import mongoose, { Schema, Document } from 'mongoose';

export interface IShortLink extends Document {
  id: string; // The 6-char random ID
  userId: mongoose.Types.ObjectId;
  type: 'sheets' | 'calendar' | 'email';
  createdAt: Date;
}

const ShortLinkSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['sheets', 'calendar', 'email'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 * 30 }, // Expire after 30 days
});

export default mongoose.models.ShortLink || mongoose.model<IShortLink>('ShortLink', ShortLinkSchema);
