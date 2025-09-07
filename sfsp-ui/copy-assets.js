const fs = require('fs').promises;
const path = require('path');

const staticSrcPath = path.join(__dirname, '.next/static');
const staticDestPath = path.join(__dirname, '.next/standalone/.next/static');
const publicSrcPath = path.join(__dirname, 'public');
const publicDestPath = path.join(__dirname, '.next/standalone/public');

async function copyAssets(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const items = await fs.readdir(src, { withFileTypes: true });
  await Promise.all(items.map(async (item) => {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);
    if (item.isDirectory()) {
      await copyAssets(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }));
}

(async () => {
  try {
    await copyAssets(staticSrcPath, staticDestPath);
    await copyAssets(publicSrcPath, publicDestPath);
    console.log('\x1b[32m Assets copied successfully\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m Failed to copy assets\x1b[0m', err);
    process.exit(1);
  }
})();