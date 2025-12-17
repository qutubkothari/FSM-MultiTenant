// Manual trigger for daily WhatsApp summaries
// Run: node trigger-manual-send.js

const axios = require('axios');

const CRON_URL = 'https://whatsapp-cron-dot-sak-fsm.el.r.appspot.com/cron/send-daily-summaries';

console.log('🚀 Manually triggering daily WhatsApp summaries...\n');
console.log('URL:', CRON_URL);
console.log('Simulating App Engine Cron header...\n');

axios.get(CRON_URL, {
  headers: {
    'X-Appengine-Cron': 'true',
    'User-Agent': 'AppEngine-Google; (+http://code.google.com/appengine)'
  },
  timeout: 180000 // 3 minute timeout
})
.then(response => {
  console.log('✅ SUCCESS!\n');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
})
.catch(error => {
  console.error('❌ FAILED!\n');
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
});
