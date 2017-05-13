import schedule from 'node-schedule';
import PDFParser from './PDFParser';
import GoogleAPIs from '../apis/GoogleAPIs';
import { CheckEmail } from '../apis/Gmail';
import { NextEvent, InsertEvents } from '../apis/GoogleCalendar';
import Webhook from './JandiWebhook';
import { printScheduled, printCatch } from './print';

/**
 * 메일에서 새로운 메뉴가 도착했는지 확인해서 이벤트에 등록
 * @export default
 */
export default function checkNewMenu() {
  GoogleAPIs()
    .then(auth => checkNewMessages(auth))
    .then(() => checkNextEvent())
    .catch(err => {
      printCatch(err);

      // 내일 다시 체크
      checkNewMenuRetry();
    });
}

/**
 * 메일이 아직 없다면 다시 체크를 위해 스케줄 등록
 */
function checkNewMenuRetry() {
  const rule = '0 0 */6 * * *';
  printScheduled(rule, '메일이 도착했는지 다시 확인');
  schedule.scheduleJob(rule, () => checkNewMenu());
}

/**
 * 다음 이벤트를 확인해서 1건을 가져옴
 * 이벤트가 있으면 해당 이벤트를 스케줄 등록 하고 메시지를 보냄
 * 종료시간 Parameter가 있다면 해당 시간 이후로 체크
 * @export
 * @param {string} [endTime] 이전 이벤트 종료 시간
 */
export function checkNextEvent(endTime) {
  GoogleAPIs()
    .then(auth => NextEvent(auth, endTime))
    .then(event => sendMenu(event))
    .catch(err => {
      printCatch(err);

      // 다음 일정이 없으면 다시 메일 체크
      checkNewMenu();
    });
}

/**
 * Gmail에서 새로운 메일을 읽어서 새로운 이메일에 첨부파일이 있다면
 * 첨부파일에서 메뉴를 파싱해서 구글 캘린더에 이벤트를 등록
 * @export
 * @param {object} auth Google API OAuth2 인증정보
 */
export function checkNewMessages(auth) {
  // 새 이메일이 있으면 첨부파일을 가져온다.
  return CheckEmail(auth)

    // 첨부파일로 PDF를 파싱함
    .then(value => PDFParser(value))

    // 구글 캘린더에 등록
    .then(value => InsertEvents(value, auth));
}

/**
 * Google Calendar의 데이터를 Webhook 으로 Jandi에 전송
 * @export
 * @param {object} event Google Calendar 데이터
 * @returns {schedule}
 */
function sendMenu(event) {
  const summary = event.summary;
  const description = JSON.parse(event.description);
  const startTime = new Date(event.start.dateTime);
  const message = customMessages(event.description);

  // 해당 시간에 맞춰서 메시지를 보내기 위해 스케줄 등록
  printScheduled(startTime, `JANDI로 메시지 발송 (${message || summary})`);
  return schedule.scheduleJob(startTime, () => {
    Webhook(message || summary, description)
      .then(() => {
        checkNextEvent(event.end.dateTime);
      });
  });
}

/**
 * 특정 단어에 따라 커스텀 메시지 셋팅
 * @param {string} description JSON String
 */
function customMessages(description) {
  const match = description.match(/고기|돈가스|라면/);
  if (match && match[0]) {
    switch (match[0]) {
      default: break;
      case '고기':
        return '고기반찬!!!';
      case '돈가스':
        return '돈가스가 나왔어요.';
      case '라면':
        return '라면이 땡기는 날?!';
    }
  }
  return null;
}
