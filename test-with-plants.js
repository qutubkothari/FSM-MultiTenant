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

function formatAdminMessage(data, adminName, timezone, companyName) {
  const date = new Date(data.date).toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  
  const formatCurrency = (amount) => {
    const safeAmount = amount || 0;
    const formatted = safeAmount.toLocaleString('en-IN');
    return timezone.includes('Cairo') ? `EGP ${formatted}` : `₹ ${formatted}`;
  };

  let message = `📊 *Revenue & Activity Report*\n`;
  message += `${companyName}\n`;
  message += `${date}\n\n`;
  
  message += `*Team Performance*\n`;
  message += `${'─'.repeat(35)}\n\n`;

  if (data.top_performers && data.top_performers.length > 0) {
    data.top_performers.forEach((p) => {
      const plant = p.plant ? ` [${p.plant}]` : '';
      message += `*${p.name}${plant}*\n`;
      message += `🎯 Activities: ${p.visits} (🚶 ${p.personal_visits || 0} + 📞 ${p.telephone_calls || 0})\n`;
      message += `💰 Revenue: ${formatCurrency(p.revenue)}\n`;
      
      // Revenue breakdown
      const personalRev = p.personal_revenue || 0;
      const telephoneRev = p.telephone_revenue || 0;
      message += `   • Personal: ${formatCurrency(personalRev)}\n`;
      message += `   • Telephone: ${formatCurrency(telephoneRev)}\n`;
      message += `\n`;
    });
  }
  
  message += `${'─'.repeat(35)}\n\n`;
  
  message += `*TOTAL SUMMARY*\n`;
  message += `👥 Team Members: ${data.active_salesmen}\n`;
  message += `🎯 Total Activities: ${data.total_visits}\n`;
  message += `   • Personal Visits: ${data.personal_visits || 0}\n`;
  message += `   • Telephone Calls: ${data.telephone_calls || 0}\n`;
  message += `💰 Total Revenue: ${formatCurrency(data.total_order_value)}\n\n`;

  message += `_${companyName} FSM Report_`;
  
  return message;
}

async function testWithRealData() {
  console.log('Testing with REAL database function (includes plant data)...\n');
  
  // Get Hylite tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name, timezone')
    .ilike('company_name', '%hylite%')
    .single();
  
  console.log('Company:', tenant.company_name);
  console.log('Timezone:', tenant.timezone, '\n');
  
  // Call the UPDATED SQL function
  const { data, error } = await supabase.rpc('get_daily_admin_summary', {
    p_tenant_id: tenant.id,
    p_date: '2025-12-01'
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('📊 Top Performers from Database (with plant):');
  console.log(JSON.stringify(data.top_performers, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  const message = formatAdminMessage(data, 'Test Admin', tenant.timezone, tenant.company_name);
  
  console.log('📱 Formatted Message:\n');
  console.log(message);
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('Sending to 919537653927...\n');

  const result = await sendWhatsAppMessage('919537653927', message);
  
  if (result.success) {
    console.log('✅ Message sent successfully!');
    console.log('Message ID:', result.data.messageId);
  } else {
    console.log('❌ Failed to send message:', result);
  }
}

testWithRealData().catch(console.error);
