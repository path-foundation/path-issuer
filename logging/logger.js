/* eslint no-param-reassign: off */
const winston = require('winston');
require('winston-daily-rotate-file');

const createWinstonLogger = (folder) => winston.createLogger({
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true,
        }),
        new winston.transports.DailyRotateFile({
            filename: folder ? `${folder}/%DATE%.process.log` : '.',
            datePattern: 'YYYY-MM-DD',
            prepend: true,
            createTree: true,
            level: 'debug',
            handleExceptions: true,
        }),
    ],
});

const createLogger = (logFolder) => {
    const folder = logFolder || './';
    const logger = createWinstonLogger(folder);

    // logger.rewriters.push((level, msg, meta) => {
    //     if (meta) {
    //         meta.hostAddress = ip.address();
    //     }

    //     return meta;
    // });

    logger.info(`Logging to ${folder}`);

    return logger;
};

module.exports = createLogger;
