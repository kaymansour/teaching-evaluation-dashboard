// lib/data.ts
//
// Loads the JSON files from public/data.
//
// This runs on the server, not in the browser, so it reads the files
// straight from disk. Nothing here is sent to the visitor except the
// finished HTML.

import { promises as fs } from "fs";
import path from "path";

import type { OverviewData } from "@/types/metrics";

// Where the generated JSON files live
const DATA_DIR = path.join(process.cwd(), "public", "data");

// Read one JSON file and hand it back
async function readJson<T>(fileName: string): Promise<T> {
  const filePath = path.join(DATA_DIR, fileName);
  const text = await fs.readFile(filePath, "utf-8");
  return JSON.parse(text) as T;
}

// Load everything the overview page needs
export async function getOverview(): Promise<OverviewData> {
  return readJson<OverviewData>("overview.json");
}
