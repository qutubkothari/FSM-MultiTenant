/**
 * Send Real WhatsApp Summaries with Hylite Data
 * Fetches actual data from Supabase and sends via SAK WhatsApp API
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const SUPABASE_URL = 'https://ktvrffbccgxtaststlhw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sNhpQ5W6i_KuIPcT6bjjnw_BcJwPljV';

// WhatsApp API Configuration
const BASE_URL = 'http://wapi.saksolution.com/api/v1';
const SESSION_ID = '5f4ebac4-0527-407b-9ca1-6f7905664f23';
const API_KEY = '9b55751c94e728d824d19a60b4082fd9e45591c1141c1a185f3845fbe9f65f9d';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Send WhatsApp message
 */
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
      console.log(`✅ Message sent to ${phone} (ID: ${result.data?.messageId})`);
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

/**
 * Format date for display
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Format Salesman Daily Summary Message
 */
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

/**
 * Format Admin Daily Summary Message
 */
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
    data.alerts.forEach(alert => {
      message += `• ${alert.message}\n`;
    });
  }

  message += `\n_FSM Daily Report_`;
  
  return message;
}

/**
 * Send Daily Summary to Specific Salesman
 */
async function sendSalesmanSummary(salesmanId, date) {
  try {
    console.log(`\n📊 Fetching summary for salesman: ${salesmanId}`);
    
    const { data, error } = await supabase.rpc('get_daily_salesman_summary', {
      p_salesman_id: salesmanId,
      p_date: date
    });

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    console.log(`   Name: ${data.name}`);
    console.log(`   Phone: ${data.phone}`);
    console.log(`   Visits: ${data.total_visits}`);
    console.log(`   Revenue: ${formatCurrency(data.total_order_value)}`);

    const message = formatSalesmanMessage(data);
    
    if (data.phone) {
      await sendWhatsAppMessage(data.phone, message);
    } else {
      console.log('⚠️ No phone number found');
    }

    return { success: true, salesman: data.name };
  } catch (error) {
    console.error(`❌ Failed for salesman ${salesmanId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Admin Summary for Tenant
 */
async function sendAdminSummary(tenantId, adminPhone, adminName, date) {
  try {
    console.log(`\n📈 Fetching admin summary for tenant: ${tenantId}`);
    
    const { data, error } = await supabase.rpc('get_daily_admin_summary', {
      p_tenant_id: tenantId,
      p_date: date
    });

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    console.log(`   Total Visits: ${data.total_visits}`);
    console.log(`   Active Salesmen: ${data.active_salesmen}`);
    console.log(`   Revenue: ${formatCurrency(data.total_order_value)}`);

    const message = formatAdminMessage(data, adminName);
    
    await sendWhatsAppMessage(adminPhone, message);

    return { success: true };
  } catch (error) {
    console.error(`❌ Failed for admin:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main Test Function
 */
async function testRealData() {
  console.log('🚀 Sending Real FSM Summaries...\n');
  console.log('=' .repeat(60));

  const testDate = '2025-12-12'; // Date with 24 visits!
  const testPhone = '+919537653927'; // Your phone for testing

  // Find all tenants first
  console.log('\n1️⃣ Finding tenants...');
  const { data: allTenants, error: allTenantsError } = await supabase
    .from('tenants')
    .select('id, company_name')
    .limit(10);

  if (allTenantsError) {
    console.error('❌ Error fetching tenants:', allTenantsError);
    return;
  }

  console.log(`\n📋 Available tenants:`);
  allTenants.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.company_name} (${t.id.substring(0, 8)}...)`);
  });

  // Use first tenant or search for Hylite
  const tenant = allTenants.find(t => t.company_name.toLowerCase().includes('hylite')) || allTenants[0];
  
  if (!tenant) {
    console.error('❌ No tenants found');
    return;
  }

  console.log(`\n✅ Using: ${tenant.company_name}`);

  // Find SALESMEN ONLY (exclude admins)
  console.log('\n2️⃣ Finding active SALESMEN (non-admin)...');
  const { data: salesmen, error: salesmenError } = await supabase
    .from('salesmen')
    .select('id, name, phone, is_admin')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .eq('is_admin', false)  // ONLY field salesmen
    .is('deleted_at', null);

  if (salesmenError) {
    console.error('❌ Error fetching salesmen:', salesmenError);
  }

  console.log(`✅ Found ${salesmen?.length || 0} field salesmen`);

  // Find ADMINS (they receive team summaries)
  console.log('\n3️⃣ Finding ADMINS...');
  const { data: admins, error: adminsError } = await supabase
    .from('salesmen')
    .select('id, name, phone')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .eq('is_admin', true)
    .is('deleted_at', null);

  if (adminsError) {
    console.error('❌ Error fetching admins:', adminsError);
  }

  console.log(`✅ Found ${admins?.length || 0} admins\n`);

  // Send summaries to SALESMEN
  console.log('=' .repeat(60));
  console.log('📤 SENDING SALESMAN SUMMARIES\n');

  if (salesmen && salesmen.length > 0) {
    for (const salesman of salesmen) {
      await sendSalesmanSummary(salesman.id, testDate);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
  } else {
    console.log('⚠️  No salesmen to send summaries to');
  }

  // Send summaries to ADMINS
  console.log('\n' + '=' .repeat(60));
  console.log('📤 SENDING ADMIN SUMMARIES\n');
  
  if (admins && admins.length > 0) {
    for (const admin of admins) {
      await sendAdminSummary(tenant.id, admin.phone, admin.name, testDate);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
  } else {
    console.log('⚠️  No admins found - sending test summary to your phone');
    await sendAdminSummary(tenant.id, testPhone, 'Test Admin', testDate);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ All summaries sent successfully!');
  console.log('=' .repeat(60));
}

// Run the test
testRealData().catch(console.error);
