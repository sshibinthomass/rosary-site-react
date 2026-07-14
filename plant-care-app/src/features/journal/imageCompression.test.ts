import { afterEach, expect, it, vi } from 'vitest';

import { compressPlantPhoto } from './imageCompression';

afterEach(() => vi.unstubAllGlobals());

it('rejects non-image uploads', async () => {
  await expect(compressPlantPhoto(new File(['notes'], 'notes.txt', { type: 'text/plain' }))).rejects.toThrow(/image/i);
});

it('resizes a photo to WebP with a 1600 pixel longest edge', async () => {
  const drawImage = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3200, height: 2400, close: vi.fn() })));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob(['compressed'], { type })));
  const result = await compressPlantPhoto(new File([new Uint8Array(2_000_000)], 'plant.jpg', { type: 'image/jpeg' }));
  expect(result.type).toBe('image/webp');
  expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
});
