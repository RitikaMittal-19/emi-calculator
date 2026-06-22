# EMI Calculator — Shared Workspace

A production-quality EMI (Equated Monthly Installment) calculator built with Next.js, where multiple browser tabs share live calculator state in real time via the native **BroadcastChannel API** — no backend, no polling, no localStorage event hacks.

Change the loan amount in one tab, and every other open tab updates instantly: loan inputs, theme, prepayments, comparison scenarios, and active mode all stay in sync across tabs.

---

## Features

- **EMI Calculator** — loan amount/rate/tenure via paired sliders + number inputs, real-time EMI, total interest, total payable, and a principal-vs-interest donut chart.
- **Amortization Schedule** — full month-by-month breakdown, paginated table (12 rows/page), a yearly-aggregated stacked bar chart view, and automatic break-even month detection.
- **Prepayment Planner** — add multiple one-time lump-sum prepayments, validated against the loan's actual outstanding balance at that month; live interest-saved and tenure-reduced figures.
- **Loan Comparison Mode** — compare up to 3 scenarios side by side, with the cheapest (by total amount payable) automatically highlighted.
- **Sensitivity Analysis Grid** — a 7×7 matrix of EMI values across rate (±1/2/3%) and tenure (±6/12/24 months) deltas, current selection highlighted, with relative cheap/expensive color coding.
- **Real-time cross-tab sync** — every field above, plus theme and active mode, propagates across all open tabs of the app within the same browser, via `BroadcastChannel`. Last-write-wins conflict resolution is applied **per state slice** (not globally), so concurrent edits to unrelated fields in different tabs never clobber each other.
- **Tab presence** — a live "N tabs open" indicator, backed by a 2-second heartbeat and a 6-second staleness timeout.
- **Theme sync** — light/dark mode toggle, synced across tabs.
- **CSV export** — download the full amortization schedule as a spreadsheet-ready CSV.
- **Shareable links** — a "Share" button copies a URL encoding the current loan + prepayments, so opening that link (in this browser or any other) loads the same loan.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| State management | `useReducer` + Context — no external state library |
| Cross-tab sync | Native `BroadcastChannel` API |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |
| Deployment | Vercel (zero-config) |

No backend, no database, no environment variables required. All state is in-memory per browser session — closing every tab resets the calculator to its default loan.

---

## Project Structure

```
emi-calculator/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx                # Main calculator shell (mode switching)
│   ├── providers.tsx           # Client providers: state, theme sync, URL sync
│   ├── error.tsx                # App-level error boundary
│   └── globals.css             # Design tokens (the "Ledger" design system)
├── components/
│   ├── calculator/              # Loan inputs, EMI summary, charts, share button
│   ├── amortization/            # Schedule table, chart, pagination, CSV export
│   ├── prepayment/               # Prepayment planner
│   ├── comparison/               # Comparison mode
│   ├── sensitivity/               # Sensitivity grid
│   ├── presence/                  # Active tabs badge
│   ├── theme/                      # Theme toggle
│   └── ModeTabs.tsx                # Calculator / Compare / Sensitivity switcher
├── lib/
│   ├── calculations/            # Pure EMI/amortization/sensitivity math (no React)
│   ├── state/                    # Reducer, actions, initial state, Context
│   ├── sync/                      # BroadcastChannel transport + sync engine interface
│   └── utils/                      # Currency formatting, CSV export, URL state
├── hooks/                        # useCalculatorState, useBroadcastSync, usePresence, etc.
├── types/                        # Shared TypeScript interfaces
└── __tests__/                    # Mirrors the source tree; 264 tests across 30 files
```

---

## Architecture Notes

**State flows through one place.** A single `useReducer` in `lib/state/reducer.ts` is the entire app's state. Every UI action — moving a slider, adding a prepayment, switching tabs — dispatches a typed action through `useCalculatorState`. There is no other source of truth.

**Sync is a transparent layer on top of dispatch**, not a separate code path. `useBroadcastSync` wraps the reducer's dispatch function: every locally-originated action is also sent over `BroadcastChannel`; every action received from another tab is re-dispatched locally with `origin: "remote"`, through a path that never re-broadcasts it — this is what prevents infinite cross-tab message loops.

**Conflict resolution is last-write-wins, per state slice.** Each of `loanInput`, `theme`, `prepayments`, `comparison`, and `activeMode` has its own timestamp. A remote update only applies if its timestamp is at least as recent as that slice's last-applied timestamp; local updates always apply. This means a user typing in Tab A and a different user toggling dark mode in Tab B, in the same instant, never clobber each other — only genuinely conflicting edits to the *same* field are resolved by timestamp.

**Slider drag events are debounced** before they reach dispatch (120ms), so dragging a slider doesn't flood every other open tab with a broadcast message per pixel of movement — the slider itself still tracks the drag instantly via local component state, only the cross-tab broadcast is throttled.

---

## Local Setup (from scratch)

### Prerequisites
- Node.js 20+ and npm
- A modern browser (Chrome, Firefox, Edge, Safari — all support `BroadcastChannel`)

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To see cross-tab sync in action, open the same URL in a second browser tab and change something in either one.

### 3. Run the test suite

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

### 4. Lint and type-check

```bash
npm run lint
npx tsc --noEmit
```

### 5. Production build

```bash
npm run build
npm run start          # serves the production build locally on :3000
```

---

## Deploying to Vercel

This project requires **zero configuration** to deploy — no environment variables, no build settings beyond the Next.js defaults.

### Option A — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel              # deploys a preview
vercel --prod        # deploys to production
```

### Option B — Vercel Dashboard (recommended for this assignment)

1. Push this repository to GitHub (see below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repository.
3. Vercel auto-detects Next.js — leave all settings on their defaults (Build Command: `next build`, Output Directory: `.next`, Install Command: `npm install`).
4. Click **Deploy**.
5. Once deployed, Vercel gives you a public URL (`https://your-project.vercel.app`). Open it in two tabs to verify live sync works in production, not just locally.

---

## Pushing to GitHub (from scratch)

If this is a brand-new repository:

```bash
cd emi-calculator
git init
git add .
git commit -m "Initial commit: EMI Calculator with Shared Workspace"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

If you're prompted for credentials, GitHub requires a [Personal Access Token](https://github.com/settings/tokens) (classic, with `repo` scope) in place of a password for HTTPS pushes, or set up SSH keys instead.

---

## Production Verification Checklist

After deploying, confirm the following on the **live Vercel URL**, not just localhost:

- [ ] Page loads with no console errors
- [ ] Loan amount/rate/tenure sliders update the EMI figure in real time
- [ ] Opening the same URL in a second tab shows the same loan
- [ ] Changing the loan amount in Tab A updates Tab B within ~1 second
- [ ] Toggling dark mode in one tab toggles it in the other
- [ ] Adding a prepayment in one tab appears in the other tab's planner
- [ ] The "tabs open" badge shows 2 when two tabs are open, and drops to 1 when one is closed
- [ ] Switching to Comparison mode, adding 2+ scenarios, correctly highlights the cheapest
- [ ] Switching to Sensitivity mode renders the 7×7 grid with the current loan highlighted
- [ ] "Export CSV" downloads a valid CSV file that opens correctly in Excel/Sheets
- [ ] "Share" copies a URL; opening that URL in a new tab loads the shared loan
- [ ] The amortization table is usable (not squashed) on a narrow/mobile viewport
- [ ] Tab/Shift+Tab and Enter/Space operate every interactive control without a mouse

---

## Known Limitations (by design, not oversights)

- **No persistence**: state is in-memory only. Closing every tab resets to the default loan. (Explicitly out of scope per the original assignment spec — see "Future Work" below.)
- **No backend**: by design. All sync is peer-to-peer between tabs of the same browser, same origin, via `BroadcastChannel`. It does **not** sync across different browsers or devices — that would require a server.
- A shared link's server-rendered initial paint briefly shows the default loan before the actual shared loan loads client-side (similar to the theme flash on first load) — both are documented trade-offs of having zero backend/persistence layer.

## Future Work

- `localStorage`-based persistence (state survives a full browser restart) — the sync layer was deliberately architected so this can be added without touching the `BroadcastChannel` code path.
- Leader-election among open tabs (one tab becomes authoritative) — the `SyncEngine` interface in `lib/sync/` was designed so this can wrap the existing transport without changing any consumer.
- Multi-currency support, recurring prepayments — explicitly out of scope per the original spec.
