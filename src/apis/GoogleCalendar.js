import chalk from 'chalk';
import google from 'googleapis';
import promisify from 'es6-promisify';
import moment from 'moment';
import 'moment/locale/ko';

import print from '../utils/print';

require('dotenv').config({ silent: true });

const TIMEZONE = 'Asia/Seoul';
const CALENDAR_ID = process.env.CALENDAR_ID;

moment().locale('ko-KR');
const calendar = google.calendar('v3');

/**
 * 메뉴를 이벤트로 등록
 * @export
 * @param {array} menu 등록될 메뉴 목록
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 * @returns {Promise}
 */
export function InsertEvents(menu, auth) {
  const list = convertEvents(menu);
  console.log();
  console.log(chalk.cyan.bold('이벤트 등록:'));
  return Promise.all(list.map(event => insertMenuEvent(auth, event)))
    .then(() => console.log())
    .then(() => print(`이벤트를 ${chalk.cyan.bold(list.length)}건 생성하였습니다.`));
}

/**
 * 다음 이벤트를 가져온다
 * @export
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 * @param {string} endTime 마지막 이벤트 종료시간
 * @returns {Promise}
 */
export function NextEvent(auth, endTime) {
  return nextEvents(auth, endTime);
}

/**
 * 개별 메뉴를 이벤트로 등록
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 * @param {any} eventData Google Calendar 데이터
 * @returns {Promise}
 */
function insertMenuEvent(auth, eventData) {
  return promisify(calendar.events.insert)({
    auth,
    calendarId: CALENDAR_ID,
    resource: eventData
  })
  .then(event => console.log('  - [%s] %s', event.id, event.summary))
  .catch(err => {
    throw new Error(`There was an error contacting the Calendar service: ${err}`);
  });
}

/**
 * 메뉴 목록을 Google Calendar 데이터로 변환
 * @param {array} menu 메뉴 목록
 * @returns {array}
 */
function convertEvents(menu) {
  const list = [];

  // 날짜별
  menu.forEach(({ meal }) => {
    // 끼니
    meal.forEach(item => {
      const main = [];
      const description = item.corner.map(o => {
        if (/^중/.test(item.name) && o.name && /^코너/.test(o.name)) {
          main.push(o.menu[0]);
        }
        return [o.name].concat(o.menu.map(m => ` - ${m}`)).join('\n');
      });

      // 식사시간 추가
      // description.splice(0, 0, `식사시간\n - ${mealTime(item.startTime, item.endTime)}`);

      // 중식 제목에 메인메뉴 표시
      let summary = item.name;
      if (main.length) {
        summary = `${item.name}: ${main.join(' or ')}`;
      }

      // 목록에 추가
      list.push({
        summary,
        description: description.join('\n\n'),
        start: setDate(item.startTime),
        end: setDate(item.endTime)
      });
    });
  });

  return list;
}

/**
 * 다음 이벤트를 1건 호출
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 * @param {string} endTime 마지막 이벤트 종료시간
 * @returns {Promise}
 */
function nextEvents(auth, endTime) {
  return promisify(calendar.events.list)({
    auth,
    calendarId: CALENDAR_ID,
    timeMin: endTime || (new Date()).toISOString(),
    maxResults: 3,
    singleEvents: true,
    orderBy: 'startTime'
  })
  .then(response => {
    const events = response.items;
    if (!events.length) {
      throw Error('No upcoming events found.');
    }
    return events;
  });
}

/**
 * Event에 등록 될 날짜 형식으로 변환
 * @param {Date} date 날짜
 */
function setDate(date) {
  return {
    dateTime: date.toISOString(),
    timeZone: TIMEZONE
  };
}

/**
 * Webhook 으로 보낼 식사시간을 String으로 만듬
 * @param {Date} startTime 시작 시간
 * @param {Date} endTime 종료 시간
 * @returns {string}
 */
function mealTime(startTime, endTime) {
  const start = moment(startTime).format('LT');
  const end = moment(endTime).format('LT');
  return `${start} ~ ${end}`;
}
