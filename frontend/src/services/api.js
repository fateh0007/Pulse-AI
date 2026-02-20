import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password, role) => 
    api.post('/auth/login', { email, password, role }),
  
  register: (name, email, password, role, isPremium) => 
    api.post('/auth/register', { name, email, password, role, isPremium }),
};

// Doctors API
export const doctorsAPI = {
  getDoctors: (query) => 
    api.get('/doctors', { params: query ? { q: query } : {} }),
  
  createDoctor: (doctorData) => 
    api.post('/doctors', doctorData),
  
  connectDoctor: (doctorId) => 
    api.post(`/doctors/${doctorId}/connect`),
  
  getMyConnections: () => 
    api.get('/doctors/me/connections'),

  getMyPatients: () =>
    api.get('/doctors/me/patients'),
};

// Chat API
export const chatAPI = {
  sendMessage: (message) => 
    api.post('/chat', { message }),

  getDoctorMessages: (connectionId) =>
    api.get(`/chat/doctor/${connectionId}`),

  sendDoctorMessage: (connectionId, message) =>
    api.post(`/chat/doctor/${connectionId}`, { message }),
};

// Prescriptions API
export const prescriptionsAPI = {
  generatePDF: (prescriptionData) => 
    api.post('/prescriptions/pdf', prescriptionData, {
      responseType: 'blob',
    }),

  listMine: () =>
    api.get('/prescriptions/mine'),
};

export default api;
