import csv from 'csv-parser';
import { createReadStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Product from '../models/productModel.js';
import Request from '../models/requestModel.js';
import { validateCSV, processImages } from '../services/imageProcessingService.js';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import { dirname, join } from 'path';
import Image from '../models/imageModel.js';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function uploadCSV(req, res) {
    try {

        if (!req.file || req.file.mimetype !== 'text/csv') {
            return res.status(400).json({ message: 'Invalid file format. Please upload a CSV file.' });
        }

        const { webhookUrl } = req.body;

        const requestId = uuidv4();
        const results = [];


        const csvValidationResult = await validateCSV(req?.file?.path);
        if (!csvValidationResult.valid) {
            throw new Error('Invalid CSV format: ' + csvValidationResult.errors);
        }

        createReadStream(req?.file?.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                const reqPar = { requestId };

                if (webhookUrl)
                    reqPar.webhookUrl = webhookUrl;

                const request = new Request({ requestId, webhookUrl });
                await request.save();

                for (const row of results) {
                    const product = new Product({
                        requestId,
                        productName: row['Product Name'],
                        inputImageUrls: row['Input Image Urls'].split(',')
                    });
                    await product.save();
                }

                processImages(requestId);

                return res.status(200).json({ requestId });
            });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
}

export async function getStatus(req, res) {
    const { requestId } = req.params;
    const request = await Request.findOne({ requestId });

    if (!request) {
        return res.status(404).json({ message: 'Request not found' });
    }

    return res.status(200).json({ status: request.status });
}

export async function webhook(req, res) {
    return res.status(200).json({ message: 'Webhook received' });
}



export async function generateCSV(req, res) {
    const { requestId } = req.params;

    try {

        const products = await Product.find({ requestId }).populate('images');

        if (products.length === 0) {
            return res.status(404).json({ message: 'No data found for the given requestId' });
        }


        const csvData = [];

        for (const product of products) {
            const images = await Image.find({ productId: product._id });

            const inputImageUrls = images.map(image => image.inputUrl).join(',');
            const outputImageUrls = images.map(image => image.outputUrl).join(',\n');

            csvData.push({
                serialNumber: product._id.toString(),
                productName: product.productName,
                inputImageUrls: inputImageUrls,
                outputImageUrls: outputImageUrls
            });
        }

        const directoryPath = join(__dirname, '../../generated_csv');

        if (!existsSync(directoryPath)) {
            mkdirSync(directoryPath, { recursive: true });
        }

        const csvFilePath = join(directoryPath, `${requestId}_output.csv`);

        const csvWriter = createCsvWriter({
            path: csvFilePath,
            header: [
                { id: 'serialNumber', title: 'Serial Number' },
                { id: 'productName', title: 'Product Name' },
                { id: 'inputImageUrls', title: 'Input Image Urls' },
                { id: 'outputImageUrls', title: 'Output Image Urls' }
            ]
        });

        await csvWriter.writeRecords(csvData);

        return res.download(csvFilePath, `${requestId}_output.csv`, (err) => {
            if (err) {
                console.error('Error downloading the file:', err);
                return res.status(500).send('Error downloading the file');
            }
            unlinkSync(csvFilePath);
        });
    } catch (error) {
        console.error('Error generating CSV:', error);
        return res.status(500).json({ message: 'Error generating CSV' });
    }
}