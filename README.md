# Smart Library & Peer Book Exchange Platform

College-level full-stack web application for managing a smart college library and peer-to-peer book exchange with moderation, reporting, and real-time chat.

## Tech Stack

- Frontend: React + Tailwind CSS + Vite
- Backend: Node.js + Express (MVC)
- Database: MongoDB (Mongoose)
- Auth: JWT + bcrypt
- File Upload: Multer
- Email: Nodemailer
- Real-time: Socket.io

## Project Structure

```text
cursor/
  backend/
    src/
      config/
      controllers/
      middlewares/
      models/
      routes/
      services/
      app.js
      server.js
  frontend/
    src/
      components/
      context/
      lib/
      pages/
      App.tsx
      main.tsx
```

## Features Implemented

### 1) Authentication & Verification
- Register/Login
- College ID and selfie upload at registration
- Verification status maintained in user profile
- JWT auth with protected routes
- Password hashing using bcrypt

### 2) Smart Library
- Search books by title, author, ISBN
- Show availability count and rack location
- Borrow book flow with auto due date (7 days)
- Return flow with overdue fine calculation
- Reminder email service hook + admin trigger endpoint

### 3) Peer-to-Peer Exchange
- List books for sell/borrow/exchange
- Multi-image upload support
- Request/approve/reject/complete transaction flow
- Reviews and rating support

### 4) Reports & Admin Panel
- Report user/listing/review/transaction
- Auto-flag listing on listing report
- Admin dashboard stats
- Ban/unban users
- Verify/unverify users
- Listing moderation (approve/flag/remove)
- Report status management
- Transaction monitoring

### 5) Real-time Chat
- Room-based chat via Socket.io
- Join room and send/receive live messages
- Chat history persistence in MongoDB
- REST endpoint for room message history

## Setup Instructions

## Prerequisites
- Node.js 18+
- MongoDB local or Atlas

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` from `.env.example` and fill values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=smart_library_peer_exchange
JWT_SECRET=your_jwt_secret_here
FINE_PER_DAY=5
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Smart Library <your_email@gmail.com>
```

Run backend:

```bash
npm run dev
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`  
Backend URL: `http://localhost:5000`

## Build Commands

```bash
# frontend
cd frontend
npm run build

# backend (development run)
cd backend
npm run dev
```

## Core API Groups

- Auth: `/api/auth/*`
- Library: `/api/library-books/*`
- Exchange: `/api/exchange/*`
- Reports: `/api/reports/*`
- Admin: `/api/admin/*`
- Chat REST: `/api/chat/*`
- Socket events: `join_room`, `send_message`, `receive_message`, `chat_error`

Detailed submission/demo checklist is in `FINAL_DEMO_CHECKLIST.md`.

## Documentation Files

- `DEPLOYMENT_GUIDE.md` - local + production deployment steps
- `FINAL_DEMO_CHECKLIST.md` - final project demonstration checklist

