require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkVisitDates() {
  console.log('🔍 Checking for dates with visit activity...\n');

  // Find Hylite tenant
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, company_name')
    .ilike('company_name', '%hylite%');

  if (!tenants || tenants.length === 0) {
    console.log('❌ Hylite tenant not found');
    return;
  }

  const hyliteTenant = tenants[0];
  console.log(`✅ Found: ${hyliteTenant.company_name}`);
  console.log(`   ID: ${hyliteTenant.id}\n`);

  // Check last 30 days for visit activity
  const { data: visits, error } = await supabase
    .from('visits')
    .select('id, created_at, salesman_id')
    .eq('tenant_id', hyliteTenant.id)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!visits || visits.length === 0) {
    console.log('⚠️  No visits found in last 30 days');
    
    // Check any visits ever
    const { data: anyVisits } = await supabase
      .from('visits')
      .select('id, created_at')
      .eq('tenant_id', hyliteTenant.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (anyVisits && anyVisits.length > 0) {
      console.log('\n📅 Last visits ever recorded:');
      anyVisits.forEach(v => {
        console.log(`   ${new Date(v.created_at).toLocaleDateString()} - ${new Date(v.created_at).toLocaleTimeString()}`);
      });
    } else {
      console.log('\n⚠️  No visits found at all for Hylite');
    }
    return;
  }

  // Group by date
  const dateCount = {};
  visits.forEach(v => {
    const date = new Date(v.created_at).toISOString().split('T')[0];
    dateCount[date] = (dateCount[date] || 0) + 1;
  });

  console.log('📊 Visit Activity (Last 30 days):\n');
  Object.entries(dateCount)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([date, count]) => {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      console.log(`   ${date} (${dayName}) - ${count} visits`);
    });

  const latestDate = Object.keys(dateCount).sort().reverse()[0];
  console.log(`\n✅ Most recent activity: ${latestDate} (${dateCount[latestDate]} visits)`);
  console.log(`\n💡 Update testDate to "${latestDate}" in send-real-summaries.js`);
}

checkVisitDates();
