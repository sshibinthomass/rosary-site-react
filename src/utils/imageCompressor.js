/**
 * Compress image before uploading to Firebase Storage
 * Ensures we stay within free tier limits
 */

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.8;
const MAX_SIZE_KB = 200;

/**
 * Compress an image file
 * @param {File} file - Image file to compress
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try to get the right quality
        let quality = QUALITY;
        
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              const sizeKB = blob.size / 1024;
              
              // If still too large and quality can be reduced
              if (sizeKB > MAX_SIZE_KB && quality > 0.3) {
                quality -= 0.1;
                tryCompress();
              } else {
                resolve(blob);
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        tryCompress();
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert blob to File object
 */
export function blobToFile(blob, fileName) {
  return new File([blob], fileName, { type: blob.type });
}
