# ⚡ ContextForge — AI Document-to-Markdown & Token-Efficiency Studio

**ContextForge** is a high-performance document normalization and token-optimization engine designed for LLM workflows, RAG architectures, and developer context management.

It ingests multi-format documents (PDF, DOCX, XLSX, PPTX, CSV, TXT, Images), converts them using Microsoft **MarkItDown**, cleans and normalizes structures via an **AI layer**, and computes exact token savings and **AI Readiness Scores** using **tiktoken**.

---

## 📸 Key Features

- 📂 **Multi-Format Ingestion**: Convert PDF, DOCX, XLSX, PPTX, CSV, HTML, TXT, and Scans/Images with MarkItDown & specialized fallback parsers.
- 🧹 **Modular AI Normalization**: Fixes OCR noise, repairs broken Markdown tables, aligns heading hierarchy (`#`, `##`, `###`), strips repeating headers/footers, and formats code blocks. Supports OpenAI (GPT-4o), Google Gemini 1.5, and a zero-dependency high-speed Deterministic Heuristic Engine.
- ⚡ **Tiktoken Precision & AI Readiness Score (0–100)**: Exact token accounting (`cl100k_base`), token reduction %, context window footprint (8K, 32K, 128K, 1M), and projected dollar cost savings.
- 🪟 **Cinematic Split-Screen Workspace**:
  - Live side-by-side editable Markdown source with line numbers & live character/token counter.
  - Live GFM-rendered preview with syntax-highlighted code copy buttons and tables.
  - Interactive Diff Viewer highlighting additions and removed noise.
- 📦 **Export Hub**: 1-click Copy Markdown, Download `.md`, and generate styled PDF reports.
- 📜 **Conversion History**: Persistent history stored in PostgreSQL (or SQLite local fallback).
- 🚀 **Full Docker & Local Development Setup**: Docker Compose with Django REST, Celery, Redis, PostgreSQL, and React Nginx frontend.

---

## 🏛️ System Architecture

```
React (Vite + TS + Tailwind) 
   │
   ▼
Django REST API (/api/documents/)
   │
   ├──▶ Celery Worker + Redis Queue (Async Conversion)
   │       │
   │       ├──▶ Microsoft MarkItDown Engine (Raw Conversion)
   │       ├──▶ AI Normalizer (OpenAI / Gemini / Heuristics)
   │       └──▶ Tiktoken Analyzer (Tokens & 4-Pillar Readiness Score)
   │
   └──▶ PostgreSQL (Conversion History & Document Metrics)
```

---

## 🚀 Quick Start with Docker Compose

Ensure Docker is installed and running:

```bash
# 1. Clone or navigate to the project directory
cd "d:\WORK\SEM 7\7. PROJECT"

# 2. Copy environment file
cp .env.example .env

# 3. Launch all containers (PostgreSQL, Redis, Backend, Celery Worker, Frontend)
docker-compose up --build
```

Access the services:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Django REST API**: [http://localhost:8000/api/](http://localhost:8000/api/)
- **API Health Check**: [http://localhost:8000/api/health/](http://localhost:8000/api/health/)

---

## 🛠️ Local Manual Development Setup

If you wish to run the backend and frontend locally without Docker:

### 1. Backend Setup (Python 3.12+)

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (defaults to SQLite if Postgres is not configured)
python manage.py makemigrations documents
python manage.py migrate

# (Optional) Run tests
pytest

# Start Django Development Server
python manage.py runserver 8000
```

*(Optional: In a separate terminal, start Celery worker if Redis is running):*
```bash
celery -A contextforge worker -l info
```
*(Note: If Celery/Redis is not running, the system will automatically process tasks in synchronous mode).*

---

### 2. Frontend Setup (Node.js 20+)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Environment Variables (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DEBUG` | Django debug mode | `True` |
| `SECRET_KEY` | Django secret key | `django-insecure-...` |
| `POSTGRES_DB` | PostgreSQL database name | `contextforge` (or SQLite fallback) |
| `CELERY_BROKER_URL` | Redis broker URL | `redis://localhost:6379/0` |
| `OPENAI_API_KEY` | (Optional) OpenAI API Key for GPT-4o cleanup | `""` |
| `GEMINI_API_KEY` | (Optional) Google Gemini API Key | `""` |
| `AI_DEFAULT_PROVIDER` | Default AI normalizer (`auto`, `openai`, `gemini`, `heuristic`) | `auto` |

---

## 🧪 API Endpoints

- `POST /api/documents/upload/`: Multipart upload of document. Returns 201 with document payload.
- `GET /api/documents/`: List all converted documents with metrics.
- `GET /api/documents/<uuid:id>/`: Fetch detailed document data, Markdown, and AI Readiness breakdown.
- `PATCH /api/documents/<uuid:id>/`: Live-edit Markdown and recalculate token metrics.
- `POST /api/documents/<uuid:id>/reprocess/`: Reprocess document with custom AI instructions.
- `GET /api/documents/<uuid:id>/export/pdf/`: Download generated formatted PDF.
- `GET /api/documents/<uuid:id>/export/md/`: Download raw or cleaned `.md` file.
- `GET /api/health/`: System health status and active features.

---

## 🎯 AI Readiness Score Breakdown (0–100)

The AI Readiness Score evaluates whether a document is optimal for RAG and LLM context windows:
1. **Structure Score (30%)**: Clear H1/H2/H3 hierarchy, GFM tables, code fences.
2. **Cleanliness Score (30%)**: Elimination of OCR noise, repeating headers, page numbers, and bad control characters.
3. **Token Density Score (25%)**: Ratio of informative alphanumeric text vs boilerplate tokens.
4. **Semantic Clarity Score (15%)**: Balanced line wrapping, list consistency, and sentence boundary integrity.
