# Soul Writer

A wholesome writer app with **Context Interconnectivity** — character profiles in the Story Bible automatically feed the Smart Codex editor (and later, the Ghostwriter Slider and Soul Checker).

**Supabase project:** `wqdbvjxsxcjwifnfgkjf`

## What's included (Step 1)

- Supabase schema: `stories` + `characters` with Row Level Security
- Auth (email/password)
- Dashboard to create and open stories
- Character Bible with structured profiles (name, role, age, appearance, flaw, motivation)
- Smart Codex Editor — character names underline and open a hover card from the bible
- **Unified 3-panel dashboard** — Navigator (outline, characters, settings) · Writing Canvas · AI Hub
- **Ghostwriter Slider** + **Soul Checker** — Gemini API routes pull character context from Supabase automatically

## Run locally on your Mac (recommended)

This is the original setup — the app runs on **your machine**, and `http://localhost:3001` works directly in your browser. No Cloud Agent, no port forwarding.

```bash
git clone https://github.com/Abhijeet199224/soul_writer.git
cd soul_writer
npm install
cp .env.example .env.local
```

Edit `.env.local` with your Supabase keys (see step 1 below), then:

```bash
npm run local:setup   # optional — verifies .env and database
npm run dev
```

Open **http://localhost:3001** in your browser.

If port 3001 is stuck: `npm run dev:reset`

In Cursor, use a **Local** agent (not Cloud) when developing on your Mac.

---

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
2. Run each migration file in order:
   - `supabase/migrations/20250606120000_initial_schema.sql`
   - `supabase/migrations/20250606200000_story_workspace.sql`

**Option B — Script**

```bash
# From Dashboard → Database → Connection string (URI)
SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@..." npm run db:apply
```

### 4. Disable email confirmation (simple login)

For instant sign-up and sign-in without verification emails:

1. Open [Authentication → Sign In / Providers → Email](https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/auth/providers)
2. Turn **off** **Confirm email**
3. Save

If you get **Invalid email or password** after an earlier signup:

1. **Easiest:** Delete your user in [Authentication → Users](https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/auth/users), then **Sign up** again in the app.
2. **Or terminal fix** (add `SUPABASE_SERVICE_ROLE_KEY` from [API settings](https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/settings/api) to `.env.local`):

```bash
npm run auth:reset -- your@email.com yournewpassword
```

3. **Or SQL:** Run the delete block in `supabase/fix-unconfirmed-users.sql` (replace with your email).

### 5. Enable Gemini (Ghostwriter + Soul Checker)

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add to `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
```

The `/api/ai` route fetches characters from your story in Supabase and injects them into every Gemini prompt — no manual copy-paste.

### 6. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001), sign up, create a story, then use the unified dashboard: Navigator on the left, Writing Canvas in the center, AI Hub on the right.

## Architecture

```
Story Bible (characters table)
        │
        │ automatic inject
        ▼
Smart Codex Editor (name detection + hover cards)
        │
        │ Step 2 & 3
        ▼
Ghostwriter Slider + Soul Checker (Gemini + /api/ai)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:apply` | Apply schema via Postgres URI |
| `npm run setup:check` | Verify Supabase connection + tables |
