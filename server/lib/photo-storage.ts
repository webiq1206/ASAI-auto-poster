import path from "path";
import fs from "fs/promises";

const DATA_DIR = process.env.PHOTO_STORAGE_PATH || "/data";

interface PhotoPaths {
  originals: (dealerId: string, vehicleId: string) => string;
  processed: (dealerId: string, vehicleId: string) => string;
  screenshots: {
    posting: (repId: string, date: string) => string;
    logins: (repId: string) => string;
  };
}

export const photoPaths: PhotoPaths = {
  originals: (dealerId, vehicleId) =>
    path.join(DATA_DIR, "photos", "originals", dealerId, vehicleId),
  processed: (dealerId, vehicleId) =>
    path.join(DATA_DIR, "photos", "processed", dealerId, vehicleId),
  screenshots: {
    posting: (repId, date) =>
      path.join(DATA_DIR, "screenshots", "posting", repId, date),
    logins: (repId) =>
      path.join(DATA_DIR, "screenshots", "logins", repId),
  },
};

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function storePhoto(
  buffer: Buffer,
  dirPath: string,
  filename: string,
): Promise<string> {
  await ensureDir(dirPath);
  const filePath = path.join(dirPath, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function readPhoto(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export function toPhotoUrl(localPath: string): string {
  const relative = localPath.replace(DATA_DIR, "").replace(/\\/g, "/");
  return `/api/photos${relative}`;
}

export function fromPhotoUrl(url: string): string {
  if (url.startsWith("/api/photos/")) {
    return path.join(DATA_DIR, url.replace("/api/photos", ""));
  }
  if (url.startsWith("http")) {
    return url;
  }
  return path.join(DATA_DIR, url);
}
