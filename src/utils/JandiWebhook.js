require('dotenv').config({ silent: true });
const axios = require('axios');
const { default: print, printError } = require('./print');

/**
 * Jandi Webhook 전송
 * @export
 * @param {string} url Webhook URL
 * @param {string} message 메시지 내용
 * @param {object[]} connectInfo 메시지 하단 정보
 * @returns {Promise}
 */
export function JandiWebhook(url, message, connectInfo) {
  /* eslint quote-props: ["error", "consistent"] */
  return axios({
    method: 'post',
    url,
    headers: {
      'Accept': 'application/vnd.tosslab.jandi-v2+json',
      'Content-Type': 'application/json'
    },
    data: {
      body: message,
      connectColor: '#00cca3',
      connectInfo
    }
  })
  .then(res => {
    if (res.status !== 200) {
      printError(
        '잔디로 메시지를 발송하지 못했습니다.',
        ['내용', message]
      );
      throw new Error(`${res.status} ${res.statusText}`);
    }
    print(
      '잔디로 메시지를 발송했습니다.',
      ['내용', message]
    );
    return true;
  })
  .catch(err => JandiWebhook(
    process.env.PRIVATE_JANDI_WEBHOOK_URL,
    `Jandi Webhook Error:\n${err}`
  ));
}

/**
 * Jandi Webhook 전송
 * @export
 * @param {string} message 메시지 내용
 * @param {object[]} connectInfo 메시지 하단 정보
 * @returns {Promise}
 */
export default (message, connectInfo) => (
  JandiWebhook(process.env.JANDI_WEBHOOK_URL, message, connectInfo)
);

/**
 * Jandi Webhook으로 메시지 전송
 * @export
 * @param {string} err 오류메시지
 * @returns {Promise}
 */
export const privateMessage = (message, connectInfo = []) => (
  JandiWebhook(
    process.env.PRIVATE_JANDI_WEBHOOK_URL,
    '서버 메시지',
    [
      {
        title: 'Message',
        description: message
      },
      ...connectInfo
    ]
  )
);

/**
 * Jandi Webhook으로 오류 전송
 * @export
 * @param {string} err 오류메시지
 * @returns {Promise}
 */
export const errorMessage = err => {
  /* eslint quote-props: ["error", "consistent"] */
  const env = process.env.NODE_ENV === 'development' ? '[개발] ' : '';
  const message = `${env}오류 알림\n${new Date()}`;
  return privateMessage(message, [{
    description: err.stack || err
  }]);
};
