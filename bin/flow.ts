import Fastify from 'fastify';
import {join, sep} from 'path';
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync} from 'fs';
import * as Mustache from 'mustache';
import launch = require('launch-editor');
const baseDir = join(__dirname, '..', '..', '..', 'app');
const html = readFileSync(join(__dirname, 'flow.html'), {encoding: 'utf-8'});

const mdDir = (dir: string) => {
  const dirs = dir.split(sep);
  let temp: string | undefined;
  for (const oneDir of dirs) {
    if (temp) {
      temp = join(temp, oneDir);
    } else {
      temp = oneDir;
    }
    if (!existsSync(temp)) {
      mkdirSync(temp);
    }
  }
};

export const flow = (port = 4000) => {
  const server = Fastify({logger: false});
  if (existsSync(join(baseDir, 'flow'))) {
    const flowCodes = readdirSync(join(baseDir, 'flow'));
    for (const code of flowCodes) {
      console.log(`http://127.0.0.1:${ port }/flow?code=${ code }`);
    }
  }
  server.register(require("fastify-static"), {
    root: join(__dirname, 'flow-public'),
    prefix: '/public/'
  });
  server.register(require('fastify-formbody'));
  server.get<{
    Querystring: {code: string}
  }>('/flow', async (request, reply) => {
    const code = request.query.code;
    if (code) {
      const dataPath = join(baseDir, 'flow', code, 'data.json');
      let data: string | undefined;
      if (existsSync(dataPath)) {
        data = readFileSync(dataPath, {encoding: 'utf-8'});
      } else {
        data = `{ fields: [], specils: [], areas: {}, lines: {}, nodes: {} }`;
      }
      const result = Mustache.render(html, {data, code});
      reply
        .code(200)
        .header('Content-Type', 'text/html; charset=UTF-8')
        .send(result);
    } else {
      reply.code(404).send('no code!');
    }
  });

  server.get<{
    Querystring: {code: string, node: string, type: string}
  }>('/open', async (request, reply) => {
    const {code, node, type} = request.query;
    if (code) {
      const nodeFile = join(baseDir, 'flow', code, `${ node }.ts`);
      if (!existsSync(nodeFile)) {
        mdDir(join(baseDir, 'flow', code));
        writeFileSync(nodeFile, `/* eslint-disable @typescript-eslint/require-await */
import {${type }} from 'egg-bag';
export default class extends ${type }<?, ?>{
}`);
      }
      launch(nodeFile, 'code');
      reply.code(200).send(1);
    } else {
      reply.code(404).send(`${ code }/${ node }.ts`);
    }
  });

  server.post<{
    Querystring: {code: string}
    Body: {content: string}
  }>('/save', async (request, reply) => {
    const code = request.query.code;
    const content = request.body.content;
    if (code) {
      const dataPath = join(baseDir, 'flow', code, 'data.json');
      if (!existsSync(dataPath)) {
        mdDir(join(baseDir, 'flow', code));
      }
      writeFileSync(dataPath, content, {encoding: 'utf-8'});
      reply.code(200).send(1);
    } else {
      reply.code(404).send(code);
    }
  });

  server.listen(port, (err, address) => {
    if (err) {
      console.error(err)
      process.exit(0)
    }
    console.log(`Server listening at ${ address }`)
  })
}