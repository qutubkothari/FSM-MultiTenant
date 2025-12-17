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
  console.log('Testing ADMIN message format with Dec 15 data (has calls)...\n');
  
  // Get Hylite tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name, timezone')
    .ilike('company_name', '%hylite%')
    .single();
  
  console.log('Testing with:', tenant.company_name);
  
  // Get admin summary data for Dec 15, 2025
  const { data } = await supabase.rpc('get_daily_admin_summary', {
    p_tenant_id: tenant.id,
    p_date: '2025-12-15'  // Date with telephone calls
  });
  
  console.log('\n📊 Admin summary data received:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Format admin message
  const date = formatDate(data.date);
  const currency = formatCurrency(data.total_order_value, tenant.timezone);
  
  let message = `📊 *Daily Team Report*\n`;
  message += `${date}\n\n`;
  message += `Good Evening *Test Admin*,\n\n`;
  
  message += `*Performance Summary*\n`;
  message += `👥 Active Salesmen: ${data.active_salesmen}\n`;
  message += `🎯 Total Activities: ${data.total_visits}\n`;
  message += `   🚶 Personal Visits: ${data.personal_visits || 0}\n`;
  message += `   📞 Telephone Calls: ${data.telephone_calls || 0}\n`;
  message += `💰 Revenue: ${currency}\n`;
  message += `✨ New: ${data.new_customers} | 🔄 Repeat: ${data.repeat_customers}\n\n`;

  if (data.top_performers && data.top_performers.length > 0) {
    message += `🏆 *Top Performers*\n`;
    data.top_performers.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const revenue = formatCurrency(p.revenue, tenant.timezone);
      const breakdown = `(🚶${p.personal_visits || 0} + 📞${p.telephone_calls || 0})`;
      message += `${medal} ${p.name} - ${p.visits} ${breakdown}, ${revenue}\n`;
    });
    message += `\n`;
  }

  if (data.alerts && data.alerts.length > 0) {
    message += `⚠️ *Attention Required*\n`;
    data.alerts.slice(0, 3).forEach(alert => {  // Show only first 3 for test
      message += `• ${alert.message}\n`;
    });
    if (data.alerts.length > 3) {
      message += `• ...and ${data.alerts.length - 3} more\n`;
    }
  }

  message += `\n_FSM Daily Report_`;
  
  console.log('📱 Admin message to send:\n');
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
