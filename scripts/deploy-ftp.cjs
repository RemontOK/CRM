/**
 * Deploy CRM to Timeweb via FTP (stable alternative to SSH/scp).
 *
 * Setup:
 *   1. Copy .env.ftp.example → .env.ftp
 *   2. Fill FTP password from Timeweb panel (login: cc060567)
 *   3. npm run deploy:ftp
 *
 * Options:
 *   --frontend-only   only build/ (index, assets, .htaccess)
 *   --api-only        only api/*.php
 *   --clean-stale     remove old hashed assets from server (default: keep for safe reloads)
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
const cleanStale = args.has('--clean-stale');

loadProjectEnv('.env.ftp');

const FTP_HOST = process.env.FTP_HOST || 'vh440.timeweb.ru';
const FTP_PORT = Number(process.env.FTP_PORT || 21);
const FTP_USER = process.env.FTP_USER || 'cc060567';
const FTP_PASSWORD = process.env.FTP_PASSWORD || '';
const FTP_REMOTE_DIR = (process.env.FTP_REMOTE_DIR || 'crm/public_html').replace(/^\/+|\/+$/g, '');
const FTP_SECURE = ['1', 'true', 'yes'].includes(String(process.env.FTP_SECURE || '').toLowerCase());
const UPLOAD_DELAY_MS = Number(process.env.FTP_UPLOAD_DELAY_MS || 300);

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function sortUploadPlan(plan) {
  const weight = (remote) => {
    if (remote === '.htaccess') return 0;
    if (remote.startsWith('assets/')) return 1;
    if (remote === 'build-version.json') return 2;
    if (remote === 'vite.svg') return 2;
    if (remote.startsWith('tinymce/')) return 3;
    if (remote === 'index.html') return 4;
    return 2;
  };

  return [...plan].sort((a, b) => {
    const weightDiff = weight(a.remote) - weight(b.remote);
    if (weightDiff !== 0) {
      return weightDiff;
    }
    return a.remote.localeCompare(b.remote);
  });
}

const TINYMCE_SKIP_FILES = new Set([
  'README.md',
  'CHANGELOG.md',
  'license.md',
  'notices.txt',
  'bower.json',
  'composer.json',
  'package.json',
]);

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
    console.warn('Warning: build/tinymce not found. Run npm run build (postbuild copies TinyMCE).');
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
      { local: path.join(BUILD_DIR, 'build-version.json'), remote: 'build-version.json' },
      { local: path.join(BUILD_DIR, 'index.html'), remote: 'index.html' },
      { local: path.join(BUILD_DIR, '.htaccess'), remote: '.htaccess' },
    );

    const assetsHtaccess = path.join(BUILD_DIR, 'assets', '.htaccess');
    if (fs.existsSync(assetsHtaccess)) {
      plan.push({ local: assetsHtaccess, remote: 'assets/.htaccess' });
    }

    for (const asset of collectReferencedAssets(BUILD_DIR)) {
      plan.push({
        local: asset.local,
        remote: asset.remote,
      });
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
        console.warn(`Skip missing API file: ${name}`);
        continue;
      }
      plan.push({
        local,
        remote: `api/${name}`,
      });
    }
  }

  return sortUploadPlan(plan);
}

async function connectClient() {
  if (!FTP_PASSWORD) {
    throw new Error(
      'FTP password missing. Copy .env.ftp.example to .env.ftp and set FTP_PASSWORD (Timeweb panel → FTP).'
    );
  }

  const client = new Client(120_000);
  client.ftp.verbose = args.has('--verbose');

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
  await sleep(3000);
  const next = await connectClient();
  await next.cd(`/${FTP_REMOTE_DIR}`);
  return next;
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

async function cdRelative(client, relativeDir) {
  await client.cd(`/${FTP_REMOTE_DIR}`);
  if (relativeDir && relativeDir !== '.') {
    await client.cd(relativeDir);
  }
}

async function uploadPlan(client, plan) {
  const currentDir = { dir: null };
  let ok = 0;
  const pending = [...plan];
  const maxRounds = 5;

  for (let round = 1; round <= maxRounds && pending.length > 0; round += 1) {
    if (round > 1) {
      console.log(`\n=== Retry round ${round}, pending: ${pending.length} ===`);
      client = await reconnect(client);
      currentDir.dir = null;
    }

    for (let i = pending.length - 1; i >= 0; i -= 1) {
      const item = pending[i];
      const name = path.basename(item.local);
      process.stdout.write(`> ${name} ... `);
      try {
        await uploadOne(client, item, currentDir);
        pending.splice(i, 1);
        ok += 1;
        console.log('ok');
      } catch (error) {
        currentDir.dir = null;
        console.log(`failed (${error.message})`);
        if (String(error.message).includes('425')) {
          client = await reconnect(client);
        }
      }
      if (UPLOAD_DELAY_MS > 0) {
        await sleep(UPLOAD_DELAY_MS);
      }
    }
  }

  return { ok, failed: pending.length, pending, client };
}

async function cleanStaleAssets(client, keepNames) {
  try {
    await cdRelative(client, 'assets');
  } catch {
    console.warn('assets/ not found on server, skip cleanup');
    return;
  }

  const listing = await client.list();
  const stale = listing
    .filter((entry) => entry.isFile)
    .map((entry) => entry.name)
    .filter((name) => !keepNames.has(name));

  if (stale.length === 0) {
    console.log('No stale assets to remove.');
    return;
  }

  console.log(`Removing ${stale.length} stale asset(s)...`);
  for (const name of stale) {
    try {
      await client.remove(name);
      console.log(`  - ${name}`);
    } catch (error) {
      console.warn(`  ! could not remove ${name}: ${error.message}`);
    }
  }
}

async function main() {
  const plan = collectUploadPlan();
  const indexEntry = plan.find((item) => item.remote === 'index.html');
  const bootstrapEntries = plan.filter((item) => item.remote === '.htaccess' || item.remote === 'vite.svg');
  const assetEntries = plan.filter((item) => item.remote.startsWith('assets/'));
  const tinymceEntries = plan.filter((item) => item.remote.startsWith('tinymce/'));
  const otherEntries = plan.filter(
    (item) =>
      item !== indexEntry &&
      !bootstrapEntries.includes(item) &&
      !assetEntries.includes(item) &&
      !tinymceEntries.includes(item)
  );

  const uploadPhases = [
    { label: 'bootstrap', items: sortUploadPlan([...bootstrapEntries, ...otherEntries]) },
    { label: 'assets', items: sortUploadPlan(assetEntries) },
    { label: 'tinymce', items: sortUploadPlan(tinymceEntries) },
    { label: 'index', items: indexEntry ? [indexEntry] : [] },
  ].filter((phase) => phase.items.length > 0);

  console.log(`FTP deploy to ${FTP_HOST} (${FTP_USER})`);
  console.log(`Remote: /${FTP_REMOTE_DIR}`);
  console.log(`Files: ${plan.length}`);

  let client = await connectClient();
  let totalOk = 0;
  let allPending = [];

  try {
    await client.cd(`/${FTP_REMOTE_DIR}`);
    console.log(`Connected. FTP cwd: ${await client.pwd()}`);

    for (const phase of uploadPhases) {
      if (phase.label === 'index') {
        console.log('\n=== Upload index.html last (atomic switch) ===');
      }
      const { ok, failed, pending, client: activeClient } = await uploadPlan(client, phase.items);
      client = activeClient;
      totalOk += ok;
      allPending = pending;

      if (failed > 0) {
        console.log(`\nPhase "${phase.label}" failed: ${failed} file(s) pending.`);
        allPending.push(...pending);
        if (phase.label === 'tinymce') {
          console.warn('Continuing despite tinymce upload errors (editor may already be on server).');
          continue;
        }
        break;
      }

      if (phase.label === 'assets' && cleanStale && !apiOnly) {
        const keepNames = new Set(assetEntries.map((item) => path.basename(item.local)));
        await cleanStaleAssets(client, keepNames);
      }
    }

    console.log(`\nDone: ${totalOk} uploaded, ${allPending.length} failed.`);
    if (allPending.length > 0) {
      console.log('Still pending:', allPending.map((item) => item.remote).join(', '));
      process.exitCode = 1;
    }
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error('\nFTP deploy failed:', error.message);
  process.exit(1);
});
