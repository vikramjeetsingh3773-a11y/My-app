# BattleMint - Esports Tournament Platform
## Complete System Architecture Document

---

## 1. SYSTEM OVERVIEW

**BattleMint** is a mobile-first esports tournament platform enabling players to compete in battle royale matches, participate in tournaments, and monetize their gaming skills.

### Core Objectives
- Support thousands of concurrent players
- Provide seamless tournament management
- Enable secure payment processing
- Implement anti-cheat mechanisms
- Deliver real-time notifications
- Scale horizontally with demand

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Mobile App | Flutter | 3.16+ |
| Backend API | Node.js + Express | 18.19+ |
| Database | PostgreSQL | 15+ |
| Admin Panel | React + Tailwind | Latest |
| Authentication | JWT + Bcrypt | - |
| Push Notifications | Firebase Cloud Messaging | Latest |
| Cloud Storage | AWS S3 or Similar | - |
| Containerization | Docker + Docker Compose | Latest |
| Cache Layer | Redis | 7+ |

---

## 2. ARCHITECTURE LAYERS

### 2.1 Presentation Layer (Mobile)
- **Framework**: Flutter (Dart)
- **State Management**: Provider/Riverpod
- **HTTP Client**: Dio
- **Local Storage**: Hive/Shared Preferences
- **Image Caching**: CachedNetworkImage

### 2.2 Application Layer (Admin Dashboard)
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State**: Redux Toolkit
- **HTTP**: Axios

### 2.3 API Layer (Backend)
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT + Middleware
- **Validation**: Joi/Zod
- **ORM**: Sequelize/TypeORM

### 2.4 Data Layer
- **Primary Database**: PostgreSQL (ACID compliance)
- **Cache**: Redis (Session, Real-time data)
- **File Storage**: AWS S3 (Screenshots, avatars)

---

## 3. DATABASE SCHEMA

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  freefire_uid VARCHAR(20) UNIQUE,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  total_wins INT DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  rank INT DEFAULT 0,
  avatar_url TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tournaments Table
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  game_mode VARCHAR(50) NOT NULL, -- Battle Royale, Clash Squad, etc.
  entry_fee DECIMAL(8,2) NOT NULL,
  prize_pool DECIMAL(12,2) NOT NULL,
  max_players INT NOT NULL,
  current_players INT DEFAULT 0,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  room_id VARCHAR(50),
  room_password VARCHAR(50),
  map_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'upcoming', -- upcoming, live, ended
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Participants Table
```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  placement INT,
  prize_won DECIMAL(10,2) DEFAULT 0,
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'joined', -- joined, completed, disqualified
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tournament_id)
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- deposit, withdrawal, prize, entry_fee
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
  reference_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Withdrawals Table
```sql
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  upi_id VARCHAR(100) NOT NULL,
  screenshot_url TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, completed
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Admin Settings Table
```sql
CREATE TABLE admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  data_type VARCHAR(20), -- number, string, boolean
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50), -- tournament_start, prize_won, deposit_approved
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Banned Users Table
```sql
CREATE TABLE banned_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lifted_at TIMESTAMP
);
```

---

## 4. API ENDPOINTS SPECIFICATION

### Authentication APIs

#### POST /api/auth/signup
**Request:**
```json
{
  "username": "player123",
  "email": "player@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123!"
}
```
**Response:** 201 Created
```json
{
  "success": true,
  "message": "Account created. OTP sent to phone.",
  "user_id": "uuid"
}
```

#### POST /api/auth/verify-otp
**Request:**
```json
{
  "user_id": "uuid",
  "otp": "123456"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Phone verified",
  "token": "jwt_token"
}
```

#### POST /api/auth/login
**Request:**
```json
{
  "email": "player@example.com",
  "password": "SecurePass123!"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "player123",
    "wallet_balance": 500.00,
    "freefire_uid": "12345678"
  }
}
```

#### POST /api/auth/refresh-token
**Response:** 200 OK
```json
{
  "token": "new_jwt_token"
}
```

#### POST /api/auth/logout
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### User Profile APIs

#### GET /api/users/profile
**Headers:** Authorization: Bearer token
**Response:** 200 OK
```json
{
  "id": "uuid",
  "username": "player123",
  "email": "player@example.com",
  "phone": "+919876543210",
  "freefire_uid": "12345678",
  "wallet_balance": 500.00,
  "total_wins": 15,
  "total_earnings": 5000.00,
  "rank": 1250,
  "avatar_url": "https://s3.../avatar.jpg",
  "phone_verified": true,
  "is_verified": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### PUT /api/users/profile
**Request:**
```json
{
  "username": "newusername",
  "avatar": "base64_image_data"
}
```
**Response:** 200 OK

#### POST /api/users/connect-gaming-id
**Request:**
```json
{
  "freefire_uid": "12345678"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Free Fire UID connected"
}
```

#### GET /api/users/match-history
**Response:** 200 OK
```json
{
  "matches": [
    {
      "tournament_id": "uuid",
      "tournament_name": "Weekend Mega Battle",
      "placement": 5,
      "prize_won": 250.00,
      "game_mode": "Squad Mode",
      "completed_at": "2024-01-20T15:45:00Z"
    }
  ]
}
```

---

### Tournament APIs

#### GET /api/tournaments
**Query Parameters:** 
- `game_mode=Squad Mode`
- `status=upcoming`
- `page=1&limit=10`

**Response:** 200 OK
```json
{
  "tournaments": [
    {
      "id": "uuid",
      "name": "Weekend Mega Battle",
      "game_mode": "Squad Mode",
      "entry_fee": 50.00,
      "prize_pool": 5000.00,
      "max_players": 100,
      "current_players": 85,
      "start_time": "2024-01-28T18:00:00Z",
      "map_type": "Bermuda",
      "status": "upcoming"
    }
  ],
  "total": 45,
  "page": 1
}
```

#### GET /api/tournaments/:id
**Response:** 200 OK
```json
{
  "id": "uuid",
  "name": "Weekend Mega Battle",
  "description": "Compete with thousands...",
  "game_mode": "Squad Mode",
  "entry_fee": 50.00,
  "prize_pool": 5000.00,
  "max_players": 100,
  "current_players": 85,
  "start_time": "2024-01-28T18:00:00Z",
  "end_time": null,
  "map_type": "Bermuda",
  "status": "upcoming",
  "room_id": null,
  "room_password": null
}
```

#### POST /api/tournaments/join
**Headers:** Authorization: Bearer token
**Request:**
```json
{
  "tournament_id": "uuid"
}
```
**Response:** 201 Created
```json
{
  "success": true,
  "message": "Joined tournament successfully",
  "participant_id": "uuid",
  "wallet_balance": 450.00
}
```

#### GET /api/tournaments/:id/room-details
**Headers:** Authorization: Bearer token
**Response:** 200 OK (Only available 30 min before match start)
```json
{
  "room_id": "BATTLE123456",
  "room_password": "pass@2024",
  "start_time": "2024-01-28T18:00:00Z",
  "map_type": "Bermuda",
  "rules": "Squad mode 4v4, 10 minutes setup"
}
```

#### POST /api/tournaments/:id/submit-result
**Headers:** Authorization: Bearer token
**Request:**
```json
{
  "placement": 5,
  "screenshot": "base64_image_data"
}
```
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Result submitted for verification",
  "status": "pending"
}
```

---

### Wallet APIs

#### GET /api/wallet/balance
**Headers:** Authorization: Bearer token
**Response:** 200 OK
```json
{
  "balance": 500.00,
  "locked_amount": 50.00,
  "available": 450.00
}
```

#### POST /api/wallet/deposit
**Request:**
```json
{
  "amount": 500.00,
  "payment_screenshot": "base64_image_data"
}
```
**Response:** 201 Created
```json
{
  "success": true,
  "message": "Deposit submitted for verification",
  "transaction_id": "uuid",
  "status": "pending"
}
```

#### GET /api/wallet/transactions
**Query Parameters:** `page=1&limit=10&type=deposit`
**Response:** 200 OK
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": 500.00,
      "type": "deposit",
      "status": "completed",
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "total": 25
}
```

#### POST /api/wallet/withdraw
**Headers:** Authorization: Bearer token
**Request:**
```json
{
  "amount": 250.00,
  "upi_id": "player@upi"
}
```
**Response:** 201 Created
```json
{
  "success": true,
  "message": "Withdrawal request submitted",
  "withdrawal_id": "uuid",
  "status": "pending"
}
```

---

### Admin APIs

#### POST /api/admin/tournaments
**Headers:** Authorization: Bearer token (Admin only)
**Request:**
```json
{
  "name": "Weekend Mega Battle",
  "description": "Compete with thousands...",
  "game_mode": "Squad Mode",
  "entry_fee": 50.00,
  "prize_pool": 5000.00,
  "max_players": 100,
  "start_time": "2024-01-28T18:00:00Z",
  "map_type": "Bermuda"
}
```
**Response:** 201 Created
```json
{
  "success": true,
  "tournament_id": "uuid"
}
```

#### PUT /api/admin/tournaments/:id
**Response:** 200 OK

#### DELETE /api/admin/tournaments/:id
**Response:** 200 OK

#### GET /api/admin/deposits/pending
**Response:** 200 OK
```json
{
  "deposits": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "username": "player123",
      "amount": 500.00,
      "screenshot_url": "https://s3.../screenshot.jpg",
      "created_at": "2024-01-20T10:30:00Z"
    }
  ],
  "total": 15
}
```

#### POST /api/admin/deposits/:id/approve
**Response:** 200 OK
```json
{
  "success": true,
  "message": "Deposit approved"
}
```

#### POST /api/admin/deposits/:id/reject
**Request:**
```json
{
  "reason": "Invalid screenshot"
}
```
**Response:** 200 OK

#### GET /api/admin/withdrawals/pending
**Response:** 200 OK

#### POST /api/admin/withdrawals/:id/approve
**Response:** 200 OK

#### POST /api/admin/users/:id/ban
**Request:**
```json
{
  "reason": "Cheating detected"
}
```
**Response:** 200 OK

#### DELETE /api/admin/users/:id/ban
**Response:** 200 OK

#### GET /api/admin/analytics
**Response:** 200 OK
```json
{
  "total_users": 5420,
  "total_deposits": 125000.00,
  "total_withdrawals": 45000.00,
  "active_tournaments": 8,
  "revenue": 80000.00,
  "daily_growth": 2.5,
  "daily_active_users": 1200,
  "conversion_rate": 15.5
}
```

#### PUT /api/admin/settings
**Request:**
```json
{
  "min_withdrawal": 100,
  "max_withdrawal": 50000,
  "min_entry_fee": 10
}
```
**Response:** 200 OK

---

## 5. SECURITY ARCHITECTURE

### Authentication & Authorization
- **JWT Strategy**: Tokens with 24-hour expiry + refresh tokens
- **Password Security**: Bcrypt hashing with salt rounds 12
- **Rate Limiting**: 100 requests/minute per IP (5/minute for auth)
- **CORS**: Whitelist specific domains

### Data Protection
- **HTTPS**: Mandatory for all endpoints
- **Input Validation**: Joi schema validation on all inputs
- **SQL Injection**: Parameterized queries via ORM
- **CSRF**: Token-based protection for state-changing operations

### Anti-Cheat Measures
- **Screenshot Verification**: Manual admin review
- **Duplicate Detection**: Alert on same FFUID from multiple accounts
- **Location Verification**: IP-based geographic checks
- **Device Fingerprinting**: Browser/device signature tracking
- **User Reporting**: Community-driven fraud reporting

### File Security
- **Image Upload**: Virus scanning, format validation, size limits
- **Storage**: S3 bucket with encryption and access controls
- **CDN**: CloudFront distribution for secure delivery

---

## 6. SCALABILITY ARCHITECTURE

### Database Optimization
- **Indexing**: Composite indexes on frequently queried columns
- **Partitioning**: Partition transactions table by date
- **Connection Pooling**: PgBouncer with 100 connections
- **Query Optimization**: EXPLAIN ANALYZE on slow queries

### Caching Strategy
- **Redis Layers**:
  - Session cache (5 min TTL)
  - Tournament listings (1 min TTL)
  - User profiles (10 min TTL)
  - Leaderboards (5 min TTL)

### API Performance
- **Pagination**: All list endpoints support limit/offset
- **Lazy Loading**: Frontend loads data on demand
- **Compression**: GZIP compression enabled
- **CDN**: CloudFront for static assets

### Load Balancing
- **Nginx**: Reverse proxy with load balancing
- **Horizontal Scaling**: Stateless API servers
- **Auto-scaling**: Based on CPU/memory metrics

---

## 7. DEPLOYMENT ARCHITECTURE

### Docker Containerization
```
Services:
- api-service (Node.js)
- postgresql (Database)
- redis (Cache)
- nginx (Reverse proxy)
```

### Cloud Infrastructure (AWS Example)
- **Compute**: ECS Fargate for API services
- **Database**: RDS PostgreSQL Multi-AZ
- **Cache**: ElastiCache Redis
- **Storage**: S3 + CloudFront
- **DNS**: Route 53
- **Monitoring**: CloudWatch + DataDog

### CI/CD Pipeline
- **Repository**: GitHub
- **Build**: GitHub Actions
- **Testing**: Unit + Integration tests
- **Deployment**: Blue-green deployment strategy

---

## 8. MONITORING & LOGGING

### Application Logging
- **Framework**: Winston logger
- **Levels**: error, warn, info, debug
- **Aggregation**: ELK Stack or Datadog

### Performance Monitoring
- **APM**: New Relic / DataDog
- **Metrics**: Response times, error rates, throughput
- **Alerts**: Automatic escalation on critical errors

### Uptime Monitoring
- **Health Checks**: /api/health endpoint
- **Ping Monitoring**: Uptime Robot
- **Alerting**: PagerDuty integration

---

## 9. DISASTER RECOVERY

### Backup Strategy
- **Database**: Automated daily backups to S3
- **Retention**: 30-day backup retention
- **Recovery Test**: Monthly backup restoration tests
- **RTO**: 4 hours
- **RPO**: 1 hour

### High Availability
- **Multi-AZ**: Database and API across availability zones
- **Failover**: Automatic RDS failover
- **Redundancy**: Multiple instances of all services

---

## 10. DEVELOPMENT WORKFLOW

### Version Control
- **Repository Structure**: Feature branches, main/staging
- **Commit Convention**: Conventional commits
- **Code Review**: Pull request reviews required

### Testing Strategy
- **Unit Tests**: 80% code coverage target
- **Integration Tests**: API endpoint tests
- **Load Testing**: Apache JMeter / Gatling
- **Security Testing**: OWASP ZAP scans

### Documentation
- **API Docs**: Swagger/OpenAPI
- **Code**: JSDoc comments
- **Deployment**: Runbooks for all procedures

---

This architecture provides a scalable, secure, and maintainable foundation for BattleMint capable of handling thousands of concurrent users with enterprise-grade reliability.
