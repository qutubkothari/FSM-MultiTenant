// Test script to manually trigger WhatsApp daily summaries
// This bypasses App Engine auth by calling the cloud function directly

const axios = require('axios');

const WHATSAPP_CRON_URL = 'https://whatsapp-cron-dot-sak-fsm.el.r.appspot.com';

async function sendDailySummaries() {
  console.log('🚀 Starting manual WhatsApp daily summary send...\n');
  
  try {
    const response = await axios.post(
      `${WHATSAPP_CRON_URL}/cron/send-daily-summaries`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Appengine-Cron': 'true',
          'User-Agent': 'AppEngine-Google; (+http://code.google.com/appengine)'
        },
        timeout: 180000, // 3 minutes
        maxRedirects: 0, // Don't follow redirects to login page
        validateStatus: function (status) {
          return status < 400; // Accept any response under 400
        }
      }
    );
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.sent !== undefined) {
      console.log(`\n🎉 SUCCESS! Sent ${response.data.sent} messages`);
      if (response.data.failed > 0) {
        console.log(`⚠️  ${response.data.failed} failed`);
      }
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ HTTP Error:', error.response.status);
      console.log('Response:', error.response.data);
      
      // Check if we got redirected to login
      if (error.response.status === 302 || 
          (typeof error.response.data === 'string' && 
           error.response.data.includes('accounts.google.com'))) {
        console.log('\n⛔ BLOCKED: App Engine requires authentication');
        console.log('This endpoint can only be called by:');
        console.log('  1. App Engine cron scheduler (automatic at 6pm)');
        console.log('  2. Authenticated gcloud session (Cloud Shell)');
        console.log('\n💡 Solution: Run these SQL statements in Supabase, then wait for 6pm cron:');
        console.log('   (See: database/RUN_THIS_create_report_send_log.sql)');
      }
    } else if (error.request) {
      console.log('❌ No response received');
      console.log('Error:', error.message);
    } else {
      console.log('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Run it
sendDailySummaries();
