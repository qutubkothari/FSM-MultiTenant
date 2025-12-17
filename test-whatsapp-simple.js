/**
 * Simple WhatsApp Test - Send Sample Messages
 * Using fetch to send via WhatsApp Business API or webhook
 */

// Sample Messages
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

const testPhone = '919537653927'; // Your WhatsApp number

// Option 1: Log messages to console (for manual copy-paste to WhatsApp)
console.log('='.repeat(60));
console.log('SALESMAN MESSAGE:');
console.log('='.repeat(60));
console.log(salesmanMessage);
console.log('\n');
console.log('='.repeat(60));
console.log('ADMIN MESSAGE:');
console.log('='.repeat(60));
console.log(adminMessage);
console.log('\n');
console.log(`Send these to: +${testPhone}`);

// Option 2: Use WhatsApp Business API (if you have credentials)
async function sendViaWhatsAppAPI(phone, message) {
  // TODO: Replace with your WhatsApp Business API credentials
  const WHATSAPP_API_URL = 'YOUR_API_ENDPOINT'; // e.g., 'https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages'
  const WHATSAPP_TOKEN = 'YOUR_ACCESS_TOKEN';

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    });

    const result = await response.json();
    console.log('✅ Message sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send:', error);
  }
}

// Option 3: Use third-party service like Twilio
async function sendViaTwilio(phone, message) {
  // TODO: Replace with your Twilio credentials
  const TWILIO_ACCOUNT_SID = 'YOUR_ACCOUNT_SID';
  const TWILIO_AUTH_TOKEN = 'YOUR_AUTH_TOKEN';
  const TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886'; // Twilio sandbox number

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('From', TWILIO_WHATSAPP_NUMBER);
  formData.append('To', `whatsapp:+${phone}`);
  formData.append('Body', message);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    const result = await response.json();
    console.log('✅ Message sent via Twilio:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to send:', error);
  }
}

// Uncomment to test with actual API:
// sendViaWhatsAppAPI(testPhone, salesmanMessage);
// setTimeout(() => sendViaWhatsAppAPI(testPhone, adminMessage), 2000);

// OR with Twilio:
// sendViaTwilio(testPhone, salesmanMessage);
// setTimeout(() => sendViaTwilio(testPhone, adminMessage), 2000);
