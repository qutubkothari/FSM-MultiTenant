const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');

// Sample data for testing
const salesmanSummary = {
    name: "Alok",
    phone: "919537653927",
    date: "15 Dec 2025",
    total_visits: 8,
    new_customers: 3,
    repeat_customers: 5,
    total_order_value: 45000,
    high_potential_visits: 2,
    pending_followups: 4
};

const adminSummary = {
    date: "15 Dec 2025",
    active_salesmen: 12,
    total_visits: 87,
    new_customers: 23,
    total_order_value: 545000,
    top_performers: [
        { name: "Rajesh Kumar", visits: 10, revenue: 62000 },
        { name: "Alok", visits: 8, revenue: 45000 },
        { name: "Priya Sharma", visits: 9, revenue: 58000 }
    ],
    alerts: [
        { message: "Mufaddal - No visits today" },
        { message: "Abdel Ghany - No visits today" }
    ]
};

// Format salesman message
function formatSalesmanMessage(data) {
    return `📊 *Daily Summary - ${data.date}*

Hi ${data.name},

✅ *Today's Performance:*
🎯 Total Visits: ${data.total_visits}
✨ New Customers: ${data.new_customers}
🔄 Repeat Customers: ${data.repeat_customers}
💰 Total Orders: ₹${data.total_order_value.toLocaleString('en-IN')}

${data.high_potential_visits > 0 ? `⭐ High Potential Visits: ${data.high_potential_visits}\n` : ''}${data.pending_followups > 0 ? `📅 Pending Follow-ups: ${data.pending_followups}\n` : ''}
Keep up the great work! 💪

_Automated by FSM System_`;
}

// Format admin message
function formatAdminMessage(data) {
    let message = `📈 *Daily Team Report - ${data.date}*

Hello Admin,

*Overall Performance:*
👥 Active Salesmen: ${data.active_salesmen}
🎯 Total Visits: ${data.total_visits}
✨ New Customers: ${data.new_customers}
💰 Total Revenue: ₹${data.total_order_value.toLocaleString('en-IN')}

*Top Performers:*\n`;

    data.top_performers.forEach(p => {
        message += `🏆 ${p.name}: ${p.visits} visits, ₹${p.revenue.toLocaleString('en-IN')}\n`;
    });

    if (data.alerts && data.alerts.length > 0) {
        message += `\n⚠️ *Alerts:*\n`;
        data.alerts.forEach(alert => {
            message += `• ${alert.message}\n`;
        });
    }

    message += `\n_FSM Management System_`;
    return message;
}

async function sendTestMessages() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 Scan this QR code with WhatsApp:');
            QRCode.generate(qr, { small: true });
            console.log('\n⬆️  Open WhatsApp > Settings > Linked Devices > Link a Device');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed due to', lastDisconnect?.error, 'Reconnecting:', shouldReconnect);
            
            if (shouldReconnect) {
                sendTestMessages();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connected successfully!\n');
            
            try {
                const phoneNumber = '919537653927@s.whatsapp.net';
                
                // Send salesman message
                console.log('📤 Sending salesman summary message...');
                const salesmanMsg = formatSalesmanMessage(salesmanSummary);
                await sock.sendMessage(phoneNumber, { text: salesmanMsg });
                console.log('✅ Salesman message sent!\n');
                
                // Wait 2 seconds
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Send admin message
                console.log('📤 Sending admin summary message...');
                const adminMsg = formatAdminMessage(adminSummary);
                await sock.sendMessage(phoneNumber, { text: adminMsg });
                console.log('✅ Admin message sent!\n');
                
                console.log('🎉 Both test messages sent successfully!');
                console.log('📱 Check your WhatsApp: +91 95376 53927');
                
                // Disconnect after 3 seconds
                setTimeout(async () => {
                    await sock.logout();
                    console.log('\n👋 Disconnected. Test complete!');
                    process.exit(0);
                }, 3000);
                
            } catch (error) {
                console.error('❌ Error sending messages:', error);
                process.exit(1);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// Start
console.log('🚀 Starting WhatsApp test...\n');
sendTestMessages();
