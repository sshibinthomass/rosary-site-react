const maximumSourceBytes = 15 * 1024 * 1024;
const maximumOutputBytes = 1_500_000;
const maximumEdge = 1600;

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The photo could not be encoded.')), 'image/webp', quality);
  });
}

export async function compressPlantPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > maximumSourceBytes) throw new Error('Choose an image smaller than 15 MB.');
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maximumEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo processing is not available on this device.');
    context.drawImage(image, 0, 0, width, height);
    let output = await canvasBlob(canvas, 0.82);
    if (output.size > maximumOutputBytes) output = await canvasBlob(canvas, 0.66);
    if (output.size > maximumOutputBytes) throw new Error('The compressed photo is still larger than 1.5 MB.');
    return output;
  } finally {
    image.close();
  }
}
