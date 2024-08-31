import { Schema, model } from 'mongoose';

const productSchema = new Schema({
    requestId: { type: String, required: true },
    productName: { type: String, required: true },
    inputImageUrls: { type: [String], required: true },
    images: [{ type: Schema.Types.ObjectId, ref: 'Image' }]
});

export default model('Product', productSchema);
