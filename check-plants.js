require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkPlants() {
  console.log('Checking plant/branch data...\n');
  
  // Check plants table if exists
  const { data: plants, error: plantError } = await supabase
    .from('plants')
    .select('*');
  
  if (!plantError && plants) {
    console.log('Plants table:');
    plants.forEach(p => console.log(`  - ${p.plant_name} (${p.city})`));
    console.log('');
  }
  
  // Check salesmen with plant info
  const { data: salesmen } = await supabase
    .from('salesmen')
    .select('name, plant, tenants(company_name)')
    .not('plant', 'is', null)
    .limit(20);
  
  console.log('Salesmen with plant assignments:');
  salesmen.forEach(s => {
    console.log(`  - ${s.name}: ${s.plant || 'No plant'} (${s.tenants?.company_name})`);
  });
}

checkPlants().catch(console.error);
