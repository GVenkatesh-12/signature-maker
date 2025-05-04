document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
  
    const formData = new FormData();
    const fileInput = document.querySelector('input[type="file"]');
    formData.append('image', fileInput.files[0]);
  
    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const resultImageUrl = await response.text(); // Get the path to the result image
        document.getElementById('resultImage').src = resultImageUrl;
      } else {
        alert('Failed to remove background');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while processing the image.');
    }
  });
  