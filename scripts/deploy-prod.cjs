const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { collectReferencedAssets } = require('./collect-build-assets.cjs');

const SERVER = 'cc060567@vh440.timeweb.ru';
const SSH_KEY = process.env.SSH_KEY_PATH || 'C:\\Users\\alexe\\.ssh\\id_ed25519';
const SSH_OPTS = `-i "${SSH_KEY}" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=20`;
const REMOTE_DIR = '~/crm/public_html';
const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const RETRIES = 4;
const RETRY_DELAY_MS = 3000;

if (!fs.existsSync(BUILD_DIR)) {
  console.error('build/ not found. Run: npm run build');
  process.exit(1);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function sh(cmd, { ignoreError = false } = {}) {
  console.log(`> ${cmd}`);
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
  } catch (error) {
    if (ignoreError) {
      return '';
    }
    throw error;
  }
}

function shRetry(cmd, label) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      return sh(cmd);
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) {
        console.warn(`${label}: attempt ${attempt}/${RETRIES} failed, retry in ${RETRY_DELAY_MS}ms...`);
        sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

function scpFile(localPath, remotePath) {
  const cmd = `scp ${SSH_OPTS} "${localPath}" ${SERVER}:${remotePath}`;
  shRetry(cmd, path.basename(localPath));
}

function verifyRemoteFile(remotePath) {
  shRetry(
    `ssh ${SSH_OPTS} ${SERVER} "test -f ${REMOTE_DIR}/${remotePath} && echo ok"`,
    `verify ${remotePath}`
  );
}

const referencedAssets = collectReferencedAssets(BUILD_DIR);
const newAssets = new Set(referencedAssets.map((item) => item.remote));

console.log(`Deploying ${referencedAssets.length} referenced asset(s) + index.html to ${SERVER} ...`);

shRetry(
  `ssh ${SSH_OPTS} ${SERVER} "mkdir -p ${REMOTE_DIR}/assets"`,
  'ensure assets dir'
);

for (const { local, remote, name } of referencedAssets) {
  scpFile(local, `${REMOTE_DIR}/${remote}`);
  verifyRemoteFile(remote);
  sleep(400);
}

const extraFiles = [
  { local: path.join(BUILD_DIR, 'index.html'), remote: `${REMOTE_DIR}/index.html` },
  { local: path.join(BUILD_DIR, '.htaccess'), remote: `${REMOTE_DIR}/.htaccess` },
  { local: path.join(BUILD_DIR, 'vite.svg'), remote: `${REMOTE_DIR}/vite.svg` },
];

for (const { local, remote } of extraFiles) {
  if (fs.existsSync(local)) {
    scpFile(local, remote);
  }
}

verifyRemoteFile('index.html');
verifyRemoteFile('.htaccess');

const indexHtml = fs.readFileSync(path.join(BUILD_DIR, 'index.html'), 'utf8');
const mainMatch = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/);
if (mainMatch) {
  verifyRemoteFile(`assets/${mainMatch[1]}`);
  console.log(`Verified main bundle on server: assets/${mainMatch[1]}`);
}

const existingAssets = shRetry(
  `ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_DIR} && find assets -maxdepth 1 -type f -printf '%f\\n'"`,
  'list assets'
)
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((f) => `assets/${f}`);

const toDelete = existingAssets.filter((f) => !newAssets.has(f));
if (toDelete.length) {
  console.log(`Removing ${toDelete.length} stale asset(s)...`);
  const rmList = toDelete.map((f) => `'${f.replace('assets/', '')}'`).join(' ');
  shRetry(
    `ssh ${SSH_OPTS} ${SERVER} "cd ${REMOTE_DIR}/assets && rm -f ${rmList}"`,
    'remove stale assets'
  );
} else {
  console.log('No stale assets to remove.');
}

const assetsOnServer = shRetry(
  `ssh ${SSH_OPTS} ${SERVER} "ls -1 ${REMOTE_DIR}/assets/ | wc -l"`,
  'count assets'
).trim();

console.log(`assets/ on server: ${assetsOnServer} file(s)`);
console.log('Deploy done.');
