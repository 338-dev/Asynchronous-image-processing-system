import { Schema, model } from 'mongoose';

const requestSchema = new Schema({
    requestId: { type: String, required: true, unique: true },
    webhookUrl: { type: String },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

export default model('Request', requestSchema);
