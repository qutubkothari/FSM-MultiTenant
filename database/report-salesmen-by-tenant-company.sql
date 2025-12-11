-- =====================================================
-- SALESMEN REPORT BY TENANT AND COMPANY
-- =====================================================
-- This query shows all salesmen with their tenant and assigned companies/plants
-- Run this in Supabase SQL Editor

-- Full Report with All Details
SELECT 
    t.name AS tenant_name,
    t.company_name AS tenant_company,
    t.slug AS tenant_slug,
    s.name AS salesman_name,
    s.name_ar AS salesman_name_arabic,
    s.phone AS salesman_phone,
    s.email AS salesman_email,
    s.is_active AS is_active,
    s.is_admin AS is_admin,
    -- Unnest the plant array to show each plant on a separate row
    p.plant_code AS company_code,
    p.plant_name AS company_name,
    p.area AS company_area,
    p.city AS company_city,
    s.created_at AS joined_date,
    s.deleted_at AS deleted_date
FROM 
    salesmen s
    INNER JOIN tenants t ON s.tenant_id = t.id
    LEFT JOIN LATERAL unnest(s.plant) AS plant_name_text ON true
    LEFT JOIN plants p ON p.plant_name = plant_name_text AND p.tenant_id = s.tenant_id
WHERE 
    s.deleted_at IS NULL
ORDER BY 
    t.name, s.name, p.plant_code;


-- =====================================================
-- SIMPLIFIED SUMMARY (Grouped by Tenant)
-- =====================================================
-- Shows count of salesmen per tenant with company names concatenated

SELECT 
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    COUNT(DISTINCT s.id) AS total_salesmen,
    COUNT(DISTINCT s.id) FILTER (WHERE s.is_active = true) AS active_salesmen,
    COUNT(DISTINCT s.id) FILTER (WHERE s.is_admin = true) AS admin_salesmen,
    STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) AS salesman_names
FROM 
    tenants t
    LEFT JOIN salesmen s ON s.tenant_id = t.id AND s.deleted_at IS NULL
WHERE 
    t.is_active = true
GROUP BY 
    t.id, t.name, t.slug
ORDER BY 
    t.name;


-- =====================================================
-- DETAILED VIEW (One Salesman Per Row with Concatenated Companies)
-- =====================================================
-- Shows each salesman once with all their assigned companies in one column

SELECT 
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    s.name AS salesman_name,
    s.name_ar AS salesman_name_arabic,
    s.phone AS salesman_phone,
    s.email AS salesman_email,
    s.is_active,
    s.is_admin,
    -- Concatenate all plant names for this salesman
    STRING_AGG(p.plant_name, ', ' ORDER BY p.plant_code) AS assigned_companies,
    STRING_AGG(p.plant_code, ', ' ORDER BY p.plant_code) AS company_codes,
    ARRAY_LENGTH(s.plant, 1) AS total_companies_assigned,
    TO_CHAR(s.created_at, 'YYYY-MM-DD') AS joined_date
FROM 
    salesmen s
    INNER JOIN tenants t ON s.tenant_id = t.id
    LEFT JOIN LATERAL unnest(s.plant) AS plant_name_text ON true
    LEFT JOIN plants p ON p.plant_name = plant_name_text AND p.tenant_id = s.tenant_id
WHERE 
    s.deleted_at IS NULL
    AND t.is_active = true
GROUP BY 
    t.id, t.name, t.slug, s.id, s.name, s.name_ar, s.phone, s.email, 
    s.is_active, s.is_admin, s.plant, s.created_at
ORDER BY 
    t.name, s.name;


-- =====================================================
-- EXPORT-READY CSV FORMAT
-- =====================================================
-- Clean format for exporting to Excel/CSV

SELECT 
    t.name AS "Tenant Name",
    s.name AS "Salesman Name",
    s.phone AS "Phone",
    s.email AS "Email",
    CASE WHEN s.is_active THEN 'Active' ELSE 'Inactive' END AS "Status",
    CASE WHEN s.is_admin THEN 'Yes' ELSE 'No' END AS "Is Admin",
    p.plant_code AS "Company Code",
    p.plant_name AS "Company Name",
    p.city AS "City",
    TO_CHAR(s.created_at, 'DD-Mon-YYYY') AS "Date Joined"
FROM 
    salesmen s
    INNER JOIN tenants t ON s.tenant_id = t.id
    LEFT JOIN LATERAL unnest(s.plant) AS plant_name_text ON true
    LEFT JOIN plants p ON p.plant_name = plant_name_text AND p.tenant_id = s.tenant_id
WHERE 
    s.deleted_at IS NULL
    AND t.is_active = true
ORDER BY 
    t.name, s.name, p.plant_code;


-- =====================================================
-- FILTER BY SPECIFIC TENANT (Uncomment and modify tenant name)
-- =====================================================
/*
SELECT 
    s.name AS salesman_name,
    s.phone,
    s.email,
    s.is_active,
    STRING_AGG(p.plant_name, ', ' ORDER BY p.plant_code) AS assigned_companies,
    TO_CHAR(s.created_at, 'YYYY-MM-DD') AS joined_date
FROM 
    salesmen s
    INNER JOIN tenants t ON s.tenant_id = t.id
    LEFT JOIN LATERAL unnest(s.plant) AS plant_name_text ON true
    LEFT JOIN plants p ON p.plant_name = plant_name_text AND p.tenant_id = s.tenant_id
WHERE 
    s.deleted_at IS NULL
    AND t.name = 'Hylite'  -- CHANGE THIS TO YOUR TENANT NAME
GROUP BY 
    s.id, s.name, s.phone, s.email, s.is_active, s.created_at
ORDER BY 
    s.name;
*/
