const path = require('path')
const fetch = require("node-fetch");
const fs = require("fs");

const utils = {
  sleep(t = 1000) {
    return new Promise(function (r) {
      setTimeout(r, t);
    });
  },

  deleteall(path) {
    var files = [];
    if (fs.existsSync(path)) {
      files = fs.readdirSync(path);
      files.forEach(function (file, index) {
        var curPath = path + "/" + file;
        if (fs.statSync(curPath).isDirectory()) { // recurse
          deleteall(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  },

  download(url, filename, _follder = './') {
    let _downCount = 0;
    function _download() {
      filename = filename || url.split('/').pop();
      return fetch(url, {}).then(async (res) => {
        if (res.status != 200 && ++_downCount < 5) {
          await utils.sleep(1000 * Math.pow(_downCount, 2));
          return _download();
        } else {
          return res.buffer()
        }
      })
    }

    let buffer = _download();
    return buffer.then(_ => {
      if (!_) return [true];
      return new Promise(function (r) {
        fs.writeFile(path.join(_follder, filename), _, "binary", function (err) {
          if (err) return r([err])
          r([, filename]);
        });
      })
    }).catch(function (e) {
      return [e]
    });
  }
}

module.exports = utils;
