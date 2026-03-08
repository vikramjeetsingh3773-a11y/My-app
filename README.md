# BattleMint - Esports Tournament Platform

Complete production-ready esports tournament platform with mobile app, backend API, and admin dashboard.

## 📁 Project Structure

```
BattleMint/
├── backend/              # Node.js/Express API Server
│   ├── src/
│   │   ├── config/       # Database & Redis config
│   │   ├── controllers/  # Business logic (5 controllers)
│   │   ├── routes/       # API routes (30+ endpoints)
│   │   ├── middlewares/  # Auth & error handling
│   │   ├── services/     # External services
│   │   └── utils/        # Utilities
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   └── tsconfig.json
│
├── mobile_app/           # Flutter Application
│   ├── lib/
│   │   ├── config/       # Theme & routes
│   │   ├── services/     # API integration
│   │   ├── main.dart
│   ├── pubspec.yaml
│
├── admin_panel/          # React Admin Dashboard
│   ├── src/
│   └── package.json
│
├── docs/                 # Documentation
│   ├── 00_START_HERE.md
│   ├── README.md
│   ├── BATTLEMINT_ARCHITECTURE.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── APK_BUILD_GUIDE.md
│   ├── FILE_STRUCTURE.md
│   └── INDEX.md
│
├── setup.sh              # Automated setup script
└── .gitignore
```

## 🚀 Quick Start

1. **Read Documentation**
   ```bash
   cat docs/00_START_HERE.md
   ```

2. **Run Setup Script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Configure Environment**
   ```bash
   cd backend
   cp .env.example .env
   nano .env  # Add your credentials
   ```

4. **Start Services**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Mobile
   cd mobile_app && flutter run
   
   # Terminal 3: Admin
   cd admin_panel && npm start
   ```

## 📚 Documentation

- **00_START_HERE.md** - Begin here!
- **README.md** - Project overview
- **BATTLEMINT_ARCHITECTURE.md** - System design
- **DEPLOYMENT_GUIDE.md** - Setup & deployment
- **APK_BUILD_GUIDE.md** - Mobile app build
- **FILE_STRUCTURE.md** - Project organization
- **INDEX.md** - Quick reference

## ✨ Features

✅ User authentication (JWT)
✅ Tournament management
✅ Wallet system (UPI)
✅ Admin controls
✅ Anti-cheat measures
✅ Push notifications
✅ Real-time leaderboards
✅ Docker deployment
✅ 30+ API endpoints
✅ 8-table database

## 🛠️ Technology Stack

- **Mobile**: Flutter 3.16+
- **Backend**: Node.js 18.19+, Express, TypeScript
- **Database**: PostgreSQL 15+, Redis 7+
- **Admin**: React 18.2+
- **Deployment**: Docker

## 📖 Next Steps

1. Extract the zip file
2. Read `docs/00_START_HERE.md`
3. Run `./setup.sh`
4. Follow the setup prompts

## 📝 License

MIT License

---

**Status**: Production Ready ✅
**Version**: 1.0.0
**All files included and organized**
