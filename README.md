# Customer Review Intelligence & AI Rating System

An end-to-end review analytics platform for the Amazon Fine Food Reviews dataset and customer-review uploads. It uses transparent, local NLP heuristics by default so the product works without paid APIs; the service layer can later be extended with scikit-learn or transformer models.

## What it does

- Validates and imports CSV review datasets in background jobs.
- Detects sentiment, emotion, product aspects, credibility signals and duplicate reviews.
- Calculates explainable product scores from rating, sentiment, credibility, quality and helpfulness.
- Serves analytics, search, comparison, review drill-down and evidence-grounded assistant responses.
- Provides a React dashboard with live charts and filters.

## Quick start

1. Copy `.env.example` to `.env`.
2. `docker compose up --build`
3. Open `http://localhost:5173`; API docs are at `http://localhost:8000/docs`.

### Local development

Backend (Python 3.11+):

```sh
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/uvicorn app.main:app --reload
```

Frontend (Node 20+):

```sh
cd frontend
npm install
npm run dev
```

Run backend tests with `cd backend && pytest`. The uploader accepts either a regular CSV or the bundled `data/raw/archive.zip` (it automatically finds `Reviews.csv`).

## Architecture

`frontend` is a Vite React/TypeScript SPA. `backend` is FastAPI plus SQLAlchemy. SQLite is the default development database; set `DATABASE_URL` to PostgreSQL in production. Import jobs run in FastAPI background tasks, while the `Job` model/API exposes progress. Redis/Celery can replace this runner for multi-worker production deployments.

## Environment

See `.env.example`. Never commit a production database URL or credentials.
