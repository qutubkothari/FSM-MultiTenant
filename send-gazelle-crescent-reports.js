const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

function formatAdminDailySummary(date, salesmenSummaries, tenantName) {
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  
  let totalPersonal = 0;
  let totalTelephone = 0;
  let totalRevenue = 0;
  
  const activeSalesmen = salesmenSummaries.filter(s => 
    (s.personal_visits > 0 || s.telephone_calls > 0 || s.total_order_value > 0)
  );
  
  activeSalesmen.forEach(s => {
    totalPersonal += s.personal_visits || 0;
    totalTelephone += s.telephone_calls || 0;
    totalRevenue += s.total_order_value || 0;
  });
  
  const totalActivities = totalPersonal + totalTelephone;
  
  let message = `📊 *${tenantName} - Daily Summary*\n`;
  message += `📅 ${dateStr}\n\n`;
  
  message += `*Team Overview:*\n`;
  message += `👥 Active Salesmen: ${activeSalesmen.length}/${salesmenSummaries.length}\n`;
  message += `🎯 Total Activities: ${totalActivities}\n`;
  message += `   👤 Personal: ${totalPersonal}\n`;
  message += `   📞 Telephone: ${totalTelephone}\n`;
  
  if (totalRevenue > 0) {
    message += `💰 Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}\n`;
  }
  
  message += `\n`;
  
  if (activeSalesmen.length > 0) {
    message += `*Top Performers:*\n`;
    
    // Sort by activities
    const sortedByActivities = [...activeSalesmen].sort((a, b) => {
      const aTotal = (a.personal_visits || 0) + (a.telephone_calls || 0);
      const bTotal = (b.personal_visits || 0) + (b.telephone_calls || 0);
      return bTotal - aTotal;
    });
    
    sortedByActivities.slice(0, 5).forEach((s, idx) => {
      const activities = (s.personal_visits || 0) + (s.telephone_calls || 0);
      const revenue = s.total_order_value || 0;
      message += `${idx + 1}. *${s.name}*: ${activities} activities`;
      if (revenue > 0) {
        message += `, ₹${revenue.toLocaleString('en-IN')}`;
      }
      message += `\n`;
    });
  } else {
    message += `_No activities recorded for this day_\n`;
  }
  
  message += `\n_${tenantName} Management_`;
  
  return message;
}

async function getTenantSummary(tenantId, tenantName, date) {
  console.log(`📊 Generating ${tenantName} summary for ${date}...\n`);
  
  const { data: salesmen, error: salesmenError } = await supabase
    .from('salesmen')
    .select('id, name, phone')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');
  
  if (salesmenError) throw salesmenError;
  
  console.log(`✅ Found ${salesmen.length} active salesmen in ${tenantName}\n`);
  
  const summaries = [];
  for (const salesman of salesmen) {
    const { data: summary } = await supabase.rpc('get_daily_salesman_summary', {
      p_salesman_id: salesman.id,
      p_date: date
    });
    if (summary) summaries.push(summary);
  }
  
  return formatAdminDailySummary(date, summaries, tenantName);
}

async function sendGazelleAndCrescentReports() {
  try {
    const adminPhone = '919537653927';
    const date = '2025-12-17';
    
    const tenants = [
      { id: 'fd43ab22-cc00-4fca-9dbf-768c0949c468', name: 'Gazelle Envelopes' },
      { id: '84c1ba8d-53ab-43ef-9483-d997682f3072', name: 'GAZELLE' },
      { id: 'fa47fd9f-253f-44c6-af02-86165f018321', name: 'Crescent' }
    ];
    
    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];
      
      const message = await getTenantSummary(tenant.id, tenant.name, date);
      
      console.log(`Message for ${tenant.name}:`);
      console.log('─'.repeat(50));
      console.log(message);
      console.log('─'.repeat(50));
      console.log(`\n📤 Sending ${tenant.name} summary...\n`);
      
      await sendWhatsAppMessage(adminPhone, message);
      console.log(`✅ ${tenant.name} summary sent!\n`);
      
      // Wait 2 seconds between messages
      if (i < tenants.length - 1) {
        console.log('⏳ Waiting 2 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('🎉 All reports sent successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

sendGazelleAndCrescentReports();
