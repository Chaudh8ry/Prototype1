# InnerVerse

InnerVerse is a full-stack nutrition label scanning app that helps a user decide whether a packaged food fits their health profile. The app lets a user create an account, save a health profile, upload a food label image, review OCR output, run an AI-based analysis, and save past scan results.

## What The App Does

The current codebase supports this flow:

1. A user signs up or logs in.
2. The user creates a health profile with age group, activity level, body metrics, allergies, health conditions, and additional context.
3. The user uploads a food label image from desktop or phone camera.
4. The backend sends the image to Google Gemini to extract:
   - the ingredient list
   - the nutrition facts table
5. The user reviews and edits the extracted ingredients and nutrition data.
6. The backend sends the confirmed data plus the user's health profile to Gemini for a personalized analysis.
7. The frontend shows:
   - an overall health rating
   - a summary paragraph
   - allergen flags
   - moderation advice
   - alternative suggestions
   - an ingredient profile chart
   - an itemized ingredient breakdown
8. The user can save the scan and revisit it later from scan history.

## Current Stack

### Frontend

- React 19
- Vite
- Axios
- React Router DOM
- Lucide React

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- Multer for image uploads
- bcryptjs for password hashing

### External Service

- Google Gemini API for OCR-style extraction and personalized ingredient analysis

## Project Structure

```text
Prototype1/
├── src/                  # React frontend
├── backend/              # Express + MongoDB backend
├── package.json          # Frontend scripts and dependencies
├── vite.config.js
└── README.md
```

Important backend files:

- [`backend/server.js`](/Users/chaudh8ry/Desktop/Prototype1/backend/server.js)
- [`backend/routes/auth.js`](/Users/chaudh8ry/Desktop/Prototype1/backend/routes/auth.js)
- [`backend/routes/profile.js`](/Users/chaudh8ry/Desktop/Prototype1/backend/routes/profile.js)
- [`backend/routes/analysis.js`](/Users/chaudh8ry/Desktop/Prototype1/backend/routes/analysis.js)
- [`backend/routes/scans.js`](/Users/chaudh8ry/Desktop/Prototype1/backend/routes/scans.js)
- [`backend/utils/geminiApi.js`](/Users/chaudh8ry/Desktop/Prototype1/backend/utils/geminiApi.js)

Important frontend files:

- [`src/App.jsx`](/Users/chaudh8ry/Desktop/Prototype1/src/App.jsx)
- [`src/services/api.js`](/Users/chaudh8ry/Desktop/Prototype1/src/services/api.js)
- [`src/components/ProfileForm.jsx`](/Users/chaudh8ry/Desktop/Prototype1/src/components/ProfileForm.jsx)
- [`src/components/Scanner.jsx`](/Users/chaudh8ry/Desktop/Prototype1/src/components/Scanner.jsx)
- [`src/components/ConfirmationView.jsx`](/Users/chaudh8ry/Desktop/Prototype1/src/components/ConfirmationView.jsx)
- [`src/components/AnalysisReport.jsx`](/Users/chaudh8ry/Desktop/Prototype1/src/components/AnalysisReport.jsx)
- [`src/components/ScanHistory.jsx`](/Users/chaudh8ry/Desktop/Prototype1/src/components/ScanHistory.jsx)

## Features Reflected In Code

- Email/password authentication with JWT
- Persistent login using token storage in `localStorage`
- Health profile creation and editing
- BMI calculation from height and weight
- Categorized health condition selection
- Image upload with file type and size validation
- OCR-style extraction of ingredients and nutrition values from a label image
- Manual confirmation and correction step before analysis
- Personalized AI analysis based on profile + ingredients + nutrition table
- Saved scan history with view and delete support

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Profile

- `POST /api/profile`
- `GET /api/profile`

### Analysis

- `POST /api/analysis/extract-ingredients`
- `POST /api/analysis/analyze-ingredients`
- `GET /api/analysis/ingredient/:name`

### Saved Scans

- `POST /api/scans`
- `GET /api/scans`
- `GET /api/scans/:id`
- `DELETE /api/scans/:id`

## Environment Variables

Create `backend/.env` from [`backend/env.example`](/Users/chaudh8ry/Desktop/Prototype1/backend/env.example).

Example:

```env
MONGODB_URI=mongodb://localhost:27017/innerverse
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5050
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Notes:

- The backend now defaults to port `5050`.
- The frontend expects the API at `http://localhost:5050/api` unless `VITE_API_BASE_URL` is set.
- `FRONTEND_URL` is used for CORS.

## Local Setup

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- A Google Gemini API key

### Install Dependencies

Frontend:

```bash
cd /Users/chaudh8ry/Desktop/Prototype1
npm install
```

Backend:

```bash
cd /Users/chaudh8ry/Desktop/Prototype1/backend
npm install
```

### Start The App

Backend:

```bash
cd /Users/chaudh8ry/Desktop/Prototype1/backend
npm run dev
```

Frontend:

```bash
cd /Users/chaudh8ry/Desktop/Prototype1
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Default Ports

- Frontend: `5173`
- Backend: `5050`

If you want a different backend host or port for the frontend, create a root `.env` file with:

```env
VITE_API_BASE_URL=http://localhost:5050
```

## Typical User Journey

1. Register a new account.
2. Fill in the profile form.
3. Upload a food label image.
4. Confirm or edit extracted ingredients and nutrition values.
5. Review the personalized report.
6. Save the scan for later.
7. Reopen or delete previous scans from history.

## Current Limitations

- The app depends on a valid Gemini API key for extraction and analysis.
- MongoDB must be available before auth, profile, and saved scans work correctly.
- Uploaded images are processed through the backend and then removed after extraction.
- There are no automated tests configured in the current repo.

## Build

To build the frontend:

```bash
cd /Users/chaudh8ry/Desktop/Prototype1
npm run build
```

## Future Improvements

- Add automated tests for frontend and backend flows
- Add stronger request validation
- Add better empty/error states around AI failures
- Support deployment-ready environment configs
- Add rate limiting and production-grade security middleware
