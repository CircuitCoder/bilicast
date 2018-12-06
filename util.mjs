import { spawn } from 'child_process';

import request from 'request-promise-native';

import logger from './logger';

export async function getDetail(av) {
  const match = av.match(/^av(\d+)$/);
  if(!match) throw new Error('Invalid AV format');

  const aid = match[1];
  const uri = `https://api.bilibili.com/x/web-interface/view/detail?aid=${aid}`;
  logger.debug(`Getting detail from ${uri}`);

  const json = await request({
    uri,
    json: true,
  });

  if(json.code !== 0) throw new Error(`Invalid response code: ${json.code}`);
  return json.data;
}

export function getDesc(av) {
  const uri = `https://bilibili.com/video/${av}`;
  logger.debug(`Getting desc from ${uri}`);
  const child = spawn('you-get', ['--json', uri]);
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', data => {
    stdout += data;
  });

  child.stdout.on('data', data => {
    stderr += data;
  });

  return new Promise((resolve, reject) => {
    child.on('close', code => {
      logger.debug(`Exit code: ${code}`);
      if(code !== 0) {
        logger.debug(`Stderr: ${stderr}`);
        logger.debug(`Stdout: ${stdout}`);
      }
      if(code === 0) return resolve(JSON.parse(stdout));
      else return reject(stderr);
    });
  });
}

export function downloadTo(url, format, path) {
  logger.debug(`Downloading ${url} @ ${format}`);
  logger.debug(`  => ${path}`);
  const child = spawn('you-get', ['-o', path, '-O', 'raw', '--no-caption', `--format=${format}`, '--auto-rename', url]);

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

export function convertMp4(base) {
  logger.debug(`Converting ${base}/raw.flv -> h264`);
  const child = spawn('ffmpeg', ['-y', '-i', `${base}/raw.flv`, '-c', 'copy', `${base}/content.mp4`]);

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

export function convertM4a(base) {
  logger.debug(`Converting ${base}/raw.flv -> aac`);
  const child = spawn('ffmpeg', ['-y', '-i', `${base}/raw.flv`, '-vn', '-c', 'copy', `${base}/content.m4a`]);

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
