require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const SAK_API_KEY = process.env.SAK_API_KEY;
const SAK_SESSION_ID = process.env.SAK_SESSION_ID;
const SAK_BASE_URL = process.env.SAK_BASE_URL;

const START_DATE = '2025-12-01';
const END_DATE = '2025-12-15';

// Where to send test messages (your number)
const TEST_PHONE = '9537653927';

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
  if (!result.success) {
    throw new Error(result.error?.message || 'Send failed');
  }
  return result;
}

function formatDateRange(startDate, endDate) {
  const start = new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} - ${end}`;
}

function makeCurrencyFormatter(tenant) {
  // Prefer tenant currency_symbol, fallback by timezone.
  const currencyPrefix = (tenant.currency_symbol && String(tenant.currency_symbol).trim())
    ? String(tenant.currency_symbol).trim()
    : (String(tenant.timezone || '').includes('Cairo') ? 'EGP' : '₹');

  return (amount) => {
    const safeAmount = Math.round(Number(amount || 0));
    return `${currencyPrefix} ${safeAmount.toLocaleString('en-IN')}`;
  };
}

async function getPlantsMap(tenantId) {
  const { data, error } = await supabase
    .from('plants')
    .select('id, plant_name')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
  if (error) throw error;
  const map = new Map();
  (data || []).forEach((p) => map.set(String(p.id), p.plant_name));
  return map;
}

async function getTenantByNameLike(nameLike) {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_name, timezone, currency_symbol, currency_code')
    .ilike('company_name', nameLike)
    .eq('is_active', true)
    .order('company_name', { ascending: true })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
}

async function getTenantAdminUser(tenantId) {
  // Prefer active role=admin, else active role=super_admin.
  const { data, error } = await supabase
    .from('users')
    .select('name, phone, role, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .in('role', ['admin', 'super_admin'])
    .order('role', { ascending: true });

  if (error) throw error;
  const admins = data || [];
  const admin = admins.find((u) => u.role === 'admin') || admins.find((u) => u.role === 'super_admin');
  return admin || { name: 'Admin', phone: null, role: 'admin', is_active: true };
}

async function getVisitsForPeriod(tenantId, startDate, endDate) {
  const { data, error } = await supabase
    .from('visits')
    .select('visit_type, order_value, salesman_name, plant, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)
    .is('deleted_at', null)
    .not('visit_type', 'is', null)
    .not('salesman_name', 'is', null);

  if (error) throw error;
  return data || [];
}

function summarizeBySalesman(visits, plantsMap) {
  const statsByName = new Map();

  for (const v of visits) {
    const name = String(v.salesman_name || '').trim() || 'Unknown';
    if (!statsByName.has(name)) {
      statsByName.set(name, {
        personal_visits: 0,
        telephone_calls: 0,
        personal_revenue: 0,
        telephone_revenue: 0,
        total_revenue: 0,
        plantCounts: new Map()
      });
    }

    const s = statsByName.get(name);
    const revenue = Number(v.order_value || 0);

    if (v.visit_type === 'personal') {
      s.personal_visits += 1;
      s.personal_revenue += revenue;
    } else if (v.visit_type === 'telephone') {
      s.telephone_calls += 1;
      s.telephone_revenue += revenue;
    }
    s.total_revenue += revenue;

    const plantId = v.plant ? String(v.plant) : '';
    if (plantId) {
      s.plantCounts.set(plantId, (s.plantCounts.get(plantId) || 0) + 1);
    }
  }

  // Convert to plain object array and compute plant name.
  const result = [];
  for (const [name, s] of statsByName.entries()) {
    let plantName;
    if (s.plantCounts.size > 0) {
      let bestId = null;
      let bestCount = -1;
      for (const [pid, c] of s.plantCounts.entries()) {
        if (c > bestCount) {
          bestId = pid;
          bestCount = c;
        }
      }
      plantName = plantsMap.get(bestId) || 'Branch';
    } else {
      plantName = 'HQ';
    }

    result.push({
      name,
      plant: plantName,
      ...s
    });
  }

  // Remove plantCounts from payload
  result.forEach((r) => delete r.plantCounts);

  // Sort by total revenue desc, then activities desc
  result.sort((a, b) => {
    const byRevenue = (b.total_revenue || 0) - (a.total_revenue || 0);
    if (byRevenue !== 0) return byRevenue;
    const aAct = (a.personal_visits || 0) + (a.telephone_calls || 0);
    const bAct = (b.personal_visits || 0) + (b.telephone_calls || 0);
    return bAct - aAct;
  });

  return result;
}

function formatManagementPeriodMessage({ tenant, adminName, salesmenStats, startDate, endDate }) {
  const range = formatDateRange(startDate, endDate);
  const currency = makeCurrencyFormatter(tenant);

  let message = `📊 *Revenue & Activity Report*\n`;
  message += `${tenant.company_name}\n`;
  message += `${range}\n`;
  message += `*Test Period Report (15 days)*\n\n`;

  message += `Dear *${adminName}*,\n\n`;

  message += `*Team Performance*\n`;
  message += `${'─'.repeat(40)}\n\n`;

  let totalPersonalVisits = 0;
  let totalTelephoneCalls = 0;
  let totalRevenue = 0;

  salesmenStats.forEach((s) => {
    const totalActivities = (s.personal_visits || 0) + (s.telephone_calls || 0);
    totalPersonalVisits += (s.personal_visits || 0);
    totalTelephoneCalls += (s.telephone_calls || 0);
    totalRevenue += (s.total_revenue || 0);

    message += `*${s.name} [${s.plant}]*\n`;
    message += `🎯 Activities: ${totalActivities} (🚶 ${s.personal_visits || 0} + 📞 ${s.telephone_calls || 0})\n`;
    message += `💰 Revenue: ${currency(s.total_revenue || 0)}\n`;
    message += `   • Personal: ${currency(s.personal_revenue || 0)}\n`;
    message += `   • Telephone: ${currency(s.telephone_revenue || 0)}\n\n`;
  });

  message += `${'─'.repeat(40)}\n`;
  message += `*TOTAL SUMMARY*\n`;
  message += `👥 Team Members: ${salesmenStats.length}\n`;
  message += `🎯 Total Activities: ${totalPersonalVisits + totalTelephoneCalls}\n`;
  message += `   • Personal Visits: ${totalPersonalVisits}\n`;
  message += `   • Telephone Calls: ${totalTelephoneCalls}\n`;
  message += `💰 *Total Revenue: ${currency(totalRevenue)}*\n\n`;
  message += `_${tenant.company_name} FSM Report_`;

  return message;
}

function formatSalesmanPeriodMessage({ tenant, salesmanName, stats, startDate, endDate }) {
  const range = formatDateRange(startDate, endDate);
  const currency = makeCurrencyFormatter(tenant);
  const totalActivities = (stats.personal_visits || 0) + (stats.telephone_calls || 0);

  let message = `📈 *Your Activity Report*\n`;
  message += `${tenant.company_name}\n`;
  message += `${range}\n`;
  message += `*Test Period Report (15 days)*\n\n`;

  message += `Hello *${salesmanName}*,\n`;
  message += `📍 Branch: *${stats.plant}*\n\n`;

  message += `*Your Performance Summary*\n`;
  message += `${'─'.repeat(35)}\n\n`;

  message += `🎯 Total Activities: ${totalActivities}\n\n`;

  message += `🚶 *Personal Visits*\n`;
  message += `   Count: ${stats.personal_visits || 0}\n`;
  message += `   Revenue: ${currency(stats.personal_revenue || 0)}\n`;
  if ((stats.personal_visits || 0) > 0) {
    message += `   Avg per visit: ${currency(Math.round((stats.personal_revenue || 0) / stats.personal_visits))}\n`;
  }
  message += `\n`;

  message += `📞 *Telephone Calls*\n`;
  message += `   Count: ${stats.telephone_calls || 0}\n`;
  message += `   Revenue: ${currency(stats.telephone_revenue || 0)}\n`;
  if ((stats.telephone_calls || 0) > 0) {
    message += `   Avg per call: ${currency(Math.round((stats.telephone_revenue || 0) / stats.telephone_calls))}\n`;
  }
  message += `\n`;

  message += `${'─'.repeat(35)}\n`;
  message += `💰 *Total Revenue: ${currency(stats.total_revenue || 0)}*\n\n`;

  if ((stats.telephone_calls || 0) > (stats.personal_visits || 0) * 2) {
    message += `Consider balancing with more personal visits for better engagement! 🚶\n\n`;
  } else {
    message += `Keep up the excellent work! 💪\n\n`;
  }

  message += `_${tenant.company_name} FSM Report_`;

  return message;
}

async function buildTenantPeriodReport(tenant, startDate, endDate) {
  const [admin, plantsMap, visits] = await Promise.all([
    getTenantAdminUser(tenant.id),
    getPlantsMap(tenant.id),
    getVisitsForPeriod(tenant.id, startDate, endDate)
  ]);

  const salesmenStats = summarizeBySalesman(visits, plantsMap);

  // pick one salesman (top by revenue) for the single salesman message
  const topSalesman = salesmenStats[0];

  return {
    tenant,
    admin,
    salesmenStats,
    topSalesman
  };
}

async function main() {
  console.log(`Generating TEST period reports ${START_DATE}..${END_DATE}`);

  const [hyliteTenant, gazelleTenant] = await Promise.all([
    getTenantByNameLike('%hylite%'),
    // Prefer the operational Gazelle tenant
    getTenantByNameLike('%gazelle envelopes%').catch(async () => getTenantByNameLike('%gazelle%'))
  ]);

  const [hyliteReport, gazelleReport] = await Promise.all([
    buildTenantPeriodReport(hyliteTenant, START_DATE, END_DATE),
    buildTenantPeriodReport(gazelleTenant, START_DATE, END_DATE)
  ]);

  const messages = [];

  // Gazelle management
  messages.push({
    label: `Gazelle - Management`,
    text: formatManagementPeriodMessage({
      tenant: gazelleReport.tenant,
      adminName: gazelleReport.admin.name,
      salesmenStats: gazelleReport.salesmenStats,
      startDate: START_DATE,
      endDate: END_DATE
    })
  });

  // Gazelle salesman (top)
  if (gazelleReport.topSalesman) {
    messages.push({
      label: `Gazelle - Salesman (${gazelleReport.topSalesman.name})`,
      text: formatSalesmanPeriodMessage({
        tenant: gazelleReport.tenant,
        salesmanName: gazelleReport.topSalesman.name,
        stats: gazelleReport.topSalesman,
        startDate: START_DATE,
        endDate: END_DATE
      })
    });
  }

  // Hylite management
  messages.push({
    label: `Hylite - Management`,
    text: formatManagementPeriodMessage({
      tenant: hyliteReport.tenant,
      adminName: hyliteReport.admin.name,
      salesmenStats: hyliteReport.salesmenStats,
      startDate: START_DATE,
      endDate: END_DATE
    })
  });

  // Hylite salesman (top)
  if (hyliteReport.topSalesman) {
    messages.push({
      label: `Hylite - Salesman (${hyliteReport.topSalesman.name})`,
      text: formatSalesmanPeriodMessage({
        tenant: hyliteReport.tenant,
        salesmanName: hyliteReport.topSalesman.name,
        stats: hyliteReport.topSalesman,
        startDate: START_DATE,
        endDate: END_DATE
      })
    });
  }

  console.log(`\nSending ${messages.length} messages to +${TEST_PHONE} for review...\n`);

  for (const m of messages) {
    console.log('='.repeat(60));
    console.log(m.label);
    console.log('='.repeat(60));
    console.log(m.text);
    console.log('\n');

    const res = await sendWhatsAppMessage(TEST_PHONE, m.text);
    console.log(`✅ Sent (${m.label}) messageId=${res.data?.messageId}`);

    // small delay between sends
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
});
