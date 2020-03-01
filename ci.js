const shell = require('shelljs');
shell.rm('-rf', './dist/');
shell.exec('yarn tsc');
shell.cp('./typings/index.d.ts', './dist/index.d.ts');
shell.cp('./package.json', './dist/package.json');
shell.cp('./yarn.lock', './dist/yarn.lock');
shell.cp('./README.md', './dist/README.md');
shell.cp('./app/util/shell.js', './dist/app/util/shell.js');
shell.cp('-R', './app/util/shell/', './dist/app/util/shell/');
