const fetch = require("node-fetch");
const fs = require("fs");
const url = require('url');
const utils = require('./utils');
const execSync = require('child_process').execSync
const path = require('path')


module.exports = async function (m3u8Url, outputName) {
  let thisUrl = url.parse(m3u8Url);
  let html = await fetch(thisUrl.href).then((res) => {
    return res.text()
  });
  let pre = thisUrl.protocol + '//' + thisUrl.host;
  let filelist = []

  html = html.split('\n').filter(function (url) {
    if (/\.ts$/.test(url)) {
      filelist.push('file ' + url.split('/').pop());
      return true;
    }
    return false
  })

  let folder = './_temp' + (Math.random() * 1000000 >> 0);
  try {
    fs.mkdirSync(folder);
  } catch (e) {
  }

  fs.writeFile(`${folder}/filelist.txt`, filelist.join('\n'), function () { });
  let promiseData = {};
  let i = 0;
  while (true) {
    let array = Object.values(promiseData);
    if (array.length >= 5) {
      let [err, data, id] = await Promise.race(array);
      console.log('完成' + id);
      delete promiseData[id];
    } else {
      let _path = html[i];
      let filePath = path.join(folder, _path.split('/').pop());
      let id = i;
      promiseData[id] = utils.download(pre + _path, filePath).then(function (res) {
        res[2] = id;
        return res
      })
      i++;
    }
    if (i >= html.length) {
      await Promise.all(array);
      break;
    }
  }

  try {
    execSync(`ffmpeg -f concat -i ${folder}/filelist.txt -c copy ${outputName}`);
  } catch (ex) {
    return ['导出失败']
  }
  utils.deleteall(folder)
  return [];
}
