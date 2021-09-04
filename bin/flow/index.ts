#!/usr/bin/env node
import Fastify from 'fastify';
import {join, sep} from 'path';
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync} from 'fs';
import * as Mustache from 'mustache';
import launch = require('launch-editor');
const baseDir = join(__dirname, '..', '..', '..', '..', 'app');
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

const flow = async (port: number) => {
  const server = Fastify({logger: false});
  if (existsSync(join(baseDir, 'flow'))) {
    const flowCodes = readdirSync(join(baseDir, 'flow'));
    for (const code of flowCodes) {
      console.log(`http://127.0.0.1:${ port }/flow?code=${ code }`);
    }
  }
  await server.register(require("fastify-static"), {
    root: join(__dirname, 'public'),
    prefix: '/public/'
  });
  await server.register(require('fastify-formbody'));
  server.get<{
    Querystring: {code: string}
  }>('/flow', (request, reply) => {
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
      void reply
        .code(200)
        .header('Content-Type', 'text/html; charset=UTF-8')
        .send(result);
    } else {
      void reply.code(404).send('no code!');
    }
  });

  server.get<{
    Querystring: {code: string, node: string, type: string}
  }>('/open', (request, reply) => {
    const {code, node, type} = request.query;
    if (code) {
      const nodeFile = join(baseDir, 'flow', code, `${ node }.ts`);
      if (!existsSync(nodeFile)) {
        mdDir(join(baseDir, 'flow', code));
        writeFileSync(nodeFile, `/* eslint-disable @typescript-eslint/require-await */
import {${ type }} from 'egg-bag';
import {Request, Response, Context} from '.';
export default class extends ${ type }<Request, Response, Context, ?>{
}`);
      }
      launch(nodeFile, 'code');
      void reply.code(200).send(1);
    } else {
      void reply.code(404).send(`${ code }/${ node }.ts`);
    }
  });

  server.post<{
    Querystring: {code: string}
    Body: {content: string}
  }>('/save', (request, reply) => {
    const code = request.query.code;
    const content = request.body.content;
    if (code) {
      const dataPath = join(baseDir, 'flow', code, 'data.json');
      if (!existsSync(dataPath)) {
        mdDir(join(baseDir, 'flow', code));
      }
      writeFileSync(dataPath, content, {encoding: 'utf-8'});
      void reply.code(200).send(1);
    } else {
      void reply.code(404).send(code);
    }
  });

  server.listen(port, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(0);
    }
    console.log(`Server listening at ${ address }`);
  });
};
const portStr = process.argv[2] || '4000';
if (portStr) {
  flow(parseInt(portStr, 10)).then(() => console.log('ready')).catch(err => console.error(err));
}