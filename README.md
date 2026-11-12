# Verity — Your Interests. Your Feed. Your Control.

Verity is an Instagram-inspired responsible social media platform built with **React + JavaScript + Tailwind CSS (Vite)** and **FastAPI + Python + SQLAlchemy + Alembic** supporting **PostgreSQL** (with automatic local SQLite fallback for zero-config startup) and **FFmpeg** video stitching.

---

## 1. Key Implemented Features

- **Unified Application with Kids Mode Transformation**:
  - One shared application that transforms completely into a child-safe interface (`Kids Mode`) via toggle (preview for adults/teens) or mandatory enforcement for child accounts (`age < 13`).
  - Backend enforces child restrictions independently of the UI: child accounts cannot disable Kids Mode, cannot select non-permitted interests (only **Learning** and **Art**), and have mandatory 30-minute daily screen-time limits.
- **Interest System & Balanced Discovery vs. Strict Focus Modes**:
  - 7 primary interests: Learning, Sports, Art, Technology, Entertainment, Personal Stories, and Social Causes.
  - **Focus Mode OFF**: Balanced discovery feed (~70% matching selected interests + ~30% controlled cross-interest discovery) with transparent *"Why am I seeing this?"* explanations.
  - **Focus Mode ON**: Strict filtering (Study, Casual, Creative, Technology, Sports, Kids, and user-created custom modes) showing only matching posts and Reels.
- **Dedicated Reels & Stories**:
  - Vertical Reels player with play/pause, mute/unmute, likes, saves, follow, AI labels, and Focus Mode / Kids Mode compliance.
  - Horizontally scrolling Stories tray with live badges, story rings, and full-screen Story Viewer.
- **Screen-Time Management & Alerts**:
  - Periodic 60-second heartbeat tracking usage against daily limits (60m default for adults, 30m mandatory for children).
  - Real-time break reminders and non-dismissible child lock screen (with Guardian PIN `1234` and demo `+10m` / `+20m` / `0m` controls).
- **Content Creation, Communities & Collaborative Video Stitch Studio**:
  - Create & Share modal for Photo, Video, and Text posts with file uploads, hashtag pills, audience controls, and AI-content disclosure.
  - Topic Communities (`/c/technology`, `/c/art`, `/c/learning`) with join/leave and community feeds.
  - Collaborative Stitch Studio allowing multi-user clip submissions, explicit consent recording, clip approval, and **FFmpeg** video stitching.
- **Guardian Controls & Moderation Dashboard**:
  - Guardian dashboard to link child accounts, set screen budgets, toggle DMs, and trigger emergency account pause.
  - Role-protected Moderation Dashboard with Flagged Posts, User Reports, Bot Signals, Bullying Patterns, and Audit Logs.

---

## 2. Project Structure

```text
verity/
├── backend/
│   ├── alembic/                  # Alembic migrations
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py               # FastAPI app, CORS, static /uploads, routers
│   │   ├── config.py             # Environment & database configuration
│   │   ├── database.py           # SQLAlchemy engine & session
│   │   ├── models.py             # 22+ relational models
│   │   ├── schemas.py            # Pydantic request/response schemas
│   │   ├── security.py           # Bcrypt hashing, JWT auth, age & role guards
│   │   ├── seed_data.py          # Initial demo users, posts, reels, communities
│   │   ├── routers/              # API v1 endpoints
│   │   └── services/             # Feed discovery, AI safety filter, FFmpeg stitcher
│   ├── tests/
│   │   └── test_endpoints_direct.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/           # Layout, Feed, Reels, Create, Common overlays
│   │   ├── context/              # AuthContext, FocusModeContext, ScreenTimeContext
│   │   ├── pages/                # Home, Explore, Reels, Interests, Focus, Stitch, etc.
│   │   ├── services/api.js       # Fetch API client
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js            # Proxies /api and /uploads to backend :8000
└── docker-compose.yml            # PostgreSQL 16 & Redis 7 services
```

---

## 3. Running Locally (Windows PowerShell)

### Start the Backend (Terminal 1)
```powershell
cd "c:\Users\Giri\Desktop\major project\verity\backend"
& "C:\Users\Giri\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
The API will be available at `http://127.0.0.1:8000` (Swagger docs at `http://127.0.0.1:8000/docs`).

### Start the Frontend (Terminal 2)
```powershell
cd "c:\Users\Giri\Desktop\major project\verity\frontend"
npm run dev
```
Open `http://localhost:5173` in your browser. Vite automatically proxies `/api` and `/uploads` requests to `http://127.0.0.1:8000`.

---

## 4. Configuring PostgreSQL

By default, if `DATABASE_URL` is not set, the backend falls back to `sqlite:///./verity.db` so it runs out of the box. To use **PostgreSQL 16**:

1. Start PostgreSQL (e.g. via Docker):
   ```powershell
   docker compose up -d postgres
   ```
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://verity:verity_password@localhost:5432/verity_db
   ```
3. Run Alembic migrations:
   ```powershell
   cd backend
   & "C:\Users\Giri\AppData\Local\Programs\Python\Python311\python.exe" -m alembic upgrade head
   ```
4. Start the FastAPI server; `seed_database` automatically populates initial data if empty.

---

## 5. Testing & Demo Accounts

### Automated Backend Tests
```powershell
cd "c:\Users\Giri\Desktop\major project\verity\backend"
& "C:\Users\Giri\AppData\Local\Programs\Python\Python311\python.exe" -m pytest tests/test_endpoints_direct.py -v
```

### 1-Click Demo Logins (Password: `password123`)
- **Mila Anderson** (`mila.creates`) — Adult Creator
- **Giri** (`giri`) — Adult / Guardian of Sammy / Admin
- **Alex Chen** (`alex_mod`) — Trust & Safety Moderator
- **Sammy** (`sammy_kid`) — Child Account (age 9, locked to Kids Mode, 30m limit)

