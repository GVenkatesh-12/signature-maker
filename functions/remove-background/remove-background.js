const axios = require('axios');
const FormData = require('form-data');

exports.handler = async function(event, context) {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true })
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Method not allowed' 
            })
        };
    }

    try {
        // Check for API key
        if (!process.env.REMOVE_BG_API_KEY) {
            console.error('REMOVE_BG_API_KEY is not set');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Server configuration error',
                    details: 'API key not configured'
                })
            };
        }

        // Parse request body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            console.error('Failed to parse request body:', e);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Invalid request body',
                    details: 'Could not parse JSON'
                })
            };
        }

        const imageData = body.imageData;
        if (!imageData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'No image data provided' 
                })
            };
        }

        // Process image
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
            headers,
            body: JSON.stringify({ 
                success: true, 
                imageUrl: dataUrl 
            })
        };
    } catch (error) {
        console.error('Error processing image:', error);
        
        // Handle specific error cases
        if (error.response) {
            return {
                statusCode: error.response.status,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'API Error',
                    details: error.response.data?.error?.message || error.message
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Failed to process image',
                details: error.message 
            })
        };
    }
}; 