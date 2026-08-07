/**
 * Patch yoomoney section in production config.local.php (does not touch other keys).
 *
 * Required env (or .env.ftp):
 *   YOOMONEY_WALLET
 *   YOOMONEY_NOTIFICATION_SECRET
 *
 * Run: node scripts/patch-yoomoney-config.cjs
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.ftp') });

const wallet = process.env.YOOMONEY_WALLET || '';
const notificationSecret = process.env.YOOMONEY_NOTIFICATION_SECRET || '';

if (!wallet || !notificationSecret) {
  console.error(
    'Set YOOMONEY_WALLET and YOOMONEY_NOTIFICATION_SECRET in .env.ftp (see .env.ftp.example).'
  );
  process.exit(1);
}

const SERVER = process.env.FTP_HOST ? `${process.env.FTP_USER}@${process.env.FTP_HOST}` : 'cc060567@vh440.timeweb.ru';
const SSH_KEY = process.env.SSH_KEY_PATH || 'C:\\Users\\alexe\\.ssh\\id_ed25519';
const SSH_OPTS = `-i "${SSH_KEY}" -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=35`;
const RETRIES = 8;

const patchPhp = `<?php
declare(strict_types=1);
$path = getenv('HOME') . '/crm/public_html/api/config.local.php';
if (!is_file($path)) {
    fwrite(STDERR, "config.local.php not found\\n");
    exit(1);
}
$block = <<<'YAML'
    'yoomoney' => [
        'wallet' => '${wallet}',
        'notification_secret' => '${notificationSecret}',
        'monthly_price' => 0,
    ],
YAML;
$text = file_get_contents($path);
if (strpos($text, "'yoomoney'") !== false) {
    $text = preg_replace(
        "/['\\"]yoomoney['\\"]\\s*=>\\s*\\[[\\s\\S]*?\\],?/m",
        rtrim($block),
        $text,
        1
    );
} else {
    $text = preg_replace('/\\n\\];\\s*$/', "\\n" . rtrim($block) . "\\n];\\n", $text, 1);
}
file_put_contents($path, $text);
echo "yoomoney config patched\\n";
`;

const tmp = path.join(__dirname, '.patch-yoomoney-tmp.php');
fs.writeFileSync(tmp, patchPhp, 'utf8');

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
  try {
    console.log(`Attempt ${attempt}/${RETRIES}...`);
    execSync(`scp ${SSH_OPTS} "${tmp}" ${SERVER}:~/patch-yoomoney-tmp.php`, { stdio: 'inherit' });
    execSync(`ssh ${SSH_OPTS} ${SERVER} "php ~/patch-yoomoney-tmp.php && rm ~/patch-yoomoney-tmp.php"`, {
      stdio: 'inherit',
    });
    fs.unlinkSync(tmp);
    console.log('YooMoney config added on server.');
    process.exit(0);
  } catch (error) {
    if (attempt === RETRIES) {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      throw error;
    }
    sleep(5000);
  }
}
