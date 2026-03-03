import { randomDelay, PHOTO_UPLOAD_PAUSE } from "./timing";
import { waitForElement } from "./selectors";

async function urlToFile(url: string, index: number): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  const ext = blob.type.split("/")[1] ?? "jpg";
  return new File([blob], `photo-${index}.${ext}`, { type: blob.type });
}

function setFilesOnInput(input: HTMLInputElement, files: File[]): void {
  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }
  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
}

/**
 * Uploads photos one at a time to a file input element.
 * Fetches each URL, creates a File object, and sets it on the input
 * via DataTransfer. Configurable delay between uploads.
 */
export async function uploadPhotos(
  selector: string,
  photoUrls: string[],
  delayMs = PHOTO_UPLOAD_PAUSE,
): Promise<number> {
  const el = await waitForElement(selector);
  const input = el as HTMLInputElement;

  if (!(input instanceof HTMLInputElement) || input.type !== "file") {
    throw new Error(`Element "${selector}" is not a file input`);
  }

  let uploaded = 0;

  for (let i = 0; i < photoUrls.length; i++) {
    try {
      const file = await urlToFile(photoUrls[i], i);
      setFilesOnInput(input, [file]);
      uploaded++;

      if (i < photoUrls.length - 1) {
        await randomDelay(delayMs, delayMs + 500);
      }
    } catch (err) {
      console.error(`[QC] Failed to upload photo ${i}:`, err);
    }
  }

  return uploaded;
}
