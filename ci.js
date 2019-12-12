const shell = require('shelljs');
(async function() {
  await shell.rm('-rf', './dist/');
  await shell.exec('yarn tsc');
  await shell.cp('./typings/index.d.ts', './dist/index.d.ts');
  await shell.cp('./package.json', './dist/package.json');
  await shell.cp('./yarn.lock', './dist/yarn.lock');
  await shell.cp('./README.md', './dist/README.md');
  await shell.cp('./app/util/shell.js', './dist/app/util/shell.js');
  await shell.cp('-R', './app/util/shell/', './dist/app/util/shell/');
})().catch(console.error);
