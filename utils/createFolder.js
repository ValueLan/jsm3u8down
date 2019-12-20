const fs = require("fs");
const path = require('path')
function getStat(path) {
  return new Promise((resolve) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        resolve(false);
      } else {
        resolve(stats);
      }
    })
  })
}
function mkdir(dir) {
  return new Promise((resolve) => {
    fs.mkdir(dir, err => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    })
  })
}

module.exports = async function createFolder(dir) {
  let isExists = await getStat(dir);
  if (isExists && isExists.isDirectory()) {
    return true;
  } else if (isExists) {
    return false;
  }
  let tempDir = path.parse(dir).dir;
  let status = await createFolder(tempDir);
  let mkdirStatus;
  if (status) {
    mkdirStatus = await mkdir(dir);
  }
  return mkdirStatus;
}