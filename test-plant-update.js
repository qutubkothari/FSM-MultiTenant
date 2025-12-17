require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function updateAndTest() {
  console.log('Updating get_daily_admin_summary function...\n');
  
  // Read SQL file
  const sql = fs.readFileSync('database/update-admin-summary-with-plant.sql', 'utf8');
  
  // Execute SQL
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();
  
  if (error) {
    // Try direct execution
    console.log('Trying direct execution...');
    const { data, error: execError } = await supabase.from('_sql').select('*').limit(0);
    console.log('Note: SQL needs to be run manually in Supabase dashboard\n');
  }
  
  console.log('Testing updated function with Hylite...\n');
  
  // Get Hylite tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name')
    .ilike('company_name', '%hylite%')
    .single();
  
  // Test the function
  const { data, error: testError } = await supabase.rpc('get_daily_admin_summary', {
    p_tenant_id: tenant.id,
    p_date: '2025-12-01'
  });
  
  if (testError) {
    console.error('Error:', testError);
    return;
  }
  
  console.log('Top Performers with Plant Info:');
  console.log(JSON.stringify(data.top_performers, null, 2));
}

updateAndTest().catch(console.error);
