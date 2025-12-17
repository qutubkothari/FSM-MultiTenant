require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getHyliteVisitTypes() {
  // Get Hylite tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name')
    .ilike('company_name', '%hylite%')
    .single();
  
  console.log('Company:', tenant.company_name, '\n');
  
  // Get all visits with user info
  const { data: visits, error } = await supabase
    .from('visits')
    .select(`
      visit_type,
      salesman_id,
      salesman:salesman_id(name)
    `)
    .eq('tenant_id', tenant.id)
    .not('visit_type', 'is', null);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!visits || visits.length === 0) {
    console.log('No visits found');
    return;
  }
  
  // Summarize by salesman
  const summary = {};
  visits.forEach(v => {
    const name = v.salesman?.name || 'Unknown';
    if (!summary[name]) {
      summary[name] = { personal: 0, telephone: 0 };
    }
    summary[name][v.visit_type]++;
  });
  
  console.log('Visit Type Breakdown by Salesman:\n');
  console.log('='.repeat(50) + '\n');
  
  Object.entries(summary)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([name, counts]) => {
      const total = counts.personal + counts.telephone;
      console.log(`${name}:`);
      console.log(`  🚶 Personal Visits: ${counts.personal}`);
      console.log(`  📞 Telephone Calls: ${counts.telephone}`);
      console.log(`  📊 Total: ${total}\n`);
    });
  
  // Overall summary
  const totals = Object.values(summary).reduce(
    (acc, curr) => ({
      personal: acc.personal + curr.personal,
      telephone: acc.telephone + curr.telephone
    }),
    { personal: 0, telephone: 0 }
  );
  
  console.log('='.repeat(50));
  console.log('\n📈 OVERALL SUMMARY:');
  console.log(`  🚶 Total Personal Visits: ${totals.personal}`);
  console.log(`  📞 Total Telephone Calls: ${totals.telephone}`);
  console.log(`  📊 Grand Total: ${totals.personal + totals.telephone}\n`);
}

getHyliteVisitTypes().catch(console.error);
