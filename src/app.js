import express, { json, urlencoded } from 'express';
import imageRoutes from './routes/imageRoutes.js';
import { connectDb } from './config/dbConfig.js';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const app = express();
app.use(json());
app.use(urlencoded({ extended: true }));

connectDb();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.get("/", (req, res) => res.send("connected and running"));

app.use('/compressed_images', express.static(path.join(__dirname, '../compressed_images')));
app.use('/api/images', imageRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
