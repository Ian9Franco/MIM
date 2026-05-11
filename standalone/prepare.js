const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

const rootDir = path.join(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');

console.log('📦 Starting standalone preparation...');

// Copy .next/static
const nextStaticSrc = path.join(rootDir, '.next', 'static');
const nextStaticDest = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(nextStaticSrc)) {
  console.log(`Copying static assets from ${nextStaticSrc} to ${nextStaticDest}`);
  copyFolderSync(nextStaticSrc, nextStaticDest);
} else {
  console.warn('⚠️ Warning: .next/static directory not found. Run "npm run build" first.');
}

// Copy public directory
const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');
if (fs.existsSync(publicSrc)) {
  console.log(`Copying public assets from ${publicSrc} to ${publicDest}`);
  copyFolderSync(publicSrc, publicDest);
}

console.log('✅ Standalone preparation complete! Ready for Electron.');
