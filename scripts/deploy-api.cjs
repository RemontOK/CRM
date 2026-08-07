const path = require('path');
const { execSync } = require('child_process');

const SERVER = 'cc060567@vh440.timeweb.ru';
const SSH_KEY = process.env.SSH_KEY_PATH || 'C:\\Users\\alexe\\.ssh\\id_ed25519';
const SSH_OPTS = `-i "${SSH_KEY}" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=20`;
const REMOTE_API = '~/crm/public_html/api';
const API_DIR = path.resolve(__dirname, '..', 'api');
const RETRIES = 4;
const RETRY_DELAY_MS = 3000;

const files = ['index.php', 'bootstrap.php', 'platform.php', 'yandex_oauth.php', 'yoomoney_billing.php', 'config.yoomoney.php', 'email_verification.php', 'mail.php', 'rate_limit.php', '.htaccess'];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function sh(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit' });
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

console.log(`Deploying API (${files.join(', ')}) to ${SERVER} ...`);

for (const file of files) {
  const local = path.join(API_DIR, file);
  const cmd = `scp ${SSH_OPTS} "${local}" ${SERVER}:${REMOTE_API}/${file}`;
  shRetry(cmd, file);
}

console.log('API deploy done.');
