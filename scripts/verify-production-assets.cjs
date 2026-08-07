/**
 * Verify production serves the same frontend assets as the local build.
 * Run after deploy: node scripts/verify-production-assets.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { writeAssetManifest } = require('./collect-build-assets.cjs');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const SITE = process.env.DEPLOY_VERIFY_URL || 'https://nakcrm.ru';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          response.resume();
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

async function main() {
  const manifest = writeAssetManifest(BUILD_DIR);
  const indexHtml = await fetchText(`${SITE}/`);
  const liveBundle = indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1];

  if (!liveBundle) {
    throw new Error('Could not find main bundle in live index.html');
  }

  if (liveBundle !== manifest.mainBundle) {
    throw new Error(`index.html mismatch: live=${liveBundle} local=${manifest.mainBundle}`);
  }

  const failures = [];
  for (const file of manifest.files) {
    const url = `${SITE}/${file.remote}`;
    try {
      const body = await fetchText(url);
      const sha256 = require('crypto').createHash('sha256').update(body).digest('hex');
      if (sha256 !== file.sha256) {
        failures.push(`${file.name}: checksum mismatch`);
      }
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error(`Verification failed (${failures.length}):`);
    failures.forEach((line) => console.error(`  - ${line}`));
    process.exit(1);
  }

  console.log(`Verified ${manifest.files.length} asset(s) and ${manifest.mainBundle} on ${SITE}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
