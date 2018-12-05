import { spawn } from 'child_process';

import logger from './logger';

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
