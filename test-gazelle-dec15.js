require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SAK_API_KEY = process.env.SAK_API_KEY;
const SAK_SESSION_ID = process.env.SAK_SESSION_ID;
const SAK_BASE_URL = process.env.SAK_BASE_URL;

function formatCurrency(amount, timezone) {
  const safeAmount = amount || 0;
  const formatted = safeAmount.toLocaleString('en-IN');
  return timezone.includes('Cairo') ? `EGP ${formatted}` : `₹ ${formatted}`;
}

function formatAdminMessage(data, adminName, timezone) {
  const date = new Date(data.date).toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : 
                   new Date().getHours() < 17 ? 'Good Afternoon' : 
                   'Good Evening';

  let message = `📊 *Daily Team Report*\n${date}\n\n`;
  message += `${greeting} *${adminName}*,\n\n`;
  message += `*Performance Summary*\n`;
  message += `👥 Active Salesmen: ${data.active_salesmen}\n`;
  message += `🎯 Total Activities: ${data.total_visits}\n`;
  message += `   🚶 Personal Visits: ${data.personal_visits || 0}\n`;
  message += `   📞 Telephone Calls: ${data.telephone_calls || 0}\n`;
  message += `💰 Revenue: ${formatCurrency(data.total_order_value, timezone)}\n`;
  message += `✨ New: ${data.new_customers} | 🔄 Repeat: ${data.repeat_customers}\n`;

  if (data.top_performers && data.top_performers.length > 0) {
    message += `\n🏆 *Top Performers*\n`;
    data.top_performers.slice(0, 3).forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const breakdown = `(🚶${p.personal_visits || 0} + 📞${p.telephone_calls || 0})`;
      const totalVisits = p.visits || p.total_visits || 0;
      const orderValue = p.revenue || p.order_value || 0;
      message += `${medal} ${p.name} - ${totalVisits} ${breakdown}, ${formatCurrency(orderValue, timezone)}\n`;
    });
  }

  if (data.alerts && data.alerts.length > 0) {
    message += `\n⚠️ *Attention Required*\n`;
    data.alerts.slice(0, 3).forEach(a => {
      message += `• ${a.message}\n`;
    });
    if (data.alerts.length > 3) {
      message += `• ...and ${data.alerts.length - 3} more\n`;
    }
  }

  message += `\n_FSM Daily Report_`;
  return message;
}

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

async function testGazelleDec15() {
  console.log('Testing Gazelle Envelopes Dec 15 (16 telephone calls)...\n');
  
  // Get Gazelle Envelopes tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name, timezone')
    .ilike('company_name', '%gazelle envelopes%')
    .single();
  
  console.log('Testing with:', tenant.company_name);
  console.log('Timezone:', tenant.timezone, '\n');
  
  // Get admin summary data for Dec 15, 2025
  const { data, error } = await supabase.rpc('get_daily_admin_summary', {
    p_tenant_id: tenant.id,
    p_date: '2025-12-15'
  });
  
  if (error) {
    console.error('Error fetching summary:', error);
    return;
  }

  console.log('📊 Admin summary data received:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n============================================================\n');

  const message = formatAdminMessage(data, 'Test Admin', tenant.timezone);
  
  console.log('📱 Admin message to send:\n');
  console.log(message);
  console.log('\n============================================================\n');
  console.log('Sending to 919537653927 ...\n');

  const result = await sendWhatsAppMessage('919537653927', message);
  
  if (result.success) {
    console.log('✅ Message sent successfully!');
    console.log('Message ID:', result.data.messageId);
  } else {
    console.log('❌ Failed to send message:', result);
  }
}

testGazelleDec15().catch(console.error);
