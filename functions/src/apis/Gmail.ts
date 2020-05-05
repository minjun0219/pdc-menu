import get from 'lodash/get';
import find from 'lodash/find';
import flatten from 'lodash/flatten';
import { google, gmail_v1 } from 'googleapis';
import print from '../utils/print';
import { OAuth2Client } from 'google-auth-library';

require('dotenv').config({ silent: true });

const GMAIL_LABEL_ID = process.env.GOOGLE_PDC_MENU_GMAIL_LABEL_ID;
const gmail = google.gmail('v1');

const STARRED_LABEL = 'STARRED';

export interface Attachments extends gmail_v1.Schema$MessagePartBody {
  filename: string;
}

/**
 * 이메일 목록을 체크
 */
export async function checkEmail(auth: OAuth2Client) {
  const list = await messagesList(auth);
  const messageIds = checkNewLabelMessages(list);
  const value = await checkNewMessages(messageIds, auth);
  return flatten(value);
}

/**
 * 메시지 목록
 */
async function messagesList(auth: OAuth2Client) {
  const labelIds = [
    GMAIL_LABEL_ID,
    STARRED_LABEL
  ].filter(Boolean) as string[];
  const { data } = await gmail.users.messages.list({
    auth,
    userId: 'me',
    labelIds,
  });
  return data;
}

/**
 * 해당 라벨에 새 메일이 있는지 체크
 * @param value 목록을 체크한 후 결과 값
 */
function checkNewLabelMessages(value: gmail_v1.Schema$ListMessagesResponse) {
  if (!value.resultSizeEstimate || !value.messages) {
    throw new Error('메시지가 없습니다.');
  }
  
  const messageIds = value.messages.map(message => message.id) as string[];
  if (!messageIds.length) {
    throw new Error('메시지가 없습니다.');
  }

  return messageIds;
}

/**
 * 새 메일을 찾으면 첨부파일을 반환
 * @param messageIds 메시지 ID
 * @param auth Google APIs OAuth2 인증
 */
function checkNewMessages(messageIds: string[], auth: OAuth2Client) {
  const messages = messageIds.map(async (messageId) => {

    // 메시지에서 별표 라벨을 제거
    await removeMessagesStarredLabel(messageId, auth);

    // 메시지를 호출
    return getMessageAttachments(messageId, auth);
  });
  return Promise.all(messages);
}

/**
 * 메시지에서 첨부파일만 따로 반환
 * @param messageId 메시지 ID
 * @param auth Google API OAuth 인증정보
 */
async function getMessageAttachments(messageId: string, auth: OAuth2Client) {
  // 메시지를 호출
  const { data: message } = await gmail.users.messages.get({
    auth,
    userId: 'me',
    id: messageId
  });

  print(
    '메시지를 발견 했습니다.',
    ['Message ID', message.id],
    ['Subject', getMessageHeader(message, 'Subject')],
    ['From', getMessageHeader(message, 'From')],
    ['Date', getMessageHeader(message, 'Date')]
  );

  // 첨부파일
  return getAttachments(message, auth);
}

/**
 * 메시지에서 첨부파일만 따로 반환
 * @param message 메시지 데이터
 * @param auth Google APIs OAuth2 인증
 */
async function getAttachments(message: gmail_v1.Schema$Message, auth: OAuth2Client) {
  const parts = message.payload?.parts || [];
  const attaches = await Promise.all(parts.map(async (part) => {
    const attachId = part.body?.attachmentId;
    if (
      message.id
      && attachId
      && part.filename
      && part.filename.length > 0
      && /\.pdf$/i.test(part.filename)
    ) {
      const { data } = await gmail.users.messages.attachments.get({
        auth,
        userId: 'me',
        id: attachId,
        messageId: message.id,
      });

      print(
        '첨부파일을 발견 했습니다.',
        ['Attachment ID', attachId],
        ['FileName', part.filename],
      );

      return {
        ...data,
        filename: part.filename,
      } as Attachments;
    }
    return null;
  }));
  return attaches.filter(Boolean) as Attachments[];
}

/**
 * 메시지에서 별표 표시를 제거
 * @param {string} messageId 메시지 ID
 * @param {google.auth.OAuth2} auth Google APIs OAuth2 인증
 */
async function removeMessagesStarredLabel(messageId: string, auth: OAuth2Client) {
  const options = {
    auth,
    userId: 'me',
    id: messageId,
  };

  let message: gmail_v1.Schema$Message;
  if (process.env.NODE_ENV === 'production') {
    message = (await gmail.users.messages.modify({
      ...options,
      requestBody: {
        removeLabelIds: [STARRED_LABEL]
      }
    })).data;
  } else {
    message = (await gmail.users.messages.get(options)).data;
  }

  print(
    `메시지의 "${STARRED_LABEL}" Label을 제거하였습니다.`,
    ['Message ID', message.id]
  );

  return message;
}

/**
 * 메시지 내용에서 특정 헤더를 가져옴
 * @param message 메시지
 */
function getMessageHeader(message: gmail_v1.Schema$Message, headerName = 'Subject') {
  const headers = get(message, 'payload.headers');
  return get(find(headers, ['name', headerName]), 'value');
}
