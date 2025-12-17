require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BASE_URL = process.env.SAK_BASE_URL || 'http://wapi.saksolution.com/api/v1';
const API_KEY = process.env.SAK_API_KEY;
const SESSION_ID = process.env.SAK_SESSION_ID;

async function sendWhatsApp(phone, message) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'x-session-id': SESSION_ID
      },
      body: JSON.stringify({
        to: phone.replace('+', ''),
        text: message
      })
    });

    const result = await response.json();
    if (result.success && result.data) {
      return { key: { id: result.data.messageId } };
    }
    return result;
  } catch (error) {
    console.error(`❌ Error sending to ${phone}:`, error.message);
    return null;
  }
}

function formatSalesmanMessage(data) {
  return `📊 *Daily Visit Summary*

👤 Salesman: *${data.salesman_name}*
📅 Date: ${data.date}

✅ *Performance:*
• Total Visits: ${data.total_visits}
• New Customers: ${data.new_customers}
• Repeat Customers: ${data.repeat_customers}
• Revenue: ₹${data.total_order_value}

💰 *Business Impact:*
• Avg Order: ₹${data.avg_order_value}
• High Potential: ${data.high_potential_visits} visits

Keep up the great work! 🎯`;
}

function formatAdminMessage(data, adminName) {
  const topPerformers = data.top_performers.map((p, i) => 
    `${i + 1}. *${p.name}* - ${p.visits} visits, ₹${p.revenue}`
  ).join('\n');

  const alerts = data.alerts.length > 0 
    ? '\n\n⚠️ *Alerts:*\n' + data.alerts.map(a => `• ${a.message}`).join('\n')
    : '';

  return `📊 *Team Performance Summary*

👋 Hi ${adminName},
📅 Date: ${data.date}

🎯 *Overview:*
• Active Salesmen: ${data.active_salesmen}
• Total Visits: ${data.total_visits}
• Revenue: ₹${data.total_order_value}
• Avg Order: ₹${data.avg_order_value}

🏆 *Top Performers:*
${topPerformers}

👥 *Customer Breakdown:*
• New: ${data.new_customers}
• Repeat: ${data.repeat_customers}
• Unique: ${data.unique_customers}
• High Potential: ${data.high_potential_visits}${alerts}`;
}

async function sendTestSummary() {
  console.log('🧪 TEST MODE - Sending to YOUR number only (+919537653927)\n');

  const testPhone = '+919537653927';
  const testDate = '2025-12-12'; // Date with 24 visits

  // Find Hylite tenant
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, company_name')
    .ilike('company_name', '%hylite%');

  if (!tenants || tenants.length === 0) {
    console.error('❌ Hylite tenant not found');
    return;
  }

  const tenant = tenants[0];
  console.log(`✅ Found: ${tenant.company_name}\n`);

  // Get one salesman for testing (NOT admin)
  const { data: salesmen } = await supabase
    .from('salesmen')
    .select('id, name, phone, is_admin')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .eq('is_admin', false)  // ONLY salesmen
    .limit(1);

  if (!salesmen || salesmen.length === 0) {
    console.error('❌ No active salesmen found');
    return;
  }

  const salesman = salesmen[0];
  console.log(`📋 Testing with salesman: ${salesman.name}\n`);

  // Get salesman summary
  const { data: salesmanData } = await supabase
    .rpc('get_daily_salesman_summary', {
      p_salesman_id: salesman.id,
      p_date: testDate
    });

  if (salesmanData) {
    console.log('📤 SALESMAN SUMMARY (preview):');
    console.log('─'.repeat(50));
    const message = formatSalesmanMessage(salesmanData);
    console.log(message);
    console.log('─'.repeat(50));

    const result = await sendWhatsApp(testPhone, message);
    if (result && result.key) {
      console.log(`✅ Sent to ${testPhone} - Message ID: ${result.key.id}\n`);
    }
  }

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get admin summary
  const { data: adminData } = await supabase
    .rpc('get_daily_admin_summary', {
      p_tenant_id: tenant.id,
      p_date: testDate
    });

  if (adminData) {
    console.log('📤 ADMIN SUMMARY (preview):');
    console.log('─'.repeat(50));
    const message = formatAdminMessage(adminData, 'Test Admin');
    console.log(message);
    console.log('─'.repeat(50));

    const result = await sendWhatsApp(testPhone, message);
    if (result && result.key) {
      console.log(`✅ Sent to ${testPhone} - Message ID: ${result.key.id}\n`);
    }
  }

  console.log('\n🎉 Test complete! Both summaries sent to YOUR number only.');
  console.log('💡 Check your WhatsApp to review the messages.');
  console.log('✅ Once approved, you can use send-real-summaries.js for all salesmen.');
}

sendTestSummary();
