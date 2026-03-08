# BattleMint - Complete Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Database Setup](#database-setup)
4. [Mobile App Setup](#mobile-app-setup)
5. [Admin Dashboard Setup](#admin-dashboard-setup)
6. [Docker Deployment](#docker-deployment)
7. [APK Build Process](#apk-build-process)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

### System Requirements
- **Node.js**: v18.19 or higher
- **npm**: v9 or higher
- **Flutter**: Latest stable (3.16+)
- **PostgreSQL**: v15 or higher
- **Redis**: v7 or higher
- **Docker**: Latest version
- **Git**: Latest version

### Environment Variables
Create `.env` files in backend and mobile directories using `.env.example` as template.

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=battlemint
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-key-change-in-production
PORT=3000
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=battlemint-uploads
```

### 3. Build TypeScript

```bash
npm run build
```

### 4. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

### 5. Run Production Server

```bash
npm start
```

---

## Database Setup

### PostgreSQL Installation

#### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download installer from https://www.postgresql.org/download/windows/

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE battlemint;

# Create user
CREATE USER battlemint_user WITH PASSWORD 'secure_password';

# Grant privileges
ALTER ROLE battlemint_user SET client_encoding TO 'utf8';
ALTER ROLE battlemint_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE battlemint_user SET default_transaction_deferrable TO on;
ALTER ROLE battlemint_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE battlemint TO battlemint_user;

# Exit psql
\q
```

### Redis Installation

#### macOS
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Windows
Download from https://github.com/microsoftarchive/redis/releases

### Verify Connections

```bash
# Test PostgreSQL
psql -U battlemint_user -d battlemint

# Test Redis
redis-cli ping
# Should return "PONG"
```

---

## Mobile App Setup

### 1. Get Flutter

```bash
# Install Flutter from https://flutter.dev/docs/get-started/install
flutter --version
```

### 2. Setup Project

```bash
cd mobile_app
flutter pub get
```

### 3. Configure API URL

Edit `lib/services/api_service.dart`:
```dart
static const String _baseUrl = 'http://your-api-domain/api';
```

### 4. Run on Emulator/Device

```bash
# List available devices
flutter devices

# Run app
flutter run

# Run with verbose logging
flutter run -v
```

### 5. Check Code

```bash
# Analyze code
flutter analyze

# Format code
flutter format .
```

---

## Admin Dashboard Setup

### 1. Create React Project

```bash
cd admin_panel
npm install
```

### 2. Create .env File

```
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_PROJECT_ID=your_project
```

### 3. Start Development Server

```bash
npm start
```

Admin dashboard will run on `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

---

## Docker Deployment

### 1. Prerequisites

Ensure Docker and Docker Compose are installed:
```bash
docker --version
docker-compose --version
```

### 2. Build and Run

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### 3. Verify Services

```bash
# Check running containers
docker-compose ps

# Test API health
curl http://localhost:3000/api/health

# Connect to database
docker-compose exec postgres psql -U postgres -d battlemint
```

### 4. Database Migrations (if needed)

```bash
docker-compose exec api npm run migrate
```

---

## APK Build Process

### 1. Prepare Signing Key

```bash
# Generate keystore (first time only)
keytool -genkey -v -keystore ~/battlemint-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias battlemint
```

### 2. Configure Signing

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            keyAlias 'battlemint'
            keyPassword 'your_key_password'
            storeFile file('/path/to/battlemint-key.jks')
            storePassword 'your_store_password'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### 3. Build Release APK

```bash
cd mobile_app

# Get dependencies
flutter pub get

# Build APK
flutter build apk --release

# Output location
# build/app/outputs/flutter-apk/app-release.apk

# Build App Bundle (for Google Play)
flutter build appbundle --release

# Output location
# build/app/outputs/bundle/release/app-release.aab
```

### 4. Verify APK

```bash
# Check APK details
aapt dump badging build/app/outputs/flutter-apk/app-release.apk

# Install on device
adb install -r build/app/outputs/flutter-apk/app-release.apk

# View logs
adb logcat | grep flutter
```

### 5. Upload to Play Store

1. Go to https://play.google.com/console
2. Create new app
3. Upload App Bundle (.aab)
4. Fill in app details
5. Submit for review

---

## Production Deployment

### AWS Deployment (Example)

#### 1. RDS Database

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier battlemint-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --allocated-storage 20 \
  --db-name battlemint
```

#### 2. ElastiCache Redis

```bash
# Create ElastiCache Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id battlemint-redis \
  --engine redis \
  --cache-node-type cache.t3.micro
```

#### 3. ECS Deployment

```bash
# Create ECS task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# Create ECS service
aws ecs create-service \
  --cluster battlemint \
  --service-name battlemint-api \
  --task-definition battlemint-api:1 \
  --desired-count 2
```

#### 4. S3 for Static Assets

```bash
# Create S3 bucket
aws s3 mb s3://battlemint-uploads

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket battlemint-uploads \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket battlemint-uploads \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Environment Configuration

Create production `.env`:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/battlemint
REDIS_URL=redis://elasticache-endpoint:6379
JWT_SECRET=your-very-secure-random-secret-key
API_URL=https://api.battlemint.com
CORS_ORIGINS=https://battlemint.com,https://admin.battlemint.com
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d api.battlemint.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Monitoring

```bash
# CloudWatch
aws cloudwatch put-metric-alarm \
  --alarm-name battlemint-api-errors \
  --alarm-description "Alert on API errors" \
  --metric-name Error4xx \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### Performance Optimization

1. **Database**: Enable query caching, create indexes
2. **Redis**: Configure eviction policies
3. **API**: Enable response compression, use CDN
4. **Frontend**: Minify assets, use lazy loading

### Backup & Recovery

```bash
# Database backup
pg_dump -U user -h host battlemint > backup.sql

# Restore backup
psql -U user -h host battlemint < backup.sql

# Automated backups (using S3)
aws s3 sync /backups s3://battlemint-backups/
```

---

## Health Checks & Monitoring

### API Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Database Health

```bash
psql -U user -h host -c "SELECT NOW();"
```

### Redis Health

```bash
redis-cli ping
# Returns: PONG
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Error

```bash
# Test connection
psql -h localhost -U user -d battlemint

# Check credentials
cat backend/.env | grep DATABASE
```

### Mobile App Build Issues

```bash
# Clean build
flutter clean

# Get dependencies again
flutter pub get

# Rebuild
flutter build apk --release
```

### Docker Issues

```bash
# View service logs
docker-compose logs -f service_name

# Rebuild specific service
docker-compose build --no-cache api

# Reset all services
docker-compose down -v
docker-compose up -d
```

---

## Summary

BattleMint is now fully deployed and ready for production use. Monitor regularly using CloudWatch, DataDog, or similar services. Keep dependencies updated and perform security audits monthly.

For support, check logs in `/logs/` directory or contact the development team.
