const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 8080;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BASE_URL = process.env.SAK_BASE_URL;
const API_KEY = process.env.SAK_API_KEY;
const SESSION_ID = process.env.SAK_SESSION_ID;

// Middleware
app.use(express.json());

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
 * Check if today is a weekend for this tenant
 */
function isWeekend(weekendDays) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return weekendDays.includes(dayOfWeek);
}

/**
 * Check if tenant has any visits today
 */
async function hasVisitsToday(tenantId, date) {
  const { data, error } = await supabase
    .from('visits')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${date}T23:59:59`)
    .is('deleted_at', null);
  
  return !error && data && data.length > 0;
}

/**
 * Format date
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format currency based on tenant country
 */
function formatCurrency(amount, timezone) {
  const symbol = timezone.includes('Cairo') ? 'EGP' : '₹';
  return symbol + ' ' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Format Salesman Message
 */
function formatSalesmanMessage(data, timezone) {
  const date = formatDate(data.date);
  const currency = formatCurrency(data.total_order_value, timezone);
  
  let message = `📈 *Your Daily Report*\n`;
  message += `${date}\n\n`;
  message += `Hello *${data.name}*,\n\n`;
  
  message += `*Today's Performance*\n`;
  message += `🎯 Visits Completed: ${data.total_visits}\n`;
  message += `💰 Revenue Generated: ${currency}\n`;
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
 * Format Admin Message
 */
function formatAdminMessage(data, adminName, timezone) {
  const date = formatDate(data.date);
  const currency = formatCurrency(data.total_order_value, timezone);
  
  let message = `📊 *Daily Team Report*\n`;
  message += `${date}\n\n`;
  message += `Good Evening *${adminName}*,\n\n`;
  
  message += `*Performance Summary*\n`;
  message += `👥 Active Salesmen: ${data.active_salesmen}\n`;
  message += `🎯 Total Visits: ${data.total_visits}\n`;
  message += `💰 Revenue: ${currency}\n`;
  message += `✨ New: ${data.new_customers} | 🔄 Repeat: ${data.repeat_customers}\n\n`;

  if (data.top_performers && data.top_performers.length > 0) {
    message += `🏆 *Top Performers*\n`;
    data.top_performers.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const revenue = formatCurrency(p.revenue, timezone);
      message += `${medal} ${p.name} - ${p.visits} visits, ${revenue}\n`;
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
 * Process a single tenant
 */
async function processTenant(tenant, today) {
  console.log(`\n📋 Processing: ${tenant.company_name}`);
  console.log(`   Timezone: ${tenant.timezone}`);
  console.log(`   Weekend days: ${tenant.weekend_days} (${tenant.weekend_days.includes(5) ? 'Fri-Sat' : 'Sat-Sun'})`);

  // Check if today is a weekend for this tenant
  if (isWeekend(tenant.weekend_days)) {
    console.log(`   ⏭️  SKIPPED: Weekend day for ${tenant.company_name}`);
    return { sent: 0, skipped: 0, failed: 0, reason: 'weekend' };
  }

  // Check if there are any visits today
  const hasVisits = await hasVisitsToday(tenant.id, today);
  if (!hasVisits) {
    console.log(`   ⏭️  SKIPPED: No visits recorded today for ${tenant.company_name}`);
    return { sent: 0, skipped: 0, failed: 0, reason: 'no_visits' };
  }

  console.log(`   ✅ Has visits today, sending messages...`);

  let sent = 0;
  let failed = 0;

  // Get SALESMEN (exclude admins)
  const { data: salesmen } = await supabase
    .from('salesmen')
    .select('id, name, phone')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .eq('is_admin', false)
    .not('phone', 'is', null);

  // Get ADMINS
  const { data: admins } = await supabase
    .from('salesmen')
    .select('id, name, phone')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .eq('is_admin', true)
    .not('phone', 'is', null);

  // Send to SALESMEN
  if (salesmen && salesmen.length > 0) {
    for (const salesman of salesmen) {
      try {
        const { data } = await supabase.rpc('get_daily_salesman_summary', {
          p_salesman_id: salesman.id,
          p_date: today
        });

        if (data) {
          const message = formatSalesmanMessage(data, tenant.timezone);
          await sendWhatsAppMessage(salesman.phone, message);
          sent++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Failed for ${salesman.name}:`, error.message);
        failed++;
      }
    }
  }

  // Send to ADMINS
  if (admins && admins.length > 0) {
    const { data: adminData } = await supabase.rpc('get_daily_admin_summary', {
      p_tenant_id: tenant.id,
      p_date: today
    });

    if (adminData) {
      for (const admin of admins) {
        try {
          const message = formatAdminMessage(adminData, admin.name, tenant.timezone);
          await sendWhatsAppMessage(admin.phone, message);
          sent++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Failed for admin ${admin.name}:`, error.message);
          failed++;
        }
      }
    }
  }

  return { sent, skipped: 0, failed };
}

/**
 * CRON endpoint - triggered by Cloud Scheduler
 */
app.get('/cron/send-daily-summaries', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 FSM DAILY SUMMARY AUTOMATION - ${formatDate(today)}`);
  console.log('='.repeat(70) + '\n');

  try {
    // Get all active tenants with timezone info
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, company_name, timezone, weekend_days, notification_time')
      .eq('is_active', true)
      .order('company_name');

    if (tenantsError) throw tenantsError;

    console.log(`✅ Found ${tenants.length} active tenants\n`);

    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const skipReasons = { weekend: [], no_visits: [] };

    for (const tenant of tenants) {
      const result = await processTenant(tenant, today);
      totalSent += result.sent;
      totalSkipped += result.skipped;
      totalFailed += result.failed;
      
      if (result.reason === 'weekend') {
        skipReasons.weekend.push(tenant.company_name);
      } else if (result.reason === 'no_visits') {
        skipReasons.no_visits.push(tenant.company_name);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Completed!`);
    console.log(`   Sent: ${totalSent}`);
    console.log(`   Failed: ${totalFailed}`);
    if (skipReasons.weekend.length > 0) {
      console.log(`   Skipped (Weekend): ${skipReasons.weekend.join(', ')}`);
    }
    if (skipReasons.no_visits.length > 0) {
      console.log(`   Skipped (No Visits): ${skipReasons.no_visits.join(', ')}`);
    }
    console.log('='.repeat(70) + '\n');

    res.status(200).json({
      success: true,
      date: today,
      tenants: tenants.length,
      sent: totalSent,
      failed: totalFailed,
      skipped: {
        weekend: skipReasons.weekend,
        no_visits: skipReasons.no_visits
      }
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FSM WhatsApp Summary Automation',
    version: '2.0.0',
    features: ['timezone-aware', 'weekend-detection', 'visit-checking']
  });
});

/**
 * Manual trigger endpoint (for testing)
 */
app.post('/trigger-now', async (req, res) => {
  console.log('🔔 Manual trigger initiated');
  req.url = '/cron/send-daily-summaries';
  return app._router.handle(req, res);
});

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Summary Service v2.0 running on port ${PORT}`);
  console.log(`   ✓ Timezone-aware scheduling`);
  console.log(`   ✓ Weekend detection`);
  console.log(`   ✓ Visit checking`);
});

module.exports = app;
