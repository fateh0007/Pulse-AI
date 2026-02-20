# Pulse AI Frontend Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm start
   ```

3. **Access the Application**
   - Open http://localhost:3000 in your browser
   - The app will automatically proxy API requests to http://localhost:4000

## Backend Requirements

Make sure your backend server is running on port 4000 with the following endpoints available:

- `/api/auth/register` - User registration
- `/api/auth/login` - User login  
- `/api/doctors` - Doctor management
- `/api/chat` - AI chat functionality
- `/api/prescriptions/pdf` - Prescription generation

## Environment Variables

Create a `.env` file in the frontend directory (optional):

```
REACT_APP_API_URL=http://localhost:4000/api
```

## Default User Roles

You can register with any of these roles:
- **user** - Patient access
- **doctor** - Doctor access with prescription creation
- **admin** - Full administrative access

## Features Overview

### For Patients:
- Browse and connect with doctors
- Chat with AI health assistant
- View personal dashboard
- Manage profile

### For Doctors:
- Create doctor profiles
- Generate prescription PDFs
- Access patient management tools
- Use AI chat for assistance

### For Admins:
- Full system access
- All features available to doctors and patients
- User management capabilities

## Troubleshooting

### Common Issues:

1. **API Connection Errors**
   - Ensure backend is running on port 4000
   - Check CORS settings in backend
   - Verify API endpoints are accessible

2. **Authentication Issues**
   - Clear browser localStorage
   - Check JWT token validity
   - Verify user role permissions

3. **Build Errors**
   - Delete node_modules and package-lock.json
   - Run `npm install` again
   - Check Node.js version compatibility

## Development Notes

- The app uses React Router for navigation
- Tailwind CSS for styling
- Axios for API communication
- React Hot Toast for notifications
- Lucide React for icons

## Production Build

To create a production build:

```bash
npm run build
```

The build files will be in the `build` directory.
