/**
 * WhatsApp Summary API
 * Endpoints to send daily/weekly summaries to salesmen and admins
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_SERVICE_KEY || 'your-service-key'
);

/**
 * Format message template with data
 */
function formatSalesmanDailyMessage(data) {
  const date = new Date(data.date).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  
  return `📊 *Daily Summary - ${date}*

Hi ${data.name},

✅ *Today's Performance:*
🎯 Total Visits: ${data.total_visits}
✨ New Customers: ${data.new_customers}
🔄 Repeat Customers: ${data.repeat_customers}
💰 Total Orders: ₹${data.total_order_value.toLocaleString('en-IN')}

${data.high_potential_visits > 0 ? `⭐ High Potential Visits: ${data.high_potential_visits}\n` : ''}${data.pending_followups > 0 ? `📅 Pending Follow-ups: ${data.pending_followups}\n` : ''}
Keep up the great work! 💪

_Automated by FSM System_`;
}

function formatAdminDailyMessage(data, adminName) {
  const date = new Date(data.date).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
  
  let message = `📈 *Daily Team Report - ${date}*

Hello ${adminName},

*Overall Performance:*
👥 Active Salesmen: ${data.active_salesmen}
🎯 Total Visits: ${data.total_visits}
✨ New Customers: ${data.new_customers}
💰 Total Revenue: ₹${data.total_order_value.toLocaleString('en-IN')}

*Top Performers:*\n`;

  if (data.top_performers && data.top_performers.length > 0) {
    data.top_performers.forEach(p => {
      message += `🏆 ${p.name}: ${p.visits} visits, ₹${p.revenue.toLocaleString('en-IN')}\n`;
    });
  } else {
    message += 'No visits recorded today\n';
  }

  if (data.alerts && data.alerts.length > 0) {
    message += `\n⚠️ *Alerts:*\n`;
    data.alerts.forEach(alert => {
      message += `• ${alert.message}\n`;
    });
  }

  message += `\n_FSM Management System_`;
  
  return message;
}

/**
 * Send WhatsApp message via API
 * Replace this with your actual WhatsApp integration
 */
async function sendWhatsAppMessage(phone, message, tenantId, userId = null) {
  try {
    console.log(`📱 Sending WhatsApp to ${phone}...`);
    console.log('Message:', message);
    
    // TODO: Replace with actual WhatsApp API call
    // Example using Baileys or WhatsApp Business API:
    // const result = await whatsappClient.sendMessage(phone + '@s.whatsapp.net', { text: message });
    
    // For now, log to database
    const { error } = await supabase.from('whatsapp_message_log').insert({
      tenant_id: tenantId,
      recipient_phone: phone,
      recipient_user_id: userId,
      message_type: 'summary',
      message_content: message,
      status: 'pending', // Change to 'sent' when WhatsApp API is integrated
      sent_at: new Date().toISOString(),
    });

    if (error) throw error;

    console.log(`✅ Message logged for ${phone}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    
    // Log error
    await supabase.from('whatsapp_message_log').insert({
      tenant_id: tenantId,
      recipient_phone: phone,
      message_type: 'summary',
      message_content: message,
      status: 'failed',
      error_message: error.message,
    });
    
    throw error;
  }
}

/**
 * API: Send daily summary to a specific salesman
 */
async function sendDailySalesmanSummary(req, res) {
  try {
    const { salesmanId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Get summary data
    const { data, error } = await supabase.rpc('get_daily_salesman_summary', {
      p_salesman_id: salesmanId,
      p_date: date
    });

    if (error) throw error;
    if (!data) throw new Error('Salesman not found or no data');

    // Format message
    const message = formatSalesmanDailyMessage(data);

    // Send WhatsApp (uncomment when WhatsApp is integrated)
    // await sendWhatsAppMessage(data.phone, message, data.tenant_id, salesmanId);

    res.json({
      success: true,
      message: 'Summary prepared (WhatsApp integration pending)',
      data: {
        salesman: data.name,
        phone: data.phone,
        summary: data,
        whatsapp_message: message
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * API: Send daily summary to all salesmen in tenant
 */
async function sendDailySummaryToAllSalesmen(req, res) {
  try {
    const tenantId = req.user?.tenant_id || req.body.tenant_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    // Get all active salesmen
    const { data: salesmen, error } = await supabase
      .from('salesmen')
      .select('id, name, phone, tenant_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (error) throw error;

    const results = [];
    
    for (const salesman of salesmen || []) {
      try {
        // Get summary
        const { data: summary, error: summaryError } = await supabase.rpc('get_daily_salesman_summary', {
          p_salesman_id: salesman.id,
          p_date: date
        });

        if (summaryError) throw summaryError;

        const message = formatSalesmanDailyMessage(summary);
        
        // Send WhatsApp (uncomment when integrated)
        // await sendWhatsAppMessage(salesman.phone, message, tenantId, salesman.id);

        results.push({
          salesman: salesman.name,
          phone: salesman.phone,
          success: true,
          visits: summary.total_visits
        });
      } catch (err) {
        console.error(`Failed for ${salesman.name}:`, err);
        results.push({
          salesman: salesman.name,
          success: false,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} salesmen`,
      data: results
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * API: Send daily admin summary
 */
async function sendDailyAdminSummary(req, res) {
  try {
    const tenantId = req.user?.tenant_id || req.body.tenant_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    // Get summary data
    const { data: summary, error } = await supabase.rpc('get_daily_admin_summary', {
      p_tenant_id: tenantId,
      p_date: date
    });

    if (error) throw error;

    // Get admin users
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'super_admin'])
      .eq('is_active', true);

    if (adminError) throw adminError;

    const results = [];

    for (const admin of admins || []) {
      try {
        const message = formatAdminDailyMessage(summary, admin.name);
        
        // Send WhatsApp (uncomment when integrated)
        // await sendWhatsAppMessage(admin.phone, message, tenantId, admin.id);

        results.push({
          admin: admin.name,
          phone: admin.phone,
          success: true
        });
      } catch (err) {
        console.error(`Failed for ${admin.name}:`, err);
        results.push({
          admin: admin.name,
          success: false,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: `Admin summaries prepared for ${results.length} admins`,
      data: {
        summary,
        recipients: results,
        sample_message: formatAdminDailyMessage(summary, 'Admin')
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * API: Test summary generation (preview only)
 */
async function previewSummary(req, res) {
  try {
    const { type, id } = req.query;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    let data, message;

    if (type === 'salesman') {
      const { data: summary, error } = await supabase.rpc('get_daily_salesman_summary', {
        p_salesman_id: id,
        p_date: date
      });
      if (error) throw error;
      data = summary;
      message = formatSalesmanDailyMessage(summary);
    } else if (type === 'admin') {
      const { data: summary, error } = await supabase.rpc('get_daily_admin_summary', {
        p_tenant_id: id,
        p_date: date
      });
      if (error) throw error;
      data = summary;
      message = formatAdminDailyMessage(summary, 'Admin');
    } else {
      return res.status(400).json({ success: false, error: 'Invalid type (salesman/admin)' });
    }

    res.json({
      success: true,
      data: {
        raw_data: data,
        formatted_message: message
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  sendDailySalesmanSummary,
  sendDailySummaryToAllSalesmen,
  sendDailyAdminSummary,
  previewSummary
};
