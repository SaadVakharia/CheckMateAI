# CheckMate AI: Design System & Styling Rules

These rules define the design tokens, visual hierarchy, typography, and color systems for **CheckMate AI**. Every UI component must adhere strictly to these principles across both **Light Mode** and **Dark Mode**.

---

## 1. Typography Hierarchy

- **UI & Headings**: `Plus Jakarta Sans`, sans-serif (Weights: 500, 600, 700, 800)
  - Clean geometric humanist sans-serif with high legibility on dark and light surfaces.
- **Chess Notation & Numbers**: `JetBrains Mono`, monospace (Weights: 400, 600, 700)
  - Used for: SAN notations (e.g. `1. e4 e5`), FEN strings, evaluation values (`+1.4`, `M3`), accuracy percentages, and move numbers.

---

## 2. Color System & Semantic Tokens

CheckMate AI uses a tailored **Cyber Blue, Ice Platinum & Midnight Obsidian** palette derived directly from the official Cyber Knight logo emblem. Avoid raw generic primaries (`#ff0000`, `#0000ff`).

### A. Dark Mode (Default)
- **Background Main**: `#070c18` (Deep Cyber Obsidian / Midnight Navy)
- **Background Surface / Cards**: `#0d172a` / `#132038` (Rich cyber slate-card)
- **Borders & Dividers**: `#1e2c45` (Subtle cyber boundary line)
- **Text Primary**: `#f8fafc` (Off-white / Ice Platinum, 98% opacity)
- **Text Secondary**: `#94a3b8` (Slate-400)
- **Text Muted**: `#64748b` (Slate-500)
- **Primary Brand Accent**: `#0284c7` (Sky-600) / `#2563eb` (Blue-600) with `#38bdf8` (Sky-400 / Cyan glow)
- **Active Glows & Indicators**: `rgba(56, 189, 248, 0.4)` (Neon Cyber Blue glow)
- **Chessboard Dark Squares**: `#1e324d` (Deep cyber slate-navy from knight base)
- **Chessboard Light Squares**: `#d8e4f2` (Sculpted ice silver from knight highlights)

### B. Light Mode
- **Background Main**: `#f1f6fd` (Crisp ice-porcelain)
- **Background Surface / Cards**: `#ffffff` (Pure white cards)
- **Borders & Dividers**: `#dbe6f4` (Crisp ice-border)
- **Text Primary**: `#091428` (Deep navy-slate)
- **Text Secondary**: `#475569` (Slate-600)
- **Text Muted**: `#94a3b8` (Slate-400)
- **Primary Brand Accent**: `#0284c7` (Sky-600) with `#0369a1` (Sky-700) hover
- **Chessboard Dark Squares**: `#3e628d` (Modern cobalt slate)
- **Chessboard Light Squares**: `#e8f1fa` (Ice paper white)

---

## 3. Move Classification Badges (Universal Across Modes)

Every classification token maintains strong contrast and standardized chess iconography in both modes:

| Category | Token Symbol | Dark Theme (Bg / Border / Text) | Light Theme (Bg / Border / Text) |
| :--- | :---: | :--- | :--- |
| **Brilliant** | `!!` | `bg-cyan-500/20 border-cyan-500/40 text-cyan-400` | `bg-cyan-50 border-cyan-200 text-cyan-700` |
| **Great** | `!` | `bg-blue-500/20 border-blue-500/40 text-blue-400` | `bg-blue-50 border-blue-200 text-blue-700` |
| **Best** | `★` | `bg-emerald-500/20 border-emerald-500/40 text-emerald-400` | `bg-emerald-50 border-emerald-200 text-emerald-700` |
| **Excellent** | `✓` | `bg-sky-500/15 border-sky-500/30 text-sky-300` | `bg-sky-50 border-sky-200 text-sky-700` |
| **Good** | `•` | `bg-slate-500/20 border-slate-500/30 text-slate-300` | `bg-slate-100 border-slate-300 text-slate-700` |
| **Inaccuracy** | `?!` | `bg-amber-500/20 border-amber-500/40 text-amber-400` | `bg-amber-50 border-amber-200 text-amber-800` |
| **Mistake** | `?` | `bg-orange-500/20 border-orange-500/40 text-orange-400` | `bg-orange-50 border-orange-200 text-orange-800` |
| **Blunder** | `??` | `bg-red-500/20 border-red-500/40 text-red-400` | `bg-red-50 border-red-200 text-red-700` |
| **Missed Win** | `⊘` | `bg-rose-500/20 border-rose-500/40 text-rose-400` | `bg-rose-50 border-rose-200 text-rose-700` |

---

## 4. Component Rules

1. **Surface Elevation**:
   - Level 0: Main background (`bg-[#070c18]` / `bg-[#f1f6fd]`)
   - Level 1: Panels & Drawers (`bg-[#0d172a]/95` / `bg-white`)
   - Level 2: Cards & Modals (`bg-[#132038]/80` / `bg-slate-50/80`)
2. **Borders**:
   - Always subtle: `border border-slate-800/80 dark:border-slate-800/80 border-slate-200` with subtle cyber blue highlights `focus:border-sky-500`
   - Use rounded corners consistently: `rounded-xl` for cards, `rounded-2xl` for modals and the board.
3. **Buttons & Interactivity**:
   - Primary: Cyber Blue fill (`bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-98 transition`)
   - Secondary / Ghost: Surface fill (`bg-slate-900 dark:bg-slate-900 bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-800 hover:bg-slate-200`)
   - All interactive elements must have smooth transitions (`transition-all duration-150`).
4. **Theme Persistence**:
   - Theme (`light` | `dark`) must be stored in `localStorage` under `checkmate_theme` and sync with the document root class `dark`.
5. **Modular Logo**:
   - The logo must be defined in a standalone `<Logo />` component rendering `/logo.png` with vibrant cyber-blue typography (`Check` + gradient `Mate` + `AI` pill badge).
