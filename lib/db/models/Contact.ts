import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  website: string;
  rawText: string;
  aiProvider: string;
  syncedTo: string[];
  createdAt: Date;
}

const ContactSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  company: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  website: { type: String, default: '' },
  rawText: { type: String, default: '' },
  aiProvider: { type: String, default: '' },
  syncedTo: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
