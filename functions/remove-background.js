const axios = require('axios');
const FormData = require('form-data');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const imageData = body.imageData;

        if (!imageData) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    success: false,
                    error: 'No image data provided' 
                })
            };
        }

        const formData = new FormData();
        const buffer = Buffer.from(imageData.split(',')[1], 'base64');
        formData.append('image_file', buffer, {
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

        const base64Image = Buffer.from(response.data).toString('base64');
        const dataUrl = `data:image/png;base64,${base64Image}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                imageUrl: dataUrl 
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to process image',
                details: error.message 
            })
        };
    }
}; 