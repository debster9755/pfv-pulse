# PFV-Pulse — Project SpecDelta

> **Real-time competitive pricing intelligence, benchmark delta tracking, and AI-powered pricing recommendations for hardware product teams.**

PFV-Pulse is a full-stack market intelligence platform built for hardware product managers and pricing strategists. It continuously monitors newly launched consumer hardware (laptops, gaming rigs, peripherals), aggregates live pricing across all major retailers, calculates performance-to-price deltas against competitors, tracks review sentiment week-on-week, and outputs automated, data-backed pricing recommendations — all from a single dashboard.

---

## Business Benefits

### For Product & Pricing Teams
| Benefit | Impact |
|---|---|
| **Eliminate manual price monitoring** | Automated scraping across HP, Newegg, Amazon, Best Buy — updated every 6 hours via Vercel Cron |
| **React to competitor moves in hours, not days** | Real-time alerts when a competitor's price drops below yours across any retailer |
| **Justify pricing decisions with data** | Regression model correlates historical sales volume directly to price delta — move from gut feel to statistical confidence |
| **Win on value-per-dollar positioning** | Value Score (benchmark aggregate ÷ market price × 100) shows exactly where your product sits relative to the competitive set |
| **Catch sentiment shifts early** | Week-on-Week review sentiment tracking across rtings, PCMag, LaptopMag, and Notebookcheck — negative sentiment spikes trigger pricing review alerts before they hit sales |
| **Reduce time-to-decision on markdowns** | Recommendation Engine outputs a single action card: Lower / Raise / Hold, suggested price, confidence score, and top 3 ranked reasons |
| **Audit trail for pricing decisions** | Every recommendation is timestamped and stored — full history of what was recommended and why |

### For Engineering & Analytics Teams
| Benefit | Impact |
|---|---|
| **One source of truth** | PostgreSQL (Neon) stores all pricing, benchmark, review, and sales data — no more spreadsheets |
| **Composable data pipeline** | Modular engines (Delta, Regression, Sentiment, Recommendation) can be individually queried, extended, or replaced |
| **Serverless-first, cost-efficient** | Vercel handles the web layer; Railway hosts the Playwright scraper on a persistent container where it belongs — no cold-start Chromium issues |
| **API-first design** | Every data source and analytical output is a clean REST endpoint — plug into your existing BI tools or Slack bots |
| **CSV import for legacy data** | Upload historical sales exports from any ERP/retail portal without schema changes |

---

## Key Features

- **Conversational Product Setup** — Chat interface to onboard products and competitors in plain English: *"Track HP Omen 16 against Lenovo Legion 5 and Asus ROG Strix G16"*
- **30-Day Price History Chart** — Multi-retailer line chart showing price trends across Amazon, Best Buy, Newegg, and HP Official
- **Competitive Delta Table** — Direct competitor price comparison with absolute and percentage delta, verdict badge (Undercuts You / Parity / You Win), and CSV export
- **Sales Projection Chart** — Actual vs. regression-projected weekly unit volume overlaid on a single chart, with R² goodness-of-fit indicator
- **Sentiment Heat-Scale** — Weekly review sentiment grid color-coded from deep red (net negative) to deep green (net positive), with WoW change annotation
- **Pricing Recommendation Card** — Prominent action card with suggested price, confidence bar, and top 3 signal-weighted reasons
- **CSV Sales Ingest** — Drag-and-drop upload with column mapping, validation, and upsert conflict resolution
- **Vercel Cron Refresh** — Every 6 hours, all tracked products are re-scraped and analytics recomputed automatically

---

## Architecture & System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                             │
│                                                                     │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │ Chat UI      │  │ Dashboard       │  │ CSV Uploader         │   │
│  │ (product     │  │ (recharts,      │  │ (papaparse,          │   │
│  │  onboarding) │  │  tables, cards) │  │  drag-and-drop)      │   │
│  └──────┬───────┘  └────────┬────────┘  └──────────┬───────────┘   │
└─────────┼───────────────────┼──────────────────────┼───────────────┘
          │  HTTPS            │  HTTPS                │  HTTPS
          ▼                   ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL  (Next.js 16 App Router)                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     API Routes                              │   │
│  │                                                             │   │
│  │  POST /api/products   ──► Upsert product + SerpApi/BestBuy  │   │
│  │  GET  /api/products   ──► Search/list products              │   │
│  │                                                             │   │
│  │  GET  /api/prices     ──► 30-day price history (DB)         │   │
│  │  POST /api/prices     ──► Fetch Keepa 30-day ASIN history   │   │
│  │                                                             │   │
│  │  POST /api/ingest     ──► Parse + upsert CSV sales data     │   │
│  │                                                             │   │
│  │  POST /api/scrape     ──► Proxy to Railway scraper service  │   │
│  │  GET  /api/scrape     ──► Poll scraper run status           │   │
│  │                                                             │   │
│  │  GET  /api/analytics  ──► Delta + Regression + Sentiment    │   │
│  │                           + Recommendation (15-min cache)   │   │
│  │                                                             │   │
│  │  GET  /api/cron       ──► Vercel Cron (every 6h)            │   │
│  │                           Fans out scrape jobs              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Analytics Engines (lib/)                  │   │
│  │                                                             │   │
│  │  Delta Engine        competitor_price − target_price        │   │
│  │                      value_score = benchmark ÷ price × 100  │   │
│  │                                                             │   │
│  │  Regression Engine   units_sold ~ price_delta (linear)      │   │
│  │                      → optimal delta, projected volume      │   │
│  │                                                             │   │
│  │  Sentiment Engine    keyword valence scoring (LIWC lexicon)  │   │
│  │                      → WoW net score per review source      │   │
│  │                                                             │   │
│  │  Recommendation      aggregates all signals → action card   │   │
│  │  Engine              action: LOWER / RAISE / HOLD           │   │
│  │                      suggested price, confidence 0–100%     │   │
│  │                      top 3 weighted reasons                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────┬───────────────────────┬──────────────────────────┘
                   │                       │
         ┌─────────▼─────────┐   ┌────────▼────────┐
         │   Upstash Redis   │   │  Neon PostgreSQL │
         │                   │   │                  │
         │  · API response   │   │  Products        │
         │    cache (1h)     │   │  Prices          │
         │  · Scraper last-  │   │  Benchmarks      │
         │    known-good     │   │  Reviews         │
         │    fallback       │   │  SalesData       │
         │  · Analytics      │   │  ScraperRuns     │
         │    cache (15min)  │   │  CronLogs        │
         └───────────────────┘   └──────────────────┘
                                          ▲
                                          │ Prisma 6 ORM
                                          │ (connection pooling
                                          │  via PgBouncer)
┌─────────────────────────────────────────┼────────────────────────────┐
│              RAILWAY  (Express + Playwright)                         │
│                                         │                            │
│  ┌──────────────────────────────────────┘──────────────────────┐    │
│  │  POST /scrape/prices                                        │    │
│  │       └─► HP Official Store  (specs + MSRP + stock)        │    │
│  │       └─► Newegg             (component costs + ratings)   │    │
│  │                                                             │    │
│  │  POST /scrape/benchmarks                                    │    │
│  │       └─► Notebookcheck.net  (Cinebench, 3DMark, thermals) │    │
│  │                                                             │    │
│  │  POST /scrape/reviews                                       │    │
│  │       └─► rtings.com                                       │    │
│  │       └─► pcmag.com                                        │    │
│  │       └─► laptopmag.com                                    │    │
│  │       └─► notebookcheck.net                                │    │
│  │                                                             │    │
│  │  All scrapers:                                              │    │
│  │    · Custom User-Agent rotation                             │    │
│  │    · Random jitter delay (500ms–2000ms)                    │    │
│  │    · Image/font blocking for speed                          │    │
│  │    · CAPTCHA detection → graceful Redis fallback            │    │
│  │    · Optional residential proxy support                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐
│  SerpApi        │  │  Keepa API    │  │  Best Buy API    │
│  Google Shopping│  │  Amazon 30-day│  │  MSRP + stock    │
│  High/Low/Avg   │  │  price history│  │  availability    │
│  (100 req/hr)   │  │  (5 req/min)  │  │  (5 req/sec)     │
└─────────────────┘  └───────────────┘  └──────────────────┘
```

---

## Data Flow

```
User types: "Track HP Omen 16 against Lenovo Legion 5"
     │
     ▼
ChatInterface.tsx  ──POST /api/products──►  Upsert Products in DB
                                            Enrich with SerpApi + BestBuy prices
                   ──POST /api/scrape───►   Fire scrape job (async)
                                                │
                                                ▼
                                        Railway scraper runs:
                                          HP + Newegg (prices)
                                          Notebookcheck (benchmarks)
                                          rtings/PCMag/LaptopMag (reviews)
                                                │
                                                ▼
                                        Results written to PostgreSQL
                                        Cached in Redis

Dashboard loads  ──GET /api/analytics──►  Delta Engine computes deltas
                                          Regression Engine fits model
                                          Sentiment Engine scores reviews
                                          Recommendation Engine generates action
                                                │
                                                ▼
                                        Rendered as:
                                          · RecommendationCard
                                          · PriceHistoryChart
                                          · DeltaTable
                                          · SalesProjectionChart
                                          · SentimentHeatmap
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Full-stack React with server components |
| Styling | Tailwind CSS | Utility-first UI |
| Charts | Recharts | Price history, sales projection |
| Icons | lucide-react | UI iconography |
| ORM | Prisma 6 | Type-safe PostgreSQL access |
| Database | Neon (PostgreSQL) | Serverless Postgres with connection pooling |
| Cache | Upstash Redis | API response + scraper fallback cache |
| Scraper | Playwright (Chromium) | Headless browser scraping |
| Scraper Host | Railway | Persistent container for Playwright |
| Pricing data | SerpApi | Google Shopping aggregation |
| Price history | Keepa API | Amazon 30-day ASIN price history |
| Retail data | Best Buy API | MSRP + stock + product catalog |
| CSV parsing | papaparse | Sales data ingestion |
| Regression | regression.js | Linear price-delta → units-sold model |
| Scheduling | Vercel Cron | 6-hourly automated scrape refresh |
| Deployment | Vercel | Next.js hosting + edge CDN |

---

## Project Structure

```
pfv-pulse/
├── app/
│   ├── api/
│   │   ├── analytics/route.ts     # Delta + Regression + Sentiment + Recommendation
│   │   ├── cron/route.ts          # Vercel Cron job (every 6h)
│   │   ├── ingest/route.ts        # CSV upload + papaparse upsert
│   │   ├── prices/route.ts        # Price history + Keepa enrichment
│   │   ├── products/route.ts      # Product CRUD + SerpApi/BestBuy enrichment
│   │   └── scrape/route.ts        # Proxy to Railway scraper + run tracking
│   ├── generated/prisma/          # Prisma 6 generated client (gitignored)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/
│   │   ├── ChatInterface.tsx      # Conversational product onboarding
│   │   ├── CsvUploader.tsx        # Drag-and-drop sales CSV import
│   │   ├── Dashboard.tsx          # Root dashboard orchestrator
│   │   ├── DeltaTable.tsx         # Competitor delta table + export
│   │   ├── PriceHistoryChart.tsx  # 30-day multi-retailer line chart
│   │   ├── RecommendationCard.tsx # Action card with reasons
│   │   ├── SalesProjectionChart.tsx # WoW actual vs projected
│   │   └── SentimentHeatmap.tsx   # WoW sentiment heat-scale
│   └── ui/
│       └── ExportButton.tsx       # Reusable CSV export
├── lib/
│   ├── apis/
│   │   ├── bestbuy.ts             # Best Buy API wrapper + throttle
│   │   ├── keepa.ts               # Keepa API + batch ASIN lookup
│   │   └── serpapi.ts             # Google Shopping wrapper + throttle
│   ├── engines/
│   │   ├── delta.ts               # Pricing delta + value score
│   │   ├── recommendation.ts      # Signal aggregation → action card
│   │   ├── regression.ts          # Linear regression (price delta ~ sales)
│   │   └── sentiment.ts           # Keyword valence + WoW aggregation
│   ├── utils/
│   │   └── throttle.ts            # Token-bucket rate limiter
│   ├── prisma.ts                  # Prisma singleton
│   └── redis.ts                   # Redis client + getCached/setCached helpers
├── prisma/
│   └── schema.prisma              # DB models: Product, Price, Benchmark, Review, SalesData
├── scraper-service/               # Railway microservice
│   └── src/
│       ├── scrapers/
│       │   ├── hp.ts              # HP Official Store scraper
│       │   ├── newegg.ts          # Newegg scraper + CAPTCHA detection
│       │   ├── notebookcheck.ts   # Benchmarks + review scraper
│       │   └── reviewSites.ts     # rtings / PCMag / LaptopMag
│       ├── browser.ts             # Playwright browser singleton
│       ├── cache.ts               # Redis fallback cache
│       ├── index.ts               # Express server + auth middleware
│       ├── sentiment.ts           # In-process sentiment scorer
│       └── utils.ts               # sleep, randomDelay, chunk
└── vercel.json                    # Cron schedule definition
```

---

## Getting Started Locally

### Prerequisites
- Node.js 20+
- A running PostgreSQL instance (or Neon account)
- A running Redis instance (or Upstash account)
- API keys for SerpApi, Keepa, and Best Buy

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/debster9755/pfv-pulse.git
cd pfv-pulse

# 2. Install dependencies
npm install

# 3. Copy env template and fill in your keys
cp .env.example .env

# 4. Run database migrations
npx prisma migrate deploy

# 5. Generate Prisma client
npx prisma generate

# 6. Start the scraper microservice (separate terminal)
cd scraper-service && npm install && npm run dev

# 7. Start the Next.js app
cd .. && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (`?pgbouncer=true`) |
| `DIRECT_URL` | Neon direct connection string (for Prisma Migrate) |
| `REDIS_URL` | Upstash Redis URL |
| `SERPAPI_KEY` | SerpApi key (Google Shopping) |
| `KEEPA_KEY` | Keepa API key (Amazon price history) |
| `BESTBUY_KEY` | Best Buy Developer API key |
| `SCRAPER_SERVICE_URL` | Railway scraper service URL |
| `SCRAPER_INTERNAL_KEY` | Shared secret between Next.js and scraper |
| `CRON_SECRET` | Bearer token to authenticate Vercel Cron calls |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |
| `PROXY_URL` | *(Optional)* Residential proxy for scraper |
| `PROXY_USER` | *(Optional)* Proxy username |
| `PROXY_PASS` | *(Optional)* Proxy password |

### Deploy

```bash
# Deploy Next.js to Vercel
vercel link
vercel deploy --prod

# Deploy scraper to Railway
cd scraper-service
railway login && railway init && railway up
```

Vercel Cron runs `/api/cron` every 6 hours automatically — no additional configuration needed after deploy.

---

## Recommendation Engine Logic

The engine weights four independent signals and outputs a single action:

```
Signal 1: Competitive Delta
  → % of competitors pricing below target
  → Average absolute delta across competitive set

Signal 2: Regression Model (R² weighted)
  → Optimal price delta for peak unit volume
  → Only used if R² > 0.4 (statistically significant)

Signal 3: Sentiment Trend
  → Current week net sentiment score
  → Week-on-Week sentiment change direction

Signal 4: Value Score
  → Benchmark aggregate ÷ lowest market price × 100
  → Flags under/over-performing value-per-dollar

Aggregate score → threshold:
  < -0.2  →  LOWER_PRICE  (suggested: current × (1 + score × 0.5), floor at 70% MSRP)
  > +0.25 →  RAISE_PRICE  (suggested: current × (1 + score × 0.3), cap at 10% raise)
  else    →  HOLD
```

---

## Rate Limits & Caching Strategy

| API | Limit | Cache TTL |
|---|---|---|
| SerpApi (Google Shopping) | 100 req / hour | 1 hour |
| Keepa (Amazon history) | 5 req / minute | 6 hours |
| Best Buy | 5 req / second | 30 minutes |
| Analytics (computed) | — | 15 minutes |
| Scraper results (Redis fallback) | — | 2–12 hours |

All API calls pass through a token-bucket throttle (`lib/utils/throttle.ts`). If a scraper is blocked (CAPTCHA, rate limit), the system transparently falls back to the last known cached result without crashing or returning an error to the user.

---

## License

MIT
