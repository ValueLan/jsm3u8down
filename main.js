const output = require('./output')

async function loadAll() {
  let start = +new Date();
  await output('https://cn6.7639616.com/hls/20191206/c8235c87fababd1f293f8ccc09fdf810/1575632831/index.m3u8', '第01集.mp4');
  console.log('用时' + (+new Date - start) / 1000 + '秒');
}

loadAll();