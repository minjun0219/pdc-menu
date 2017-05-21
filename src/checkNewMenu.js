import schedule from 'node-schedule';
import PDFParser from './utils/PDFParser';
import GoogleAPIs from './apis/GoogleAPIs';
import { CheckEmail } from './apis/Gmail';
import { InsertEvents } from './apis/GoogleCalendar';
import { printScheduled, printCatch } from './utils/print';

// start
checkNewMenu();

/**
 * Gmail에서 새로운 메일을 읽어서 새로운 이메일에 첨부파일이 있다면
 * 첨부파일에서 메뉴를 파싱해서 구글 캘린더에 이벤트를 등록
 */
function checkNewMenu() {
  GoogleAPIs()
    .then(auth => (
      // 새 이메일이 있으면 첨부파일을 가져온다.
      CheckEmail(auth)

        // 첨부파일로 PDF를 파싱함
        .then(value => PDFParser(value))

        // 구글 캘린더에 등록
        .then(value => InsertEvents(value, auth))
    ))
    .then(() => {
      // 성공하면 다음주 금요일에 다시 확인
      checkNewMenuNextWeek();
    })
    .catch(err => {
      printCatch(err);

      // 다시 확인
      checkNewMenuRetry();
    });
}

/**
 * 메일이 아직 없다면 다시 체크를 위해 스케줄 등록
 */
function checkNewMenuNextWeek() {
  const rule = '0 0 16 * * 5';
  printScheduled(rule, '차주 메뉴 확인');
  schedule.scheduleJob(rule, () => checkNewMenu());
}

/**
 * 메일이 아직 없다면 다시 체크를 위해 스케줄 등록
 */
function checkNewMenuRetry() {
  const rule = '0 0 */6 * * *';
  printScheduled(rule, '메일이 도착했는지 다시 확인');
  schedule.scheduleJob(rule, () => checkNewMenu());
}
