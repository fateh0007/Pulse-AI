import mongoose from 'mongoose';

const doctorChatMessageSchema = new mongoose.Schema(
  {
    connection: { type: mongoose.Schema.Types.ObjectId, ref: 'Connection', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    from: { type: String, enum: ['user', 'doctor'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    senderUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // captures the logged-in user id when doctor has linked user
    deliveredAt: { type: Date },
    readAt: { type: Date }
  },
  { timestamps: true }
);

doctorChatMessageSchema.index({ connection: 1, createdAt: 1 });

export const DoctorChatMessage = mongoose.model('DoctorChatMessage', doctorChatMessageSchema);

