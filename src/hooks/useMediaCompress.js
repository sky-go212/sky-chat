import { useState } from 'react';
import { compressImage, compressAvatar } from '../utils/mediaCompressor.js';

export function useMediaCompress() {
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);

  async function compress(file, type = 'image') {
    setCompressing(true);
    setError(null);
    try {
      let result;
      if (type === 'avatar') result = await compressAvatar(file);
      else result = await compressImage(file);
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setCompressing(false);
    }
  }

  return { compress, compressing, error };
}
