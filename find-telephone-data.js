require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function findTelephoneData() {
  console.log('Finding telephone calls data...\n');
  
  // First, check all visit types
  const { data: allTypes, error: typeError } = await supabase
    .from('visits')
    .select('visit_type')
    .limit(100);
    
  console.log('Sample visit types in database:');
  if (typeError) {
    console.log('Error:', typeError);
  } else {
    const types = [...new Set(allTypes.map(v => v.visit_type))];
    console.log('Distinct types:', types);
  }
  
  // Get visits with telephone type and tenant info
  const { data: visits, error } = await supabase
    .from('visits')
    .select(`
      id,
      visit_type,
      created_at,
      tenant_id,
      tenants(company_name)
    `)
    .eq('visit_type', 'telephone')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.log('\nError fetching telephone visits:', error);
    return;
  }
  
  if (!visits || visits.length === 0) {
    console.log('\n⚠️ No telephone visits found');
    return;
  }
  
  console.log('\nRecent telephone calls:');
  visits.forEach(v => {
    const date = v.created_at.split('T')[0];
    console.log(`- ${date}: ${v.tenants.company_name} (tenant_id: ${v.tenant_id})`);
  });
  
  // Group by date and tenant
  const byDateTenant = {};
  visits.forEach(v => {
    const date = v.created_at.split('T')[0];
    const key = `${date}_${v.tenants.company_name}`;
    if (!byDateTenant[key]) {
      byDateTenant[key] = {
        date: date,
        company: v.tenants.company_name,
        tenant_id: v.tenant_id,
        count: 0
      };
    }
    byDateTenant[key].count++;
  });
  
  console.log('\nGrouped by date and company:');
  Object.values(byDateTenant).forEach(g => {
    console.log(`- ${g.date}: ${g.company} - ${g.count} telephone calls`);
  });
  
  // Pick the first one with data
  const first = Object.values(byDateTenant)[0];
  console.log(`\n✅ Using: ${first.date} for ${first.company} (${first.count} telephone calls)`);
  
  return first;
}

findTelephoneData().catch(console.error);
