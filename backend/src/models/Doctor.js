import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional link to doctor user
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    experienceYears: { type: Number, default: 0 },
    languages: [{ type: String }],
    bio: { type: String, default: '' },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    prescriptions: [
      {
        patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        patientName: { type: String, required: true },
        patientEmail: { type: String, required: true },
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

doctorSchema.index({ name: 'text', specialty: 'text' });

export const Doctor = mongoose.model('Doctor', doctorSchema);
