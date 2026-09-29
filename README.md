# CheckMate AI ♟️⚡

**CheckMate AI** is a state-of-the-art AI-powered chess match analysis platform and interactive coach. It features 1-click game synchronization from Chess.com and Lichess, client-side Stockfish 19 WebAssembly evaluation, interactive blunder workouts, tactical intent reconstruction, and a Grandmaster AI coach.

![CheckMate AI Logo](client/public/logo.png)

---

## ✨ Features

- **⚡ Client-Side Stockfish 19 Engine**: Full centipawn evaluations, win probabilities, multi-PV alternative lines, and deep game reviews powered directly in your browser via WebAssembly & Web Workers.
- **🎯 1-Click Game Sync**: Instant sync for **Chess.com** and **Lichess** profiles and recent matches, or analyze any custom PGN.
- **📊 Chess.com Style Deep Analysis**: Visual accuracy gauges, centipawn loss graphs, move classification indicators (Brilliant, Great, Best, Excellent, Book, Inaccuracy, Mistake, Miss, Blunder).
- **🧠 Grandmaster AI Coach**: Dual-mode coaching engine (powered by Google Gemini `gemini-1.5-flash` with a built-in Grandmaster Pedagogy Heuristic fallback engine).
- **🏋️ Interactive Blunder Workout**: Practice and find the winning continuation from your own mistakes and blunders in an interactive puzzle trainer.
- **🎨 Responsive Cyber Dark UI**: Built with Tailwind CSS, sound effects, smooth animations, and clean responsive layouts.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/CheckMateAI.git
cd CheckMateAI
```

### 2. Run the Backend API (Port 3001)
```bash
cd server
npm install
npm run dev
```
*(Optional)* Add a Google Gemini API key in `server/.env` if you want AI-generated commentary. If omitted, the server automatically uses the built-in Grandmaster Heuristic Engine.

### 3. Run the Frontend (Port 5173)
```bash
cd ../client
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🌐 Deploy to Vercel

### Option 1: Direct Vercel Git Import (Recommended)
1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Import your `CheckMateAI` GitHub repository.
4. Vercel will automatically detect `vercel.json` and build the client.
   - Alternatively, set **Root Directory** to `client` and Framework Preset to **Vite**.
5. Click **Deploy**!

> **Note**: Stockfish analysis, PGN import, Chess.com/Lichess fetching, and heuristic coaching run 100% in the browser and work immediately on Vercel without requiring a backend server. If you deploy the Node.js backend (e.g. on Render, Railway, or Fly.io), simply set the `VITE_API_URL` environment variable in Vercel to your backend URL.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Canvas Confetti
- **Chess Logic**: Chess.js, React-Chessboard, Stockfish 19 WASM
- **Backend API**: Node.js, Express, TypeScript, tsx, Google Generative AI SDK (`gemini-1.5-flash`)
