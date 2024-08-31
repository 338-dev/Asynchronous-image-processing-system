import { Router } from 'express';
import multer from 'multer';
import { uploadCSV, getStatus, webhook, generateCSV } from '../controllers/imageController.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadCSV);
router.get('/status/:requestId', getStatus);
router.post('/webhook', webhook);
router.get('/generate-csv/:requestId', generateCSV);

export default router;
