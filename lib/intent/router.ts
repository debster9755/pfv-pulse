export type IntentType =
  | "single_product"
  | "comparison"
  | "price_history"
  | "recommendation"
  | "clarification_needed"
  | "unknown";

export interface ParsedIntent {
  type: IntentType;
  brands: string[];
  products: string[];
  rawQuery: string;
  clarificationPrompt?: string;
}

const BRAND_PATTERNS: Record<string, RegExp> = {
  HP: /\bhp\b/i,
  Lenovo: /\blenovo\b/i,
  Asus: /\basus\b/i,
  Dell: /\bdell\b/i,
  Acer: /\bacer\b/i,
  Razer: /\brazer\b/i,
  MSI: /\bmsi\b/i,
  Samsung: /\bsamsung\b/i,
  Apple: /\bapple\b|\bmacbook\b/i,
};

const PRODUCT_LINE_PATTERNS: Record<string, RegExp> = {
  "HP Omen": /\bomen\b/i,
  "HP Spectre": /\bspectre\b/i,
  "HP Envy": /\benvy\b/i,
  "HP Victus": /\bvictus\b/i,
  "Lenovo Legion": /\blegion\b/i,
  "Lenovo ThinkPad": /\bthinkpad\b/i,
  "Asus ROG": /\brog\b/i,
  "Asus TUF": /\btuf\b/i,
  "Dell XPS": /\bxps\b/i,
  "Dell Alienware": /\balienware\b/i,
  "Razer Blade": /\brazer blade\b/i,
};

const COMPARISON_TRIGGERS = /\bvs\.?\b|\bversus\b|\bcompare\b|\bcomparison\b|\bagainst\b/i;
const HISTORY_TRIGGERS = /\bhistory\b|\btrend\b|\bover time\b|\blast \d+ days?\b|\bprice change\b/i;
const RECOMMENDATION_TRIGGERS = /\brecommend\b|\bshould i\b|\bbest price\b|\boptimal\b|\bboost revenue\b/i;
const PRICE_TRIGGERS = /\bprice\b|\bcost\b|\bhow much\b|\bpricing\b|\brates?\b/i;

function extractBrands(text: string): string[] {
  return Object.entries(BRAND_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([brand]) => brand);
}

function extractProducts(text: string): string[] {
  return Object.entries(PRODUCT_LINE_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([line]) => line);
}

export function parseIntent(input: string): ParsedIntent {
  const brands = extractBrands(input);
  const products = extractProducts(input);

  if (COMPARISON_TRIGGERS.test(input) || brands.length >= 2 || products.length >= 2) {
    return { type: "comparison", brands, products, rawQuery: input };
  }

  if (HISTORY_TRIGGERS.test(input)) {
    if (brands.length === 0 && products.length === 0) {
      return {
        type: "clarification_needed",
        brands,
        products,
        rawQuery: input,
        clarificationPrompt:
          "Which product would you like to see price history for? For example: *HP Omen 16* or *Lenovo Legion 5*.",
      };
    }
    return { type: "price_history", brands, products, rawQuery: input };
  }

  if (RECOMMENDATION_TRIGGERS.test(input)) {
    return { type: "recommendation", brands, products, rawQuery: input };
  }

  if (PRICE_TRIGGERS.test(input)) {
    if (brands.length === 0 && products.length === 0) {
      return {
        type: "clarification_needed",
        brands,
        products,
        rawQuery: input,
        clarificationPrompt:
          "Which product or brand are you looking for pricing on? For example: *HP Omen Laptop options* or *Lenovo Legion 5*.",
      };
    }
    return { type: "single_product", brands, products, rawQuery: input };
  }

  if (brands.length === 1 || products.length === 1) {
    return { type: "single_product", brands, products, rawQuery: input };
  }

  if (brands.length === 0 && products.length === 0) {
    return {
      type: "clarification_needed",
      brands,
      products,
      rawQuery: input,
      clarificationPrompt:
        "I'm not sure what you're looking for. Could you specify a product or brand? For example:\n- *\"Give me the price for HP Omen Laptop options\"*\n- *\"Compare HP Omen vs Lenovo Legion vs Asus ROG\"*",
    };
  }

  return { type: "unknown", brands, products, rawQuery: input };
}
