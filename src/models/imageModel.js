import { Schema, model } from 'mongoose';

const imageSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    inputUrl: { type: String, required: true },
    outputUrl: { type: String }
});

export default model('Image', imageSchema);
