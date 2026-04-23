import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function GET() {
  const key = process.env.BESTBUY_API_KEY ?? "";
  const serpKey = process.env.SERPAPI_KEY ?? "";

  const bbKeyPresent = key.length > 0;
  const serpKeyPresent = serpKey.length > 0;

  const testUrl = `https://api.bestbuy.com/v1/products(search=HP%20Omen%26categoryPath.id=abcat0502000)?format=json&pageSize=3&show=sku,name,regularPrice&apiKey=${key}`;

  let bbResult: unknown = null;
  let bbStatus = 0;
  let bbError: string | null = null;
  let resolvedUrl = "";

  try {
    const r = await fetch(testUrl, { cache: "no-store" });
    bbStatus = r.status;
    resolvedUrl = r.url; // final URL after any redirects
    bbResult = await r.json();
  } catch (e) {
    bbError = String(e);
  }

  let serpResult: unknown = null;
  let serpStatus = 0;
  try {
    const sp = new URLSearchParams({
      engine: "google_shopping",
      q: "HP Omen laptop",
      api_key: serpKey,
      num: "3",
    });
    const sr = await fetch(`https://serpapi.com/search.json?${sp}`, { cache: "no-store" });
    serpStatus = sr.status;
    const sd = await sr.json() as { shopping_results?: unknown[]; error?: string };
    serpResult = { count: (sd.shopping_results ?? []).length, error: sd.error };
  } catch (e) {
    serpResult = { error: String(e) };
  }

  return NextResponse.json({
    env: {
      bbKeyPresent,
      bbKeyPreview: key.slice(0, 6) + "...",
      serpKeyPresent,
      serpKeyPreview: serpKey.slice(0, 8) + "...",
      node: process.version,
    },
    bestbuy: { status: bbStatus, resolvedUrl, error: bbError, result: bbResult },
    serpapi: { status: serpStatus, result: serpResult },
  });
}
