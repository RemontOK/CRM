/**
 * Upload only build/assets + index.html + build-version.json (no TinyMCE).
 * Use when the site shows 404 on index-*.js / index-*.css.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');
const { collectReferencedAssets } = require('./collect-build-assets.cjs');
const { loadProjectEnv } = require('./load-env-file.cjs');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');

loadProjectEnv('.env.ftp');

const FTP_HOST = process.env.FTP_HOST || 'vh440.timeweb.ru';
const FTP_PORT = Number(process.env.FTP_PORT || 21);
const FTP_USER = process.env.FTP_USER || 'cc060567';
const FTP_PASSWORD = process.env.FTP_PASSWORD || '';
const FTP_REMOTE_DIR = (process.env.FTP_REMOTE_DIR || 'crm/public_html').replace(/^\/+|\/+$/g, '');
const FTP_SECURE = ['1', 'true', 'yes'].includes(String(process.env.FTP_SECURE || '').toLowerCase());
const UPLOAD_DELAY_MS = Number(process.env.FTP_UPLOAD_DELAY_MS || 300);
const MAX_ATTEMPTS = Number(process.env.FTP_EMERGENCY_ATTEMPTS || 12);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function localSize(localPath) {
  return fs.statSync(localPath).size;
}

async function connect() {
  if (!FTP_PASSWORD) {
    throw new Error('FTP password missing in .env.ftp');
  }
  const client = new Client(120_000);
  await client.access({
    host: FTP_HOST,
    port: FTP_PORT,
    user: FTP_USER,
    password: FTP_PASSWORD,
    secure: FTP_SECURE,
  });
  await client.cd(`/${FTP_REMOTE_DIR}`);
  return client;
}

async function reconnect(client) {
  try {
    client.close();
  } catch {
    // ignore
  }
  await sleep(3000);
  return connect();
}

async function cdRelative(client, relativeDir) {
  await client.cd(`/${FTP_REMOTE_DIR}`);
  if (relativeDir && relativeDir !== '.') {
    await client.cd(relativeDir);
  }
}

async function remoteSize(client, remotePath) {
  const normalized = toPosix(remotePath);
  const dir = path.posix.dirname(normalized);
  const file = path.posix.basename(normalized);
  try {
    await cdRelative(client, dir === '.' ? '.' : dir);
    return await client.size(file);
  } catch {
    return null;
  }
}

async function uploadFile(client, localPath, remotePath) {
  const normalized = toPosix(remotePath);
  const dir = path.posix.dirname(normalized);
  const file = path.posix.basename(normalized);
  await cdRelative(client, dir === '.' ? '.' : dir);
  await client.uploadFrom(localPath, file);
}

async function uploadWithRetry(client, item) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    process.stdout.write(`> ${item.remote} ... `);
    try {
      await uploadFile(client, item.local, item.remote);
      const ok = (await remoteSize(client, item.remote)) === localSize(item.local);
      if (ok) {
        console.log('ok');
        return client;
      }
      console.log(`size mismatch (attempt ${attempt})`);
    } catch (error) {
      console.log(`failed (${error.message})`);
      client = await reconnect(client);
    }
    await sleep(UPLOAD_DELAY_MS);
  }
  throw new Error(`Could not upload ${item.remote}`);
}

function buildPlan() {
  if (!fs.existsSync(path.join(BUILD_DIR, 'index.html'))) {
    throw new Error('build/ missing. Run: npm run build');
  }

  const plan = collectReferencedAssets(BUILD_DIR).map((asset) => ({
    local: asset.local,
    remote: asset.remote,
  }));

  plan.push(
    { local: path.join(BUILD_DIR, 'index.html'), remote: 'index.html' },
    { local: path.join(BUILD_DIR, 'build-version.json'), remote: 'build-version.json' }
  );

  const assetsHtaccess = path.join(BUILD_DIR, 'assets', '.htaccess');
  if (fs.existsSync(assetsHtaccess)) {
    plan.unshift({ local: assetsHtaccess, remote: 'assets/.htaccess' });
  }

  return plan;
}

async function main() {
  const assets = buildPlan().filter((item) => item.remote !== 'index.html' && item.remote !== 'build-version.json');
  const indexItem = { local: path.join(BUILD_DIR, 'index.html'), remote: 'index.html' };
  const versionItem = { local: path.join(BUILD_DIR, 'build-version.json'), remote: 'build-version.json' };

  console.log(`Emergency frontend deploy → ${FTP_HOST}`);
  console.log(`Assets to upload: ${assets.length}`);

  let client = await connect();

  for (const item of assets) {
    client = await uploadWithRetry(client, item);
    if (UPLOAD_DELAY_MS > 0) {
      await sleep(UPLOAD_DELAY_MS);
    }
  }

  const missing = [];
  for (const item of assets) {
    const remote = await remoteSize(client, item.remote);
    if (remote !== localSize(item.local)) {
      missing.push(item.remote);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Still missing on server: ${missing.join(', ')}`);
  }

  console.log('\nAll assets verified. Switching build-version.json and index.html...');
  client = await uploadWithRetry(client, versionItem);
  client = await uploadWithRetry(client, indexItem);

  const mainBundle = JSON.parse(fs.readFileSync(versionItem.local, 'utf8')).mainBundle;
  console.log(`\nDone. Live bundle: ${mainBundle}`);
  client.close();
}

main().catch((error) => {
  console.error('\nEmergency deploy failed:', error.message);
  process.exit(1);
});
