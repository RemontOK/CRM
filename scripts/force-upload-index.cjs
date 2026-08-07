const fs = require('fs');
const path = require('path');
const os = require('os');
const { Client } = require('basic-ftp');
const { loadProjectEnv } = require('./load-env-file.cjs');

loadProjectEnv('.env.ftp');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'build', 'index.html');
const REMOTE_DIR = (process.env.FTP_REMOTE_DIR || 'crm/public_html').replace(/^\/+|\/+$/g, '');

const bundleFromHtml = (html) => html.match(/index-[^"']+\.js/)?.[0] || '';

async function main() {
  const localHtml = fs.readFileSync(INDEX, 'utf8');
  const localBundle = bundleFromHtml(localHtml);
  console.log('Local bundle:', localBundle);

  const client = new Client(180_000);
  await client.access({
    host: process.env.FTP_HOST,
    port: Number(process.env.FTP_PORT || 21),
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    secure: false,
  });
  await client.cd(`/${REMOTE_DIR}`);

  try {
    await client.remove('index.html');
    console.log('Removed old index.html');
  } catch (error) {
    console.log('Remove skipped:', error.message);
  }

  await client.uploadFrom(INDEX, 'index.html');
  console.log('Uploaded index.html');

  const tmp = path.join(os.tmpdir(), `crm-index-${Date.now()}.html`);
  await client.downloadTo(tmp, 'index.html');
  client.close();

  const remoteHtml = fs.readFileSync(tmp, 'utf8');
  const remoteBundle = bundleFromHtml(remoteHtml);
  console.log('Remote bundle (FTP):', remoteBundle);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const https = require('https');
  const liveHtml = await new Promise((resolve, reject) => {
    https
      .get('https://nakcrm.ru/', (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
  const liveBundle = bundleFromHtml(liveHtml);
  console.log('Live bundle (HTTP):', liveBundle);

  if (localBundle !== remoteBundle || localBundle !== liveBundle) {
    console.error('index.html verification failed');
    process.exit(1);
  }

  console.log('index.html verified');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
