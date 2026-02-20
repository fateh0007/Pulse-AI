# Backend Setup Guide

## Environment Variables Required

Create a `.env` file in the backend directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/pulse-ai

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Google Gemini AI
GEMINI_API_KEY=your-google-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# Server
PORT=4000
NODE_ENV=development
```

## Getting Started

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Update MONGODB_URI in .env file

3. **Get Google Gemini API Key**
   - Go to Google AI Studio
   - Create a new API key
   - Add it to your .env file

4. **Start the Server**
   ```bash
   npm run dev
   ```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/doctors` - List doctors
- `POST /api/doctors` - Create doctor profile
- `POST /api/doctors/:id/connect` - Connect with doctor
- `GET /api/doctors/me/connections` - Get user connections
- `POST /api/chat` - AI chat
- `POST /api/prescriptions/pdf` - Generate prescription PDF

## Fixed Issues

- ✅ Updated Google Generative AI package and API usage
- ✅ Fixed chat controller to use correct Gemini API methods
- ✅ Proper error handling and response formatting
