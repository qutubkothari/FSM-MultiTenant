-- Check Hylite tenant configuration

SELECT 
  id,
  name,
  company_name,
  is_active,
  timezone,
  created_at
FROM tenants
WHERE id = '112f12b8-55e9-4de8-9fda-d58e37c75796';

-- Check if Hylite had IST timezone cron run on Dec 17 (today)
SELECT 
  rsl.tenant_id,
  rsl.report_date,
  rsl.created_at,
  rsl.meta,
  t.company_name,
  t.timezone
FROM report_send_log rsl
LEFT JOIN tenants t ON rsl.tenant_id = t.id
WHERE rsl.tenant_id = '112f12b8-55e9-4de8-9fda-d58e37c75796'
ORDER BY rsl.created_at DESC;

-- Get all tenants with their timezone and last send date
SELECT 
  t.id,
  t.company_name,
  t.timezone,
  t.is_active,
  MAX(rsl.report_date) as last_report_sent
FROM tenants t
LEFT JOIN report_send_log rsl ON t.id = rsl.tenant_id
GROUP BY t.id, t.company_name, t.timezone, t.is_active
ORDER BY t.company_name;
