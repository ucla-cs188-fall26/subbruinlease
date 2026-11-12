import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ImageStorage } from "./index";

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
const SAFE_FILE = /^[A-Za-z0-9_-]+\.webp$/;

/** Dev-only storage: writes photos to disk. Paths are strictly validated (no "..", no slashes). */
export class LocalFileStorage implements ImageStorage {
  private root: string;

  constructor(dir: string) {
    // Dev-only folder, chosen at runtime; tell the bundler not to trace it.
    this.root = path.resolve(/*turbopackIgnore: true*/ process.cwd(), dir);
  }

  async save(ownerId: string, data: Buffer) {
    if (!SAFE_SEGMENT.test(ownerId)) throw new Error("Invalid owner id");
    const file = `${randomUUID().replaceAll("-", "")}.webp`;
    const dir = path.join(this.root, ownerId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, file), data);
    return { url: `/uploads/${ownerId}/${file}` };
  }

  async read(ownerId: string, file: string) {
    if (!SAFE_SEGMENT.test(ownerId) || !SAFE_FILE.test(file)) return null;
    try {
      return await readFile(path.join(this.root, ownerId, file));
    } catch {
      return null;
    }
  }
}
