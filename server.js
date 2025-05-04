import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Remove background endpoint
app.post('/remove-background', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No image file provided' 
            });
        }

        if (!process.env.REMOVE_BG_API_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Server configuration error',
                details: 'API key not configured'
            });
        }

        const formData = new FormData();
        formData.append('image_file', req.file.buffer, {
            filename: 'image.png',
            contentType: 'image/png'
        });
        formData.append('size', 'auto');

        const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
            headers: {
                ...formData.getHeaders(),
                'X-Api-Key': process.env.REMOVE_BG_API_KEY
            },
            responseType: 'arraybuffer'
        });

        // Convert the response to base64
        const base64Image = Buffer.from(response.data).toString('base64');
        const dataUrl = `data:image/png;base64,${base64Image}`;

        res.json({ 
            success: true, 
            imageUrl: dataUrl 
        });
    } catch (error) {
        console.error('Error:', error);
        
        // Handle specific error cases
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                error: 'API Error',
                details: error.response.data?.error?.message || error.message
            });
        }

        res.status(500).json({ 
            success: false,
            error: 'Failed to process image',
            details: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        details: err.message
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
