const fetch = require("node-fetch");
const fs = require("fs");
const url = require('url');
const utils = require('./utils');
const path = require('path')
const ffmpeg = require('fluent-ffmpeg');

module.exports = async function(m3u8Url, outputName) {
    let thisUrl = url.parse(m3u8Url);
    let html = await fetch(thisUrl.href).then((res) => {
        return res.text()
    });
    let pre = thisUrl.protocol + '//' + thisUrl.host;
    let filelist = []

    html = html.split('\n').filter(function(url) {
        if (/\.ts$/.test(url)) {
            filelist.push(url.split('/').pop());
            return true;
        }
        return false
    })

    let folder = './__temp' + (Math.random() * 1000000 >> 0);
    try {
        fs.mkdirSync(folder);
    } catch (e) {}

    let promiseData = {};
    let i = 0;
    while (true) {
        let array = Object.values(promiseData);
        if (array.length >= 10) {
            let [err, data, id] = await Promise.race(array);
            console.log('完成' + id);
            delete promiseData[id];
        } else {
            let _path = html[i];
            let filePath = path.join(folder, _path.split('/').pop());
            let id = i;
            promiseData[id] = utils.download(pre + _path, filePath).then(function(res) {
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

    new Promise(function(r) {
        // 运行cmd效率比较高
        let command = ffmpeg();
        for (let key of filelist) {
            command.input(`${folder}/${key}`);
        }
        command.on('end', function(e) {
            console.log(e, 'end')
            r([])
        }).on('error', function(err) {
            r([err])
        })
        command.mergeToFile(outputName, folder);
    }).then(function() {
        utils.deleteall(folder)
    });
    return [];
}