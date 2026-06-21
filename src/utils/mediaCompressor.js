import { MEDIA_LIMITS } from './constants.js';

export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      const maxW = MEDIA_LIMITS.IMAGE.maxWidth;
      if (width > maxW) { height = (height * maxW) / width; width = maxW; }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Kompresi gagal')); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
        },
        'image/webp',
        MEDIA_LIMITS.IMAGE.quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal baca gambar')); };
    img.src = url;
  });
}

export async function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);
    const size = MEDIA_LIMITS.AVATAR.size;

    img.onload = () => {
      canvas.width = size; canvas.height = size;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Kompresi avatar gagal')); return; }
          resolve(new File([blob], 'avatar.webp', { type: 'image/webp' }));
        },
        'image/webp',
        MEDIA_LIMITS.AVATAR.quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal baca gambar')); };
    img.src = url;
  });
}
