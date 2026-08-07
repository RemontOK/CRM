/**
 * Retry deploy until every file succeeds.
 * Run: node scripts/deploy-until-done.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { collectReferencedAssets } = require('./collect-build-assets.cjs');

const SERVER = 'cc060567@vh440.timeweb.ru';
const SSH_KEY = process.env.SSH_KEY_PATH || 'C:\\Users\\alexe\\.ssh\\id_ed25519';
const SSH_OPTS = `-i "${SSH_KEY}" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=30`;
const REMOTE_DIR = '~/crm/public_html';
const REMOTE_API = '~/crm/public_html/api';
const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const API_DIR = path.resolve(__dirname, '..', 'api');

const ATTEMPTS_PER_FILE = 8;
const RETRY_DELAY_MS = 5000;
const ROUND_DELAY_MS = 15000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function collectCriticalFiles() {
  const files = [
    { local: path.join(BUILD_DIR, 'index.html'), remote: `${REMOTE_DIR}/index.html` },
    { local: path.join(BUILD_DIR, '.htaccess'), remote: `${REMOTE_DIR}/.htaccess` },
  ];

  for (const asset of collectReferencedAssets(BUILD_DIR)) {
    files.push({
      local: asset.local,
      remote: `${REMOTE_DIR}/${asset.remote}`,
    });
  }

  if (fs.existsSync(path.join(BUILD_DIR, 'vite.svg'))) {
    files.push({
      local: path.join(BUILD_DIR, 'vite.svg'),
      remote: `${REMOTE_DIR}/vite.svg`,
    });
  }

  const apiFiles = [
    'index.php',
    'bootstrap.php',
    'platform.php',
    'yandex_oauth.php',
    'yoomoney_billing.php',
    'config.yoomoney.php',
    'email_verification.php',
    'mail.php',
    'rate_limit.php',
    '.htaccess',
  ];
  for (const name of apiFiles) {
    files.push({
      local: path.join(API_DIR, name),
      remote: `${REMOTE_API}/${name}`,
    });
  }

  return files;
}

function scpOnce(localPath, remotePath) {
  const cmd = `scp ${SSH_OPTS} "${localPath}" ${SERVER}:${remotePath}`;
  execSync(cmd, { stdio: 'pipe' });
}

function uploadFile(localPath, remotePath) {
  for (let attempt = 1; attempt <= ATTEMPTS_PER_FILE; attempt += 1) {
    try {
      scpOnce(localPath, remotePath);
      return true;
    } catch {
      if (attempt < ATTEMPTS_PER_FILE) {
        sleep(RETRY_DELAY_MS);
      }
    }
  }
  return false;
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error('build/ not found. Run: npm run build');
  process.exit(1);
}

try {
  execSync(`ssh ${SSH_OPTS} ${SERVER} "mkdir -p ${REMOTE_DIR}/assets ${REMOTE_API}"`, { stdio: 'pipe' });
} catch (error) {
  console.warn('Could not ensure remote directories (will retry during upload).');
}

const allFiles = collectCriticalFiles();
const pending = new Map(allFiles.map((item) => [item.local, item]));
let round = 0;

console.log(`Deploy until done: ${allFiles.length} file(s) to ${SERVER}`);

while (pending.size > 0) {
  round += 1;
  console.log(`\n=== Round ${round}, pending: ${pending.size} ===`);

  for (const [local, { remote }] of [...pending.entries()]) {
    const name = path.basename(local);
    process.stdout.write(`> ${name} ... `);
    if (uploadFile(local, remote)) {
      pending.delete(local);
      console.log('ok');
    } else {
      console.log('failed, will retry');
    }
    sleep(2000);
  }

  if (pending.size > 0) {
    console.log(`Waiting ${ROUND_DELAY_MS / 1000}s before next round...`);
    sleep(ROUND_DELAY_MS);
  }
}

const keepAssetNames = new Set(
  allFiles
    .filter((item) => item.remote.includes('/assets/'))
    .map((item) => path.basename(item.local))
);
try {
  const existing = execSync(
    `ssh ${SSH_OPTS} ${SERVER} "ls -1 ${REMOTE_DIR}/assets 2>/dev/null || true"`,
    { encoding: 'utf8', stdio: 'pipe' }
  )
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const stale = existing.filter((name) => !keepAssetNames.has(name));
  if (stale.length > 0) {
    console.log(`Removing ${stale.length} stale asset(s)...`);
    const rmList = stale.map((f) => `'${f.replace(/'/g, "'\\''")}'`).join(' ');
    execSync(`ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_DIR}/assets && rm -f ${rmList}"`, { stdio: 'pipe' });
  }
} catch {
  console.warn('Could not clean stale assets on server.');
}

const mainBundle = [...allFiles]
  .map((item) => path.basename(item.local))
  .find((name) => /^index-[^/]+\.js$/.test(name));
if (mainBundle) {
  try {
    const size = execSync(
      `ssh ${SSH_OPTS} ${SERVER} "wc -c < ${REMOTE_DIR}/assets/${mainBundle}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    ).trim();
    console.log(`Verified: assets/${mainBundle} (${size} bytes on server)`);
  } catch {
    console.warn(`Could not verify assets/${mainBundle} — check manually on server`);
  }
}

console.log('\nAll files deployed successfully.');
