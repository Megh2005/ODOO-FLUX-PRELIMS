import { NextRequest, NextResponse } from "next/server";
import { uploadImageToImageKit } from "@/lib/imagekitClient";
import { processSignatureImage } from "@/lib/signatureProcessor";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const isSignature = formData.get("isSignature") === "true";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer) as Buffer;
    let fileName = file.name;

    // If marked as signature, run background removal, landscape aspect ratio fit & compression
    if (isSignature) {
      buffer = await processSignatureImage(buffer);
      fileName = `signature_${Date.now()}.png`;
    }

    const folder = isSignature ? "/signatures" : "/inventory";
    const result = await uploadImageToImageKit(buffer, fileName, folder);

    return NextResponse.json({
      success: true,
      url: result.url,
      fileId: result.fileId,
    });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
