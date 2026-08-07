/**
 * Upload only files required to fix lazy-load / Settings chunk errors.
 * Use when full deploy fails or after partial deploy left missing assets.
 *
 * Run: node scripts/deploy-critical.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERVER = 'cc060567@vh440.timeweb.ru';
const SSH_KEY = process.env.SSH_KEY_PATH || 'C:\\Users\\alexe\\.ssh\\id_ed25519';
const SSH_OPTS = `-i "${SSH_KEY}" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=30`;
const REMOTE_DIR = '~/crm/public_html';
const BUILD_DIR = path.resolve(__dirname, '..', 'build');

const { collectReferencedAssets } = require('./collect-build-assets.cjs');

const criticalFiles = [
  { local: path.join(BUILD_DIR, 'index.html'), remote: `${REMOTE_DIR}/index.html` },
  { local: path.join(BUILD_DIR, '.htaccess'), remote: `${REMOTE_DIR}/.htaccess` },
];

for (const asset of collectReferencedAssets(BUILD_DIR)) {
  criticalFiles.push({
    local: asset.local,
    remote: `${REMOTE_DIR}/${asset.remote}`,
  });
}

if (fs.existsSync(path.join(BUILD_DIR, 'vite.svg'))) {
  criticalFiles.push({
    local: path.join(BUILD_DIR, 'vite.svg'),
    remote: `${REMOTE_DIR}/vite.svg`,
  });
}

const RETRIES = 4;
const RETRY_DELAY_MS = 3000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function scpWithRetry(localPath, remotePath) {
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing: ${localPath}`);
  }
  const cmd = `scp ${SSH_OPTS} "${localPath}" ${SERVER}:${remotePath}`;
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    console.log(`> ${path.basename(localPath)}${attempt > 1 ? ` (retry ${attempt}/${RETRIES})` : ''}`);
    try {
      execSync(cmd, { stdio: 'inherit' });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) {
        sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

console.log(`Uploading ${criticalFiles.length} critical file(s) to ${SERVER} ...`);
for (const { local, remote } of criticalFiles) {
  scpWithRetry(local, remote);
}
console.log('Critical deploy done.');
