# WhatsApp Summary System - Implementation Guide

## 📋 Overview
Automated daily/weekly/monthly summary system that sends professional WhatsApp messages to salesmen and admins with their performance metrics.

---

## 🗄️ Database Setup

### Step 1: Run SQL Migrations
Execute in this order:

```bash
# 1. Create WhatsApp tables
psql -d your_database -f database/add-whatsapp-summary-tables.sql

# 2. Create summary generation functions
psql -d your_database -f database/summary-functions.sql
```

---

## 🔧 Backend Implementation

### Step 2: Install Dependencies

```bash
npm install @whiskeysockets/baileys qrcode-terminal node-cron handlebars
```

### Step 3: Create WhatsApp Service

**File: `src/services/whatsappService.ts`**

```typescript
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode-terminal';
import { supabase } from './supabase';

class WhatsAppService {
  private sock: any = null;
  private isConnected = false;
  private qrCode: string | null = null;

  async initialize() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    this.sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.qrCode = qr;
        QRCode.generate(qr, { small: true });
        console.log('🔗 WhatsApp QR Code generated');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('❌ Connection closed. Reconnecting...', shouldReconnect);
        if (shouldReconnect) {
          this.initialize();
        }
        this.isConnected = false;
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connected successfully');
        this.isConnected = true;
        this.qrCode = null;
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
  }

  async sendMessage(phone: string, message: string, tenantId: string, userId?: string) {
    if (!this.isConnected) {
      throw new Error('WhatsApp not connected');
    }

    try {
      // Format phone number (remove + and add @s.whatsapp.net)
      const formattedPhone = phone.replace(/\+/g, '').replace(/\s/g, '') + '@s.whatsapp.net';
      
      const result = await this.sock.sendMessage(formattedPhone, { text: message });
      
      // Log to database
      await supabase.from('whatsapp_message_log').insert({
        tenant_id: tenantId,
        recipient_phone: phone,
        recipient_user_id: userId,
        message_type: 'summary',
        message_content: message,
        status: 'sent',
        whatsapp_message_id: result.key.id,
        sent_at: new Date().toISOString(),
      });

      console.log(`✅ Message sent to ${phone}`);
      return { success: true, messageId: result.key.id };
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      
      // Log error
      await supabase.from('whatsapp_message_log').insert({
        tenant_id: tenantId,
        recipient_phone: phone,
        message_type: 'summary',
        message_content: message,
        status: 'failed',
        error_message: error.message,
      });

      throw error;
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      qrCode: this.qrCode,
    };
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.isConnected = false;
    }
  }
}

export const whatsappService = new WhatsAppService();
```

### Step 4: Create Message Template Renderer

**File: `src/services/messageTemplateService.ts`**

```typescript
import Handlebars from 'handlebars';
import { supabase } from './supabase';

// Register Handlebars helpers
Handlebars.registerHelper('if', function(conditional: any, options: any) {
  if (conditional) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('each', function(context: any, options: any) {
  let ret = '';
  for (let i = 0, j = context.length; i < j; i++) {
    ret = ret + options.fn(context[i]);
  }
  return ret;
});

export class MessageTemplateService {
  async renderTemplate(templateName: string, data: any, language: string = 'en'): Promise<string> {
    // Fetch template from database
    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .select('message_template')
      .eq('template_name', templateName)
      .eq('language', language)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Compile and render
    const compiled = Handlebars.compile(template.message_template);
    return compiled(data);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

export const messageTemplateService = new MessageTemplateService();
```

### Step 5: Create Summary Service

**File: `src/services/summaryService.ts`**

```typescript
import { supabase } from './supabase';
import { whatsappService } from './whatsappService';
import { messageTemplateService } from './messageTemplateService';

export class SummaryService {
  
  // Send daily summary to a specific salesman
  async sendDailySalesmanSummary(salesmanId: string, date: Date = new Date()) {
    try {
      // Get summary data from database function
      const { data, error } = await supabase.rpc('get_daily_salesman_summary', {
        p_salesman_id: salesmanId,
        p_date: date.toISOString().split('T')[0],
      });

      if (error) throw error;
      if (!data) throw new Error('No summary data found');

      // Format data for template
      const templateData = {
        ...data,
        date: messageTemplateService.formatDate(date),
        total_order_value: messageTemplateService.formatCurrency(data.total_order_value),
      };

      // Render message from template
      const message = await messageTemplateService.renderTemplate(
        'daily_salesman_summary',
        templateData,
        'en'
      );

      // Send via WhatsApp
      await whatsappService.sendMessage(
        data.phone,
        message,
        data.tenant_id,
        salesmanId
      );

      console.log(`✅ Daily summary sent to ${data.name}`);
      return { success: true, salesman: data.name };
    } catch (error: any) {
      console.error(`❌ Failed to send summary to salesman ${salesmanId}:`, error);
      throw error;
    }
  }

  // Send daily summary to all salesmen in a tenant
  async sendDailySummaryToAllSalesmen(tenantId: string, date: Date = new Date()) {
    try {
      // Get all active salesmen
      const { data: salesmen, error } = await supabase
        .from('salesmen')
        .select('id, name, phone')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) throw error;

      const results = [];
      for (const salesman of salesmen || []) {
        try {
          await this.sendDailySalesmanSummary(salesman.id, date);
          results.push({ salesman: salesman.name, success: true });
        } catch (err: any) {
          console.error(`Failed for ${salesman.name}:`, err.message);
          results.push({ salesman: salesman.name, success: false, error: err.message });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to send summaries to salesmen:', error);
      throw error;
    }
  }

  // Send daily admin summary
  async sendDailyAdminSummary(tenantId: string, date: Date = new Date()) {
    try {
      // Get summary data
      const { data, error } = await supabase.rpc('get_daily_admin_summary', {
        p_tenant_id: tenantId,
        p_date: date.toISOString().split('T')[0],
      });

      if (error) throw error;
      if (!data) throw new Error('No summary data found');

      // Get admin/super admin users
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id, name, phone, role')
        .eq('tenant_id', tenantId)
        .in('role', ['admin', 'super_admin'])
        .eq('is_active', true);

      if (adminError) throw adminError;

      // Format data
      const templateData = {
        ...data,
        date: messageTemplateService.formatDate(date),
        total_order_value: messageTemplateService.formatCurrency(data.total_order_value),
        top_performers: (data.top_performers || []).map((p: any) => ({
          ...p,
          revenue: messageTemplateService.formatCurrency(p.revenue),
        })),
      };

      const results = [];
      for (const admin of admins || []) {
        try {
          const message = await messageTemplateService.renderTemplate(
            'daily_admin_summary',
            { ...templateData, name: admin.name },
            'en'
          );

          await whatsappService.sendMessage(
            admin.phone,
            message,
            tenantId,
            admin.id
          );

          console.log(`✅ Admin summary sent to ${admin.name}`);
          results.push({ admin: admin.name, success: true });
        } catch (err: any) {
          console.error(`Failed for ${admin.name}:`, err.message);
          results.push({ admin: admin.name, success: false, error: err.message });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to send admin summary:', error);
      throw error;
    }
  }

  // Send weekly salesman summary
  async sendWeeklySalesmanSummary(salesmanId: string, weekStart: Date) {
    try {
      const { data, error } = await supabase.rpc('get_weekly_salesman_summary', {
        p_salesman_id: salesmanId,
        p_week_start: weekStart.toISOString().split('T')[0],
      });

      if (error) throw error;

      const templateData = {
        ...data,
        total_order_value: messageTemplateService.formatCurrency(data.total_order_value),
      };

      const message = await messageTemplateService.renderTemplate(
        'weekly_salesman_summary',
        templateData,
        'en'
      );

      await whatsappService.sendMessage(data.phone, message, data.tenant_id, salesmanId);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send weekly summary:', error);
      throw error;
    }
  }
}

export const summaryService = new SummaryService();
```

### Step 6: Create Scheduler

**File: `src/services/summaryScheduler.ts`**

```typescript
import cron from 'node-cron';
import { supabase } from './supabase';
import { summaryService } from './summaryService';

export class SummaryScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  async initialize() {
    console.log('📅 Initializing summary scheduler...');

    // Daily salesman summaries at 6:00 PM
    this.scheduleJob('daily-salesman', '0 18 * * *', async () => {
      console.log('⏰ Running daily salesman summaries...');
      await this.runDailySalesmanSummaries();
    });

    // Daily admin summaries at 6:30 PM
    this.scheduleJob('daily-admin', '30 18 * * *', async () => {
      console.log('⏰ Running daily admin summaries...');
      await this.runDailyAdminSummaries();
    });

    // Weekly summaries every Monday at 9:00 AM
    this.scheduleJob('weekly-salesman', '0 9 * * 1', async () => {
      console.log('⏰ Running weekly salesman summaries...');
      await this.runWeeklySalesmanSummaries();
    });

    console.log('✅ Summary scheduler initialized');
  }

  private scheduleJob(name: string, cronExpression: string, task: () => Promise<void>) {
    const job = cron.schedule(cronExpression, async () => {
      try {
        await task();
      } catch (error) {
        console.error(`❌ Error in scheduled job ${name}:`, error);
      }
    });

    this.jobs.set(name, job);
    console.log(`✅ Scheduled job: ${name} (${cronExpression})`);
  }

  private async runDailySalesmanSummaries() {
    try {
      // Get all tenants
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, company_name')
        .eq('is_active', true);

      if (error) throw error;

      for (const tenant of tenants || []) {
        console.log(`📊 Sending daily summaries for ${tenant.company_name}...`);
        await summaryService.sendDailySummaryToAllSalesmen(tenant.id);
      }
    } catch (error) {
      console.error('❌ Failed to run daily salesman summaries:', error);
    }
  }

  private async runDailyAdminSummaries() {
    try {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, company_name')
        .eq('is_active', true);

      if (error) throw error;

      for (const tenant of tenants || []) {
        console.log(`📊 Sending admin summary for ${tenant.company_name}...`);
        await summaryService.sendDailyAdminSummary(tenant.id);
      }
    } catch (error) {
      console.error('❌ Failed to run daily admin summaries:', error);
    }
  }

  private async runWeeklySalesmanSummaries() {
    try {
      const { data: salesmen, error } = await supabase
        .from('salesmen')
        .select('id, name, tenant_id')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) throw error;

      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - 7));

      for (const salesman of salesmen || []) {
        await summaryService.sendWeeklySalesmanSummary(salesman.id, weekStart);
      }
    } catch (error) {
      console.error('❌ Failed to run weekly summaries:', error);
    }
  }

  stopAll() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped job: ${name}`);
    });
    this.jobs.clear();
  }
}

export const summaryScheduler = new SummaryScheduler();
```

### Step 7: Add API Endpoints

**File: `src/routes/whatsapp.routes.ts`**

```typescript
import express from 'express';
import { whatsappService } from '../services/whatsappService';
import { summaryService } from '../services/summaryService';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// WhatsApp connection status
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = whatsappService.getConnectionStatus();
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually trigger daily summary for a salesman (Admin only)
router.post('/summary/salesman/:salesmanId', authenticate, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { salesmanId } = req.params;
    const result = await summaryService.sendDailySalesmanSummary(salesmanId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually trigger daily admin summary
router.post('/summary/admin', authenticate, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const result = await summaryService.sendDailyAdminSummary(tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send summary to all salesmen
router.post('/summary/all-salesmen', authenticate, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const results = await summaryService.sendDailySummaryToAllSalesmen(tenantId);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## 🚀 Initialization

**File: `src/server.ts` (add these lines)**

```typescript
import { whatsappService } from './services/whatsappService';
import { summaryScheduler } from './services/summaryScheduler';

// Initialize WhatsApp
await whatsappService.initialize();

// Initialize scheduler
await summaryScheduler.initialize();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⏹️ Shutting down gracefully...');
  summaryScheduler.stopAll();
  await whatsappService.disconnect();
  process.exit(0);
});
```

---

## 📱 Message Examples

### Daily Salesman Summary
```
📊 *Daily Summary - 15 Dec 2025*

Hi Rajesh Kumar,

✅ *Today's Performance:*
🎯 Total Visits: 8
✨ New Customers: 3
🔄 Repeat Customers: 5
💰 Total Orders: ₹45,000

⭐ High Potential Visits: 2

📅 Pending Follow-ups: 4

Keep up the great work! 💪

_Automated by FSM System_
```

### Daily Admin Summary
```
📈 *Daily Team Report - 15 Dec 2025*

Hello Admin,

*Overall Performance:*
👥 Active Salesmen: 12
🎯 Total Visits: 87
✨ New Customers: 23
💰 Total Revenue: ₹5,45,000

*Top Performers:*
🏆 Rajesh Kumar: 8 visits, ₹45,000
🏆 Priya Sharma: 10 visits, ₹62,000
🏆 Amit Patel: 7 visits, ₹38,000

_FSM Management System_
```

---

## 🔧 Configuration

Create `.env` file:

```env
# WhatsApp Configuration
WHATSAPP_SESSION_ID=default
WHATSAPP_AUTO_RECONNECT=true

# Summary Schedule (Cron format)
DAILY_SALESMAN_SUMMARY_TIME=0 18 * * *  # 6:00 PM daily
DAILY_ADMIN_SUMMARY_TIME=30 18 * * *    # 6:30 PM daily
WEEKLY_SUMMARY_TIME=0 9 * * 1           # 9:00 AM every Monday

# Database
DATABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

---

## 🧪 Testing

### Manual Testing
```bash
# Test salesman summary
curl -X POST http://localhost:3000/api/whatsapp/summary/salesman/{salesmanId} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test admin summary
curl -X POST http://localhost:3000/api/whatsapp/summary/admin \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test all salesmen
curl -X POST http://localhost:3000/api/whatsapp/summary/all-salesmen \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 Monitoring

Check message delivery status:

```sql
SELECT 
    recipient_phone,
    message_type,
    status,
    sent_at,
    error_message
FROM whatsapp_message_log
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

---

## 🎯 Features Included

✅ Daily salesman summaries (6 PM)
✅ Daily admin summaries (6:30 PM)
✅ Weekly salesman summaries (Monday 9 AM)
✅ Monthly admin summaries
✅ Professional message templates
✅ Bilingual support (English/Arabic)
✅ Delivery tracking & logging
✅ Error handling & retry logic
✅ Manual trigger via API
✅ WhatsApp connection management

---

## 📞 Support

For issues or questions, contact the development team.
