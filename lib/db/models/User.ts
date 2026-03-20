import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name?: string;
  email: string;
  whatsappNumber?: string;
  plan: 'free' | 'pro';
  scansUsed: number;
  scansLimit: number;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  whatsappNumber: { type: String },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  scansUsed: { type: Number, default: 0 },
  scansLimit: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
