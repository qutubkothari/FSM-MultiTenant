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

async function sendToAbbas() {
  try {
    const tenantId = '112f12b8-55e9-4de8-9fda-d58e37c75796'; // Hylite
    const tenantName = 'Hylite';
    const abbasPhone = '919730965552'; // Abbas Rangoonwala
    
    // Get all active salesmen in Hylite
    console.log('📋 Fetching Hylite salesmen...\n');
    const { data: salesmen, error: salesmenError } = await supabase
      .from('salesmen')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name');
    
    if (salesmenError) throw salesmenError;
    
    console.log(`✅ Found ${salesmen.length} active salesmen\n`);
    
    // === DEC 16 SUMMARY ===
    console.log('📊 Generating Dec 16 summary...\n');
    const dec16Summaries = [];
    
    for (const salesman of salesmen) {
      const { data: summary } = await supabase.rpc('get_daily_salesman_summary', {
        p_salesman_id: salesman.id,
        p_date: '2025-12-16'
      });
      if (summary) dec16Summaries.push(summary);
    }
    
    const message1 = formatAdminDailySummary('2025-12-16', dec16Summaries, tenantName);
    console.log('Message 1 (Dec 16):');
    console.log('─'.repeat(50));
    console.log(message1);
    console.log('─'.repeat(50));
    console.log('\n📤 Sending Dec 16 summary to Abbas...\n');
    
    await sendWhatsAppMessage(abbasPhone, message1);
    console.log('✅ Dec 16 summary sent to Abbas!\n');
    
    // Wait 2 seconds
    console.log('⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // === DEC 17 SUMMARY ===
    console.log('📊 Generating Dec 17 summary...\n');
    const dec17Summaries = [];
    
    for (const salesman of salesmen) {
      const { data: summary } = await supabase.rpc('get_daily_salesman_summary', {
        p_salesman_id: salesman.id,
        p_date: '2025-12-17'
      });
      if (summary) dec17Summaries.push(summary);
    }
    
    const message2 = formatAdminDailySummary('2025-12-17', dec17Summaries, tenantName);
    console.log('Message 2 (Dec 17):');
    console.log('─'.repeat(50));
    console.log(message2);
    console.log('─'.repeat(50));
    console.log('\n📤 Sending Dec 17 summary to Abbas...\n');
    
    await sendWhatsAppMessage(abbasPhone, message2);
    console.log('✅ Dec 17 summary sent to Abbas!\n');
    
    console.log('🎉 Both admin summaries sent successfully to Abbas (9730965552)!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

sendToAbbas();
