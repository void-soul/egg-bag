#!/usr/bin/env node
import * as cli from './bin/index';

const command = process.argv[2];
if (cli[command]) {
  cli[command](...process.argv.slice(3));
  console.log('finished!');
} else {
  console.error(`可用命令有${ Object.keys(cli) }`);
}

