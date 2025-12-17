require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const SAK_API_KEY = process.env.SAK_API_KEY;
const SAK_SESSION_ID = process.env.SAK_SESSION_ID;
const SAK_BASE_URL = process.env.SAK_BASE_URL;

const TEST_PHONE = process.env.TEST_PHONE || '+919537653927';

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

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount, timezone, tenantCurrencySymbol) {
  const symbol = (tenantCurrencySymbol && String(tenantCurrencySymbol).trim())
    ? String(tenantCurrencySymbol).trim()
    : (String(timezone || '').includes('Cairo') ? 'EGP' : '₹');
  return symbol + ' ' + Math.round(Number(amount || 0)).toLocaleString('en-IN');
}

function formatSalesmanMessage(data, timezone, companyName, currencySymbol) {
  const date = formatDate(data.date);
  const currency = (amount) => formatCurrency(amount, timezone, currencySymbol);

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

function formatAdminMessage(data, timezone, companyName, currencySymbol) {
  const date = formatDate(data.date);
  const currency = (amount) => formatCurrency(amount, timezone, currencySymbol);

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

async function getTenant(nameLike) {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_name, timezone, currency_symbol')
    .ilike('company_name', nameLike)
    .eq('is_active', true)
    .order('company_name', { ascending: true })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

async function getLatestVisitDate(tenantId) {
  const { data, error } = await supabase
    .from('visits')
    .select('created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return String(data[0].created_at).slice(0, 10);
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
    counts.set(row.salesman_id, (counts.get(row.salesman_id) || 0) + 1);
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

async function sendTenantSamples(nameLike) {
  const tenant = await getTenant(nameLike);
  const latestDate = await getLatestVisitDate(tenant.id);

  if (!latestDate) {
    await sendWhatsAppMessage(TEST_PHONE, `No visits found for ${tenant.company_name} (cannot generate sample).`);
    return;
  }

  const { data: adminData, error: adminErr } = await supabase.rpc('get_daily_admin_summary', {
    p_tenant_id: tenant.id,
    p_date: latestDate
  });
  if (adminErr) throw adminErr;

  const adminMessage = formatAdminMessage(adminData, tenant.timezone, tenant.company_name, tenant.currency_symbol);
  await sendWhatsAppMessage(TEST_PHONE, adminMessage);

  const topSalesmanId = await getTopSalesmanIdForDay(tenant.id, latestDate);
  if (!topSalesmanId) return;

  const { data: salesmanData, error: smErr } = await supabase.rpc('get_daily_salesman_summary', {
    p_salesman_id: topSalesmanId,
    p_date: latestDate
  });
  if (smErr) throw smErr;
  if (!salesmanData) return;

  const salesmanMessage = formatSalesmanMessage(salesmanData, tenant.timezone, tenant.company_name, tenant.currency_symbol);
  await sendWhatsAppMessage(TEST_PHONE, salesmanMessage);
}

async function main() {
  const tenants = ['%Hylite%', '%Gazelle%', '%Crescent%'];

  for (const nameLike of tenants) {
    await sendTenantSamples(nameLike);
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
