# 🌳 Skill Tree Dashboard

<div align="center">

**Your all-in-one hub for competitive programming and structured learning.**

*Track progress · Run virtual contests · Master AI/ML · Analyze performance*

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![MongoDB](https://img.shields.io/badge/DB-MongoDB-47A248?style=flat-square&logo=mongodb)](https://mongodb.com)
[![Node](https://img.shields.io/badge/Runtime-Node.js-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Python](https://img.shields.io/badge/API-Python%20Flask-3776AB?style=flat-square&logo=python)](https://python.org)

</div>

---

## 📖 Overview

**Skill Tree** is a modern web app that combines:

- **Unified dashboard** — One place for levels, XP, and progress across tools
- **User accounts** — Sign up, login, password reset, and per-user data
- **Virtual contests** — Codeforces-style timed contests with cloud sync
- **AI/ML roadmap** — SKILL TREE 2.0: 75-level Grandmaster AI roadmap with progress tracking
- **Codeforces & A2OJ** — Problem pickers, ladders, and category-wise practice
- **Profile analysis** — Codeforces profile analytics and insights

Everything is built to run on **Vercel** (static + serverless + Python) with **MongoDB** for persistence and optional **Redis** (Upstash).

---

## ✨ Features

| Area | Features |
|------|----------|
| **Auth** | Login, sign up, forgot password, change password, JWT-style sessions |
| **Dashboard** | Level/XP system, global progress bar, search, filters, grid/list view, keyboard shortcuts |
| **SKILL TREE 2.0** | 5 zones, 75 levels, XP & hours estimate, export/import, cloud sync, search, reset progress |
| **Contest** | DIV 1–4 + custom, quick practice, timer, scoring, penalties, pause/resume, MongoDB sync, stats, dark/light theme |
| **Codeforces** | Problem picker and integration |
| **A2OJ** | Ladders and category-wise practice |
| **Analysis** | Codeforces profile analyzer |
| **UX** | Responsive layout, skip links, ARIA, theme support |

---

## 🗂 Project structure

```
SKILL TREE/
├── index.html              # Main dashboard (auth gate + app)
├── app.js                  # Dashboard logic, zones, progress
├── auth-gate.js            # Login, signup, reset, session
├── styles.css              # Global dashboard styles
├── reset-password.html     # Password reset confirmation page
│
├── api/                    # Vercel serverless endpoints
│   ├── auth-login.js
│   ├── auth-signup.js
│   ├── auth-me.js
│   ├── auth-reset-request.js
│   ├── auth-reset-confirm.js
│   ├── auth-change-password.js
│   ├── auth-shared.js
│   ├── progress.js         # User progress (dashboard)
│   ├── contest-data.js     # Contest data proxy
│   └── skilltree2-progress.js  # SKILL TREE 2.0 cloud progress
│
├── skilltree2/             # AI/ML Mastery Roadmap (2.0)
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── contest/                # Virtual contest system
│   ├── index.html
│   ├── script.js
│   └── styles.css
│
├── codeforces/             # Codeforces problem picker
├── A2OJ/                   # A2OJ ladders & categorywise
│   ├── ladders/
│   └── categorywise/
├── analysis/               # Codeforces profile analyzer
│
├── contest_server.py       # Flask API for contests (MongoDB)
├── vercel.json             # Vercel build & routes
├── package.json            # Node deps (MongoDB, Upstash Redis)
├── requirements.txt        # Python deps (Flask, MongoDB)
└── .env.example            # Env template (MongoDB URI, etc.)
```

---

## 🛠 Tech stack

| Layer | Tech |
|-------|------|
| **Frontend** | HTML5, CSS3, vanilla JavaScript |
| **Auth & APIs** | Node (Vercel serverless), JWT/session-style auth |
| **Contest backend** | Python 3, Flask, MongoDB driver |
| **Database** | MongoDB Atlas (e.g. M0 free tier) |
| **Optional** | Upstash Redis (in package.json) |
| **Deploy** | Vercel (static + Node + Python) |

---

## 🚀 Quick start

### Prerequisites

- **Node.js** (for local dev and Vercel CLI)
- **Python 3.8+** (for contest server if run locally)
- **MongoDB Atlas** URI (for auth, progress, contest, SKILL TREE 2.0 sync)

### Local development

```bash
# Clone and enter project
cd "SKILL TREE"

# Install Node dependencies (for API serverless deps)
npm install

# Optional: run contest backend locally
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set MONGODB_URI, DB_NAME=skilltree
python contest_server.py
```

### Run with Vercel (recommended)

```bash
npx vercel dev
```

Then open the URL shown (e.g. `http://localhost:3000`). Configure environment variables in Vercel dashboard (e.g. `MONGODB_URI`, `DB_NAME`) for auth, progress, and contest.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DB_NAME` | Database name (e.g. `skilltree`) |
| (Optional) | Redis/Upstash if used by any API |

See `.env.example` for a template.

---

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| `CONTEST_README.md` | Contest system overview and usage |
| `CONTEST_MONGODB_SETUP.md` | MongoDB setup for contests |
| `EXECUTIVE_SUMMARY.md` | Contest migration summary (localStorage → MongoDB) |
| `VERCEL_DEPLOYMENT.md` | Vercel deployment notes |
| `contest/README.md` | Virtual contest user guide |

---

## 📄 License & status

- **Status:** Production-ready; deployable on Vercel with MongoDB.
- **Original roadmap:** The 75-level Grandmaster AI roadmap (5 zones, boss battles) is implemented in **SKILL TREE 2.0** (`/skilltree2/`). The former `readme.txt` content described that curriculum and is now fully reflected in the app and this README.

---

<div align="center">

**Skill Tree** — *Master your journey.*

</div>
