require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const SAK_API_KEY = process.env.SAK_API_KEY;
const SAK_SESSION_ID = process.env.SAK_SESSION_ID;
const SAK_BASE_URL = process.env.SAK_BASE_URL;

const TEST_PHONES = (process.env.TEST_PHONES || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

if (TEST_PHONES.length === 0) {
  console.error('Missing TEST_PHONES env (comma-separated).');
  process.exit(1);
}

async function sendWhatsAppMessage(phone, message) {
  const response = await fetch(`${SAK_BASE_URL}/api/v1/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SAK_API_KEY,
      'x-session-id': SAK_SESSION_ID
    },
    body: JSON.stringify({
      to: phone.replace(/\+/g, '').replace(/\s/g, ''),
      text: message
    })
  });

  const result = await response.json();
  if (!result.success) throw new Error(result.error?.message || 'Send failed');
  return result;
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

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount, timezone) {
  const symbol = String(timezone || '').includes('Cairo') ? 'EGP' : '₹';
  return symbol + ' ' + Math.round(Number(amount || 0)).toLocaleString('en-IN');
}

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

async function getTopSalesmanIdForDay(tenantId, date) {
  const { data, error } = await supabase
    .from('visits')
    .select('salesman_id')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${date}T23:59:59`)
    .is('deleted_at', null)
    .not('salesman_id', 'is', null);

  if (error) throw error;
  const counts = new Map();
  for (const row of data || []) {
    const id = row.salesman_id;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  let bestId = null;
  let best = -1;
  for (const [id, c] of counts.entries()) {
    if (c > best) {
      best = c;
      bestId = id;
    }
  }
  return bestId;
}

async function main() {
  const tenantPatterns = ['%Gazelle%', '%Hylite%'];

  for (const pat of tenantPatterns) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, company_name, timezone, weekend_days')
      .ilike('company_name', pat)
      .eq('is_active', true)
      .order('company_name', { ascending: true })
      .limit(1)
      .single();

    if (error || !tenant) {
      console.warn(`Skipping tenant ${pat}: not found`);
      continue;
    }

    const tenantDate = getTenantLocalDate(tenant.timezone);

    const { count, error: countErr } = await supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', `${tenantDate}T00:00:00`)
      .lt('created_at', `${tenantDate}T23:59:59`)
      .is('deleted_at', null);

    if (countErr || (count || 0) === 0) {
      console.log(`No visits for ${tenant.company_name} on ${tenantDate}; skipping test sends.`);
      continue;
    }

    const { data: adminData, error: adminErr } = await supabase.rpc('get_daily_admin_summary', {
      p_tenant_id: tenant.id,
      p_date: tenantDate
    });
    if (adminErr) throw adminErr;

    const adminMessage = formatAdminMessage(adminData, 'Admin', tenant.timezone, tenant.company_name);

    const topSalesmanId = await getTopSalesmanIdForDay(tenant.id, tenantDate);
    let salesmanMessage = null;
    if (topSalesmanId) {
      const { data: salesmanData, error: smErr } = await supabase.rpc('get_daily_salesman_summary', {
        p_salesman_id: topSalesmanId,
        p_date: tenantDate
      });
      if (smErr) throw smErr;
      if (salesmanData) salesmanMessage = formatSalesmanMessage(salesmanData, tenant.timezone, tenant.company_name);
    }

    for (const phone of TEST_PHONES) {
      console.log(`Sending ${tenant.company_name} daily admin report to ${phone}...`);
      await sendWhatsAppMessage(phone, adminMessage);

      if (salesmanMessage) {
        console.log(`Sending ${tenant.company_name} sample salesman report to ${phone}...`);
        await sendWhatsAppMessage(phone, salesmanMessage);
      }

      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
