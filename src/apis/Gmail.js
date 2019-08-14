import _ from 'lodash';
import promisify from 'es6-promisify';
import google from 'googleapis';
import print from '../utils/print';

require('dotenv').config({ silent: true });

const GMAIL_LABEL_ID = process.env.GMAIL_LABEL_ID;
const gmail = google.gmail('v1');

const STARRED_LABEL = 'STARRED';

/**
 * 이메일 목록을 체크
 * @export
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 * @returns {Promise}
 */
export function CheckEmail(auth) {
  return messagesList(auth)
    .then(res => checkNewLabelMessages(res))
    .then(messageIds => checkNewMessages(messageIds, auth))
    .then(value => _.flatten(value));
}

/**
 * 메시지 목록
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 * @returns {Promise}
 */
function messagesList(auth) {
  return promisify(gmail.users.messages.list)({
    auth,
    userId: 'me',
    labelIds: [GMAIL_LABEL_ID, STARRED_LABEL]
  });
}

/**
 * 해당 라벨에 새 메일이 있는지 체크
 * @param {any} value 목록을 체크한 후 결과 값
 * @returns {array}
 */
function checkNewLabelMessages(value) {
  if (!value.resultSizeEstimate) {
    throw '메시지가 없습니다.';
  }
  return value.messages.map(message => message.id);
}

/**
 * 새 메일을 찾으면 첨부파일을 반환
 * @param {array} messageIds 메시지 ID
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 * @returns {Promise}
 */
function checkNewMessages(messageIds, auth) {
  const messages = messageIds.map(messageId => (

    // 메시지에서 별표 라벨을 제거
    removeMessagesStarredLabel(messageId, auth)

      // 메시지를 호출
      .then(() => getMessageAttachments(messageId, auth))
  ));
  return Promise.all(messages);
}

/**
 * 메시지에서 첨부파일만 따로 반환
 * @param {String} messageId 메시지 ID
 * @param {Object} auth Google API OAuth 인증정보
 */
function getMessageAttachments(messageId, auth) {
  // 메시지를 호출
  return promisify(gmail.users.messages.get)({
    auth,
    userId: 'me',
    id: messageId
  })

  // 메일 확인
  .then(message => {
    print(
      '메시지를 발견 했습니다.',
      ['Message ID', message.id],
      ['Subject', getMessageHeader(message, 'Subject')],
      ['From', getMessageHeader(message, 'From')],
      ['Date', getMessageHeader(message, 'Date')]
    );

    // 첨부파일
    const attaches = getAttachments(message, auth);
    return Promise.all(attaches);
  });
}

/**
 * 메시지에서 첨부파일만 따로 반환
 * @param {object} message 메시지 데이터
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 */
function getAttachments(message, auth) {
  const parts = message.payload.parts;
  return parts.map(part => {
    if (part.filename && part.filename.length > 0) {
      const attachId = part.body.attachmentId;
      return promisify(gmail.users.messages.attachments.get)({
        auth,
        userId: 'me',
        id: attachId,
        messageId: message.id
      })
      .then(res => ({
        filename: part.filename,
        ...res
      }))
      .then(data => {
        if (data && data.filename && /\.pdf$/i.test(data.filename) && !/영문/.test(data.filename)) {
          print(
            '첨부파일을 발견 했습니다.',
            ['Attachment ID', attachId],
            ['FileName', data.filename]
          );

          return data;
        }
        return null;
      });
    }
    return null;
  })
  .filter(o => !!o);
}

/**
 * 메시지에서 별표 표시를 제거
 * @param {string} messageId 메시지 ID
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 */
function removeMessagesStarredLabel(messageId, auth) {
  const MESSAGE_API = process.env.NODE_ENV === 'development' ?
                      gmail.users.messages.get :
                      gmail.users.messages.modify;
  return promisify(MESSAGE_API)({
    auth,
    userId: 'me',
    id: messageId,
    resource: {
      removeLabelIds: [STARRED_LABEL]
    }
  })
  .then(message => {
    print(
      `메시지의 "${STARRED_LABEL}" Label을 제거하였습니다.`,
      ['Message ID', message.id]
    );
    return message;
  });
}

/**
 * 메시지 내용에서 특정 헤더를 가져옴
 * @param {object} message 메시지
 */
function getMessageHeader(message, headerName = 'Subject') {
  const headers = _.get(message, 'payload.headers');
  return _.get(_.find(headers, ['name', headerName]), 'value');
}
