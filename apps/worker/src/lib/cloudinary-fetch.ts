import { env } from "../config/env.js";

/**
 * Fetch raw bytes from Cloudinary delivery URL (upload used `resource_type: raw`).
 * Validates host/path so we never fetch arbitrary URLs from job payloads.
 */
export async function fetchBinaryFromCloudinaryUrl(
  secureUrl: string,
): Promise<Buffer> {
  let u: URL;
  try {
    u = new URL(secureUrl);
  } catch {
    throw new Error("Invalid Cloudinary asset URL");
  }
  if (u.hostname !== "res.cloudinary.com") {
    throw new Error("Invalid Cloudinary asset URL host");
  }
  const prefix = `/${env.CLOUDINARY_CLOUD_NAME}/`;
  if (!u.pathname.includes(prefix)) {
    throw new Error("Cloudinary URL does not match CLOUDINARY_CLOUD_NAME");
  }

  const res = await fetch(secureUrl);
  if (!res.ok) {
    throw new Error(`Cloudinary fetch failed: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
