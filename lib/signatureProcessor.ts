import sharp from "sharp";

/**
 * Process a signature image:
 * 1. Removes white/near-white paper background to make it transparent PNG
 * 2. Enhances black/dark ink contrast
 * 3. Resizes & fits into a landscape rectangular aspect ratio (400x160)
 * 4. Compresses into a lightweight transparent PNG buffer
 */
export async function processSignatureImage(inputBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<Buffer> {
  try {
    // 1. Get metadata and convert to raw RGBA buffer
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    // Ensure we work with RGBA pixels
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixelCount = info.width * info.height;
    const channels = info.channels; // Should be 4 (R, G, B, A)

    // 2. Loop through pixels to remove white/light background and boost ink contrast
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      // Calculate perceived luminance / brightness (0-255)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if (brightness > 190 || (r > 185 && g > 185 && b > 185)) {
        // White or light paper background -> make 100% transparent
        data[offset + 3] = 0;
      } else if (brightness > 150) {
        // Feather / anti-alias transition edges
        const alphaRatio = (190 - brightness) / 40; // 0 to 1
        data[offset + 3] = Math.round(Math.max(0, Math.min(255, alphaRatio * 255)));
        // Darken ink for crisp rendering
        data[offset] = Math.max(0, Math.round(r * 0.4));
        data[offset + 1] = Math.max(0, Math.round(g * 0.4));
        data[offset + 2] = Math.max(0, Math.round(b * 0.4));
      } else {
        // Solid ink pixel -> boost dark contrast and full opacity
        data[offset] = Math.max(0, Math.round(r * 0.3));
        data[offset + 1] = Math.max(0, Math.round(g * 0.3));
        data[offset + 2] = Math.max(0, Math.round(b * 0.3));
        data[offset + 3] = 255;
      }
    }

    // 3. Create transparent RGBA image from processed buffer
    const processedImage = sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    });

    // 4. Resize and trim into rectangular landscape aspect ratio (400x160)
    const finalBuffer = await processedImage
      .trim() // Trim transparent border padding around the actual signature
      .resize(400, 160, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, quality: 85 })
      .toBuffer();

    return finalBuffer;
  } catch (error: any) {
    console.error("Error processing signature image with sharp:", error);
    // Fallback: if raw processing fails, resize and return PNG directly
    return await sharp(inputBuffer)
      .resize(400, 160, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  }
}
