import mongoose from 'mongoose';

const connectionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    status: { type: String, enum: ['connected', 'requested'], default: 'connected' }
  },
  { timestamps: true }
);

connectionSchema.index({ user: 1, doctor: 1 }, { unique: true });

export const Connection = mongoose.model('Connection', connectionSchema);
