import chalk from 'chalk';
import prettyjson from 'prettyjson';
import cronParser from 'cron-parser';
import { privateMessage, errorMessage } from './JandiWebhook';

const log = console.log;
const now = () => log(chalk.dim(new Date()));

/**
 * 메시지를 콘솔에 출력
 * @param {any} message
 */
export default function print(message, ...restMessage) {
  log();
  log(chalk.cyan.bold('Message:'), chalk.cyan(message));
  restMessage.forEach(msg => {
    if (Array.isArray(msg)) {
      const [subject, ...rest] = msg;
      log('  -', chalk.yellow(`${subject}:`), ...rest);
    } else {
      log('  -', msg);
    }
  });
  now();
  log();
}

/**
 * Object/Array를 콘솔에 출력
 * @param {object|array} data
 */
export function printJSON(data) {
  log(prettyjson.render(data));
}

/**
 * Promise.catch를 출력
 * @param {string|Error} reason
 */
export function printCatch(reason) {
  if (typeof reason !== 'object') {
    print(reason);
    privateMessage(reason);
  } else {
    printError(reason);
    errorMessage(reason);
  }
}

/**
 * 에러를 화면에 출력
 * @export
 * @param {Error} err 에러 메시지
 */
export function printError(err) {
  log();
  if (err.stack) {
    log(chalk.red.bold('ERROR:'));
    log('  -', chalk.underline(`${err.name}:`), err.message);
    now();
    log();
    log(err.stack);
  } else {
    log(chalk.red.bold('ERROR:'));
    log(`   ${err}`);
    now();
  }
  log();
}

/**
 * 스케줄링이 되면 화면에 메시지를 출력
 * @export
 * @param {Date|string} rule
 * @param {string} message 메시지
 */
export function printScheduled(rule, message) {
  const date = (value => {
    if (typeof value === 'string') {
      return cronParser.parseExpression(value).next();
    }
    return value;
  })(rule);

  log();
  log(chalk.green.bold('Scheduled:'));
  log('  -', message);
  log('  -', chalk.yellow('Scheduled Time:'), chalk.underline(date));
  now();
  log();
}
