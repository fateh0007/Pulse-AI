import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { Connection } from '../models/Connection.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { DoctorChatMessage } from '../models/DoctorChatMessage.js';
dotenv.config();
const apiKey = process.env.GEMINI_API_KEY;
const hasApiKey = true;
const ai = new GoogleGenerativeAI(apiKey);

export function isPremiumActive(user) {
  if (!user) return false;
  if (user.premiumStatus !== 'premium') return false;
  if (user.premiumUntil && user.premiumUntil < new Date()) return false;
  return true;
}

export async function assertConnectionAccess(req, connectionId) {
  const connection = await Connection.findById(connectionId);
  if (!connection) {
    const error = new Error('Connection not found');
    error.status = 404;
    throw error;
  }
  if (connection.status !== 'connected') {
    const error = new Error('Chat available only for connected doctors');
    error.status = 403;
    throw error;
  }

  // Users must own the connection and have premium
  if (req.userRole === 'user') {
    if (String(connection.user) !== String(req.userId)) {
      const error = new Error('Forbidden: connection does not belong to user');
      error.status = 403;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!isPremiumActive(user)) {
      const error = new Error('Premium subscription required for doctor chat');
      error.status = 403;
      throw error;
    }
    return { connection, role: 'user', user };
  }

  // Doctors must be linked to the connection doctor
  if (req.userRole === 'doctor') {
    const doctor = await Doctor.findOne({ user: req.userId });
    if (!doctor || String(doctor._id) !== String(connection.doctor)) {
      const error = new Error('Forbidden: doctor not linked to this connection');
      error.status = 403;
      throw error;
    }
    return { connection, role: 'doctor', doctor };
  }

  // Admins can access any connection
  if (req.userRole === 'admin') {
    return { connection, role: 'admin' };
  }

  const error = new Error('Forbidden');
  error.status = 403;
  throw error;
}

export async function chatWithAI(req, res, next) {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'message is required as a string' });
    }

    console.log('API Key present:', !!apiKey);
    console.log('Model:', process.env.GEMINI_MODEL || 'gemini-1.5-flash');

    if (!hasApiKey || !ai) {
      console.log('No API key or AI instance available');
      return res.status(200).json({
        reply: 'Pulse AI is temporarily unavailable. Please configure GEMINI_API_KEY to enable AI responses.',
        fallback: true
      });
    }

    try {
      const model = ai.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
      });

      console.log('Sending message to Gemini:', message.substring(0, 50) + '...');
      const result = await model.generateContent(message);
      const text = result.response.text();
      console.log('Received response from Gemini:', text.substring(0, 50) + '...');

      return res.json({ reply: text });
    } catch (err) {
      console.error('Gemini API Error:', err.message);
      console.error('Error details:', err);
      
      const isAuthError =
        typeof err?.message === 'string' &&
        /api key not valid|permission|unauthorized|invalid|quota|billing/i.test(err.message);

      if (isAuthError) {
        return res.status(200).json({
          reply: 'Pulse AI cannot respond right now due to API configuration. Please check your API key and billing settings.',
          fallback: true
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('Chat controller error:', err);
    next(err);
  }
}

export async function getDoctorMessages(req, res, next) {
  try {
    const { connectionId } = req.params;
    const { connection } = await assertConnectionAccess(req, connectionId);

    const messages = await DoctorChatMessage.find({ connection: connection._id })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendDoctorMessage(req, res, next) {
  try {
    const { connectionId } = req.params;
    const { message } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'message is required' });
    }

    const { connection, role } = await assertConnectionAccess(req, connectionId);
    const from = role === 'doctor' ? 'doctor' : 'user';

    const newMessage = await DoctorChatMessage.create({
      connection: connection._id,
      user: connection.user,
      doctor: connection.doctor,
      from,
      message: message.trim(),
      senderUser: req.userId,
      deliveredAt: new Date()
    });

    res.status(201).json(newMessage);
  } catch (err) {
    next(err);
  }
}
