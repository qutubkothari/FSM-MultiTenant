/**
 * WhatsApp Summary Integration
 * Using your SAK WhatsApp API
 */

const BASE_URL = 'http://wapi.saksolution.com/api/v1'; // Your WhatsApp API
const SESSION_ID = '5f4ebac4-0527-407b-9ca1-6f7905664f23';
const API_KEY = '9b55751c94e728d824d19a60b4082fd9e45591c1141c1a185f3845fbe9f65f9d';

/**
 * Send WhatsApp message using your SAK API
 */
async function sendWhatsAppMessage(phone, message) {
  try {
    console.log(`   Sending to: ${phone}`);
    console.log(`   API: POST ${BASE_URL}/messages/send`);
    
    const response = await fetch(`${BASE_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-session-id': SESSION_ID
      },
      body: JSON.stringify({
        to: phone.replace('+', ''), // Remove + sign
        text: message
      })
    });

    console.log(`   Response status: ${response.status}`);
    const text = await response.text();
    console.log(`   Response: ${text.substring(0, 200)}...\n`);
    
    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      throw new Error(`API returned non-JSON response: ${text.substring(0, 100)}`);
    }
    
    if (result.success) {
      console.log(`✅ Message sent to ${phone}`);
      console.log(`   Message ID: ${result.data?.messageId || 'N/A'}\n`);
      return result;
    } else {
      console.error(`❌ API Error:`, result.error);
      throw new Error(result.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error.message);
    throw error;
  }
}

/**
 * Check WhatsApp connection status
 */
async function checkWhatsAppStatus() {
  try {
    const response = await fetch(`${BASE_URL}/sessions/${SESSION_ID}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('📱 WhatsApp Status:', result.data);
      return result.data;
    } else {
      console.error('❌ Failed to get status:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
    return null;
  }
}

// Sample messages
const salesmanMessage = `📊 *Daily Summary - 15 Dec 2025*

Hi Rajesh Kumar,

✅ *Today's Performance:*
🎯 Total Visits: 8
✨ New Customers: 3
🔄 Repeat Customers: 5
💰 Total Orders: ₹45,000

⭐ High Potential Visits: 2
📅 Pending Follow-ups: 4

Keep up the great work! 💪

_Automated by FSM System_`;

const adminMessage = `📈 *Daily Team Report - 15 Dec 2025*

Hello Admin,

*Overall Performance:*
👥 Active Salesmen: 12
🎯 Total Visits: 87
✨ New Customers: 23
💰 Total Revenue: ₹5,45,000

*Top Performers:*
🏆 Rajesh Kumar: 8 visits, ₹45,000
🏆 Priya Sharma: 10 visits, ₹62,000
🏆 Amit Patel: 7 visits, ₹38,000

⚠️ *Alerts:*
• Salesman X - No visits today
• Salesman Y - No visits today

_FSM Management System_`;

// Test function
async function testWhatsAppSummary() {
  console.log('🚀 Testing WhatsApp Summary System...\n');
  
  // Skip status check, directly send messages
  console.log('📱 Using API:', BASE_URL);
  console.log('🔑 Session:', SESSION_ID.substring(0, 10) + '...\n');
  
  // Test phone number
  const testPhone = '+919537653927';
  
  // Send salesman message
  console.log('1️⃣ Sending Salesman Summary...');
  try {
    await sendWhatsAppMessage(testPhone, salesmanMessage);
    console.log('✅ Salesman message sent!\n');
  } catch (error) {
    console.error('❌ Failed to send salesman message:', error.message, '\n');
  }
  
  // Wait 2 seconds before sending next message
  console.log('⏳ Waiting 2 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Send admin message
  console.log('2️⃣ Sending Admin Summary...');
  try {
    await sendWhatsAppMessage(testPhone, adminMessage);
    console.log('✅ Admin message sent!\n');
  } catch (error) {
    console.error('❌ Failed to send admin message:', error.message, '\n');
  }
  
  console.log('✅ Test complete!');
}

// Run the test
testWhatsAppSummary().catch(console.error);
