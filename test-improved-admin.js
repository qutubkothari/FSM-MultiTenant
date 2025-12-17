require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const BASE_URL = 'http://wapi.saksolution.com';
const API_KEY = process.env.SAK_API_KEY;
const SESSION_ID = process.env.SAK_SESSION_ID;

const formatCurrency = (amt) => '₹' + amt.toLocaleString('en-IN');
const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { 
  day: '2-digit', 
  month: 'short', 
  year: 'numeric' 
});

function formatAdminMessage(data, adminName) {
  const date = formatDate(data.date);
  
  let message = `📊 *Daily Team Report*\n`;
  message += `${date}\n\n`;
  message += `Good Evening *${adminName}*,\n\n`;
  
  message += `*Performance Summary*\n`;
  message += `👥 Active Salesmen: ${data.active_salesmen}\n`;
  message += `🎯 Total Visits: ${data.total_visits}\n`;
  message += `💰 Revenue: ${formatCurrency(data.total_order_value)}\n`;
  message += `✨ New: ${data.new_customers} | 🔄 Repeat: ${data.repeat_customers}\n\n`;

  if (data.top_performers && data.top_performers.length > 0) {
    message += `🏆 *Top Performers*\n`;
    data.top_performers.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      message += `${medal} ${p.name} - ${p.visits} visits, ${formatCurrency(p.revenue)}\n`;
    });
    message += `\n`;
  }

  if (data.alerts && data.alerts.length > 0) {
    message += `⚠️ *Attention Required*\n`;
    data.alerts.forEach(a => {
      message += `• ${a.message}\n`;
    });
  }

  message += `\n_FSM Daily Report_`;
  return message;
}

function formatSalesmanMessage(data) {
  const date = formatDate(data.date);
  
  let message = `📈 *Your Daily Report*\n`;
  message += `${date}\n\n`;
  message += `Hello *${data.name}*,\n\n`;
  
  message += `*Today's Performance*\n`;
  message += `🎯 Visits Completed: ${data.total_visits}\n`;
  message += `💰 Revenue Generated: ${formatCurrency(data.total_order_value)}\n`;
  message += `✨ New Customers: ${data.new_customers}\n`;
  message += `🔄 Repeat Customers: ${data.repeat_customers}\n\n`;
  
  if (data.high_potential_visits > 0) {
    message += `⭐ High Potential Leads: ${data.high_potential_visits}\n\n`;
  }
  
  message += `Keep up the excellent work! 💪\n\n`;
  message += `_FSM Daily Report_`;
  
  return message;
}

async function testImprovedMessage() {
  console.log('📱 Testing both messages to +96567709452\n');

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .ilike('company_name', '%hylite%');

  // Test 1: Admin Message
  console.log('═'.repeat(60));
  console.log('ADMIN MESSAGE');
  console.log('═'.repeat(60));
  
  const { data: adminData } = await supabase.rpc('get_daily_admin_summary', {
    p_tenant_id: tenants[0].id,
    p_date: '2025-12-12'
  });

  const adminMessage = formatAdminMessage(adminData, 'Abbas Rangoonwala');
  console.log(adminMessage);
  console.log('\n');

  // Test 2: Salesman Message
  console.log('═'.repeat(60));
  console.log('SALESMAN MESSAGE');
  console.log('═'.repeat(60));

  const { data: salesmen } = await supabase
    .from('salesmen')
    .select('id, name')
    .eq('tenant_id', tenants[0].id)
    .eq('name', 'Alok')
    .single();

  const { data: salesmanData } = await supabase.rpc('get_daily_salesman_summary', {
    p_salesman_id: salesmen.id,
    p_date: '2025-12-12'
  });

  const salesmanMessage = formatSalesmanMessage(salesmanData);
  console.log(salesmanMessage);
  console.log('\n');

  // Send both messages
  console.log('═'.repeat(60));
  console.log('SENDING TO +96567709452');
  console.log('═'.repeat(60) + '\n');

  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  // Send admin message
  const adminResponse = await fetch(`${BASE_URL}/api/v1/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-session-id': SESSION_ID
    },
    body: JSON.stringify({
      to: '96567709452',
      text: adminMessage
    })
  });
  const adminResult = await adminResponse.json();
  console.log('✅ Admin message sent! ID:', adminResult.data.messageId);

  // Wait 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send salesman message
  const salesmanResponse = await fetch(`${BASE_URL}/api/v1/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'x-session-id': SESSION_ID
    },
    body: JSON.stringify({
      to: '96567709452',
      text: salesmanMessage
    })
  });
  const salesmanResult = await salesmanResponse.json();
  console.log('✅ Salesman message sent! ID:', salesmanResult.data.messageId);
}

testImprovedMessage();
