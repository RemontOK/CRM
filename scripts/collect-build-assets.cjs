/**
 * Collect every frontend asset that must be on the server for the current build.
 * Uses the full build/assets directory plus index.html so lazy/nested chunks are never missed.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function collectAssetReferencesFromJs(text) {
  const names = new Set();

  for (const match of text.matchAll(/assets\/([^"']+\.(?:js|css))/g)) {
    names.add(match[1]);
  }

  for (const match of text.matchAll(/\.\/([^"']+\.js)/g)) {
    names.add(match[1]);
  }

  return names;
}

function collectReferencedAssets(buildDir) {
  const assetsDir = path.join(buildDir, 'assets');
  const indexHtmlPath = path.join(buildDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error('build/index.html not found. Run: npm run build');
  }

  if (!fs.existsSync(assetsDir)) {
    throw new Error('build/assets not found. Run: npm run build');
  }

  const assetNames = new Set();

  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  for (const match of indexHtml.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)) {
    assetNames.add(match[1]);
  }
  for (const match of indexHtml.matchAll(/(?:entry|cssHref)\s*=\s*"\/assets\/([^"]+)"/g)) {
    assetNames.add(match[1]);
  }
  for (const match of indexHtml.matchAll(/(?:entry|cssHref)\s*=\s*'\/assets\/([^']+)'/g)) {
    assetNames.add(match[1]);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const name of [...assetNames]) {
      if (!name.endsWith('.js')) {
        continue;
      }

      const filePath = path.join(assetsDir, name);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const bundleText = fs.readFileSync(filePath, 'utf8');
      for (const ref of collectAssetReferencesFromJs(bundleText)) {
        if (!assetNames.has(ref)) {
          assetNames.add(ref);
          changed = true;
        }
      }
    }
  }

  const files = [...assetNames]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      local: path.join(assetsDir, name),
      remote: `assets/${name}`,
    }))
    .filter((item) => fs.existsSync(item.local));

  const missing = [...assetNames].filter((name) => !fs.existsSync(path.join(assetsDir, name)));
  if (missing.length) {
    console.warn(`Warning: ${missing.length} referenced asset(s) missing from build/assets: ${missing.join(', ')}`);
  }

  return files;
}

function pruneUnreferencedAssets(buildDir) {
  const assets = collectReferencedAssets(buildDir);
  const keepNames = new Set(assets.map((item) => item.name));
  const assetsDir = path.join(buildDir, 'assets');

  if (!fs.existsSync(assetsDir)) {
    return [];
  }

  const removed = [];
  for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
    if (!entry.isFile() || keepNames.has(entry.name)) {
      continue;
    }

    fs.unlinkSync(path.join(assetsDir, entry.name));
    removed.push(entry.name);
  }

  return removed;
}

function writeAssetManifest(buildDir) {
  const assets = collectReferencedAssets(buildDir);
  const indexHtml = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');
  const mainBundle = indexHtml.match(/(?:src|entry)\s*=\s*["']\/assets\/(index-[^"']+\.js)["']/)?.[1]
    || indexHtml.match(/src="\/assets\/(index-[^"]+\.js)"/)?.[1]
    || '';

  const files = assets.map((asset) => {
    const buffer = fs.readFileSync(asset.local);
    return {
      name: asset.name,
      remote: asset.remote,
      size: buffer.length,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    };
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    mainBundle,
    files,
  };

  const manifestPath = path.join(buildDir, 'asset-manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

module.exports = {
  collectReferencedAssets,
  writeAssetManifest,
  collectAssetReferencesFromJs,
  pruneUnreferencedAssets,
};
