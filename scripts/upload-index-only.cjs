const fs = require('fs');
const path = require('path');
const { Client } = require('basic-ftp');
const { loadProjectEnv } = require('./load-env-file.cjs');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');

loadProjectEnv('.env.ftp');

async function main() {
  const client = new Client(120_000);
  await client.access({
    host: process.env.FTP_HOST || 'vh440.timeweb.ru',
    port: Number(process.env.FTP_PORT || 21),
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: ['1', 'true', 'yes'].includes(String(process.env.FTP_SECURE || '').toLowerCase()),
  });
  const remoteDir = `/${(process.env.FTP_REMOTE_DIR || 'crm/public_html').replace(/^\/+|\/+$/g, '')}`;
  await client.cd(remoteDir);

  const localPath = path.join(BUILD, 'index.html');
  const expected = fs.statSync(localPath).size;

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    process.stdout.write(`> index.html (attempt ${attempt}) ... `);
    try {
      await client.uploadFrom(localPath, 'index.html');
      const remote = await client.size('index.html');
      if (remote === expected) {
        console.log('ok');
        client.close();
        return;
      }
      console.log(`size mismatch (${remote} vs ${expected})`);
    } catch (error) {
      console.log(`failed (${error.message})`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw new Error('Could not upload index.html');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
