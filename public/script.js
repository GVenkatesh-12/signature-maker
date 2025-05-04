let cropper = null;
let currentImage = null;
let webcamStream = null;
let processedImageUrl = null; // Store the original processed image URL
let originalImageData = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const webcamBtn = document.getElementById('webcamBtn');
const webcamContainer = document.getElementById('webcamContainer');
const webcam = document.getElementById('webcam');
const captureBtn = document.getElementById('captureBtn');
const stopWebcamBtn = document.getElementById('stopWebcamBtn');
const imageContainer = document.getElementById('imageContainer');
const originalImage = document.getElementById('originalImage');
const processedImage = document.getElementById('processedImage');
const cropBtn = document.getElementById('cropBtn');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const cropperModal = new bootstrap.Modal(document.getElementById('cropperModal'));
const cropperImage = document.getElementById('cropperImage');
const cropConfirmBtn = document.getElementById('cropConfirmBtn');
const adjustmentsContainer = document.getElementById('adjustmentsContainer');
const brightnessSlider = document.getElementById('brightnessSlider');
const contrastSlider = document.getElementById('contrastSlider');
const brightnessValue = document.getElementById('brightnessValue');
const contrastValue = document.getElementById('contrastValue');
const resetAdjustmentsBtn = document.getElementById('resetAdjustmentsBtn');

// Event Listeners
fileInput.addEventListener('change', handleFileSelect);
webcamBtn.addEventListener('click', startWebcam);
captureBtn.addEventListener('click', captureImage);
stopWebcamBtn.addEventListener('click', stopWebcam);
cropBtn.addEventListener('click', openCropper);
cropConfirmBtn.addEventListener('click', cropImage);
processBtn.addEventListener('click', processImage);
downloadBtn.addEventListener('click', downloadImage);
brightnessSlider.addEventListener('input', updateImageAdjustments);
contrastSlider.addEventListener('input', updateImageAdjustments);
resetAdjustmentsBtn.addEventListener('click', resetAdjustments);

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            originalImage.src = e.target.result;
            originalImageData = e.target.result;
            imageContainer.classList.remove('d-none');
            webcamContainer.classList.add('d-none');
            if (webcamStream) {
                stopWebcam();
            }
        };
        reader.readAsDataURL(file);
    }
}

// Start webcam
async function startWebcam() {
    try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcam.srcObject = webcamStream;
        webcamContainer.classList.remove('d-none');
        imageContainer.classList.add('d-none');
    } catch (error) {
        console.error('Error accessing webcam:', error);
        alert('Error accessing webcam. Please make sure you have granted camera permissions.');
    }
}

// Capture image from webcam
function captureImage() {
    const canvas = document.createElement('canvas');
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    canvas.getContext('2d').drawImage(webcam, 0, 0);
    originalImageData = canvas.toDataURL('image/png');
    originalImage.src = originalImageData;
    imageContainer.classList.remove('d-none');
    webcamContainer.classList.add('d-none');
    stopWebcam();
}

// Stop webcam
function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcam.srcObject = null;
        webcamContainer.classList.add('d-none');
    }
}

// Display image
function displayImage(imageUrl) {
    currentImage = imageUrl;
    originalImage.src = imageUrl;
    imageContainer.classList.remove('d-none');
    processedImage.classList.add('d-none');
    adjustmentsContainer.classList.add('d-none');
    
    // Show a tooltip or message suggesting cropping
    const tooltip = document.createElement('div');
    tooltip.className = 'alert alert-info mt-3';
    tooltip.innerHTML = 'You can crop the image if needed before removing the background.';
    tooltip.style.display = 'none';
    
    // Remove any existing tooltip
    const existingTooltip = document.querySelector('.alert-info');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Add the new tooltip
    imageContainer.insertBefore(tooltip, imageContainer.firstChild);
    setTimeout(() => {
        tooltip.style.display = 'block';
    }, 100);
}

// Open cropper modal
function openCropper() {
    if (!originalImageData) {
        alert('Please upload or capture an image first.');
        return;
    }

    cropperImage.src = originalImageData;
    cropperModal.show();
    
    // Initialize cropper after modal is shown
    cropperModal._element.addEventListener('shown.bs.modal', function onShown() {
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(cropperImage, {
            aspectRatio: NaN,
            viewMode: 2,
            autoCropArea: 1,
            responsive: true,
            restore: false,
            modal: true,
            guides: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });

        // Remove the event listener to prevent multiple initializations
        cropperModal._element.removeEventListener('shown.bs.modal', onShown);
    });
}

// Crop image
function cropImage() {
    if (!cropper) {
        alert('Please wait for the cropping tool to initialize.');
        return;
    }

    try {
        const canvas = cropper.getCroppedCanvas({
            width: cropper.getData().width,
            height: cropper.getData().height,
            minWidth: 256,
            minHeight: 256,
            maxWidth: 4096,
            maxHeight: 4096,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        if (!canvas) {
            throw new Error('Failed to get cropped canvas');
        }

        originalImageData = canvas.toDataURL('image/png');
        originalImage.src = originalImageData;
        cropperModal.hide();
        
        // Clean up
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    } catch (error) {
        console.error('Error cropping image:', error);
        alert('Error cropping image. Please try again.');
    }
}

// Process image (remove background)
async function processImage() {
    try {
        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';

        if (!originalImageData) {
            throw new Error('No image available to process');
        }

        const result = await fetch('/.netlify/functions/remove-background', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData: originalImageData
            })
        });

        let data;
        try {
            const text = await result.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse response:', text);
                throw new Error('Invalid response from server');
            }
        } catch (e) {
            console.error('Failed to get response text:', e);
            throw new Error('Failed to get response from server');
        }

        if (!result.ok) {
            throw new Error(data.details || data.error || 'Failed to process image');
        }
        
        if (!data.success) {
            throw new Error(data.details || data.error || 'Failed to process image');
        }
        
        processedImageUrl = data.imageUrl;
        processedImage.src = data.imageUrl;
        processedImage.classList.remove('d-none');
        adjustmentsContainer.classList.remove('d-none');
        
        // Reset adjustments
        resetAdjustments();
        
        // Remove the tooltip after successful processing
        const tooltip = document.querySelector('.alert-info');
        if (tooltip) {
            tooltip.remove();
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Error processing image: ${error.message}`);
    } finally {
        processBtn.disabled = false;
        processBtn.textContent = 'Remove Background';
    }
}

// Update image adjustments
function updateImageAdjustments() {
    if (!processedImageUrl) return;

    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    
    // Update the display values
    brightnessValue.textContent = `${brightness}%`;
    contrastValue.textContent = `${contrast}%`;

    // Create a canvas to apply the adjustments
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // Apply the adjustments
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
        ctx.drawImage(img, 0, 0);

        // Update the processed image with the adjusted version
        processedImage.src = canvas.toDataURL('image/png');
    };
    img.src = processedImageUrl;
}

// Reset adjustments
function resetAdjustments() {
    brightnessSlider.value = 100;
    contrastSlider.value = 100;
    brightnessValue.textContent = '100%';
    contrastValue.textContent = '100%';
    if (processedImageUrl) {
        processedImage.src = processedImageUrl;
    }
}

// Download processed image
function downloadImage() {
    if (!processedImage.src) {
        alert('No processed image available');
        return;
    }

    const link = document.createElement('a');
    link.href = processedImage.src; // This will include the current adjustments
    link.download = 'signature.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
