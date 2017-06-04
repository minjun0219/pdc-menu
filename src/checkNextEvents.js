import _ from 'lodash';
import moment from 'moment';
import schedule from 'node-schedule';
import GoogleAPIs from './apis/GoogleAPIs';
import { NextEvent } from './apis/GoogleCalendar';
import Webhook from './utils/JandiWebhook';
import print, { printScheduled, printCatch } from './utils/print';

// start
function checkNextEvent() {
  GoogleAPIs()
    .then(auth => NextEvent(auth))
    .then(events => events[0])
    .then(event => _.get(event, 'start.dateTime'))
    .then(date => scheduleNextEvents(date))
    .catch(err => {
      printCatch(err);

      // 오류 후 다시 체크
      scheduleAfterAnHour();
    });
}
checkNextEvent();

// 한시간 뒤에 일정을 다시 체크
// 오류가 나면 대책이 없어서 한시간 마다 체크
function scheduleAfterAnHour() {
  const date = new Date(Date.now() + (60 * 60 * 1000));
  printScheduled(date, '1시간 뒤에 일정을 다시 체크');
  return schedule.scheduleJob(date, () => {
    checkNextEvents(date.toISOString());
  });
}

// 다음 발송을 예약
function scheduleNextEvents(date) {
  const startTime = new Date(date);
  startTime.setHours(12);
  startTime.setMinutes(30);
  printScheduled(startTime, '다음 메뉴 3건을 가져온다.');
  return schedule.scheduleJob(startTime, () => {
    checkNextEvents(startTime.toISOString());
  });
}

/**
 * 다음 이벤트를 확인해서 3건을 가져옴
 * 이벤트가 있으면 해당 이벤트를 스케줄 등록 하고 메시지를 보냄
 * 종료시간 Parameter가 있다면 해당 시간 이후로 체크
 * @param {string} [endTime] 이전 이벤트 종료 시간
 */
function checkNextEvents(endTime) {
  GoogleAPIs()
    .then(auth => NextEvent(auth, endTime))
    .then(events => createJandiMessage(events))
    .then(data => sendMessage(data))
    .then(date => scheduleNextEvents(date))
    .catch(err => {
      printCatch(err);

      // 다음 일정이 없으면 다시 체크
      scheduleAfterAnHour();
    });
}

/**
 * 특정 단어에 따라 커스텀 메시지 셋팅
 * @param {string} description JSON String
 */
function createJandiMessage(events) {
  const current = moment(_.chain(events).first().get('start.dateTime').value());
  const message = _.chain(events).first().get('summary').value();
  const endTime = _.chain(events).last().get('end.dateTime').value();
  const description = events.map(event => {
    let title = event.summary.match(/^((조|중|석)식)/)[1];
    if (title === '조식') {
      let date = moment(_.get(event, 'start.dateTime'));
      if (current.diff(date, 'days')) {
        // 하루이상 차이나면 날짜로
        date = date.format('M/DD');
      } else {
        date = '내일';
      }
      title = `${date} ${title}`;
    }
    return {
      title,
      description: event.description
    };
  });
  print(
    '잔디 메시지를 생성합니다.',
    ['제목', message]
  );
  return { message, description, endTime };
}

/**
 * Google Calendar의 데이터를 Webhook 으로 Jandi에 전송
 * @param {object} data 잔디 메시지
 */
function sendMessage({ message, description, endTime }) {
  return Webhook(message, description).then(() => endTime);
}
