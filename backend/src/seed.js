import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import { Doctor } from './models/Doctor.js';
import { Connection } from './models/Connection.js';

dotenv.config();

async function clearCollections() {
  await Promise.all([
    User.deleteMany({}),
    Doctor.deleteMany({}),
    Connection.deleteMany({})
  ]);
}

async function createUsers() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@pulseai.com',
    passwordHash,
    role: 'admin',
    premiumStatus: 'premium'
  });

  const doctorUsers = await User.insertMany([
    { name: 'Dr. Amelia Hart', email: 'amelia.hart@pulseai.com', passwordHash, role: 'doctor' },
    { name: 'Dr. Ethan Cole', email: 'ethan.cole@pulseai.com', passwordHash, role: 'doctor' },
    { name: 'Dr. Priya Nair', email: 'priya.nair@pulseai.com', passwordHash, role: 'doctor' }
  ]);

  const now = new Date();
  const premiumUntil = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
  const patientUsers = await User.insertMany([
    { name: 'Ava Johnson', email: 'ava.johnson@example.com', passwordHash, role: 'user', premiumStatus: 'premium', premiumUntil },
    { name: 'Liam Martinez', email: 'liam.martinez@example.com', passwordHash, role: 'user', premiumStatus: 'premium', premiumUntil },
    { name: 'Noah Kim', email: 'noah.kim@example.com', passwordHash, role: 'user' }
  ]);

  return { admin, doctorUsers, patientUsers };
}

async function createDoctors(doctorUsers) {
  const doctors = await Doctor.insertMany([
    {
      user: doctorUsers[0]._id,
      name: 'Dr. Amelia Hart',
      specialty: 'Cardiology',
      experienceYears: 12,
      languages: ['English', 'Spanish'],
      bio: 'Board-certified cardiologist with over a decade of experience in treating complex heart conditions.',
      contactEmail: 'amelia.hart@pulseai.com',
      contactPhone: '+1 (555) 100-1000',
      prescriptions: []
    },
    {
      user: doctorUsers[1]._id,
      name: 'Dr. Ethan Cole',
      specialty: 'Neurology',
      experienceYears: 9,
      languages: ['English'],
      bio: 'Neurologist specializing in migraine management and neurodegenerative disorders.',
      contactEmail: 'ethan.cole@pulseai.com',
      contactPhone: '+1 (555) 200-2000',
      prescriptions: []
    },
    {
      user: doctorUsers[2]._id,
      name: 'Dr. Priya Nair',
      specialty: 'Pediatrics',
      experienceYears: 7,
      languages: ['English', 'Hindi'],
      bio: 'Pediatrician passionate about preventive care and child wellness.',
      contactEmail: 'priya.nair@pulseai.com',
      contactPhone: '+1 (555) 300-3000',
      prescriptions: []
    },
    {
      name: 'Dr. Marco Silva',
      specialty: 'Orthopedics',
      experienceYears: 15,
      languages: ['English', 'Portuguese'],
      bio: 'Orthopedic surgeon focused on sports injuries and minimally invasive procedures.',
      contactEmail: 'marco.silva@pulseai.com',
      contactPhone: '+1 (555) 400-4000',
      prescriptions: []
    },
    {
      name: 'Dr. Sophia Nguyen',
      specialty: 'Dermatology',
      experienceYears: 6,
      languages: ['English', 'Vietnamese'],
      bio: 'Dermatologist with expertise in acne, eczema, and cosmetic dermatology.',
      contactEmail: 'sophia.nguyen@pulseai.com',
      contactPhone: '+1 (555) 500-5000',
      prescriptions: []
    }
  ]);

  return doctors;
}

async function createConnections(patients, doctors) {
  const connections = [];
  for (const patient of patients) {
    // Connect each patient with first two doctors
    for (let i = 0; i < Math.min(2, doctors.length); i++) {
      connections.push({ user: patient._id, doctor: doctors[i]._id, status: 'connected' });
    }
  }
  await Connection.insertMany(connections);
}

async function main() {
  try {
    const uri = process.env.MONGODB_URI;
    await connectDB(uri);

    // console.log('Clearing existing data...');
    // await clearCollections();

    console.log('Creating users...');
    const { doctorUsers, patientUsers } = await createUsers();

    console.log('Creating doctor profiles...');
    const doctors = await createDoctors(doctorUsers);

    console.log('Creating connections...');
    await createConnections(patientUsers, doctors);

    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();


