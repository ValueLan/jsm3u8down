const fetch = require("node-fetch");
const fs = require("fs");
const url = require('url');
const path = require('path')
const execSync = require('child_process').execSync;
const utils = require('./utils');
const progress = require('./utils/progress');

module.exports = async function (m3u8Url, outputName) {
  let thisUrl = url.parse(m3u8Url);
  let html = await fetch(thisUrl.href).then((res) => {
    return res.text()
  });
  let pre = thisUrl.protocol + '//' + thisUrl.host;
  let filelist = []

  html = html.split('\n').filter(function (url) {
    if (/\.ts$/.test(url)) {
      filelist.push(url.split('/').pop());
      return true;
    }
    return false
  })

  let folder = './__temp' + (Math.random() * 1000000 >> 0);
  await utils.createFolder(folder);

  let pg = progress()
  let promiseData = {};
  let i = 0;
  let success = 0;
  while (true) {
    let array = Object.values(promiseData);
    if (array.length >= 10) {
      let [err, data, id] = await Promise.race(array);
      if (err) {
        // 失败可以重新处理
        console.log('下载失败', data, id)
      }
      pg.render({ completed: ++success, total: (html.length - 1) })
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
      for await (let [err, data, id] of utils.getYield(array)) {
        if (err) {
          console.log('下载失败', data, id)
        }
        pg.render({ completed: ++success, total: (html.length - 1) })
      }
      break;
    }
  }

  return new Promise(async function (r) {
    try {
      let arr = []
      for (let key of filelist) {
        arr.push(`file ${key}`);
      }
      await utils.createFolder(path.dirname(outputName));
      fs.writeFileSync(`${folder}/filelist.txt`, arr.join('\n'));
      execSync(`ffmpeg -f concat -safe 0 -i ${folder}/filelist.txt -c copy "${outputName}"`);
      r([]);
    } catch (e) {
      r([e])
    }
  }).then(function ([e, data]) {
    if (e) {
      console.log(e)
    }
    utils.deleteall(folder)
    return [e, data]
  });
}