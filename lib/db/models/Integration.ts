import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegration extends Document {
  userId: mongoose.Types.ObjectId;
  provider: 'google';
  accessToken: string;
  refreshToken: string;
  scope: string;
  sheetId?: string;
  expiresAt: Date;
  createdAt: Date;
}

const IntegrationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: ['google'], required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  scope: { type: String, required: true },
  sheetId: { type: String },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Integration || mongoose.model<IIntegration>('Integration', IntegrationSchema);
