import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name?: string;
  email?: string;
  whatsappNumber?: string;
  plan: 'free' | 'pro';
  scansUsed: number;
  scansLimit: number;
  botState: 'new' | 'awaiting_email' | 'active';
  scanCredits: number;
  referralCode: string;
  referredBy?: string; // WhatsApp number or ID of the referrer
  referralCount: number;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String },
  email: { type: String, required: false, unique: true, sparse: true },
  whatsappNumber: { type: String, unique: true },

  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  scansUsed: { type: Number, default: 0 },
  scansLimit: { type: Number, default: 10 },
  botState: { type: String, enum: ['new', 'awaiting_email', 'active'], default: 'new' },
  scanCredits: { type: Number, default: 5 },
  isFirstScan: { type: Boolean, default: true },
  referralCode: { type: String, unique: true },
  referredBy: { type: String },
  referralCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
