import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('public/uploads')) {
    fs.mkdirSync('public/uploads', { recursive: true });
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle image upload and background removal
app.post('/remove-background', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        if (!process.env.REMOVE_BG_API_KEY) {
            throw new Error('Remove.bg API key is not configured');
        }

        const imagePath = req.file.path;
        const formData = new FormData();
        formData.append('size', 'auto');
        formData.append('image_file', fs.createReadStream(imagePath));

        console.log('Sending request to Remove.bg API...');
        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': process.env.REMOVE_BG_API_KEY,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Remove.bg API error:', errorText);
            throw new Error(`Remove.bg API error: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.buffer();
        const outputPath = path.join('public', 'uploads', `removed_bg_${Date.now()}.png`);
        fs.writeFileSync(outputPath, buffer);

        res.json({
            success: true,
            imageUrl: `/uploads/${path.basename(outputPath)}`
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Failed to process image',
            details: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Remove.bg API Key configured:', process.env.REMOVE_BG_API_KEY ? 'Yes' : 'No');
});
