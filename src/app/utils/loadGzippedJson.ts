import { ungzip } from 'pako';

export async function loadGzippedJson<T>(path: string): Promise<T> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Check if the file starts with the gzip magic numbers (1f 8b)
    if (uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
      const decompressed = ungzip(uint8Array, { to: 'string' });
      return JSON.parse(decompressed);
    } else {
      // Not gzipped, just parse as regular JSON
      const text = new TextDecoder().decode(uint8Array);
      return JSON.parse(text);
    }
  } catch (error) {
    console.error(`Error loading JSON from ${path}:`, error);
    throw error;
  }
}