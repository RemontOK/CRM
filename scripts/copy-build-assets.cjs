const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');

function ensureBuildDir() {
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build directory does not exist. Run vite build first.');
  }
}

function copyFile(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required build asset is missing: ${source}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required build asset directory is missing: ${source}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
}

ensureBuildDir();

copyFile(path.join(root, 'public.htaccess.example'), path.join(buildDir, '.htaccess'));
copyDirectory(path.join(root, 'node_modules', 'tinymce'), path.join(buildDir, 'tinymce'));

const viteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 257"><path fill="#646CFF" d="M255.2 37.9 134.9 252.9c-2.5 4.4-8.8 4.5-11.4.1L.9 37.9c-2.7-4.7 1.4-10.4 6.6-9.5l120.7 21.6a7 7 0 0 0 2.5 0l117.8-21.6c5.2-1 9.4 4.8 6.7 9.5Z"/><path fill="#FFEA83" d="M185.4.1 96.4 17.5a3.5 3.5 0 0 0-2.8 3.2l-5.5 92.9a3.5 3.5 0 0 0 4.2 3.6l24.8-5.7c2.3-.5 4.4 1.6 3.7 3.9l-7.4 36.1c-.7 2.3 1.5 4.4 3.8 3.7l15.3-4.7c2.3-.7 4.5 1.4 3.8 3.7l-11.7 56.6c-1 4.4 4.9 6.8 7.3 3l1.6-2.5 72.5-144.7c1.2-2.3-.8-5-3.4-4.5l-25.5 4.9c-2.4.5-4.4-1.8-3.6-4.1l16.6-57.9c.8-2.5-1.4-4.8-3.9-4.4Z"/></svg>`;
fs.writeFileSync(path.join(buildDir, 'vite.svg'), viteSvg);

