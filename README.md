# CheckMate AI ♟️⚡
### Interactive Chess Match Analysis & Pedagogical AI Coaching Platform

[![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple?logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-teal?logo=tailwindcss)](https://tailwindcss.com/)
[![Stockfish WASM](https://img.shields.io/badge/Stockfish-19_NNUE_WASM-orange?logo=webassembly)](https://stockfishchess.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-gray.svg)](LICENSE)

**CheckMate AI** is a next-generation chess analysis and pedagogical platform that bridges the comprehension gap between raw, opaque computer engine calculations and human chess intuition. 

By executing **Stockfish 19 locally inside the user's browser via multi-threaded WebAssembly (WASM)**, CheckMate AI slashes cloud compute expenses by over 95% while delivering instant game review, move-by-move quality classifications, conversational Grandmaster AI coaching, interactive blunder retraining workouts, and personalized player profiles.

---

## 🌟 Key Features

### 1. ⚡ Zero-Server Client Stockfish 19 Engine (WASM + SIMD)
- **100% Client-Side Computation**: Multi-threaded Stockfish 19 NNUE running directly inside dedicated browser `Web Workers`.
- **Live Visual Telemetry**: Vertical dynamic evaluation bar, live Centipawn/Mate scores, best move arrows, Multi-PV alternative variations, calculation depth, and real-time nodes-per-second (NPS) telemetry.
- **Cost Elimination**: No cloud GPU/CPU server bottlenecks, queue delays, or subscription paywalls.

### 2. 🎯 1-Click Game Sync & Ingestion
- **Public REST Ingestion**: 1-click fetch from **Chess.com** and **Lichess** profiles by username without requiring private user API tokens.
- **PGN & FEN Parser**: Instant paste support with timestamps and metadata parsing.
- **Curated Preloaded Matches**: Immediate zero-friction demo games featuring typical club player blunders and historical master matches.

### 3. 📊 Deep Game Review & $\Delta P_{win}$ Classification
- **Mathematical Win-Probability Model**:
  $$P_{win} = \frac{100}{1 + 10^{-cp / 400}}$$
- **Categorization Badges**: Evaluates each ply by delta win-probability ($\Delta P_{win}$) into *Brilliant (!!), Great (!), Best ($\star$), Excellent, Good, Book (📖), Inaccuracy (?!), Mistake (?), Blunder (??), and Missed Win*.
- **Interactive Advantages Graph**: Recharts evaluation flow curve with clickable plies and mistake markers.
- **ECO Opening Book Recognition**: Dynamic detection of opening family and ECO codes via `ecoBook.ts`.

### 4. 🧠 Conversational Grandmaster AI Coach ("GM Alex")
- **Dual-Mode AI Engine**: Powered by **Google Gemini LLM** paired with an autonomous **Grandmaster Pedagogy Heuristic Engine** for 100% offline fallback uptime.
- **"Ask the Coach" Live Chat**: Interactive drawer next to the board with dynamic contextual prompt chips (e.g. *"Why is my move a blunder?"*, *"What was Black's tactical idea?"*).
- **Tactical Intent Reconstruction**: Identifies what threats players believed they were setting up before blundering.

### 5. 🏋️ "Learn from Your Mistakes" Interactive Puzzle Retrainer
- **Automatic Blunder Extraction**: Isolates key mistakes from analyzed games into dynamic tactical puzzles.
- **Socratic 3-Tier Hint System**:
  - **Level 1**: Highlights which piece to move.
  - **Level 2**: Explains the underlying tactical motif (fork, pin, skewer, back-rank weakness).
  - **Level 3**: Reveals the winning engine move continuation.
- **Celebratory Feedback**: Confetti celebrations, custom move sound effects, and mastery tracking.

### 6. 👤 Player Profile & Account System
- **Player Rating Tracker**: Track estimated Elo rating and customized user profile.
- **Linked Accounts**: Save Chess.com and Lichess handles with persistent `localStorage` session state.
- **Guest Mode**: Full functionality available immediately without mandatory sign-ups.

---

## 🏛️ System Architecture

```
CheckMateAI/
├── client/                     # Vite + React 19 + TypeScript + Tailwind CSS
│   ├── public/
│   │   └── stockfish/          # Stockfish 19 NNUE WASM binaries & Web Worker
│   ├── src/
│   │   ├── analyzer/           # Win% conversions, ECO book, & tactical motifs
│   │   ├── components/
│   │   │   ├── analysis/       # EvalGraph, MatchReportView, GameReviewPanel, MoveTable
│   │   │   ├── auth/           # AuthModal & Player Profile
│   │   │   ├── board/          # InteractiveBoard, EvalBar, EngineHUD, CapturedPieces
│   │   │   ├── coach/          # CoachChatDrawer ("Ask the Coach")
│   │   │   ├── importer/       # PlatformSyncModal (Chess.com / Lichess) & PGNModal
│   │   │   ├── layout/         # Navbar, WorkflowStepper, WelcomeLaunchpad
│   │   │   └── puzzles/        # MistakePuzzlePlayer (Blunder workout trainer)
│   │   ├── engine/             # StockfishEngineController & Web Worker wrapper
│   │   └── services/           # coachApi client & chessPlatforms scraper
│   └── vite.config.ts          # COOP / COEP multi-threaded WASM header configuration
│
└── server/                     # Node.js + Express + TypeScript
    ├── src/
    │   ├── controllers/        # Coach chat and explanation controllers
    │   ├── routes/             # REST endpoints (/api/coach)
    │   └── services/           # Gemini AI SDK & Grandmaster Pedagogy Heuristics
    └── package.json
```

---

## 🚀 Quick Start & Local Execution

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**

### 1. Clone the Repository
```bash
git clone https://github.com/SaadVakharia/CheckMateAI.git
cd CheckMateAI
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install client & server dependencies
npm --prefix client install
npm --prefix server install
```

### 3. Run Locally

#### Option A: Run Full Stack (Frontend + AI Coach Backend)
Open two terminal windows:

**Terminal 1 (Frontend UI + Stockfish WASM):**
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

**Terminal 2 (Backend AI Coach API):**
```bash
npm run server
```
Server runs on **`http://localhost:3001`**.

#### Option B: Standalone Zero-Server Mode
Because CheckMate AI compiles Stockfish 19 directly to client WebAssembly, you can run the entire platform **without the backend server running**:
```bash
npm run dev
```
The application will automatically use the built-in **Grandmaster Alex Heuristic Pedagogy Engine** for instant explanations and puzzle hints.

> [!TIP]
> **Windows PowerShell Execution Policy:**
> If you encounter `npm.ps1 cannot be loaded` in PowerShell, run:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```
> Or invoke via CMD:
> ```cmd
> cmd.exe /c "npm run dev"
> ```

---

## ⚙️ Environment Variables (Optional)

In `server/.env`:
```env
PORT=3001
GEMINI_API_KEY=your_google_gemini_api_key_here
```
*(If omitted, the backend seamlessly falls back to the deterministic Grandmaster Heuristics engine).*

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript 5.7, Vite 6 | High-speed reactive UI, strict type safety |
| **Styling** | Tailwind CSS 4, Lucide Icons | Responsive luxury dark-slate theme, smooth transitions |
| **Engine** | Stockfish 19 NNUE (WebAssembly) | 100% client-side multi-threaded chess calculation |
| **Chess Logic**| `chess.js`, `react-chessboard` | Legal move validation, FEN/PGN state, interactive board |
| **Visuals** | Recharts, Canvas Confetti | Advantage graphs, rating telemetry, solve animations |
| **Backend** | Express 4, Node.js 18+, `tsx` | Stateless AI orchestration conduit |
| **AI Layer** | Google Gemini 2.5 Flash + Heuristics | Conversational Grandmaster chess pedagogy & Q&A |

---

## 🎓 Academic Credentials

This project was developed as a Final Year Capstone Project in the **Department of Information Technology**, **Atharva College of Engineering (AET's)**, affiliated with the **University of Mumbai** (Academic Year 2026–2027).

- **Project Title**: *CheckMate AI: Interactive Chess Match Analysis & Pedagogical AI Coaching Platform*
- **Project Guide**: **Prof. Ridhi More**
- **Project Team**:
  - **Arham Bukhari** (BEIT-1, Roll No. 09)
  - **Shoaib Munshi** (BEIT-1, Roll No. 69)
  - **Shivansh Singh** (BEIT-2, Roll No. 117)
  - **Saad Vakharia** (BEIT-2, Roll No. 155)

---

## 📄 License

This project is licensed under the **MIT License**. Stockfish is licensed under the **GNU General Public License v3 (GPL v3)**.
