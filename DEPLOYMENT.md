# Deployment Scripts

## Google Cloud App Engine Deployment

### Prerequisites
1. Install Google Cloud SDK
2. Initialize gcloud: `gcloud init`
3. Set project: `gcloud config set project YOUR_PROJECT_ID`

### Deploy Admin Dashboard
```bash
gcloud app deploy
```

### View Logs
```bash
gcloud app logs tail -s default
```

### View Admin Dashboard
```bash
gcloud app browse /admin
```

## React Native Mobile App Build

### Android APK Build

#### Prerequisites
1. Install Expo CLI: `npm install -g expo-cli`
2. Install EAS CLI: `npm install -g eas-cli`
3. Create Expo account

#### Build Steps
```bash
# Login to Expo
eas login

# Configure build
eas build:configure

# Build Android APK
eas build --platform android --profile production

# Download the APK from Expo dashboard
```

### iOS Build
```bash
# Build iOS app (requires Apple Developer account)
eas build --platform ios --profile production
```

## Future AWS VPS Migration

### Nginx Configuration (for admin dashboard)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /admin {
        root /var/www/fsm;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_headers;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker Configuration
See docker-compose.yml for containerized deployment

### AWS Deployment Steps
1. Create EC2 instance (Ubuntu 22.04)
2. Install Docker and Docker Compose
3. Clone repository
4. Configure environment variables
5. Run `docker-compose up -d`

## Database Migration

### Backup Supabase Data
```bash
# Export schema
pg_dump -h db.your-project.supabase.co -U postgres -d postgres --schema-only > schema.sql

# Export data
pg_dump -h db.your-project.supabase.co -U postgres -d postgres --data-only > data.sql
```

### Restore to Self-Hosted PostgreSQL
```bash
psql -h your-aws-host -U postgres -d fsm_db < schema.sql
psql -h your-aws-host -U postgres -d fsm_db < data.sql
```
