const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const BASE_URL = process.env.SAK_BASE_URL;
const API_KEY = process.env.SAK_API_KEY;
const SESSION_ID = process.env.SAK_SESSION_ID;

async function sendWhatsAppMessage(phone, message) {
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
  return await response.json();
}

function formatCurrency(amount, timezone) {
  const symbol = timezone.includes('Cairo') ? 'EGP' : '₹';
  return symbol + ' ' + Math.round(amount).toLocaleString('en-IN');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

(async () => {
  console.log('Testing new message format with visit breakdown...\n');
  
  // Get a Hylite salesman
  const { data: salesman } = await supabase
    .from('salesmen')
    .select('id, name, phone, tenant_id')
    .ilike('name', '%alok%')
    .limit(1)
    .single();
  
  if (!salesman) {
    console.log('Salesman not found');
    return;
  }
  
  console.log('Testing with:', salesman.name);
  
  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('timezone')
    .eq('id', salesman.tenant_id)
    .single();
  
  // Get summary data
  const { data } = await supabase.rpc('get_daily_salesman_summary', {
    p_salesman_id: salesman.id,
    p_date: '2025-12-16'
  });
  
  console.log('\n📊 Summary data received:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Format message
  const date = formatDate(data.date);
  const currency = formatCurrency(data.total_order_value, tenant.timezone);
  
  let message = `📈 *Your Daily Report*\n`;
  message += `${date}\n\n`;
  message += `Hello *${data.name}*,\n\n`;
  
  message += `*Today's Performance*\n`;
  message += `🎯 Total Activities: ${data.total_visits}\n`;
  message += `   🚶 Personal Visits: ${data.personal_visits || 0}\n`;
  message += `   📞 Telephone Calls: ${data.telephone_calls || 0}\n`;
  message += `💰 Revenue Generated: ${currency}\n`;
  message += `✨ New Customers: ${data.new_customers}\n`;
  message += `🔄 Repeat Customers: ${data.repeat_customers}\n\n`;
  
  if (data.high_potential_visits > 0) {
    message += `⭐ High Potential Leads: ${data.high_potential_visits}\n\n`;
  }
  
  message += `Keep up the excellent work! 💪\n\n`;
  message += `_FSM Daily Report_`;
  
  console.log('📱 Message to send:\n');
  console.log(message);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Send to your test number
  const testPhone = '919537653927';
  console.log('Sending to', testPhone, '...\n');
  
  const result = await sendWhatsAppMessage(testPhone, message);
  
  if (result.success) {
    console.log('✅ Message sent successfully!');
    console.log('Message ID:', result.data?.messageId);
  } else {
    console.log('❌ Failed:', result.error);
  }
})();
