# CheckMate AI: Master Implementation Plan

A comprehensive, production-grade roadmap for building **CheckMate AI** — an AI-powered chess match analyzer, conversational grandmaster coach, and weakness-targeted training platform.

---

## 1. System Architecture & Tech Stack

```
CheckMateAI/
├── client/                     # Vite + React (TypeScript) + Tailwind CSS
│   ├── public/
│   │   └── stockfish/          # Stockfish WASM binaries & worker scripts
│   ├── src/
│   │   ├── assets/             # Piece sets, sound effects, icons
│   │   ├── components/
│   │   │   ├── board/          # Interactive Board, Eval Bar, Move Arrows, Branching Sandbox
│   │   │   ├── analysis/       # Eval Graph, Move Table, Accuracy Badges, Time Chart
│   │   │   ├── coach/          # AI Coach Panel, "Ask the Coach" Chat, Blunder Explanations
│   │   │   ├── importer/       # Chess.com & Lichess 1-Click Profile & Game Fetcher
│   │   │   ├── puzzles/        # Mistake-to-Puzzle Interactive Player
│   │   │   ├── dashboard/      # Player Analytics, Tilt/Time Insights, Opening Leaks
│   │   │   └── common/         # Modals, Tabs, Buttons, Glassmorphic UI
│   │   ├── engine/             # Stockfish Web Worker controller & job queue
│   │   ├── analyzer/           # Win% conversions, move categorizer, tactical flags, time tracker
│   │   ├── store/              # Zustand state (game, analysis, auth, coach, chat)
│   │   └── services/           # Chess.com/Lichess API & Backend API clients
│   └── vite.config.ts          # COOP/COEP headers for multi-threaded WASM
│
├── server/                     # Node.js + Express (TypeScript / ES Modules)
│   ├── src/
│   │   ├── controllers/        # Auth, Games, Analysis, Puzzles, Analytics, CoachChat
│   │   ├── models/             # User, Game, AnalysisReport, Puzzle schemas
│   │   ├── routes/             # Express REST endpoints
│   │   ├── services/
│   │   │   ├── aiCoach.ts      # LLM Prompting & Conversational Q&A
│   │   │   ├── tacticalTags.ts # Heuristic tactical pattern & intent extraction
│   │   │   └── analytics.ts    # Long-term pattern, opening leak & tilt aggregator
│   │   ├── middleware/         # JWT Auth, rate limiter, error handler
│   │   └── index.ts            # Express server entry point
│   └── package.json
└── README.md
```

### Technology Matrix

| Layer | Primary Tech | Justification |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + TypeScript | Blazing fast HMR, strict type safety for FEN/PGN and engine states |
| **Styling** | Tailwind CSS + Lucide Icons | Custom dark-slate aesthetic, chess-themed tokens, responsive layout |
| **Chess Engine** | Stockfish 16+ WASM (Web Worker) | 100% client-side calculation; eliminates heavy server CPU compute costs |
| **Chess Logic** | `chess.js` + `react-chessboard` | Robust move validation, legal moves, SAN/LAN conversion, FEN/PGN parsing |
| **Game Ingestion**| Chess.com & Lichess Open REST APIs | Instant 1-click sync by username without requiring user API keys |
| **State Management**| Zustand | Lightweight, high-performance state without Redux boilerplate |
| **Data Viz** | Recharts | Evaluation timeline, move time correlation, opening success rates |
| **Backend** | Express + Node.js (TypeScript) | High-throughput asynchronous API layer |
| **Database** | MongoDB + Mongoose | Flexible JSON schema for multi-ply game histories and move evaluations |
| **AI Layer** | LLM API (Gemini / Anthropic / OpenAI) | Formatted JSON prompt $\to$ natural language chess pedagogy & interactive chat |

---

## 2. Phased Execution Roadmap

### Phase 1: Interactive Board, Playground & 1-Click Game Importer
**Objective:** Build a responsive, fully featured interactive chess board with legal validation, sound effects, PGN/FEN management, and instant 1-click import from Chess.com and Lichess.

- **Tasks:**
  1. Scaffold frontend with `vite` (React + TypeScript) and configure Tailwind CSS with a luxury dark theme.
  2. Implement board component using `react-chessboard` wired to `chess.js`:
     - Drag-and-drop & click-to-move with legal target highlights.
     - Move sound effects (move, capture, check, castle, game end).
     - Captured pieces visualizer with dynamic material balance counter ($\Delta$ pawns).
     - Move navigation controls (first, previous, next, last) and keyboard arrow support.
     - Board flip and FEN/PGN manual import/export.
  3. **1-Click Chess.com & Lichess Game Importer:**
     - Connect to `https://api.chess.com/pub/player/{username}/games` and `https://explorer.lichess.ovh/`.
     - Fetch user profile, avatar, rating, and list of recent matches (Blitz, Rapid, Bullet).
     - One-click load: Selecting a game instantly parses the PGN with timestamps into the board.

---

### Phase 2: Stockfish WASM Web Worker & Live Evaluation `[COMPLETED]`
**Objective:** Integrate Stockfish 19 via a dedicated Web Worker for real-time calculation without freezing the UI.

- **Tasks:**
  1. [x] Setup Stockfish 19 WASM binaries inside `client/public/stockfish/`.
  2. [x] Configure worker URL with hash configuration for cross-origin WASM execution.
  3. [x] Build `StockfishEngineController`:
     - UCI protocol bridge (`uci`, `isready`, `ucinewgame`, `position fen`, `go depth X`, `stop`).
     - MultiPV support (1, 2, or 3 evaluation lines with full principal variation).
     - Real-time parsing of `depth`, `score cp`, `score mate`, `pv`, `nodes`, and speed (`nps`).
     - Cancellation of stale searches upon rapid user navigation.
  4. [x] Build Visual Evaluation Components:
     - Vertical **Eval Bar** with smooth CSS height transitions.
     - Centipawn indicator (e.g., `+1.4` or `M3`).
     - Dynamic **Best Move Arrow** rendered on top of `react-chessboard` (primary in emerald, secondary lines in cyan/amber).
     - Engine depth, nodes, and calculation speed telemetry HUD (`EngineHUD.tsx`).

---

### Phase 3: Automated Game Review & Move Classification Pipeline `[COMPLETED]`
**Objective:** Provide a full-game review experience processing an entire PGN move-by-move with Stockfish.

- **Mathematical Model for Move Classification:**
  - Convert raw Centipawns ($cp$) to **Winning Probability ($P_{win}$)**:
    $$P_{win} = \frac{100}{1 + 10^{-cp / 400}}$$
  - Calculate **$\Delta P_{win}$** between the position before the move and after the move (from the moving player's perspective).
  - Classification thresholds:
    - **Brilliant (!!) / Great (!)**: Only move that maintains advantage in a difficult position, or a sound sacrifice.
    - **Best Move ($\star$)**: $\Delta P_{win} \ge -1\%$ (matches engine top choice).
    - **Excellent**: $-1\% > \Delta P_{win} \ge -3\%$.
    - **Good**: $-3\% > \Delta P_{win} \ge -7\%$.
    - **Book (📖)**: Standard master opening theory detected via ECO database (`ecoBook.ts`).
    - **Inaccuracy (?!)**: $-7\% > \Delta P_{win} \ge -15\%$.
    - **Mistake (?)**: $-15\% > \Delta P_{win} \ge -25\%$.
    - **Blunder (??)**: $\Delta P_{win} < -25\%$.
    - **Missed Win**: Player had a winning advantage ($P_{win} > 80\%$) and dropped to equal or losing.
- **Tasks:**
  1. [x] Build `FullGameReviewer` (`scanFullGame` in `stockfishWorker.ts`):
     - Sequentially feeds each move of a PGN to Stockfish at customizable depth (10, 14, 18).
     - Records best move (UCI and SAN), centipawns before/after, win% delta, and continuation line.
     - Real-time progress bar with ply counter and cancel/abort button.
     - Average Centipawn Loss (ACPL) for White & Black.
     - Player accuracy percentage (0-100%) and estimated performance rating.
  2. [x] Build **Evaluation Graph** using Recharts:
     - Area chart showing the flow of advantage from move 1 to the end.
     - Clickable data points to jump directly to any ply on the board.
     - Color-coded mistake dots on the graph.
  3. [x] Build **Move Review Table & Game Review Panel**:
     - Interactive move list displaying colored badges for each move classification.
     - ECO Opening Theory Banner (`ecoBook.ts`) with opening name and ECO code.
     - Critical blunders quick-jump cards.

---

### Phase 4: AI Coach, Intent Reconstruction & "Ask the Coach" Q&A `[COMPLETED]`
**Objective:** Convert technical numbers into actionable, friendly, master-level explanations, reconstruct human intent, and enable live conversational Q&A on any board position.

- **Data Flow & Tactical Feature Extractor:**
  $$\text{Engine Data} \xrightarrow{\text{Extract}} \text{Tactics \& Intent} \xrightarrow{\text{Format}} \text{LLM Prompt} \xrightarrow{\text{Generate}} \text{Coach Commentary}$$
  - Detects tactical motifs: Hanging pieces, Forks, Pins, Skewers, Back-rank weaknesses, Overloaded defenders.
  - **Human Intent Reconstruction**: Identifies what threat the player *believed* they were creating when they blundered.
- **Tasks:**
  1. [x] Set up Express (TypeScript) backend in `server/` with AI Coach service (Google Gemini API + Grandmaster Heuristics engine fallback).
  2. [x] **"Ask the Coach" Interactive Conversational Q&A**:
     - Embedded chat drawer next to the board (`CoachChatDrawer.tsx`).
     - Player can ask: *"Why can't I play Bxh7+ here?"* or *"What was Black's idea?"*
     - Dynamic suggestion chips and real-time Grandmaster Alex pedagogical responses.
  3. [x] **Interactive Move Explanations**:
     - Auto-fetch tactical explanations upon selecting any move in the match timeline (`/api/coach/explain-move`).
  4. [x] **Post-Game Master Narrative**:
     - High-level review highlighting opening phase, decisive turning point, and key training takeaway (`/api/coach/game-summary`).

---

### Phase 5: Personalized Puzzle Generator ("Learn from Your Mistakes")
**Objective:** Transform every blunder and missed win into an interactive training puzzle.

- **Tasks:**
  1. Automated Puzzle Extractor:
     - Scans analyzed games for positions where the user made a Mistake or Blunder.
     - Stores FEN at $(N-1)$, the user's blunder move, the best move, and the engine continuation lines.
  2. Interactive Puzzle Solver UI:
     - "Retry Your Mistakes" workout mode.
     - Board sets up at the blunder moment: "You played *Qe7* here. Find the winning continuation instead!"
     - Move validation: Checks if the user plays the engine's best move.
     - Progressive hints: Hint 1 (piece), Hint 2 (tactical motif), Hint 3 (the move).
     - Mastery status tracking.

---

### Phase 6: Player Profile, Opening Leaks & Psychological/Tilt Analytics
**Objective:** Track stats across dozens/hundreds of games to diagnose recurring habits, opening flaws, and psychological blindspots.

- **Metrics & Analytics Pipeline:**
  1. **Move-Time & Psychological Tilt Detection:**
     - Extract `[%emt]` move timestamps from PGN.
     - Plot move time vs. evaluation change.
     - Detect **Tilt Spirals**: Blunders made after rushing moves (< 3 seconds) right after losing material.
     - Detect **Time-Trouble Panic**: Correlate error frequency with remaining clock time.
  2. **Opening Repertoire Leak Detector:**
     - Categorize user games by ECO code / opening family.
     - Pinpoint the exact move number where accuracy collapses (e.g. *"In the Sicilian Najdorf, you consistently blunder on move 7 by playing Nbd7 instead of e5"*).
  3. **Tactical Blindspot Matrix & ACL Tracking:**
     - Breakdown of blunders by tactical motif (pins, knight forks, hanging pieces).
     - Average Centipawn Loss (ACL) trend over time.
     - Phase performance (Opening vs Middlegame vs Endgame).

---

### Phase 7: Polish, Authentication & Production Deployment
**Objective:** Deliver a responsive, state-of-the-art web application ready for live users.

- **Tasks:**
  1. Authentication module (Register, Login, JWT tokens, bcrypt password hashing, guest mode).
  2. UI Polish:
     - Premium dark theme (zinc, slate, emerald highlights).
     - Responsive mobile layout for touch screens.
     - Exportable Match Report Card (shareable summary image of accuracy and key moments).
  3. Preloaded sample games (GM blunders, typical club player matches) for immediate demoing.
  4. Deployment configuration:
     - Client build on Vercel / Netlify with proper COOP/COEP HTTP headers.
     - Express API deployed on Render / Railway with MongoDB Atlas integration.

---

## 3. Milestones & Work Order

| Milestone | Deliverables | Target |
| :--- | :--- | :--- |
| **M1: Client Foundation & Importer** | React + Vite + TS + Tailwind + Chessboard + Legal Logic + Chess.com/Lichess 1-Click Sync | **NOW** |
| **M2: Engine & Evaluation Bar** | Stockfish WASM Web Worker + Eval Bar + Dynamic Move Arrows + Real-time Telemetry | Next |
| **M3: Full Game Review & Charts** | Automated PGN analysis pipeline + $\Delta P_{win}$ classifier + Recharts Eval Graph | Next |
| **M4: AI Coach & "Ask the Coach"** | Express API + Tactical motif extractor + Conversational board Q&A + Intent explanation | Next |
| **M5: Puzzles & Mistake Workout** | Blunder-to-puzzle practice player + Progressive hint system | Next |
| **M6: Tilt, Opening Leaks & Profile** | Move-time tilt analyzer + Opening repertoire leak detector + Long-term player dashboard | Next |
| **M7: Auth, Polish & Export** | User auth + Exportable report card + Responsive finish + Production readiness | Final |
