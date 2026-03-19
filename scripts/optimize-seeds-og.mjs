import sharp from 'sharp';
import path from 'path';

const inputPath = path.resolve('C:/Users/taren/Downloads/Making Images (2).jpg');
const outputPath = path.resolve('./client/public/og/seeds-contributions.webp');

await sharp(inputPath)
  .resize(1200, 630, { fit: 'cover', position: 'center' })
  .webp({ quality: 83 })
  .toFile(outputPath);

const { promises: fs } = await import('fs');
const stat = await fs.stat(outputPath);
console.log(`Done. Output: ${(stat.size / 1024).toFixed(1)} KB`);
