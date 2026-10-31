import ImageKit from "imagekit";

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || "";
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "";
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "";

export const imagekit = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint,
});

export async function uploadImageToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = "/inventory"
) {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName,
      folder,
    });
    return {
      url: response.url,
      fileId: response.fileId,
    };
  } catch (error: any) {
    console.error("ImageKit upload error:", error);
    throw new Error(error?.message || "Failed to upload image to ImageKit");
  }
}

export async function deleteImageFromImageKit(fileId: string) {
  try {
    await imagekit.deleteFile(fileId);
    return true;
  } catch (error) {
    console.error("ImageKit deletion error:", error);
    return false;
  }
}
