require('dotenv').config({ silent: true });
const axios = require('axios');

/**
 * Jandi Webhook 전송
 * @export
 * @param {string} message 메시지 내용
 * @param {object[]} connectInfo 메시지 하단 정보
 * @returns {Promise}
 */
export default function JandiWebhook(message, connectInfo) {
  /* eslint quote-props: ["error", "consistent"] */
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
  .then(res => res.status === 200);
}
