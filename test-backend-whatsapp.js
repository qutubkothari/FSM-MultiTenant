// Test script to send WhatsApp messages with DRY RUN mode
// This logs what would be sent without actually sending

const axios = require('axios');

const CRON_SERVICE_URL = 'https://whatsapp-cron-dot-sak-fsm.el.r.appspot.com';

async function testWhatsAppMessages() {
  console.log('🧪 Running DRY RUN test (no actual messages will be sent)...\n');
  console.log('⏱️  This may take 1-2 minutes to generate all messages...\n');
  
  try {
    // Call the dry-run test endpoint
    const response = await axios.post(
      `${CRON_SERVICE_URL}/test/dry-run`,
      {},
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 180000, // 3 minutes
        maxRedirects: 5
      }
    );
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.mode === 'dry-run') {
      console.log('\n🧪 DRY RUN COMPLETE!');
      console.log(`   📅 Date: ${response.data.date}`);
      console.log(`   🏢 Tenants: ${response.data.tenants}`);
      console.log(`   📝 Would send: ${response.data.would_send} messages`);
      console.log(`   ⏸️  Skipped: ${response.data.skipped} tenants`);
      
      if (response.data.skip_reasons) {
        const weekend = response.data.skip_reasons.weekend || [];
        const noVisits = response.data.skip_reasons.no_visits || [];
        const lockError = response.data.skip_reasons.lock_error || [];
        
        if (weekend.length > 0) {
          console.log(`   Weekend: ${weekend.join(', ')}`);
        }
        if (noVisits.length > 0) {
          console.log(`   No Visits: ${noVisits.join(', ')}`);
        }
        if (lockError.length > 0) {
          console.log(`   Lock/Already Sent: ${lockError.join(', ')}`);
        }
      }
      
      console.log('\n💡 Check the App Engine logs to see the actual message content!');
      console.log('   gcloud logging read "resource.labels.module_id=whatsapp-cron" --limit=100');
    } else if (response.data && !response.data.success) {
      console.log('\n⚠️  Request completed but with errors:');
      console.log('Error:', response.data.error);
    }
    
  } catch (error) {
    if (error.response) {
      console.log('❌ HTTP Error:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('❌ No response received');
      console.log('Error:', error.message);
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Run it
testWhatsAppMessages();
