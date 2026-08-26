import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Read a File into a base64 string (no data: prefix) plus its media type.
 * Used to send screenshots to the decode API.
 */
export function fileToBase64(
  file: File
): Promise<{ dataBase64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve({
        dataBase64: comma >= 0 ? result.slice(comma + 1) : result,
        mediaType: file.type,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
