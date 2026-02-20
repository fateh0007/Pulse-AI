import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'doctor', 'admin'], default: 'user' },
    // Premium subscription controls access to doctor chat
    premiumStatus: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    premiumUntil: { type: Date },
    prescriptions: [
      {
        doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
        doctorName: String,
        diagnosis: String,
        medications: [
          {
            name: String,
            dosage: String,
            frequency: String,
            duration: String,
            instructions: String
          }
        ],
        notes: String,
        date: String,
        fileName: String,
        pdf: Buffer,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

// userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
