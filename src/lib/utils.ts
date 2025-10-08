import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Safe number conversion utility for handling API responses that might return strings
export function safeNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Run async work over a list with bounded concurrency.
// Collects successful results; individual failures are ignored so that
// a batch upload can continue even if some files fail.
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const runners = new Array(Math.min(concurrency, Math.max(1, items.length))).fill(0).map(async () => {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      try {
        const r = await worker(items[i], i);
        results.push(r);
      } catch {
        // swallow individual errors to keep batch going
      }
    }
  });
  await Promise.all(runners);
  return results;
}

// Variant that also reports errors so callers can show accurate counts/messages
export async function runWithConcurrencyDetailed<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<{ succeeded: R[]; errors: any[] }> {
  const succeeded: R[] = [];
  const errors: any[] = [];
  let index = 0;
  const runners = new Array(Math.min(concurrency, Math.max(1, items.length))).fill(0).map(async () => {
    while (true) {
      const i = index++;
      if (i >= items.length) break;
      try {
        const r = await worker(items[i], i);
        succeeded.push(r);
      } catch (e) {
        errors.push(e);
        // continue
      }
    }
  });
  await Promise.all(runners);
  return { succeeded, errors };
}

// ---- Image helpers ----
function dataURLToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new Blob([u8arr], { type: mime });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed'));
    }, type, quality);
  });
}

export async function maybeCompressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number; minBytesToCompress?: number } = {}
): Promise<File> {
  try {
    if (!file.type.startsWith('image/')) return file;
    const maxDimension = opts.maxDimension ?? 1600;
    const quality = opts.quality ?? 0.82;
    const minBytesToCompress = opts.minBytesToCompress ?? 1_200_000; // ~1.2MB
    if (file.size < minBytesToCompress) return file;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = dataUrl;
    });

    const { width, height } = img;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW; canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);

    // If compression didn’t help, keep original
    if (blob.size >= file.size * 0.95) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    // In case of any failure, fallback to original
    return file;
  }
}
