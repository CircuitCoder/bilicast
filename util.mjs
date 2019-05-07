import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const access = promisify(fs.access);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);

import xml2js from 'xml2js';

const parseXML = promisify(xml2js.parseString);

import SocksProxyAgent from 'socks-proxy-agent';
import HttpProxyAgent from 'http-proxy-agent';

import request from './request';

import logger from './logger';

const PASSPHRASE = process.env.PASSPHRASE;

export function getType(av) {
  if(av.indexOf('sm') === 0) return 'nico';
  return 'bili';
}

export function getProxy(type) {
  const setting = process.env[`${type}_proxy`.toUpperCase()];
  if(!setting) return null;
  const httpMatch = setting.match(/^http:\/\/([^:]+:\d+)$/);
  if(httpMatch) return { http: httpMatch[1] };
  const socksMatch = setting.match(/^socks5?:\/\/([^:]+:\d+)$/);
  if(socksMatch) return { socks: socksMatch[1] };

  throw new Error(`Unrecognized proxy setting: ${setting}`);
}

function getProxyAgent(type) {
  const proxy = getProxy(type);

  if(!proxy) return undefined;
  if(proxy.socks)
    return new SocksProxyAgent(`socks://${proxy.socks}`);
  if(proxy.http)
    return new HttpProxyAgent(`http://${proxy.http}`);

  return undefined;
}

async function getBiliDetail(av) {
  const match = av.match(/^av(\d+)$/);
  if(!match) throw new Error('Invalid AV format');

  const aid = match[1];
  const uri = `https://api.bilibili.com/x/web-interface/view/detail?aid=${aid}`;
  logger.debug(`Getting detail from ${uri}`);

  const json = await request({
    uri,
    agent: getProxyAgent('bili'),
    json: true,
  });

  if(json.code !== 0) throw new Error(`Invalid response code: ${json.code}`);

  return {
    thumb: json.data.View.pic,
    uploader: json.data.Card.card.name,
    category: json.data.View.tname,
  };
}

async function getNicoDetail(sm) {
  const uri = `https://ext.nicovideo.jp/api/getthumbinfo/${sm}`;
  logger.debug(`Getting detail from ${uri}`);

  const xml = await request({
    uri,
    agent: getProxyAgent('nico'),
  });

  const parsed = await parseXML(xml);
  logger.debug(parsed.nicovideo_thumb_response.thumb[0]);

  return {
    thumb: parsed.nicovideo_thumb_response.thumb[0].thumbnail_url[0],
    uploader: parsed.nicovideo_thumb_response.thumb[0].user_nickname[0],
    category: parsed.nicovideo_thumb_response.thumb[0].genre[0],
  };
}

export async function getDetail(av) {
  const type = getType(av);
  if(type === 'nico')
    return await getNicoDetail(av);
  return await getBiliDetail(av);
}

export function getUri(av) {
  const type = getType(av);
  if(type === 'nico')
    return `https://www.nicovideo.jp/watch/${av}`;
  return `https://bilibili.com/video/${av}`;
}

export function supportsPlaylist(av) {
  return getType(av) === 'bili';
}

function getYouGetProxy(type) {
  const proxy = getProxy(type);

  if(!proxy) return [];
  if(proxy.http) return ['-x', proxy.http];
  else if(proxy.socks) return ['-s', proxy.socks];
  return [];
}

export function getDesc(av) {
  const uri = getUri(av);
  logger.debug(`Getting desc from ${uri}`);

  let args = ['--json'];
  if(supportsPlaylist(av)) args.push('--playlist');
  args = args.concat(getYouGetProxy(getType(av)));

  const child = spawn('you-get', [...args, uri]);
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', data => {
    stdout += data;
  });

  child.stderr.on('data', data => {
    stderr += data;
  });

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      logger.debug(`Exit code: ${code}`);
      if(code !== 0) {
        logger.debug(`Stderr: ${stderr}`);
        logger.debug(`Stdout: ${stdout}`);
      }
      if(code === 0) {
        let groups =
          stdout
            .split('\n}')
            .filter(e => e.trim() !== '')
            .map(e => e + '\n}')
            .map(e => {
              const firstBracket = e.indexOf('{');
              if(firstBracket === -1) return null;
              return e.substr(firstBracket);
            })
            .filter(e => !!e)
            .map(JSON.parse);
        return resolve(groups);
      }
      else return reject(stderr);
    });
  });
}

export function downloadTo(url, format, path, av) {
  logger.debug(`Downloading ${url} @ ${format}`);
  logger.debug(`  => ${path}`);
  const child = spawn('tmux', ['-L', 'bilicast', 'new', '-d', '-s', path, `you-get ${getYouGetProxy(getType(av)).join(' ')} -o ${path} -O raw --no-caption --format=${format} --auto-rename "${url}" && touch ${path}/done || sleep 10; tmux wait-for -S ${path}`, ';', 'wait-for', path]);

  child.stdout.on('data', data => {
    logger.debug(data);
  });

  child.stderr.on('data', data => {
    logger.debug(`STDERR: ${data}`);
  });

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      logger.debug(`Exit code: ${code}`);
      if(code === 0) return access(`${path}/done`).then(resolve).catch(reject);
      else return reject();
    });
  });
}

export function convertMp4(base, suffix='flv') {
  logger.debug(`Converting ${base}/raw.${suffix} -> h264`);
  const child = spawn('ffmpeg', ['-y', '-i', `${base}/raw.${suffix}`, '-c', 'copy', `${base}/content.mp4`]);

  child.stdout.on('data', data => {
    logger.debug(data);
  });

  child.stdout.on('data', data => {
    logger.debug(`STDERR: ${data}`);
  });

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      logger.debug(`Exit code: ${code}`);
      if(code === 0) return resolve();
      else return reject();
    });
  });
}

export function convertM4a(base, suffix='flv') {
  logger.debug(`Converting ${base}/raw.${suffix}-> aac`);
  const child = spawn('ffmpeg', ['-y', '-i', `${base}/raw.${suffix}`, '-vn', '-c', 'copy', `${base}/content.m4a`]);

  child.stdout.on('data', data => {
    logger.debug(data);
  });

  child.stdout.on('data', data => {
    logger.debug(`STDERR: ${data}`);
  });

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      logger.debug(`Exit code: ${code}`);
      if(code === 0) return resolve();
      else return reject();
    });
  });
}

export async function rmRaw(base, suffix='flv') {
  logger.debug(`Removing ${base}/raw.${suffix}`);
  await unlink(`${base}/raw.${suffix}`);
}

export async function findSuffix(base) {
  const content = await readdir(base);
  for(const c of content) {
    const match = c.match(/^raw\.(mp4|flv)$/);
    if(match) return match[1];
  }

  throw new Error('Not finished');
}

export function auth(req) {
  if(!PASSPHRASE) return true;
  return req.header['authorization'] === `Bearer ${PASSPHRASE}`;
}

export async function authMiddleware(ctx, next) {
  if(auth(ctx.request)) return next();

  ctx.status = 403;
  ctx.body = "Authorization Failed";
}
