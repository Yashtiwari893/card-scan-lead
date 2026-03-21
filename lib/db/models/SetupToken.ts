import mongoose, { Schema, Document } from 'mongoose';

export interface ISetupToken extends Document {
  token: string;
  phone: string;
  type: 'sheets' | 'calendar' | 'email' | 'credits';
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const SetupTokenSchema: Schema = new Schema({
  token: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  type: { type: String, enum: ['sheets', 'calendar', 'email', 'credits'], required: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete expired tokens
SetupTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.SetupToken || mongoose.model<ISetupToken>('SetupToken', SetupTokenSchema);
