# Rent Management App

A beginner-friendly full-stack Rent Management app to track monthly rent and electricity bills with meter photos, signatures, and PDF receipts.

## Folder structure
```
RENTER/
  client/   # React frontend
  server/   # Express backend
```

## Prerequisites
- Node.js 18+
- A Firebase project with Firestore, Storage, and Authentication enabled

## Setup instructions

### 1) Backend (Express)
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend (React)
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

### 3) Firebase setup
- Enable **Authentication → Email/Password**
- Enable **Firestore**
- Enable **Storage**
- Create a **service account** in Firebase Console and copy the JSON into `FIREBASE_SERVICE_ACCOUNT_KEY` in the server `.env` file.

## Environment variables
See `client/.env.example` and `server/.env.example` for required values.

## Notes
- The backend uploads meter photos to Firebase Storage and stores public URLs in Firestore.
- PDF receipts are generated on the client using `jspdf`.
