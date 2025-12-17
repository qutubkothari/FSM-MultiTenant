-- WhatsApp Summary System Tables
-- Creates tables for storing WhatsApp configuration, message templates, and delivery logs

-- WhatsApp Configuration Table
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    api_url TEXT NOT NULL, -- WhatsApp API endpoint
    api_key TEXT, -- API authentication key
    session_id TEXT DEFAULT 'default', -- WhatsApp session identifier
    is_active BOOLEAN DEFAULT true,
    phone_number_id TEXT, -- WhatsApp Business phone number ID
    business_account_id TEXT,
    webhook_verify_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id)
);

-- Message Templates Table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_name VARCHAR(100) NOT NULL, -- e.g., 'daily_salesman_summary', 'daily_admin_summary'
    template_type VARCHAR(50) NOT NULL, -- 'salesman_daily', 'admin_daily', 'weekly', 'monthly'
    recipient_role VARCHAR(50) NOT NULL, -- 'salesman', 'admin', 'super_admin'
    message_template TEXT NOT NULL, -- Template with placeholders: {{name}}, {{visits}}, etc.
    language VARCHAR(10) DEFAULT 'en', -- 'en', 'ar'
    is_active BOOLEAN DEFAULT true,
    send_time TIME, -- Scheduled time (e.g., '18:00:00' for 6 PM)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Message Log Table
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL, -- 'summary', 'notification', 'alert'
    message_content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
    whatsapp_message_id TEXT, -- WhatsApp API message ID
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- Additional data like visit_date, summary_data, etc.
);

-- Summary Schedule Table
CREATE TABLE IF NOT EXISTS summary_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    schedule_name VARCHAR(100) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    target_role VARCHAR(50) NOT NULL, -- 'salesman', 'admin', 'super_admin'
    send_time TIME NOT NULL, -- Time to send (e.g., '18:00:00')
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    include_metrics JSONB, -- Which metrics to include: {"visits": true, "orders": true, "new_customers": true}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_tenant ON whatsapp_message_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_status ON whatsapp_message_log(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_created ON whatsapp_message_log(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_log_recipient ON whatsapp_message_log(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_summary_schedules_tenant ON summary_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_summary_schedules_active ON summary_schedules(is_active) WHERE is_active = true;

-- Insert default templates for English
INSERT INTO whatsapp_templates (template_name, template_type, recipient_role, message_template, language, send_time) VALUES
(
    'daily_salesman_summary',
    'salesman_daily',
    'salesman',
    '📊 *Daily Summary - {{date}}*

Hi {{name}},

✅ *Today''s Performance:*
🎯 Total Visits: {{total_visits}}
✨ New Customers: {{new_customers}}
🔄 Repeat Customers: {{repeat_customers}}
💰 Total Orders: ₹{{total_order_value}}

{{#if high_potential_visits}}
⭐ High Potential Visits: {{high_potential_visits}}
{{/if}}

{{#if pending_followups}}
📅 Pending Follow-ups: {{pending_followups}}
{{/if}}

Keep up the great work! 💪

_Automated by FSM System_',
    'en',
    '18:00:00'
),
(
    'daily_admin_summary',
    'admin_daily',
    'admin',
    '📈 *Daily Team Report - {{date}}*

Hello {{name}},

*Overall Performance:*
👥 Active Salesmen: {{active_salesmen}}
🎯 Total Visits: {{total_visits}}
✨ New Customers: {{new_customers}}
💰 Total Revenue: ₹{{total_order_value}}

*Top Performers:*
{{#each top_performers}}
🏆 {{name}}: {{visits}} visits, ₹{{revenue}}
{{/each}}

{{#if alerts}}
⚠️ *Alerts:*
{{#each alerts}}
• {{message}}
{{/each}}
{{/if}}

_FSM Management System_',
    'en',
    '18:30:00'
),
(
    'weekly_salesman_summary',
    'salesman_weekly',
    'salesman',
    '📊 *Weekly Summary - Week {{week_number}}*

Hi {{name}},

*This Week ({{date_range}}):*
🎯 Total Visits: {{total_visits}}
📍 Unique Customers: {{unique_customers}}
✨ New Customers: {{new_customers}}
💰 Total Revenue: ₹{{total_order_value}}
📊 Avg Visits/Day: {{avg_visits_per_day}}

*Targets:*
Target: {{target_visits}} | Achieved: {{actual_visits}}
{{achievement_percentage}}% Complete

{{#if milestone}}
🎉 {{milestone}}
{{/if}}

_FSM System_',
    'en',
    NULL
),
(
    'monthly_admin_summary',
    'admin_monthly',
    'admin',
    '📈 *Monthly Report - {{month_name}}*

Hello {{name}},

*Month Overview:*
👥 Total Salesmen: {{total_salesmen}}
🎯 Total Visits: {{total_visits}}
📍 Unique Customers: {{unique_customers}}
💰 Total Revenue: ₹{{total_order_value}}
📊 Avg Revenue/Visit: ₹{{avg_revenue_per_visit}}

*Department Performance:*
{{#each departments}}
• {{name}}: {{visits}} visits, ₹{{revenue}}
{{/each}}

*Achievements:*
✅ {{achievements}}

_FSM Management Dashboard_',
    'en',
    NULL
);

-- Insert default templates for Arabic
INSERT INTO whatsapp_templates (template_name, template_type, recipient_role, message_template, language, send_time) VALUES
(
    'daily_salesman_summary_ar',
    'salesman_daily',
    'salesman',
    '📊 *ملخص يومي - {{date}}*

مرحبا {{name}}،

✅ *أداء اليوم:*
🎯 إجمالي الزيارات: {{total_visits}}
✨ عملاء جدد: {{new_customers}}
🔄 عملاء متكررون: {{repeat_customers}}
💰 إجمالي الطلبات: ₹{{total_order_value}}

{{#if high_potential_visits}}
⭐ زيارات عالية الإمكانات: {{high_potential_visits}}
{{/if}}

{{#if pending_followups}}
📅 متابعات معلقة: {{pending_followups}}
{{/if}}

استمر في العمل الرائع! 💪

_نظام FSM الآلي_',
    'ar',
    '18:00:00'
);

COMMENT ON TABLE whatsapp_config IS 'Stores WhatsApp API configuration per tenant';
COMMENT ON TABLE whatsapp_templates IS 'Message templates for different summary types';
COMMENT ON TABLE whatsapp_message_log IS 'Logs all WhatsApp messages sent with delivery status';
COMMENT ON TABLE summary_schedules IS 'Scheduled summary configurations';
