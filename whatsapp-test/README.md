# WhatsApp Test - Quick Instructions

## 🚀 Run Test Messages

### Step 1: Install Dependencies
```powershell
cd whatsapp-test
npm install
```

### Step 2: Run Test Script
```powershell
npm test
```

### Step 3: Scan QR Code
- A QR code will appear in the terminal
- Open WhatsApp on your phone
- Go to: **Settings > Linked Devices > Link a Device**
- Scan the QR code

### Step 4: Receive Messages
Once connected, the script will automatically send **2 test messages** to **+91 95376 53927**:

1. ✅ **Salesman Daily Summary** (sample with 8 visits, ₹45,000 revenue)
2. ✅ **Admin Team Report** (sample with 87 total visits, ₹5,45,000 revenue)

---

## 📱 Expected Messages

### Message 1 - Salesman Summary:
```
📊 Daily Summary - 15 Dec 2025

Hi Alok,

✅ Today's Performance:
🎯 Total Visits: 8
✨ New Customers: 3
🔄 Repeat Customers: 5
💰 Total Orders: ₹45,000

⭐ High Potential Visits: 2
📅 Pending Follow-ups: 4

Keep up the great work! 💪

_Automated by FSM System_
```

### Message 2 - Admin Summary:
```
📈 Daily Team Report - 15 Dec 2025

Hello Admin,

Overall Performance:
👥 Active Salesmen: 12
🎯 Total Visits: 87
✨ New Customers: 23
💰 Total Revenue: ₹5,45,000

Top Performers:
🏆 Rajesh Kumar: 10 visits, ₹62,000
🏆 Alok: 8 visits, ₹45,000
🏆 Priya Sharma: 9 visits, ₹58,000

⚠️ Alerts:
• Mufaddal - No visits today
• Abdel Ghany - No visits today

_FSM Management System_
```

---

## ⏱️ Timeline

- **0s**: Script starts
- **5s**: QR code appears
- **10s**: You scan QR
- **15s**: WhatsApp connects
- **16s**: Salesman message sent ✅
- **18s**: Admin message sent ✅
- **21s**: Script disconnects

Total time: ~30 seconds

---

## 🔧 Troubleshooting

### QR Code doesn't appear?
```powershell
# Try installing QR terminal separately
npm install qrcode-terminal --save
```

### Connection errors?
- Make sure you have internet connection
- Try deleting `auth_info_baileys` folder and re-scanning
- Check if WhatsApp is updated on your phone

### Messages not arriving?
- Check if number format is correct: 919537653927
- Verify WhatsApp is active on that number
- Look in terminal for error messages

---

## ✅ Next Steps After Test

If messages arrive successfully:
1. ✅ WhatsApp API is working
2. ✅ Message format looks professional
3. ✅ Ready to integrate with live data
4. ✅ Can schedule automated daily sends

---

## 📞 Test Number
**+91 95376 53927**

Both messages will be sent to this number.
