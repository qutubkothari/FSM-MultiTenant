require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SAK_API_KEY = process.env.SAK_API_KEY;
const SAK_SESSION_ID = process.env.SAK_SESSION_ID;
const SAK_BASE_URL = process.env.SAK_BASE_URL;

async function sendWhatsAppMessage(phone, message) {
  const response = await fetch(`${SAK_BASE_URL}/api/v1/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SAK_API_KEY,
      'x-session-id': SAK_SESSION_ID
    },
    body: JSON.stringify({
      to: phone,
      text: message
    })
  });

  const result = await response.json();
  return result;
}

function formatCurrency(amount, timezone) {
  const safeAmount = amount || 0;
  const formatted = safeAmount.toLocaleString('en-IN');
  return timezone.includes('Cairo') ? `EGP ${formatted}` : `₹ ${formatted}`;
}

function formatSalesmanMessage(data, timezone, companyName) {
  const startDate = new Date('2025-12-01').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const endDate = new Date('2025-12-15').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  
  const formatCurrency = (amount) => {
    const safeAmount = amount || 0;
    const formatted = safeAmount.toLocaleString('en-IN');
    return timezone.includes('Cairo') ? `EGP ${formatted}` : `₹ ${formatted}`;
  };
  
  const totalActivities = (data.personal_visits || 0) + (data.telephone_calls || 0);
  const personalRevenue = data.personal_revenue || 0;
  const telephoneRevenue = data.telephone_revenue || 0;
  
  let message = `📈 *Your Activity Report*\n`;
  message += `${startDate} - ${endDate}\n\n`;
  message += `Hello *${data.name}*,\n\n`;
  
  message += `*Your Performance Summary*\n`;
  message += `${'─'.repeat(35)}\n\n`;
  
  message += `🎯 Total Activities: ${totalActivities}\n\n`;
  
  message += `🚶 *Personal Visits*\n`;
  message += `   Count: ${data.personal_visits || 0}\n`;
  message += `   Revenue: ${formatCurrency(personalRevenue)}\n`;
  if ((data.personal_visits || 0) > 0) {
    message += `   Avg per visit: ${formatCurrency(Math.round(personalRevenue / data.personal_visits))}\n`;
  }
  message += `\n`;
  
  message += `📞 *Telephone Calls*\n`;
  message += `   Count: ${data.telephone_calls || 0}\n`;
  message += `   Revenue: ${formatCurrency(telephoneRevenue)}\n`;
  if ((data.telephone_calls || 0) > 0) {
    message += `   Avg per call: ${formatCurrency(Math.round(telephoneRevenue / data.telephone_calls))}\n`;
  }
  message += `\n`;
  
  message += `${'─'.repeat(35)}\n`;
  message += `💰 *Total Revenue: ${formatCurrency(data.total_order_value)}*\n\n`;
  
  if ((data.telephone_calls || 0) > (data.personal_visits || 0) * 2) {
    message += `Consider balancing with more personal visits for better engagement! 🚶\n\n`;
  }
  
  message += `_${companyName} FSM Report_`;

  return message;
}

async function testSalesmanMessage() {
  console.log('Testing SALESMAN message format...\n');
  
  // Use mock data to show the format
  const summary = {
    name: 'Alok',
    total_visits: 45,
    personal_visits: 2,
    telephone_calls: 43,
    total_order_value: 1460000,
    personal_revenue: 460000,
    telephone_revenue: 1000000,
    new_customers: 3,
    repeat_customers: 42,
    high_potential_visits: 0
  };
  
  console.log('Sample Salesman: Alok');
  console.log('Period: Dec 1-15, 2025');
  console.log('Activities:', summary.total_visits);
  console.log('\n============================================================\n');
  
  const message = formatSalesmanMessage(summary, 'Asia/Kolkata', 'Hylite');
  
  console.log('📱 Formatted Salesman Message:\n');
  console.log(message);
  console.log('\n============================================================\n');
  console.log('Sending to 919537653927...\n');
  
  const result = await sendWhatsAppMessage('919537653927', message);
  
  if (result.success) {
    console.log('✅ Message sent successfully!');
    console.log('Message ID:', result.data?.messageId);
  } else {
    console.log('❌ Failed:', result.error);
  }
}

testSalesmanMessage().catch(console.error);
