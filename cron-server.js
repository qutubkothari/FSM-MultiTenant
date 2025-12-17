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

async function acquireDailySendLock(tenantId, reportDate, meta) {
  const { error } = await supabase
    .from('report_send_log')
    .insert({
      tenant_id: tenantId,
      report_date: reportDate,
      report_type: 'daily',
      meta: meta || null
    });

  if (!error) return { ok: true };

  // Unique violation => already sent.
  if (String(error.code) === '23505') return { ok: false, reason: 'already_sent' };

  // If log table isn't installed yet or blocked by RLS, fail closed to avoid spam.
  if (
    String(error.code) === '42P01' ||
    String(error.code) === '42501'
  ) {
    console.error('❌ report_send_log missing/blocked; skipping to avoid duplicates.');
    return { ok: false, reason: 'log_unavailable' };
  }

  console.error('❌ Failed to acquire send lock:', error);
  return { ok: false, reason: 'lock_error' };
}

function getTenantLocalDate(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch (_) {
    // fallback below
  }
  return new Date().toISOString().split('T')[0];
}

function getTenantLocalDayOfWeek(timezone) {
  const label = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(new Date());
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? new Date().getDay();
}

/**
 * Check if today is a weekend for this tenant (tenant-local)
 */
function isWeekend(weekendDays, timezone) {
  const dayOfWeek = getTenantLocalDayOfWeek(timezone); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return Array.isArray(weekendDays) && weekendDays.includes(dayOfWeek);
}

/**
 * Check if tenant has any visits today
 */
async function hasVisitsToday(tenantId, date) {
  const { count, error } = await supabase
    .from('visits')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${date}T23:59:59`)
    .is('deleted_at', null);
  
  return !error && (count || 0) > 0;
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
function formatSalesmanMessage(data, timezone, companyName) {
  const date = formatDate(data.date);
  const currency = (amount) => formatCurrency(amount, timezone);
  
  const totalActivities = (data.personal_visits || 0) + (data.telephone_calls || 0);
  
  let message = `📈 *Your Activity Report*\n`;
  message += `${date}\n\n`;
  message += `Hello *${data.name}*,\n\n`;
  
  message += `*Your Performance Summary*\n`;
  message += `${'─'.repeat(35)}\n\n`;
  
  message += `🎯 Total Activities: ${totalActivities}\n\n`;
  
  message += `🚶 *Personal Visits*\n`;
  message += `   Count: ${data.personal_visits || 0}\n`;
  const personalRevenue = data.personal_revenue || 0;
  message += `   Revenue: ${currency(personalRevenue)}\n`;
  if ((data.personal_visits || 0) > 0) {
    message += `   Avg per visit: ${currency(Math.round(personalRevenue / data.personal_visits))}\n`;
  }
  message += `\n`;
  
  message += `📞 *Telephone Calls*\n`;
  message += `   Count: ${data.telephone_calls || 0}\n`;
  const telephoneRevenue = data.telephone_revenue || 0;
  message += `   Revenue: ${currency(telephoneRevenue)}\n`;
  if ((data.telephone_calls || 0) > 0) {
    message += `   Avg per call: ${currency(Math.round(telephoneRevenue / data.telephone_calls))}\n`;
  }
  message += `\n`;
  
  message += `${'─'.repeat(35)}\n`;
  message += `💰 *Total Revenue: ${currency(data.total_order_value)}*\n\n`;
  
  if ((data.telephone_calls || 0) > (data.personal_visits || 0) * 2) {
    message += `Consider balancing with more personal visits for better engagement! 🚶\n\n`;
  }
  
  message += `_${companyName} FSM Report_`;

  return message;
}

/**
 * Format Admin Message
 */
function formatAdminMessage(data, adminName, timezone, companyName) {
  const date = formatDate(data.date);
  const currency = (amount) => formatCurrency(amount, timezone);
  
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
      message += `💰 Revenue: ${currency(p.revenue)}\n`;
      
      // Calculate revenue breakdown
      const personalRev = p.personal_revenue || 0;
      const telephoneRev = p.telephone_revenue || 0;
      message += `   • Personal: ${currency(personalRev)}\n`;
      message += `   • Telephone: ${currency(telephoneRev)}\n`;
      message += `\n`;
    });
  }
  
  message += `${'─'.repeat(35)}\n\n`;
  
  message += `*TOTAL SUMMARY*\n`;
  message += `👥 Team Members: ${data.active_salesmen}\n`;
  message += `🎯 Total Activities: ${data.total_visits}\n`;
  message += `   • Personal Visits: ${data.personal_visits || 0}\n`;
  message += `   • Telephone Calls: ${data.telephone_calls || 0}\n`;
  message += `💰 Total Revenue: ${currency(data.total_order_value)}\n\n`;

  message += `_${companyName} FSM Report_`;
  
  return message;
}

/**
 * Process a single tenant
 */
async function processTenant(tenant, requestMeta) {
  console.log(`\n📋 Processing: ${tenant.company_name}`);
  console.log(`   Timezone: ${tenant.timezone}`);
  console.log(`   Weekend days: ${tenant.weekend_days} (${tenant.weekend_days.includes(5) ? 'Fri-Sat' : 'Sat-Sun'})`);

  const tenantDate = getTenantLocalDate(tenant.timezone);
  console.log(`   Tenant date: ${tenantDate}`);

  const forceSend = Boolean(requestMeta?.forceSend);
  const dryRun = Boolean(requestMeta?.dryRun);
  if (dryRun) {
    console.log('   🧪 DRY RUN MODE: Messages will be logged but not sent');
  }
  if (!forceSend) {
    const lock = await acquireDailySendLock(tenant.id, tenantDate, requestMeta);
    if (!lock.ok) {
      console.log(`   ⏭️  SKIPPED: ${lock.reason}`);
      return { sent: 0, skipped: 0, failed: 0, reason: lock.reason };
    }
  } else {
    console.log('   ⚠️  Force send enabled (no dedupe lock)');
  }

  // Check if today is a weekend for this tenant
  if (isWeekend(tenant.weekend_days, tenant.timezone)) {
    console.log(`   ⏭️  SKIPPED: Weekend day for ${tenant.company_name}`);
    return { sent: 0, skipped: 0, failed: 0, reason: 'weekend' };
  }

  // Check if there are any visits today
  const hasVisits = await hasVisitsToday(tenant.id, tenantDate);
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
          p_date: tenantDate
        });

        if (data) {
          const message = formatSalesmanMessage(data, tenant.timezone, tenant.company_name);
          
          if (dryRun) {
            console.log(`\n   📱 [DRY RUN] Would send to ${salesman.name} (${salesman.phone}):`);
            console.log('   ' + '─'.repeat(50));
            console.log(message.split('\n').map(line => '   ' + line).join('\n'));
            console.log('   ' + '─'.repeat(50));
            sent++;
          } else {
            await sendWhatsAppMessage(salesman.phone, message);
            sent++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
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
      p_date: tenantDate
    });

    if (adminData) {
      for (const admin of admins) {
        try {
          const message = formatAdminMessage(adminData, admin.name, tenant.timezone, tenant.company_name);
          
          if (dryRun) {
            console.log(`\n   📱 [DRY RUN] Would send to ADMIN ${admin.name} (${admin.phone}):`);
            console.log('   ' + '─'.repeat(50));
            console.log(message.split('\n').map(line => '   ' + line).join('\n'));
            console.log('   ' + '─'.repeat(50));
            sent++;
          } else {
            await sendWhatsAppMessage(admin.phone, message);
            sent++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
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
  const tzFilter = req.query.tz ? String(req.query.tz) : null;
  const force = String(req.query.force || '').toLowerCase() === 'true';
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 FSM DAILY SUMMARY AUTOMATION - ${formatDate(today)}`);
  console.log('='.repeat(70) + '\n');

  try {
    // Get all active tenants with timezone info
    let tenantsQuery = supabase
      .from('tenants')
      .select('id, company_name, timezone, weekend_days, notification_time')
      .eq('is_active', true)

    if (tzFilter) {
      tenantsQuery = tenantsQuery.eq('timezone', tzFilter);
    }

    const { data: tenants, error: tenantsError } = await tenantsQuery.order('company_name');

    if (tenantsError) throw tenantsError;

    console.log(`✅ Found ${tenants.length} active tenants\n`);

    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const skipReasons = { weekend: [], no_visits: [] };

    const requestMeta = { tz: tzFilter, trigger_date_utc: today, forceSend: force };

    for (const tenant of tenants) {
      const result = await processTenant(tenant, requestMeta);
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
 * Dry-run test endpoint (logs messages without sending)
 */
app.post('/test/dry-run', async (req, res) => {
  console.log('🧪 Dry-run test initiated');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, company_name, timezone, weekend_days')
      .eq('is_active', true);

    if (!tenants || tenants.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active tenants found',
        tenants: 0
      });
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 DRY RUN TEST - ${today}`);
    console.log(`Active tenants: ${tenants.length}`);
    console.log('='.repeat(70));

    let totalProcessed = 0;
    let totalSkipped = 0;

    const skipReasons = {
      weekend: [],
      no_visits: [],
      lock_error: []
    };

    for (const tenant of tenants) {
      const result = await processTenant(tenant, { dryRun: true, forceSend: false });
      
      if (result.reason) {
        totalSkipped++;
        if (result.reason === 'weekend') skipReasons.weekend.push(tenant.company_name);
        else if (result.reason === 'no_visits') skipReasons.no_visits.push(tenant.company_name);
        else if (result.reason === 'lock_error' || result.reason === 'already_sent') skipReasons.lock_error.push(tenant.company_name);
      } else {
        totalProcessed += result.sent;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🧪 DRY RUN COMPLETE');
    console.log(`   Would send: ${totalProcessed} messages`);
    console.log(`   Skipped: ${totalSkipped} tenants`);
    if (skipReasons.weekend.length > 0) {
      console.log(`   Skipped (Weekend): ${skipReasons.weekend.join(', ')}`);
    }
    if (skipReasons.no_visits.length > 0) {
      console.log(`   Skipped (No Visits): ${skipReasons.no_visits.join(', ')}`);
    }
    if (skipReasons.lock_error.length > 0) {
      console.log(`   Skipped (Lock/Already Sent): ${skipReasons.lock_error.join(', ')}`);
    }
    console.log('='.repeat(70) + '\n');

    res.status(200).json({
      success: true,
      mode: 'dry-run',
      date: today,
      tenants: tenants.length,
      would_send: totalProcessed,
      skipped: totalSkipped,
      skip_reasons: skipReasons,
      note: 'No actual messages were sent - this was a test'
    });

  } catch (error) {
    console.error('❌ Dry-run test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
