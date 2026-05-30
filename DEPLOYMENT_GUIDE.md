# Deployment Guide

This guide covers local deployment and a simple production approach for the Smart Library project.

## 1) Local Deployment (Recommended for College Demo)

## Backend

1. Open terminal:
   ```bash
   cd backend
   npm install
   ```
2. Create `.env` from `.env.example`.
3. Set `MONGO_URI`, `JWT_SECRET`, and optional SMTP values.
4. Run:
   ```bash
   npm run dev
   ```
5. Verify:
   - `GET http://localhost:5000/health`

## Frontend

1. Open second terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open:
   - `http://localhost:5173`

## 2) Production Deployment (Simple)

## Backend on Render/Railway

1. Push project to GitHub.
2. Create backend service from `backend/` directory.
3. Add environment variables:
   - `PORT` (platform-provided or 5000)
   - `MONGO_URI`
   - `MONGO_DB_NAME`
   - `JWT_SECRET`
   - `FINE_PER_DAY`
   - SMTP variables if email reminders are needed
4. Build/start:
   - Install command: `npm install`
   - Start command: `npm start`

## Frontend on Vercel/Netlify

1. Deploy `frontend/` as a static Vite app.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set frontend API base URL if needed (for production backend domain).

## 3) MongoDB Deployment

- Use MongoDB Atlas for production.
- Ensure network access allows your backend host.
- Use a dedicated DB user with strong password.

## 4) Security Checklist for Deployment

- Use strong random `JWT_SECRET`.
- Do not commit `.env`.
- Restrict CORS to frontend domain in production.
- Enforce HTTPS in production hosting.
- Use app password for SMTP (not personal email password).
- Rotate secrets if exposed.

## 5) Common Troubleshooting

- `EADDRINUSE` on backend:
  - Change `PORT` or stop previous process using port.
- Mongo connect failure:
  - Check URI, DB user permissions, and whitelist/IP access.
- 401 on protected routes:
  - Check `Authorization: Bearer <token>` header.
- Socket connection issues:
  - Confirm backend URL and CORS settings for Socket.io.

