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

async function getHyliteRevenueReport(startDate, endDate) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name')
    .ilike('company_name', '%hylite%')
    .single();
  
  const { data: visits } = await supabase
    .from('visits')
    .select(`
      visit_type,
      order_value,
      salesman_id,
      salesman:salesman_id(name)
    `)
    .eq('tenant_id', tenant.id)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')
    .not('visit_type', 'is', null);
  
  const salesmanData = {};
  visits.forEach(v => {
    const name = v.salesman?.name || 'Unknown';
    if (!salesmanData[name]) {
      salesmanData[name] = {
        personal_visits: 0,
        telephone_calls: 0,
        personal_revenue: 0,
        telephone_revenue: 0,
        total_revenue: 0
      };
    }
    
    const revenue = v.order_value || 0;
    if (v.visit_type === 'personal') {
      salesmanData[name].personal_visits++;
      salesmanData[name].personal_revenue += revenue;
    } else if (v.visit_type === 'telephone') {
      salesmanData[name].telephone_calls++;
      salesmanData[name].telephone_revenue += revenue;
    }
    salesmanData[name].total_revenue += revenue;
  });
  
  return { tenant, salesmanData, startDate, endDate };
}

function formatManagementMessage(data) {
  const { tenant, salesmanData, startDate, endDate } = data;
  
  const start = new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  
  let message = `📊 *Revenue & Activity Report*\n`;
  message += `${tenant.company_name}\n`;
  message += `${start} - ${end}\n\n`;
  
  const sorted = Object.entries(salesmanData).sort((a, b) => b[1].total_revenue - a[1].total_revenue);
  
  let totalPersonalVisits = 0;
  let totalTelephoneCalls = 0;
  let totalRevenue = 0;
  
  message += `*Team Performance*\n`;
  message += `${'─'.repeat(40)}\n\n`;
  
  sorted.forEach(([name, stats]) => {
    const totalActivities = stats.personal_visits + stats.telephone_calls;
    totalPersonalVisits += stats.personal_visits;
    totalTelephoneCalls += stats.telephone_calls;
    totalRevenue += stats.total_revenue;
    
    message += `*${name}*\n`;
    if (stats.plant) {
      message += `📍 Branch: ${stats.plant}\n`;
    }
    message += `🎯 Activities: ${totalActivities} (🚶${stats.personal_visits} + 📞${stats.telephone_calls})\n`;
    message += `💰 Revenue: ₹${stats.total_revenue.toLocaleString('en-IN')}\n`;
    message += `   • Personal: ₹${stats.personal_revenue.toLocaleString('en-IN')}\n`;
    message += `   • Telephone: ₹${stats.telephone_revenue.toLocaleString('en-IN')}\n\n`;
  });
  
  message += `${'─'.repeat(40)}\n`;
  message += `*TOTAL SUMMARY*\n`;
  message += `👥 Team Members: ${sorted.length}\n`;
  message += `🎯 Total Activities: ${totalPersonalVisits + totalTelephoneCalls}\n`;
  message += `   🚶 Personal Visits: ${totalPersonalVisits}\n`;
  message += `   📞 Telephone Calls: ${totalTelephoneCalls}\n`;
  message += `💰 *Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}*\n\n`;
  message += `_${tenant.company_name} FSM Report_`;
  
  return message;
}

function formatSalesmanMessage(name, stats, startDate, endDate, companyName) {
  const start = new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  
  const totalActivities = stats.personal_visits + stats.telephone_calls;
  
  let message = `📈 *Your Activity Report*\n`;
  message += `${start} - ${end}\n\n`;
  message += `Hello *${name}*,\n\n`;
  
  message += `*Your Performance Summary*\n`;
  message += `${'─'.repeat(35)}\n\n`;
  
  message += `🎯 Total Activities: ${totalActivities}\n\n`;
  
  message += `🚶 *Personal Visits*\n`;
  message += `   Count: ${stats.personal_visits}\n`;
  message += `   Revenue: ₹${stats.personal_revenue.toLocaleString('en-IN')}\n`;
  if (stats.personal_visits > 0) {
    message += `   Avg per visit: ₹${Math.round(stats.personal_revenue / stats.personal_visits).toLocaleString('en-IN')}\n`;
  }
  message += `\n`;
  
  message += `📞 *Telephone Calls*\n`;
  message += `   Count: ${stats.telephone_calls}\n`;
  message += `   Revenue: ₹${stats.telephone_revenue.toLocaleString('en-IN')}\n`;
  if (stats.telephone_calls > 0) {
    message += `   Avg per call: ₹${Math.round(stats.telephone_revenue / stats.telephone_calls).toLocaleString('en-IN')}\n`;
  }
  message += `\n`;
  
  message += `${'─'.repeat(35)}\n`;
  message += `💰 *Total Revenue: ₹${stats.total_revenue.toLocaleString('en-IN')}*\n\n`;
  
  if (stats.telephone_calls > stats.personal_visits * 2) {
    message += `Consider balancing with more personal visits for better engagement! 🚶\n\n`;
  }
  
  message += `_${companyName} FSM Report_`;
  
  return message;
}

async function sendToAdditionalNumbers() {
  console.log('Generating messages for Dec 1-16, 2025...\n');
  
  const reportData = await getHyliteRevenueReport('2025-12-01', '2025-12-16');
  
  const managementMsg = formatManagementMessage(reportData);
  const alokStats = reportData.salesmanData['Alok'];
  const salesmanMsg = formatSalesmanMessage('Alok', alokStats, '2025-12-01', '2025-12-16', reportData.tenant.company_name);
  
  const phones = ['917737835253', '923062547251'];
  
  for (const phone of phones) {
    console.log('=' .repeat(60));
    console.log(`\nSending to +${phone}...\n`);
    
    // Send management message
    console.log('📊 Sending Management Report...');
    const result1 = await sendWhatsAppMessage(phone, managementMsg);
    if (result1.success) {
      console.log(`✅ Management message sent! Message ID: ${result1.data.messageId}`);
    } else {
      console.log('❌ Failed:', result1);
    }
    
    // Wait 2 seconds between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send salesman message
    console.log('\n📈 Sending Salesman Report (Alok sample)...');
    const result2 = await sendWhatsAppMessage(phone, salesmanMsg);
    if (result2.success) {
      console.log(`✅ Salesman message sent! Message ID: ${result2.data.messageId}`);
    } else {
      console.log('❌ Failed:', result2);
    }
    
    console.log(`\n✅ Both messages sent to +${phone}`);
    
    // Wait 3 seconds before next phone number
    if (phone !== phones[phones.length - 1]) {
      console.log('\nWaiting before next recipient...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n✨ All messages sent successfully to both numbers!');
  console.log('\n📱 Recipients:');
  console.log('   • +917737835253');
  console.log('   • +923062547251\n');
}

sendToAdditionalNumbers().catch(console.error);
