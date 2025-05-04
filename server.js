import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get the directory name from the current module URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// POST route to handle image upload
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const imagePath = path.join(__dirname, req.file.path);
    console.log("Uploaded file path:", imagePath); // Log the file path

    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_file', fs.createReadStream(imagePath));

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': 'GhstRCioHnbNrx8jqKxcxoCM' }, // Replace with your actual API key
      body: formData,
    });

    if (response.ok) {
      const buffer = await response.buffer();
      const outputPath = path.join(__dirname, 'public', 'no-bg.png');
      fs.writeFileSync(outputPath, buffer);
      res.send('/signature-no-bg.png');
    } else {
      const errorMessage = await response.text();
      console.log("API Response Error:", errorMessage); // Log the error
      res.status(500).send(`Failed to remove background: ${errorMessage}`);
    }

    // Clean up the uploaded image
    fs.unlinkSync(imagePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
