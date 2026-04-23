# PFV-Pulse ⚡ — Competitive Pricing & Market Intelligence

> **Project SpecDelta** — An automated dashboard for HP hardware pricing intelligence, real-time competitor tracking, price-to-performance delta calculation, and AI-driven revenue optimization recommendations.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)](https://neon.tech)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis)](https://upstash.com)
[![Playwright](https://img.shields.io/badge/Playwright-Scraper-45ba4b?logo=playwright)](https://playwright.dev)

---

## Table of Contents

1. [Overview](#overview)
2. [Business Benefits](#business-benefits)
3. [System Architecture](#system-architecture)
4. [Data Flow Diagram](#data-flow-diagram)
5. [Conversational Intent Routing](#conversational-intent-routing)
6. [Market Intelligence Module Pipeline](#market-intelligence-module-pipeline)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [Quick Start](#quick-start)
10. [Environment Variables](#environment-variables)
11. [API Reference](#api-reference)
12. [Deploying to Vercel + Scraper Service](#deploying)
13. [CSV Upload Format](#csv-upload-format)
14. [Graceful Degradation Contract](#graceful-degradation-contract)

---

## Overview

PFV-Pulse is a **real-time competitive pricing and market intelligence platform** purpose-built for HP hardware revenue teams. It aggregates live retail pricing across Best Buy, Google Shopping, and Amazon, calculates price-to-performance deltas against key competitors (Lenovo Legion, Asus ROG), and surfaces AI-driven revenue optimization recommendations.

The primary interface is a **conversational chat UI** — users ask questions in natural language and receive dynamic charts, comparison tables, and actionable pricing intelligence without navigating complex dashboards.

---

## Business Benefits

### 1. Revenue Optimization at Speed
The Revenue-Boost Recommendation Engine automatically synthesizes competitor pricing, review sentiment, and sales correlation data into a single **Action (YES/NO/HOLD) + Suggested Price** output — eliminating the hours analysts spend manually aggregating this data.

### 2. Competitor Price Awareness in Real Time
Instead of quarterly pricing reviews, PFV-Pulse tracks competitor prices **continuously** across retailers. The comparison table surfaces the exact % price gap between HP and each competitor, enabling dynamic price adjustments before margin is lost.

### 3. Sentiment-Driven Pricing Strategy
By correlating Week-on-Week review sentiment with sales velocity, the platform identifies when positive buzz creates pricing headroom — and when negative sentiment requires a margin sacrifice to defend volume.

### 4. Sales Velocity Forecasting
The Sales Correlation Module uses regression analysis on historical CSV data to project next-week unit volume, giving demand planners an early warning signal 5–7 days before it shows in ERP systems.

### 5. Reduced Manual Research Overhead
A team analyst typically spends 3–5 hours/week scraping pricing sites, compiling spreadsheets, and writing pricing decks. PFV-Pulse automates this entirely — the conversational interface delivers the same insight in under 10 seconds.

### 6. Modular & Risk-Free Adoption
Every intelligence module is **independently toggleable** — teams can adopt pricing data first, then layer in sentiment and correlation as confidence grows. No "all or nothing" implementation risk.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PFV-Pulse Platform                             │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Next.js App (Vercel)                         │  │
│  │                                                                  │  │
│  │  ┌────────────────────┐    ┌─────────────────────────────────┐  │  │
│  │  │   Chat Interface   │    │      Intelligence Dashboard     │  │  │
│  │  │  (Conversational   │    │  ┌───────────┐ ┌────────────┐  │  │  │
│  │  │   Intent Router)   │    │  │ Module    │ │Recommenda- │  │  │  │
│  │  │                    │    │  │ Settings  │ │tion Card   │  │  │  │
│  │  │  → single_product  │    │  ├───────────┤ ├────────────┤  │  │  │
│  │  │  → comparison      │    │  │ Price     │ │ Sentiment  │  │  │  │
│  │  │  → price_history   │    │  │ History   │ │ Heat-Scale │  │  │  │
│  │  │  → recommendation  │    │  │ Chart     │ │            │  │  │  │
│  │  │  → clarification   │    │  ├───────────┤ ├────────────┤  │  │  │
│  │  └─────────┬──────────┘    │  │ Sales     │ │ CSV Upload │  │  │  │
│  │            │               │  │ Projection│ │            │  │  │  │
│  │            ▼               │  └───────────┘ └────────────┘  │  │  │
│  │  ┌─────────────────────┐   └─────────────────────────────────┘  │  │
│  │  │   API Routes Layer  │                                         │  │
│  │  │  /api/chat          │                                         │  │
│  │  │  /api/prices        │                                         │  │
│  │  │  /api/compare       │                                         │  │
│  │  │  /api/history       │                                         │  │
│  │  │  /api/upload-csv    │                                         │  │
│  │  │  /api/modules/*     │                                         │  │
│  │  │  /api/scrape        │                                         │  │
│  │  └──────┬──────────────┘                                         │  │
│  └─────────┼────────────────────────────────────────────────────────┘  │
│            │                                                            │
│  ┌─────────▼───────────────────────────────────────────────────────┐  │
│  │                      Data & Services Layer                      │  │
│  │                                                                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │  │
│  │  │ Best Buy │ │ SerpApi  │ │  Keepa   │ │  Scraper Service   │ │  │
│  │  │   API    │ │(Google   │ │ (Amazon  │ │  (Playwright)      │ │  │
│  │  │          │ │Shopping) │ │ History) │ │  HP Store, Newegg  │ │  │
│  │  │ MSRPs,   │ │ High/Low/│ │ 30-day   │ │  Notebookcheck     │ │  │
│  │  │ Stock,   │ │ Average  │ │ price    │ │  rtings, PCMag     │ │  │
│  │  │ SKUs     │ │ pricing  │ │ history  │ │                    │ │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────────┬──────────┘ │  │
│  │       │            │            │                  │            │  │
│  │       └────────────┴────────────┴──────────────────┘            │  │
│  │                              │                                   │  │
│  │              ┌───────────────▼───────────────┐                  │  │
│  │              │    Upstash Redis Cache         │                  │  │
│  │              │  (TTL: 30min–2hr per source)   │                  │  │
│  │              └───────────────┬───────────────┘                  │  │
│  │                              │                                   │  │
│  │              ┌───────────────▼───────────────┐                  │  │
│  │              │   Neon PostgreSQL Database     │                  │  │
│  │              │  Products | Prices | Benchmarks│                  │  │
│  │              │  Reviews  | SalesData          │                  │  │
│  │              └───────────────────────────────┘                  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Types Query
      │
      ▼
┌─────────────────┐
│  Intent Router  │  ◄── Keyword/Regex Pattern Matching
│  (lib/intent/   │
│   router.ts)    │
└────────┬────────┘
         │
    ┌────▼─────────────────────────────────────────┐
    │           Intent Classification              │
    ├──────────────┬───────────────┬───────────────┤
    │              │               │               │
    ▼              ▼               ▼               ▼
single_product  comparison   price_history  clarification
    │              │               │            │
    ▼              ▼               ▼            ▼
Best Buy API   SerpApi (×N    Keepa API    Ask user for
+ SerpApi      brands) →      + DB prices  more context
    │          % delta calc        │
    │              │               │
    ▼              ▼               ▼
Bar Chart      Comparison      Line Chart
(recharts)     Table           (30-day)

         ↓ All results persisted to ↓

┌─────────────────────────────────┐
│    Neon PostgreSQL (Prisma)     │
│  Prices table (historical log)  │
└─────────────────────────────────┘
```

---

## Conversational Intent Routing

The chat interface uses a **keyword/regex pattern matcher** (zero LLM dependency, instant, free) with a clarification fallback when intent cannot be determined.

```
User Input
    │
    ├─ Contains "vs" / "versus" / "compare" / 2+ brands? ──► COMPARISON intent
    │                                                          → SerpApi × N brands
    │                                                          → % delta vs HP baseline
    │                                                          → Comparison Table UI
    │
    ├─ Contains "history" / "trend" / "over time"? ──────────► HISTORY intent
    │                                                          → Keepa API (ASIN)
    │                                                          → DB price log
    │                                                          → 30-day Line Chart UI
    │
    ├─ Contains "recommend" / "boost revenue" / "optimal"? ──► RECOMMENDATION intent
    │                                                          → Dashboard module refresh
    │                                                          → Revenue-Boost Engine
    │
    ├─ Contains "price" / "cost" / "how much" + 1 brand? ───► SINGLE PRODUCT intent
    │                                                          → Best Buy API
    │                                                          → Bar Chart UI
    │
    └─ No brand/product detected? ───────────────────────────► CLARIFICATION
                                                               → Asks specific follow-up
                                                               → Offers example queries
```

---

## Market Intelligence Module Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│              Market Intelligence Suite (Feature-Flagged)       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Module 1: Ratings & Reviews (toggle: reviews)           │ │
│  │                                                          │ │
│  │  Scraper Service → rtings.com, PCMag, LaptopMag,        │ │
│  │  Notebookcheck → Aggregate review entries               │ │
│  │  → Store in PostgreSQL Reviews table                     │ │
│  └──────────────────────┬───────────────────────────────────┘ │
│                          │ feeds                               │
│  ┌──────────────────────▼───────────────────────────────────┐ │
│  │  Module 2: Sentiment Analysis (toggle: sentiment)        │ │
│  │                                                          │ │
│  │  Review text → keyword scoring (positive/negative word   │ │
│  │  sets) → binary sentiment label → score (-1.0 to 1.0)   │ │
│  │  → Week-on-Week delta → Heat-Scale UI                   │ │
│  └──────────────────────┬───────────────────────────────────┘ │
│                          │ feeds                               │
│  ┌──────────────────────▼───────────────────────────────────┐ │
│  │  Module 3: Sales Correlation (toggle: correlation)       │ │
│  │                                                          │ │
│  │  CSV Upload → SalesData table → regression.js           │ │
│  │  → Price-to-sales R2 → Sentiment-to-sales R2            │ │
│  │  → Trend slope → Projected next-week units              │ │
│  └──────────────────────┬───────────────────────────────────┘ │
│                          │ feeds                               │
│  ┌──────────────────────▼───────────────────────────────────┐ │
│  │  Module 4: Revenue-Boost Recommendation Engine           │ │
│  │                                                          │ │
│  │  Inputs (available modules only):                        │ │
│  │  ├─ Competitor price delta (SerpApi)                    │ │
│  │  ├─ Sentiment label + WoW delta                         │ │
│  │  └─ Sales trend slope + R2                              │ │
│  │                                                          │ │
│  │  Output:                                                 │ │
│  │  ├─ Action: YES / NO / HOLD                             │ │
│  │  ├─ Suggested Price (revenue-maximizing)                │ │
│  │  ├─ Confidence: HIGH / MEDIUM / LOW                     │ │
│  │  └─ Top 3 Reasons (human-readable)                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  NOTE: Engine outputs a recommendation even with 0 modules    │
│  enabled — confidence degrades to LOW with a quality note.    │
└────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Technology | Version | Used For |
|---|---|---|
| **Next.js** | 16 (App Router) | Full-stack React framework; API routes + SSR/static rendering |
| **TypeScript** | 5.x | Type safety across all frontend and backend code |
| **Tailwind CSS** | v4 | HP-brand design system (CSS `@theme` tokens: blues, whites, grays) |
| **Recharts** | latest | Bar charts (product pricing), Line charts (history), Area charts (sales) |
| **lucide-react** | latest | Icon system throughout the UI |
| **Prisma** | v7 | ORM for PostgreSQL — schema management, type-safe queries, migrations |
| **@prisma/adapter-neon** | latest | Serverless-compatible Neon driver for Prisma v7 |
| **@neondatabase/serverless** | latest | WebSocket-based PostgreSQL driver for Vercel Edge/serverless |
| **Neon PostgreSQL** | — | Serverless PostgreSQL — Products, Prices, Benchmarks, Reviews, SalesData |
| **redis** | latest | Redis client library |
| **Upstash Redis** | — | Serverless Redis — response caching for all external API calls (TTL 30min–2hr) |
| **papaparse** | latest | CSV parsing for historical sales data ingestion |
| **regression** | latest | Linear regression for price-to-sales and sentiment-to-sales correlation (R2) |
| **Playwright** | latest | Headless browser scraping (HP Store, Newegg, Notebookcheck, rtings, PCMag) |
| **Express** | 4.x | HTTP server for the isolated scraper microservice |
| **SerpApi** | REST | Google Shopping pricing API — high/low/average retail prices |
| **Keepa API** | REST | Amazon 30-day price history by ASIN |
| **Best Buy API** | REST | Base MSRP, stock availability, SKU catalog search |

### Why These Choices?

**Next.js App Router** — Enables co-locating API routes with UI in one deployable unit on Vercel, with zero-config Edge caching. The App Router's streaming support means charts render incrementally as data arrives.

**Playwright in a separate service** — Vercel serverless functions have a 50MB bundle limit; Playwright binaries are ~300MB. Isolating scraping to a separate long-running process (Railway/Fly.io) keeps the main app within Vercel limits while enabling full browser automation.

**Upstash Redis** — Serverless-first Redis with HTTP REST API — no persistent connections needed, compatible with Vercel's function model. Rate-limited APIs (SerpApi: 100 req/s, Keepa: token-bucket) are protected by 30-minute TTL caches.

**Neon PostgreSQL** — Scales to zero between requests (no idle compute cost), provides a connection pooler (`-pooler` endpoint) compatible with Vercel's ephemeral function model. Prisma's `driverAdapters` feature enables WebSocket-based connections.

**Keyword/regex intent routing** — Zero latency, zero cost, zero external dependency for query classification. An LLM router adds 500ms+ latency and API cost per message; for structured pricing queries the pattern space is well-defined and regex is 100% reliable.

**regression.js** — Lightweight (2KB) linear regression library. Provides R2 correlation coefficients and slope values needed for sales trend analysis without a full ML stack.

---

## Project Structure

```
pfv-pulse/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Conversational intent routing + data fetch
│   │   ├── prices/route.ts            # Single product pricing (Best Buy + SerpApi)
│   │   ├── compare/route.ts           # Multi-brand comparison with % delta
│   │   ├── history/route.ts           # 30-day history (Keepa + DB)
│   │   ├── upload-csv/route.ts        # CSV ingestion (papaparse → PostgreSQL)
│   │   ├── scrape/route.ts            # Proxy to scraper microservice
│   │   └── modules/
│   │       ├── reviews/route.ts       # Aggregated review fetching
│   │       ├── sentiment/route.ts     # WoW sentiment scoring
│   │       ├── correlation/route.ts   # Sales correlation (R2 + projection)
│   │       └── recommendation/route.ts # Revenue-Boost engine
│   ├── layout.tsx                     # Root layout with HP brand fonts
│   ├── page.tsx                       # Main two-column dashboard page
│   └── globals.css                    # Tailwind v4 + HP brand CSS tokens
│
├── components/
│   ├── ChatInterface.tsx              # Conversational UI with message rendering
│   ├── Dashboard.tsx                  # Right-panel intelligence dashboard
│   ├── PriceChart.tsx                 # Best Buy product pricing bar chart
│   ├── PriceHistoryChart.tsx          # 30-day price line chart (auto-fetches)
│   ├── ComparisonTable.tsx            # Multi-brand table with % delta badges
│   ├── SentimentPanel.tsx             # Heat-scale WoW sentiment indicator
│   ├── SalesChart.tsx                 # Sales projection area chart
│   ├── RecommendationCard.tsx         # Revenue-Boost output card
│   ├── ModuleSettings.tsx             # Toggle panel for intelligence modules
│   ├── CsvUpload.tsx                  # Drag-and-drop CSV uploader
│   └── EmptyState.tsx                 # Graceful "Data Unavailable" placeholder
│
├── lib/
│   ├── api/
│   │   ├── bestbuy.ts                 # Best Buy API wrapper + Redis caching
│   │   ├── serpapi.ts                 # SerpApi wrapper + rate limiting + cache
│   │   └── keepa.ts                   # Keepa API wrapper + ASIN history parser
│   ├── modules/
│   │   ├── reviews.ts                 # Review aggregation (scraper service call)
│   │   ├── sentiment.ts               # Keyword-based sentiment scorer
│   │   ├── correlation.ts             # regression.js linear correlation
│   │   └── recommendation.ts         # Revenue-Boost recommendation engine
│   ├── intent/
│   │   └── router.ts                  # Keyword/regex intent classifier
│   ├── redis.ts                       # Upstash Redis client (graceful null)
│   ├── prisma.ts                      # Neon-adapter PrismaClient singleton
│   └── utils.ts                       # CSV export utility
│
├── types/
│   ├── index.ts                       # Shared TypeScript interfaces
│   └── regression.d.ts                # Type declaration for regression module
│
├── scraper-service/                   # Standalone Playwright microservice
│   ├── src/
│   │   ├── index.ts                   # Express server + in-memory cache
│   │   └── scrapers/
│   │       ├── hp-store.ts            # HP Official Store scraper
│   │       ├── newegg.ts              # Newegg product + price scraper
│   │       ├── notebookcheck.ts       # Benchmark data scraper
│   │       └── reviews.ts             # rtings.com + PCMag review scraper
│   ├── package.json                   # Separate dependencies (Express, Playwright)
│   └── tsconfig.json
│
├── prisma/
│   └── schema.prisma                  # 5-model schema with indexes
│
├── prisma.config.ts                   # Prisma v7 datasource config
├── .env.example                       # Environment variable template
├── next.config.ts                     # Next.js config
└── package.json
```

---

## Quick Start

### Prerequisites
- Node.js 22+
- A [Neon](https://neon.tech) PostgreSQL database
- An [Upstash](https://upstash.com) Redis instance

### 1. Clone and install

```bash
git clone https://github.com/debster9755/pfv-pulse.git
cd pfv-pulse
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 4. Start the development server

```bash
npm run dev
# App runs at http://localhost:3000
```

### 5. (Optional) Start the scraper service

```bash
cd scraper-service
npm install
npx playwright install chromium
npm run dev
# Scraper runs at http://localhost:3001
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | Yes |
| `UPSTASH_REDIS_URL` | Upstash Redis `redis://` connection string | Yes |
| `SERPAPI_KEY` | SerpApi key for Google Shopping pricing | Optional |
| `KEEPA_API_KEY` | Keepa API key for Amazon price history | Optional |
| `BESTBUY_API_KEY` | Best Buy Developer API key | Optional |
| `SCRAPER_SERVICE_URL` | URL of deployed Playwright scraper service | Optional |

All optional keys degrade gracefully — missing keys return empty results and the UI shows a clean EmptyState. No crashes.

---

## API Reference

### `POST /api/chat`
Conversational interface. Routes intent and returns typed response.

**Request:**
```json
{ "message": "Compare HP Omen vs Lenovo Legion vs Asus ROG" }
```

**Response types:** `single_product` | `comparison` | `price_history` | `recommendation` | `clarification` | `error`

### `GET /api/prices?q={query}`
Fetch pricing for a single product query from Best Buy + SerpApi.

### `GET /api/compare?brands=HP+Omen,Lenovo+Legion,Asus+ROG`
Multi-brand comparison with % price delta relative to HP baseline.

### `GET /api/history?q={query}&asin={asin}`
30-day price history from Keepa and/or PostgreSQL price log.

### `POST /api/upload-csv`
Upload historical sales CSV (multipart/form-data, field: `file`).

**Required CSV columns:** `product_name`, `brand`, `period`, `units_sold`, `revenue`

**Optional columns:** `region`, `channel`

### `GET /api/modules/recommendation?product={name}&reviews={bool}&sentiment={bool}&correlation={bool}`
Revenue-Boost recommendation for a product with module toggles.

### `GET /api/modules/sentiment?product={name}`
WoW sentiment analysis for a product.

### `GET /api/modules/correlation?product={name}`
Sales correlation (R2 + projected units) for a product.

---

## Deploying

### Next.js App to Vercel

```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL
vercel env add UPSTASH_REDIS_URL
vercel env add SERPAPI_KEY
vercel env add BESTBUY_API_KEY
vercel env add SCRAPER_SERVICE_URL   # set after deploying scraper
vercel deploy --prod
```

**After first deploy, run migration:**
```bash
DATABASE_URL="your_neon_url" npx prisma migrate deploy
```

### Scraper Service to Railway

```bash
npm i -g @railway/cli
railway login
cd scraper-service
railway init
railway up
# Copy the deployment URL → set as SCRAPER_SERVICE_URL in Vercel
```

---

## CSV Upload Format

```csv
product_name,brand,period,units_sold,revenue,region,channel
HP Omen 16,HP,2024-01-01,1250,1874750,US,online
HP Omen 16,HP,2024-01-08,1380,2068020,US,online
Lenovo Legion 5,Lenovo,2024-01-01,1890,2607210,US,online
```

- `period`: ISO date string (YYYY-MM-DD)
- `units_sold`: integer
- `revenue`: float (USD)
- `region`, `channel`: optional strings

---

## Graceful Degradation Contract

Every external dependency has an explicit fallback. The app never throws a 500 error due to a missing API key or unavailable service.

| Dependency | Failure Mode | Fallback Behaviour |
|---|---|---|
| `BESTBUY_API_KEY` missing | `isConfigured()` false | Returns `[]`, Chat shows EmptyState |
| `SERPAPI_KEY` missing | `isConfigured()` false | Returns null summary, EmptyState |
| `KEEPA_API_KEY` missing | `isConfigured()` false | Returns null, History shows EmptyState |
| Redis unavailable | `connect()` throws | `cacheGet` returns null, API calls proceed uncached |
| PostgreSQL unavailable | Prisma throws | `try/catch` returns empty array, UI shows EmptyState |
| Scraper service down | `fetch()` times out (25s) | Returns 503 with null data, UI shows EmptyState |
| Scraper blocked by site | Playwright throws | Returns partial results collected before failure |
| Module disabled in settings | `enabled=false` prop | EmptyState with "Integration Disabled" shown |
| Recommendation with no data | 0 data sources | Action=HOLD, Confidence=LOW, explanatory note shown |

---

## License

MIT © 2025 PFV-Pulse / Project SpecDelta
