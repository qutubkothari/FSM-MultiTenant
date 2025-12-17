require('dotenv').config();

const BASE_URL = process.env.SAK_BASE_URL || 'http://wapi.saksolution.com';
const API_KEY = process.env.SAK_API_KEY;
const SESSION_ID = process.env.SAK_SESSION_ID;

async function testWhatsAppAPI() {
  console.log('🔍 Testing WhatsApp API Connection...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Session ID: ${SESSION_ID?.substring(0, 20)}...`);
  console.log(`API Key: ${API_KEY?.substring(0, 20)}...\n`);

  // Test 1: Check if session is active
  console.log('1️⃣ Testing /api/v1/sessions/status endpoint...');
  try {
    const statusResponse = await fetch(`${BASE_URL}/api/v1/sessions/status`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'x-session-id': SESSION_ID
      }
    });

    console.log(`Status Code: ${statusResponse.status}`);
    const statusText = await statusResponse.text();
    console.log(`Response: ${statusText.substring(0, 200)}...\n`);

    if (statusResponse.status === 200) {
      try {
        const statusData = JSON.parse(statusText);
        console.log('✅ Session Status:', JSON.stringify(statusData, null, 2));
      } catch {
        console.log('⚠️  Response is not JSON');
      }
    }
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }

  // Test 2: Send a message
  console.log('\n2️⃣ Testing /api/v1/messages/send endpoint...');
  try {
    const sendResponse = await fetch(`${BASE_URL}/api/v1/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-session-id': SESSION_ID
      },
      body: JSON.stringify({
        to: '919537653927',
        text: '🧪 API Test - Please ignore'
      })
    });

    console.log(`Status Code: ${sendResponse.status}`);
    const sendText = await sendResponse.text();
    console.log(`Response (first 500 chars):\n${sendText.substring(0, 500)}`);

    if (sendResponse.status === 200) {
      try {
        const sendData = JSON.parse(sendText);
        console.log('\n✅ Message sent:', JSON.stringify(sendData, null, 2));
      } catch {
        console.log('\n⚠️  Response is not JSON - likely HTML error page');
        
        // Check if it's an HTML error
        if (sendText.includes('<html>') || sendText.includes('<HTML>')) {
          console.log('\n❌ API returned HTML instead of JSON');
          console.log('Possible issues:');
          console.log('  1. Session expired or invalid');
          console.log('  2. API endpoint changed');
          console.log('  3. Authentication failed');
          console.log('  4. Server error on SAK side');
        }
      }
    }
  } catch (error) {
    console.error('❌ Send test failed:', error.message);
  }
}

testWhatsAppAPI();
