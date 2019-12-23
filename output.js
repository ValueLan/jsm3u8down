const fetch = require("node-fetch");
const fs = require("fs");
const url = require('url');
const path = require('path')
const execSync = require('child_process').execSync;
const utils = require('./utils');
const progress = require('./utils/progress');

async function downList(downArray = [], folder = './') {
  let pg = progress()
  let promiseData = {};
  let index = 0;
  let failList = [];
  let renderData = { success: 0, completed: 0, fail: 0, total: downArray.length };

  while (true) {
    let array = Object.values(promiseData);
    if (array.length >= 10) {
      let [err, _path, id] = await Promise.race(array);
      if (err) {
        failList.push(_path)
        renderData.fail++;
      } else {
        renderData.success++
      }
      renderData.completed++;
      pg.render({ completed: renderData.completed, total: renderData.total })
      delete promiseData[id];
    } else {
      let _path = downArray[index];
      let id = index;
      promiseData[id] = utils.download(_path, path.join(folder, _path.split('/').pop())).then(function ([err]) {
        return [err, _path, id]
      })
      array.push(promiseData[id]);
      index++;
    }

    if (index >= downArray.length) {
      for await (let [err, _path] of utils.getYield(array)) {
        if (err) {
          failList.push(_path);
          renderData.fail++;
        } else {
          renderData.success++
        }
        renderData.completed++;
        pg.render({ completed: renderData.completed, total: renderData.total })
      }
      break;
    }
  }
  return [, {
    failList,
    renderData
  }]
}

module.exports = async function (m3u8Url, outputName) {
  let thisUrl = url.parse(m3u8Url);
  let resContent = await fetch(thisUrl.href, {
    timeout: 60000
  }).then((res) => {
    return res.text()
  });

  let pre = thisUrl.protocol + '//' + thisUrl.host;
  let folder = `./.temp__${Math.random() * 10000 >> 0}__${+new Date()}__`;
  let filelist = []
  let downArray = [];

  resContent.split('\n').map(function (url) {
    if (/\.ts$/.test(url)) {
      filelist.push(`file ${url.split('/').pop()}`);
      downArray.push(pre + url);
    }
  })

  let failCount = 0;
  while (true) {
    [, { failList }] = await downList(downArray, folder);
    if (failList.length == 0) {
      // Download all break
      break;
    }

    if (failCount++ > 10) {
      // Fail count 10 break
      console.log(`\n faillist \n${failList.join('\n')}`)
      break;
    }
    downArray = failList;
    await utils.sleep(1000);
  }

  return new Promise(async function (r) {
    try {
      await utils.createFolder(path.dirname(outputName));
      fs.writeFileSync(`${folder}/filelist.txt`, filelist.join('\n'));
      execSync(`./plugins/ffmpeg -f concat -safe 0 -i ${folder}/filelist.txt -c copy "${outputName}"`);
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