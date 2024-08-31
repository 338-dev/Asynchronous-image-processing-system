import Product from '../models/productModel.js';
import Image from '../models/imageModel.js';
import Request from '../models/requestModel.js';
import { existsSync, mkdirSync, createReadStream } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import axios from 'axios';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function processImages(requestId) {
    try {
        const products = await Product.find({ requestId });
        
        for (const product of products) {
            for (const imageUrl of product.inputImageUrls) {
                const compressedImageUrl = await downloadAndCompressImage(imageUrl, product._id);
                
                console.log(compressedImageUrl,"compressedImageUrl");
                const image = new Image({
                    productId: product._id,
                    inputUrl: imageUrl,
                    outputUrl: compressedImageUrl
                });
                await image.save();
            }
        }

        const request = await Request.findOneAndUpdate({ requestId }, { status: 'completed' }, { new: true });

        if (request?.webhookUrl) {
            await triggerWebhook(request.webhookUrl, requestId, 'completed');
        }
    } catch (error) {
        const request = await Request.findOneAndUpdate({ requestId }, { status: 'failed' }, { new: true });
          if (request?.webhookUrl) {
            await triggerWebhook(request.webhookUrl, requestId, 'failed');
        }
    }
}


async function downloadAndCompressImage(imageUrl, productId) {
    try {
        const response = await axios({
            url: imageUrl,
            responseType: 'arraybuffer'
        });

        const outputDirectory = join(__dirname, '../../compressed_images', String(productId));
        if (!existsSync(outputDirectory)) {
            mkdirSync(outputDirectory, { recursive: true });
        }

        const outputFilename = `compressed-${Date.now()}.jpg`;
        const outputFilePath = join(outputDirectory, outputFilename);

        await sharp(response.data)
            .jpeg({ quality: 50 })
            .toFile(outputFilePath);

            return `${BASE_URL}/compressed_images/${productId}/${outputFilename}`;
        } catch (error) {
        console.error('Error compressing image:', error);
        throw new Error('Image compression failed');
    }
}

async function triggerWebhook(webhookUrl, requestId, status) {
    try {
        const payload = {
            requestId: requestId,
            status: status,
            message: `Image processing has ${status}`
        };

        await axios.post(webhookUrl, payload);
        console.log(`Webhook triggered successfully for requestId: ${requestId}`);
    } catch (error) {
        console.error(`Failed to trigger webhook for requestId: ${requestId}`, error);
    }
}


export function validateCSV(filePath) {
  return new Promise((resolve, reject) => {
    const errors = [];
    let lineNumber = 0;

    createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;

        let invalidCol = !row['S. No.'] ? 'S. No.' : !row['Product Name'] ? 'Product Name' : !row['Input Image Urls'] ? 'Input Image Urls': '';
        
        if (invalidCol) {
          errors.push(`Col: ${invalidCol}, Line: ${lineNumber}; Missing required columns`);
        }

        const urls = row['Input Image Urls'].split(',');
        for (const url of urls) {
            if (!isValidUrl(url.trim())) {
              errors.push(`Invalid URL format: ${url}`);
            }
        }
      })
      .on('end', () => {
        resolve({ valid: errors.length === 0, errors: errors.join(', ') });
      })
      .on('error', reject);
  });
}


function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (err) {
        return false;
    }
}
