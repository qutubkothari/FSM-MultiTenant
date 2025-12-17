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
 * Format currency
 */
function formatCurrency(amount) {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Format Salesman Message
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
 * Format Admin Message
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
 * CRON endpoint - triggered by Cloud Scheduler
 */
app.get('/cron/send-daily-summaries', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 FSM DAILY SUMMARY AUTOMATION - ${formatDate(today)}`);
  console.log('='.repeat(70) + '\n');

  try {
    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, company_name')
      .order('company_name');

    if (tenantsError) throw tenantsError;

    console.log(`✅ Found ${tenants.length} tenants\n`);

    let totalSent = 0;
    let totalFailed = 0;

    for (const tenant of tenants) {
      console.log(`📋 Processing: ${tenant.company_name}`);

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
              const message = formatSalesmanMessage(data);
              await sendWhatsAppMessage(salesman.phone, message);
              totalSent++;
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error) {
            console.error(`❌ Failed for ${salesman.name}:`, error.message);
            totalFailed++;
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
              const message = formatAdminMessage(adminData, admin.name);
              await sendWhatsAppMessage(admin.phone, message);
              totalSent++;
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              console.error(`❌ Failed for admin ${admin.name}:`, error.message);
              totalFailed++;
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Completed! Sent: ${totalSent}, Failed: ${totalFailed}`);
    console.log('='.repeat(70) + '\n');

    res.status(200).json({
      success: true,
      date: today,
      tenants: tenants.length,
      sent: totalSent,
      failed: totalFailed
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
    version: '1.0.0'
  });
});

/**
 * Manual trigger endpoint (for testing)
 */
app.post('/trigger-now', async (req, res) => {
  console.log('🔔 Manual trigger initiated');
  // Redirect to cron endpoint
  req.url = '/cron/send-daily-summaries';
  return app._router.handle(req, res);
});

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Summary Service running on port ${PORT}`);
});

module.exports = app;
