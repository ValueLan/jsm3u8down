const path = require('path')
const fetch = require("node-fetch");
const fs = require("fs");

const utils = {
  createFolder: require('./createFolder'),
  sleep(t = 1000) {
    return new Promise(function (r) {
      setTimeout(r, t);
    });
  },
  async *getYield(list) {
    let newList = {};
    list.map((item, index) => {
      newList[index] = Promise.resolve(item).then((data) => {
        return { data, index }
      })
    });
    async function* go() {
      let val = Object.values(newList);
      if (val.length == 0) return;
      let res = Promise.race(val).then(({ data, index }) => {
        delete newList[index];
        return data;
      })
      yield res;
      await res
      yield* go();
    }
    return yield* go();
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

  download(url, filename) {
    let _downCount = 0;
    function _download() {
      filename = filename || url.split('/').pop();
      _downCount++;
      return fetch(url, {
        timeout: 60000
      }).then(async (res) => {
        if (res.status != 200 && _downCount < 10) return [{ msg: '超时' }];
        return res.buffer().then(function (_) {
          return [, _]
        })
      }).then(function ([err, res]) {
        if (err) return _download()
        return [err, res];
      })
    }

    return _download().then(([err, _]) => {
      if (err) return [true];
      return new Promise(async function (r) {
        await utils.createFolder(path.resolve(path.dirname(filename)));
        fs.writeFile(filename, _, "binary", function (err) {
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
