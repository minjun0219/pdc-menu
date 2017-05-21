require('dotenv').config({ silent: true });
const axios = require('axios');
const { default: print } = require('./print');

/**
 * Jandi Webhook 전송
 * @export
 * @param {string} message 메시지 내용
 * @param {object[]} connectInfo 메시지 하단 정보
 * @returns {Promise}
 */
export default function JandiWebhook(message, connectInfo) {
  /* eslint quote-props: ["error", "consistent"] */
  print(
    '잔디로 메시지를 발송합니다.',
    ['내용', message]
  );
  return axios({
    method: 'post',
    url: process.env.JANDI_WEBHOOK_URL,
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
  .then(res => res.status === 200)
  .then(() => {
    print(
      '잔디로 메시지를 발송했습니다.',
      ['내용', message]
    );
    return true;
  });
}
