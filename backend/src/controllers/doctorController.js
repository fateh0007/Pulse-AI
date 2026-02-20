import { Doctor } from '../models/Doctor.js';
import { Connection } from '../models/Connection.js';
import { User } from '../models/User.js';

export async function listDoctors(req, res, next) {
  try {
    const { q } = req.query;
    let filter = {};
    
    if (q && q.trim()) {
      const searchQuery = q.trim();
      // Search by name (case-insensitive) or specialty
      filter = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { specialty: { $regex: searchQuery, $options: 'i' } }
        ]
      };
    }
    
    const docs = await Doctor.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(docs);
  } catch (err) {
    next(err);
  }
}

export async function createDoctor(req, res, next) {
  try {
    const { name, specialty, experienceYears, languages, bio, contactEmail, contactPhone } = req.body || {};
    if (!name || !specialty) {
      return res.status(400).json({ message: 'name and specialty are required' });
    }
    // If the caller is a doctor, auto-bind their userId to the doctor profile
    const payload = {
      user: req.userRole === 'doctor' ? req.userId : undefined,
      name,
      specialty,
      experienceYears: experienceYears ?? 0,
      languages: languages ?? [],
      bio: bio ?? '',
      contactEmail: contactEmail ?? '',
      contactPhone: contactPhone ?? ''
    };
    const doc = await Doctor.create(payload);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

export async function connectDoctor(req, res, next) {
  try {
    const doctorId = req.params.id;
    if (!doctorId) return res.status(400).json({ message: 'doctor id required' });
    const existing = await Connection.findOne({ user: req.userId, doctor: doctorId });
    if (existing) return res.status(200).json(existing);
    const conn = await Connection.create({ user: req.userId, doctor: doctorId, status: 'connected' });
    res.status(201).json(conn);
  } catch (err) {
    next(err);
  }
}

export async function myConnections(req, res, next) {
  try {
    const conns = await Connection.find({ user: req.userId }).populate('doctor');
    res.json(conns);
  } catch (err) {
    next(err);
  }
}

export async function myPatients(req, res, next) {
  try {
    const doctor = await Doctor.findOne({ user: req.userId });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    const conns = await Connection.find({ doctor: doctor._id }).populate('user');
    res.json(conns);
  } catch (err) {
    next(err);
  }
}
