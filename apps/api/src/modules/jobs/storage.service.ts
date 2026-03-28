import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryRawUpload = {
  publicId: string;
  secureUrl: string;
};

/**
 * Upload arbitrary raw bytes (PDF, audio, etc.). Worker fetches via `secure_url`.
 */
export async function uploadRawAsset(
  userId: string,
  buffer: Buffer,
  _originalName: string,
): Promise<CloudinaryRawUpload> {
  const folder = `ai-task-runner/${userId}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err || !result?.public_id || !result.secure_url) {
          reject(err ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function destroyRaw(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
}
