import _ from 'lodash';
import moment from 'moment';
import GoogleAPIs from './apis/GoogleAPIs';
import { NextEvent } from './apis/GoogleCalendar';
import Webhook from './utils/JandiWebhook';
import print, { printCatch } from './utils/print';
import setupSentry from './setupSentry';

require('dotenv').config({ silent: true });

setupSentry();

/**
 * 다음 이벤트를 확인해서 3건을 가져옴
 * 이벤트가 있으면 해당 이벤트를 스케줄 등록 하고 메시지를 보냄
 * 종료시간 Parameter가 있다면 해당 시간 이후로 체크
 */
function checkNextEvents() {
  GoogleAPIs()
    .then(auth => NextEvent(auth))
    .then(events => createJandiMessage(events))
    .then(data => sendMessage(data))
    .catch(err => printCatch(err));
}

/**
 * 특정 단어에 따라 커스텀 메시지 셋팅
 * @param {string} description JSON String
 */
function createJandiMessage(events) {
  const current = moment(_.chain(events).first().get('start.dateTime').value());
  const message = [_.chain(events).first().get('summary').value()];
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
  return { message: message.join('\n'), description, endTime };
}

/**
 * Google Calendar의 데이터를 Webhook 으로 Jandi에 전송
 * @param {object} data 잔디 메시지
 */
function sendMessage({ message, description, endTime }) {
  return Webhook(message, description).then(() => endTime);
}

// start
try {
  checkNextEvents();
} catch (err) {
  console.error(err);
}
