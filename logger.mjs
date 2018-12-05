import winston from 'winston';

const format = winston.format;

export default winston.createLogger({
  level: 'info',
  format: format.combine(
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    format.align(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
