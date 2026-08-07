/**
 * FTP deploy with retries until every required file is on the server.
 * By default uploads only changed files (remote size !== local size).
 *
 * Run: node scripts/deploy-ftp-until-done.cjs
 * Options:
 *   --frontend-only | --api-only
 *   --clean-stale        remove old hashed assets from server (only after all assets verified)
 *   --no-clean-stale     skip stale asset cleanup (default)
 *   --full               re-upload every file even when remote size already matches
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');
const { collectReferencedAssets } = require('./collect-build-assets.cjs');
const { loadProjectEnv } = require('./load-env-file.cjs');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const API_DIR = path.join(ROOT, 'api');

const args = new Set(process.argv.slice(2));
const frontendOnly = args.has('--frontend-only');
const apiOnly = args.has('--api-only');
const forceFullUpload = args.has('--full');
// Stale cleanup is opt-in: a partial FTP upload + cleanup can 404 the live site.
const cleanStale = args.has('--clean-stale');

loadProjectEnv('.env.ftp');

const FTP_HOST = process.env.FTP_HOST || 'vh440.timeweb.ru';
const FTP_PORT = Number(process.env.FTP_PORT || 21);
const FTP_USER = process.env.FTP_USER || 'cc060567';
const FTP_PASSWORD = process.env.FTP_PASSWORD || '';
const FTP_REMOTE_DIR = (process.env.FTP_REMOTE_DIR || 'crm/public_html').replace(/^\/+|\/+$/g, '');
const FTP_SECURE = ['1', 'true', 'yes'].includes(String(process.env.FTP_SECURE || '').toLowerCase());
const UPLOAD_DELAY_MS = Number(process.env.FTP_UPLOAD_DELAY_MS || 400);
const ROUND_DELAY_MS = Number(process.env.FTP_ROUND_DELAY_MS || 12000);
const MAX_ROUNDS = Number(process.env.FTP_MAX_ROUNDS || 80);

const API_FILES = [
  'index.php',
  'bootstrap.php',
  'platform.php',
  'yandex_oauth.php',
  'yoomoney_billing.php',
  'document_templates.php',
  'employee_access.php',
  'platform_notifications.php',
  'email_verification.php',
  'mail.php',
  'rate_limit.php',
  'config.yoomoney.php.example',
  '.htaccess',
];

const TINYMCE_SKIP_FILES = new Set([
  'README.md',
  'CHANGELOG.md',
  'license.md',
  'notices.txt',
  'bower.json',
  'composer.json',
  'package.json',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function shouldUploadTinymceFile(fileName) {
  if (TINYMCE_SKIP_FILES.has(fileName)) {
    return false;
  }
  if (fileName.endsWith('.d.ts') || fileName.endsWith('.ts')) {
    return false;
  }
  if (fileName.endsWith('.js') && !fileName.endsWith('.min.js') && fileName !== 'index.js') {
    return false;
  }
  return true;
}

function collectTinymceFiles() {
  const tinymceDir = path.join(BUILD_DIR, 'tinymce');
  if (!fs.existsSync(tinymceDir)) {
    return [];
  }

  const files = [];
  const walk = (dir, remotePrefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const local = path.join(dir, entry.name);
      const remote = `${remotePrefix}/${entry.name}`.replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walk(local, remote);
      } else if (shouldUploadTinymceFile(entry.name)) {
        files.push({ local, remote });
      }
    }
  };

  walk(tinymceDir, 'tinymce');
  return files;
}

function collectUploadPlan() {
  const plan = [];

  if (!apiOnly) {
    if (!fs.existsSync(BUILD_DIR)) {
      throw new Error('build/ not found. Run: npm run build');
    }

    plan.push(
      { local: path.join(BUILD_DIR, 'index.html'), remote: 'index.html' },
      { local: path.join(BUILD_DIR, '.htaccess'), remote: '.htaccess' },
      { local: path.join(BUILD_DIR, 'build-version.json'), remote: 'build-version.json' }
    );

    const assetsHtaccess = path.join(BUILD_DIR, 'assets', '.htaccess');
    if (fs.existsSync(assetsHtaccess)) {
      plan.push({ local: assetsHtaccess, remote: 'assets/.htaccess' });
    }

    for (const asset of collectReferencedAssets(BUILD_DIR)) {
      plan.push({ local: asset.local, remote: asset.remote });
    }

    const viteSvg = path.join(BUILD_DIR, 'vite.svg');
    if (fs.existsSync(viteSvg)) {
      plan.push({ local: viteSvg, remote: 'vite.svg' });
    }

    for (const file of collectTinymceFiles()) {
      plan.push(file);
    }
  }

  if (!frontendOnly) {
    for (const name of API_FILES) {
      const local = path.join(API_DIR, name);
      if (!fs.existsSync(local)) {
        continue;
      }
      plan.push({ local, remote: `api/${name}` });
    }
  }

  return plan;
}

async function connectClient() {
  if (!FTP_PASSWORD) {
    throw new Error('FTP password missing in .env.ftp');
  }

  const client = new Client(180_000);
  await client.access({
    host: FTP_HOST,
    port: FTP_PORT,
    user: FTP_USER,
    password: FTP_PASSWORD,
    secure: FTP_SECURE,
  });
  return client;
}

async function reconnect(client) {
  try {
    client.close();
  } catch {
    // ignore
  }
  await sleep(4000);
  const next = await connectClient();
  await next.cd(`/${FTP_REMOTE_DIR}`);
  return next;
}

async function cdRelative(client, relativeDir) {
  await client.cd(`/${FTP_REMOTE_DIR}`);
  if (relativeDir && relativeDir !== '.') {
    await client.cd(relativeDir);
  }
}

async function remoteBuildVersionMatchesLocal(client, item) {
  const tmp = path.join(require('os').tmpdir(), `crm-build-version-${Date.now()}.json`);
  try {
    await cdRelative(client, '.');
    await client.downloadTo(tmp, 'build-version.json');
    const local = JSON.parse(fs.readFileSync(item.local, 'utf8'));
    const remote = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    return local.id === remote.id && local.mainBundle === remote.mainBundle;
  } catch {
    return false;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

async function remoteMatchesLocal(client, item, currentDir) {
  const remote = toPosix(item.remote);
  const dir = path.posix.dirname(remote);
  const file = path.posix.basename(remote);
  const localSize = fs.statSync(item.local).size;

  try {
    if (dir !== currentDir.dir) {
      await cdRelative(client, dir);
      currentDir.dir = dir;
    }

    if (remote === 'build-version.json') {
      return remoteBuildVersionMatchesLocal(client, item);
    }

    const remoteSize = await client.size(file);
    return remoteSize === localSize;
  } catch {
    return false;
  }
}

function localFileSize(item) {
  return fs.statSync(item.local).size;
}

async function indexRemoteDirectory(client, remoteDir, sizes) {
  const normalizedDir = remoteDir === '.' ? '.' : toPosix(remoteDir);

  try {
    await cdRelative(client, normalizedDir);
  } catch {
    return;
  }

  const listing = await client.list();
  for (const entry of listing) {
    const remotePath =
      normalizedDir === '.' ? entry.name : `${normalizedDir}/${entry.name}`;

    if (entry.isFile) {
      sizes.set(toPosix(remotePath), entry.size);
      continue;
    }

    if (entry.isDirectory) {
      await indexRemoteDirectory(client, remotePath, sizes);
    }
  }
}

async function buildRemoteSizeIndex(client) {
  const sizes = new Map();

  if (!apiOnly) {
    await indexRemoteDirectory(client, 'assets', sizes);
  }

  if (!frontendOnly) {
    await indexRemoteDirectory(client, 'api', sizes);
  }

  try {
    await cdRelative(client, '.');
    for (const entry of await client.list()) {
      if (entry.isFile) {
        sizes.set(entry.name, entry.size);
      }
    }
  } catch {
    // ignore root listing errors
  }

  return sizes;
}

async function buildRemoteSizeIndexWithRetry(client) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const sizes = await buildRemoteSizeIndex(client);
      return { client, sizes };
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      console.warn(`Remote index attempt ${attempt} failed: ${error.message}`);
      client = await reconnect(client);
    }
  }
  return { client, sizes: new Map() };
}

function remoteSizeMatchesLocal(item, remoteSizes) {
  const remoteSize = remoteSizes.get(toPosix(item.remote));
  return remoteSize !== undefined && remoteSize === localFileSize(item);
}

function extractIndexBundleName(html) {
  const fromScript = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (fromScript) {
    return fromScript[1].split('/').pop();
  }
  const fromBootstrap = html.match(/entry = "(\/assets\/index-[^"]+\.js)"/);
  if (fromBootstrap) {
    return fromBootstrap[1].split('/').pop();
  }
  return html.match(/index-[^"]+\.js/)?.[0] || '';
}

async function indexHtmlBundleMatchesRemote(client, indexItem) {
  const localHtml = fs.readFileSync(indexItem.local, 'utf8');
  const localBundle = extractIndexBundleName(localHtml);
  if (!localBundle) {
    return false;
  }

  const tmp = path.join(require('os').tmpdir(), `crm-index-bundle-${Date.now()}.html`);
  try {
    await cdRelative(client, '.');
    await client.downloadTo(tmp, 'index.html');
    const remoteHtml = fs.readFileSync(tmp, 'utf8');
    return extractIndexBundleName(remoteHtml) === localBundle;
  } catch {
    return false;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}

async function indexHtmlAlreadyLive(client, indexItem, remoteSizes) {
  if (!remoteSizeMatchesLocal(indexItem, remoteSizes)) {
    return false;
  }

  return indexHtmlBundleMatchesRemote(client, indexItem);
}

async function partitionUploadPlan(client, plan, { forceFull }) {
  const indexItem = plan.find((item) => item.remote === 'index.html') || null;
  const buildVersionItem = plan.find((item) => item.remote === 'build-version.json') || null;
  const candidates = plan.filter(
    (item) => item.remote !== 'index.html' && item.remote !== 'build-version.json'
  );

  if (forceFull) {
    return {
      client,
      indexItem,
      buildVersionItem,
      toUpload: candidates,
      skipped: [],
    };
  }

  const { sizes: remoteSizes, client: indexedClient } = await buildRemoteSizeIndexWithRetry(client);
  client = indexedClient;
  const toUpload = [];
  const skipped = [];
  const currentDir = { dir: null };

  const tinymceMarker = candidates.find((item) => item.remote === 'tinymce/tinymce.min.js');
  let skipTinymce = false;
  if (tinymceMarker) {
    skipTinymce =
      remoteSizeMatchesLocal(tinymceMarker, remoteSizes) ||
      (await remoteMatchesLocal(client, tinymceMarker, currentDir));
  }

  for (const item of candidates) {
    if (skipTinymce && item.remote.startsWith('tinymce/')) {
      skipped.push(item);
      continue;
    }

    if (remoteSizeMatchesLocal(item, remoteSizes)) {
      skipped.push(item);
      continue;
    }

    toUpload.push(item);
  }

  let skipIndex = false;
  if (indexItem && (await indexHtmlAlreadyLive(client, indexItem, remoteSizes))) {
    skipIndex = true;
  }

  let skipBuildVersion = false;
  if (buildVersionItem && (await remoteBuildVersionMatchesLocal(client, buildVersionItem))) {
    skipBuildVersion = true;
  }

  return {
    client,
    indexItem: skipIndex ? null : indexItem,
    buildVersionItem: skipBuildVersion ? null : buildVersionItem,
    toUpload,
    skipped,
    skipIndex,
    skipBuildVersion,
  };
}

async function uploadOne(client, item, currentDir) {
  const remote = toPosix(item.remote);
  const dir = path.posix.dirname(remote);
  const file = path.posix.basename(remote);

  if (dir !== currentDir.dir) {
    await cdRelative(client, dir);
    currentDir.dir = dir;
  }
  await client.uploadFrom(item.local, file);
}

async function remoteAssetSize(client, remotePath) {
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

async function verifyAssetPlanOnRemote(client, plan) {
  const assetItems = plan.filter(
    (item) => item.remote.startsWith('assets/') && !item.remote.endsWith('/.htaccess')
  );
  const missing = [];

  for (const item of assetItems) {
    const remoteSize = await remoteAssetSize(client, item.remote);
    const localSize = localFileSize(item);
    if (remoteSize !== localSize) {
      missing.push(item.remote);
    }
  }

  return missing;
}

async function cleanStaleAssets(client, keepNames) {
  try {
    await cdRelative(client, 'assets');
  } catch {
    return;
  }

  const listing = await client.list();
  const stale = listing
    .filter((entry) => entry.isFile)
    .map((entry) => entry.name)
    .filter((name) => !keepNames.has(name));

  if (stale.length === 0) {
    return;
  }

  console.log(`Removing ${stale.length} stale asset(s)...`);
  for (const name of stale) {
    try {
      await client.remove(name);
    } catch {
      // ignore single-file cleanup errors
    }
  }
}

async function main() {
  const fullPlan = collectUploadPlan();

  console.log(`FTP deploy (until done) → ${FTP_HOST} (${FTP_USER})`);
  console.log(`Remote: /${FTP_REMOTE_DIR}`);
  console.log(`Mode: ${forceFullUpload ? 'full upload' : 'changed files only'}`);

  let client = await connectClient();
  await client.cd(`/${FTP_REMOTE_DIR}`);

  const partition = await partitionUploadPlan(client, fullPlan, {
    forceFull: forceFullUpload,
  });
  client = partition.client;
  const { indexItem, buildVersionItem, toUpload, skipped, skipIndex, skipBuildVersion } = partition;

  console.log(`Plan: ${fullPlan.length} file(s), upload ${toUpload.length}, skip ${skipped.length}${skipIndex ? ', index.html unchanged' : ''}${skipBuildVersion ? ', build-version.json unchanged' : ''}`);

  if (skipped.length > 0 && skipped.length <= 12) {
    skipped.forEach((item) => console.log(`  skip ${item.remote}`));
  } else if (skipped.length > 12) {
    console.log(`  skip ${skipped.length} unchanged file(s)`);
  }

  let pending = [...toUpload];
  const verified = new Set(skipped.map((item) => item.remote));

  for (let round = 1; round <= MAX_ROUNDS && pending.length > 0; round += 1) {
    console.log(`\n=== Round ${round}, pending: ${pending.length} ===`);
    const currentDir = { dir: null };
    const nextPending = [];

    for (const item of pending) {
      process.stdout.write(`> ${item.remote} ... `);

      try {
        if (!forceFullUpload && (await remoteMatchesLocal(client, item, currentDir))) {
          verified.add(item.remote);
          console.log('skip (ok)');
          continue;
        }

        await uploadOne(client, item, currentDir);

        if (await remoteMatchesLocal(client, item, currentDir)) {
          verified.add(item.remote);
          console.log('ok');
        } else {
          nextPending.push(item);
          console.log('size mismatch');
        }
      } catch (error) {
        currentDir.dir = null;
        nextPending.push(item);
        console.log(`failed (${error.message})`);
        if (String(error.message).includes('425') || String(error.message).includes('ECONNRESET')) {
          client = await reconnect(client);
        }
      }

      if (UPLOAD_DELAY_MS > 0) {
        await sleep(UPLOAD_DELAY_MS);
      }
    }

    pending = nextPending;
    if (pending.length > 0) {
      console.log(`Waiting ${ROUND_DELAY_MS / 1000}s before next round...`);
      client = await reconnect(client);
      await sleep(ROUND_DELAY_MS);
    }
  }

  if (pending.length > 0) {
    client.close();
    console.error(`\nFailed after ${MAX_ROUNDS} rounds. Still pending: ${pending.length}`);
    pending.forEach((item) => console.error(`  - ${item.remote}`));
    process.exit(1);
  }

  const missingAssets = !apiOnly ? await verifyAssetPlanOnRemote(client, fullPlan) : [];
  if (missingAssets.length > 0) {
    console.warn(`\nWarning: ${missingAssets.length} asset(s) missing or size mismatch on server:`);
    missingAssets.slice(0, 8).forEach((name) => console.warn(`  - ${name}`));
    if (missingAssets.length > 8) {
      console.warn(`  ... and ${missingAssets.length - 8} more`);
    }
    console.warn('Will retry uploading missing assets before switching index.html...');

    const currentDir = { dir: null };
    for (const remote of missingAssets) {
      const item = fullPlan.find((entry) => entry.remote === remote);
      if (!item) {
        continue;
      }
      process.stdout.write(`> retry ${item.remote} ... `);
      try {
        await uploadOne(client, item, currentDir);
        const ok = (await remoteAssetSize(client, item.remote)) === localFileSize(item);
        console.log(ok ? 'ok' : 'size mismatch');
      } catch (error) {
        console.log(`failed (${error.message})`);
        client = await reconnect(client);
      }
      if (UPLOAD_DELAY_MS > 0) {
        await sleep(UPLOAD_DELAY_MS);
      }
    }

    const stillMissing = !apiOnly ? await verifyAssetPlanOnRemote(client, fullPlan) : [];
    if (stillMissing.length > 0) {
      console.error(`\nStill missing ${stillMissing.length} asset(s). Aborting before index.html switch.`);
      stillMissing.slice(0, 12).forEach((name) => console.error(`  - ${name}`));
      client.close();
      process.exit(1);
    }
  }

  if (buildVersionItem) {
    console.log('\n=== Upload build-version.json (final switch) ===');
    const currentDir = { dir: null };
    let uploaded = false;
    for (let attempt = 1; attempt <= 10 && !uploaded; attempt += 1) {
      try {
        if (!(await remoteBuildVersionMatchesLocal(client, buildVersionItem))) {
          await uploadOne(client, buildVersionItem, currentDir);
        }
        uploaded = await remoteBuildVersionMatchesLocal(client, buildVersionItem);
        if (uploaded) {
          const local = JSON.parse(fs.readFileSync(buildVersionItem.local, 'utf8'));
          console.log(`build-version.json ok (${local.mainBundle})`);
        }
      } catch (error) {
        console.log(`build-version.json attempt ${attempt} failed: ${error.message}`);
        client = await reconnect(client);
        await sleep(ROUND_DELAY_MS);
      }
    }
    if (!uploaded) {
      client.close();
      console.error('Could not upload build-version.json');
      process.exit(1);
    }
  }

  if (indexItem) {
    console.log('\n=== Upload index.html (final switch) ===');
    const currentDir = { dir: null };
    let uploaded = false;
    for (let attempt = 1; attempt <= 10 && !uploaded; attempt += 1) {
      try {
        if (!(await indexHtmlBundleMatchesRemote(client, indexItem))) {
          try {
            await cdRelative(client, '.');
            await client.remove('index.html');
          } catch {
            // ignore if missing
          }
          await uploadOne(client, indexItem, currentDir);
        }
        uploaded = await indexHtmlBundleMatchesRemote(client, indexItem);
        if (uploaded) {
          const localHtml = fs.readFileSync(indexItem.local, 'utf8');
          console.log(`index.html ok (${extractIndexBundleName(localHtml)})`);
        } else {
          const localHtml = fs.readFileSync(indexItem.local, 'utf8');
          console.log(`index.html bundle mismatch after upload: local=${extractIndexBundleName(localHtml)}`);
        }
      } catch (error) {
        console.log(`index.html attempt ${attempt} failed: ${error.message}`);
        client = await reconnect(client);
        await sleep(ROUND_DELAY_MS);
      }
    }
    if (!uploaded) {
      client.close();
      console.error('Could not upload index.html');
      process.exit(1);
    }
  }

  if (!apiOnly && cleanStale) {
    try {
      const stillMissing = await verifyAssetPlanOnRemote(client, fullPlan);
      if (stillMissing.length > 0) {
        console.warn(`Stale asset cleanup skipped: ${stillMissing.length} asset(s) not verified on server.`);
      } else {
        const keepNames = new Set(
          fullPlan.filter((item) => item.remote.startsWith('assets/')).map((item) => path.basename(item.local))
        );
        const buildVersionPath = path.join(BUILD_DIR, 'build-version.json');
        if (fs.existsSync(buildVersionPath)) {
          const mainBundle = JSON.parse(fs.readFileSync(buildVersionPath, 'utf8')).mainBundle;
          if (mainBundle) {
            keepNames.add(mainBundle);
          }
        }
        await cleanStaleAssets(client, keepNames);
      }
    } catch (error) {
      console.warn(`Stale asset cleanup skipped: ${error.message}`);
    }
  }

  try {
    client.close();
  } catch {
    // ignore
  }

  const uploadedCount =
    toUpload.length + (buildVersionItem ? 1 : 0) + (indexItem ? 1 : 0);
  console.log(
    `\nDeploy complete: uploaded ${uploadedCount}, skipped ${skipped.length + (skipIndex ? 1 : 0)} unchanged file(s).`
  );
}

main().catch((error) => {
  console.error('\nFTP deploy failed:', error.message);
  process.exit(1);
});
