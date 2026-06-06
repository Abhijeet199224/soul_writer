# Soul Writer

A wholesome writer app with **Context Interconnectivity** — character profiles in the Story Bible automatically feed the Smart Codex editor (and later, the Ghostwriter Slider and Soul Checker).

**Supabase project:** `wqdbvjxsxcjwifnfgkjf`

## What's included (Step 1)

- Supabase schema: `stories` + `characters` with Row Level Security
- Auth (email/password)
- Dashboard to create and open stories
- Character Bible with structured profiles (name, role, age, appearance, flaw, motivation)
- Smart Codex Editor — character names underline and open a hover card from the bible

## Quick start

### 1. Get your Supabase API keys

In [your project dashboard](https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/settings/api):

1. Copy **Project URL** → `https://wqdbvjxsxcjwifnfgkjf.supabase.co`
2. Copy **anon / publishable key**

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://wqdbvjxsxcjwifnfgkjf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### 3. Apply the database schema

**Option A — SQL Editor (easiest)**

1. Open [SQL Editor](https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/sql/new)
2. Paste the contents of `supabase/migrations/20250606120000_initial_schema.sql`
3. Run

**Option B — Script**

```bash
# From Dashboard → Database → Connection string (URI)
SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@..." npm run db:apply
```

### 4. Enable email auth

In [Authentication → Providers](https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/auth/providers), ensure **Email** is enabled.

For local dev, you may want to disable email confirmation under Authentication → Settings.

### 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, create a story, add characters, then switch to the Smart Codex Editor tab.

## Architecture

```
Story Bible (characters table)
        │
        │ automatic inject
        ▼
Smart Codex Editor (name detection + hover cards)
        │
        │ Step 2 & 3 (planned)
        ▼
Ghostwriter Slider + Soul Checker
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:apply` | Apply schema via Postgres URI |
