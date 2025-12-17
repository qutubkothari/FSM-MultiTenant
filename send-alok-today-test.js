const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('Using Supabase URL:', process.env.SUPABASE_URL);
console.log('Using Supabase Key:', process.env.SUPABASE_ANON_KEY ? 'Found' : 'Missing');

const supabase = createClient(
  'https://ktvrffbccgxtaststlhw.supabase.co',
  'sb_publishable_sNhpQ5W6i_KuIPcT6bjjnw_BcJwPljV'
);

const BASE_URL = process.env.SAK_BASE_URL;
const API_KEY = process.env.SAK_API_KEY;
const SESSION_ID = process.env.SAK_SESSION_ID;

async function sendWhatsAppMessage(phone, message) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-session-id': SESSION_ID
      },
      body: JSON.stringify({
        to: phone.replace(/\+/g, '').replace(/\s/g, ''),
        text: message
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Message sent to ${phone}`);
      console.log(`   Message ID: ${result.data?.messageId}`);
      return result;
    } else {
      console.error(`❌ Failed:`, result.error);
      throw new Error(result.error?.message || 'Send failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

function formatSalesmanDailyMessage(summary) {
  const { name, date, personal_visits, telephone_calls, total_order_value, personal_revenue, telephone_revenue } = summary;
  
  const totalVisits = (personal_visits || 0) + (telephone_calls || 0);
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  
  let message = `📊 *Daily Report - ${dateStr}*\n\n`;
  message += `Hello ${name},\n\n`;
  
  if (totalVisits === 0) {
    message += `No activities recorded for today.\n\n`;
    message += `📝 Remember to log your visits in the app!\n`;
  } else {
    message += `Here's your performance summary:\n\n`;
    message += `🎯 *Total Activities: ${totalVisits}*\n`;
    if (personal_visits > 0) message += `   👤 Personal Visits: ${personal_visits}\n`;
    if (telephone_calls > 0) message += `   📞 Telephone Calls: ${telephone_calls}\n`;
    message += `\n`;
    
    if (total_order_value > 0) {
      message += `💰 *Revenue: ₹${total_order_value.toLocaleString('en-IN')}*\n`;
      if (personal_revenue > 0) message += `   Personal: ₹${personal_revenue.toLocaleString('en-IN')}\n`;
      if (telephone_revenue > 0) message += `   Telephone: ₹${telephone_revenue.toLocaleString('en-IN')}\n`;
      message += `\n`;
    }
    
    message += `Keep up the great work! 💪\n`;
  }
  
  message += `\n_Hylite Sales Team_`;
  
  return message;
}

async function sendAlokTodaySummary() {
  try {
    console.log('📋 Fetching Alok\'s TODAY (Dec 17) summary...\n');
    
    // Get Alok's summary for today
    const { data: summary, error } = await supabase.rpc('get_daily_salesman_summary', {
      p_salesman_id: 'b4cc8d15-2099-43e2-b1f8-435e31b69658',
      p_date: '2025-12-17'
    });

    if (error) {
      console.error('❌ Error fetching summary:', error);
      process.exit(1);
    }

    console.log('✅ Summary fetched:');
    console.log(JSON.stringify(summary, null, 2));
    console.log('\n📱 Formatting WhatsApp message...\n');

    const message = formatSalesmanDailyMessage(summary);
    console.log('Message to send:');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));
    console.log('\n📤 Sending to 919537653927...\n');

    await sendWhatsAppMessage('919537653927', message);
    
    console.log('\n✅ Test message sent successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

sendAlokTodaySummary();
