const path = require('path');
const fs = require('fs');

const repoImgDir = path.join(__dirname, '..', 'img');
const persistentImgDir = process.env.IMG_DIR
  ? path.resolve(process.env.IMG_DIR)
  : repoImgDir;

function ensureImgDirs() {
  fs.mkdirSync(repoImgDir, { recursive: true });
  if (persistentImgDir !== repoImgDir) {
    fs.mkdirSync(persistentImgDir, { recursive: true });
  }
}

module.exports = {
  repoImgDir,
  persistentImgDir,
  ensureImgDirs
};
