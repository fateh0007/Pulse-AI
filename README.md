# Pulse AI - Healthcare Management Frontend

A modern, responsive React frontend for the Pulse AI healthcare management system. This application provides an intuitive interface for patients, doctors, and administrators to manage healthcare services.

## Features

### 🔐 Authentication
- User registration and login
- Role-based access control (Patient, Doctor, Admin)
- Secure JWT token management
- Protected routes

### 👨‍⚕️ Doctor Management
- Browse and search doctors by specialty
- Connect with healthcare professionals
- Doctor profile creation and management
- Experience and language filtering

### 🤖 AI Health Assistant
- Real-time chat with AI-powered health assistant
- Quick health questions and answers
- General health information and guidance
- Instant responses powered by Google Gemini AI

### 📋 Prescription Management
- Create professional prescription PDFs (Doctor/Admin only)
- Comprehensive medication management
- Patient information tracking
- Downloadable prescription documents

### 📊 Dashboard
- Personalized dashboard for each user role
- Health statistics and insights
- Quick action buttons
- Recent activity tracking

### 👤 Profile Management
- User profile information
- Account settings
- Security status
- Role-based feature access

## Technology Stack

- **Frontend Framework**: React 18
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running on port 4000

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file (optional):
   ```bash
   cp .env.example .env
   ```
   
   Add your environment variables:
   ```
   REACT_APP_API_URL=http://localhost:4000/api
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## API Integration

The frontend integrates with the following backend endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Doctors
- `GET /api/doctors` - List all doctors
- `POST /api/doctors` - Create doctor profile
- `POST /api/doctors/:id/connect` - Connect with doctor
- `GET /api/doctors/me/connections` - Get user connections

### Chat
- `POST /api/chat` - Send message to AI assistant

### Prescriptions
- `POST /api/prescriptions/pdf` - Generate prescription PDF

## User Roles

### Patient (User)
- Browse and connect with doctors
- Chat with AI health assistant
- View prescription information
- Manage personal profile

### Doctor
- Create and manage doctor profile
- Generate prescription PDFs
- Access patient management tools
- Use AI chat for medical assistance

### Administrator
- Full system access
- User management capabilities
- All doctor and patient features
- System administration tools

## Design System

### Colors
- **Primary**: Blue (#0ea5e9)
- **Secondary**: Gray (#64748b)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Error**: Red (#ef4444)

### Components
- Consistent button styles
- Form input components
- Card layouts
- Modal dialogs
- Navigation components

## Responsive Design

The application is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## Security Features

- JWT token authentication
- Protected routes
- Role-based access control
- Secure API communication
- Input validation and sanitization

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
