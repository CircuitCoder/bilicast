import util from 'util';

import winston from 'winston';

const format = winston.format;

function formatMsg(msg) {
  if(typeof msg === 'string') return msg;
  else return '\n' + util.inspect(msg);
}

export default winston.createLogger({
  level: 'info',
  format: format.combine(
    format(info => {
      info.message = formatMsg(info.message);
      return info;
    })(),
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    format.align(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
  ],
});
