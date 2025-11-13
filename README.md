# FSM Mobile App

AI-Powered Field Sales Management Mobile Application

## 🚀 Features

### Mobile App (React Native + Expo)
- ✅ **Smart Login**: Phone-based authentication with auto-registration
- ✅ **AI-Powered Forms**: Intelligent autocomplete for customer names and contact persons
- ✅ **Offline-First**: Record visits without internet, auto-sync when connected
- ✅ **GPS Tracking**: Automatic location capture for each visit
- ✅ **Quick Data Entry**: Checkbox-based form (< 1 minute per visit)
- ✅ **Real-time Sync**: Background synchronization of pending visits
- ✅ **Smart Reminders**: Automatic notifications for follow-up actions

### Admin Dashboard (Web)
- ✅ **Visit Analytics**: Comprehensive reporting and statistics
- ✅ **Excel Export**: One-click export of all visit data
- ✅ **Salesman Performance**: Track visits, orders, enquiries, hit ratios
- ✅ **Product Insights**: Most discussed products and conversion rates
- ✅ **Customer Analytics**: Visit frequency and potential tracking
- ✅ **Date Filtering**: Filter by custom date ranges
- ✅ **Real-time Data**: Live updates from Supabase

### Technology Stack
- **Mobile**: React Native, Expo, TypeScript
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 for intelligent suggestions
- **Offline Storage**: AsyncStorage + SQLite
- **Location**: Expo Location
- **Notifications**: Expo Notifications
- **Admin Dashboard**: Pure HTML/CSS/JavaScript
- **Hosting**: Google Cloud App Engine (current), AWS VPS (future)

## 📋 Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli` (for building APK)
- Supabase account
- OpenAI API key (for AI features)
- Google Cloud account (for deployment)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd FSM
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

Also update the values in `App.tsx`:
```typescript
initializeEnv({
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',
  OPENAI_API_KEY: 'your-openai-key',
});
```

### 4. Set Up Database

1. Create a new Supabase project
2. Go to SQL Editor and run the schema from `database/schema.sql`
3. Verify tables are created: salesmen, customers, products, visits, competitors

### 5. Run the App

```bash
# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web browser
npm run web
```

## 📱 Building APK for Distribution

### Configure EAS Build
```bash
eas build:configure
```

### Build Android APK
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production
```

### Download and Distribute
1. Go to https://expo.dev
2. Navigate to your project builds
3. Download the APK file
4. Distribute via email, Google Drive, or internal server

## 🌐 Admin Dashboard Setup

### Local Testing
1. Open `admin/index.html` in a browser
2. Update Supabase credentials in the file:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### Deploy to Google Cloud App Engine
```bash
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud app deploy

# View deployed app
gcloud app browse /admin
```

## 📊 Database Schema

### Tables
- **salesmen**: User accounts for field sales team
- **customers**: Customer master data
- **products**: Product catalog
- **visits**: All visit records with GPS and meeting details
- **competitors**: Competitor tracking

### Views (for Analytics)
- **salesman_performance**: Visit stats, hit ratios per salesman
- **product_discussion_stats**: Product discussion frequency
- **customer_visit_history**: Customer engagement tracking

## 🔧 Architecture

```
FSM/
├── src/
│   ├── components/         # Reusable UI components
│   ├── screens/           # App screens (Login, Home, NewVisit)
│   ├── services/          # Business logic services
│   │   ├── ai.service.ts          # AI-powered suggestions
│   │   ├── supabase.service.ts    # Database operations
│   │   ├── location.service.ts    # GPS handling
│   │   ├── storage.service.ts     # Local storage
│   │   ├── offline-sync.service.ts # Offline sync logic
│   │   └── notification.service.ts # Push notifications
│   ├── store/             # State management (Zustand)
│   │   ├── authStore.ts
│   │   ├── visitStore.ts
│   │   ├── dataStore.ts
│   │   └── syncStore.ts
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions (analytics, etc.)
│   └── config/            # App configuration
├── admin/                 # Web admin dashboard
├── database/             # Database schema and migrations
├── App.tsx               # Main app entry point
└── package.json
```

## 🎯 Key Features Explained

### 1. Offline-First Architecture
- All visit data saved locally first
- Background sync every 5 minutes when online
- Retry mechanism with exponential backoff
- Visual indicators for pending syncs

### 2. AI-Powered Autocomplete
- Customer name suggestions based on history
- Contact person auto-fill
- Intelligent next action prediction
- Competitor analysis from remarks

### 3. Smart Form Design
- Checkbox-based selections (no typing)
- Auto-fill for repeat customers
- GPS auto-capture
- < 1 minute to complete

### 4. Analytics & Reporting
- Real-time visit statistics
- Salesman performance metrics
- Hit ratio calculation (Orders/Enquiries)
- Product discussion trends
- Excel export with all fields

## 🔐 Security

- Row Level Security (RLS) enabled on Supabase
- Phone-based authentication
- Secure API keys (never committed to git)
- HTTPS-only connections
- Data encryption in transit

## 🚀 Deployment Options

### Current: Google Cloud App Engine
- Easy deployment with `gcloud app deploy`
- Auto-scaling
- Built-in load balancing
- Simple configuration via `app.yaml`

### Future: AWS VPS
- Docker containerization ready
- Nginx configuration included
- PostgreSQL migration scripts provided
- See `DEPLOYMENT.md` for migration guide

## 📈 Roadmap

- [x] Core mobile app with offline support
- [x] Admin dashboard with Excel export
- [x] AI-powered autocomplete
- [x] GPS tracking
- [x] Reminder notifications
- [ ] Advanced analytics dashboard
- [ ] Photo attachments for visits
- [ ] Voice notes
- [ ] Route optimization
- [ ] Team collaboration features
- [ ] WhatsApp integration for reports

## 🤝 Support

For issues or questions:
1. Check the documentation
2. Review database schema in `database/schema.sql`
3. Check deployment guide in `DEPLOYMENT.md`
4. Contact development team

## 📝 License

Proprietary - All rights reserved

## 🙏 Acknowledgments

- Supabase for backend infrastructure
- Expo for React Native tooling
- OpenAI for AI capabilities
- Google Cloud for hosting
