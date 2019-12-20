const output = require('./output')
const arr = require('./m3u8list.json');
(async function () {
  for (let i = 0; i < arr.length; i++) {
    let [name, url] = arr[i].split('$');
    await output(url, './啊1你好xas/as/wqr/w1/412/421//' + name + '.mp4');
  }
})();