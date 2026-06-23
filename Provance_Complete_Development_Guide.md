# VerifAI — Complete Development Guide

> **What this document covers:** Full system architecture, tech stack, FastAPI setup, Supabase integration, stage-by-stage build guide, and a migration path for when you outgrow Supabase. Build this once, build it right.

---

## Part 1 — How the System Works (Big Picture)

Before touching any code, understand how the three pieces talk to each other:

```
User (browser)
    ↓ uploads file
Next.js (frontend)
    ↓ sends file to FastAPI
FastAPI (ML engine — runs on its own server)
    ↓ runs detection
    ↓ writes result to Supabase
Supabase (database + storage + auth)
    ↓ pushes result back to browser in real time
Next.js (shows result to user)
```

**FastAPI does not run inside Supabase.** Supabase cannot run Python ML models. FastAPI is a separate Python server you deploy yourself. Supabase is just where data lives.

---

## Part 2 — Full Tech Stack

### Frontend
- **Next.js 14** — React framework, handles routing and UI
- **TailwindCSS** — styling
- **Supabase JS client** — talks to Supabase directly for auth and real-time updates
- **Uppy.js** — chunked file upload (handles large videos without breaking)

### Backend / ML Engine
- **FastAPI (Python)** — your API server, receives files, runs ML models
- **Celery + Redis** — job queue so scans run in the background
- **PyTorch** — runs the neural network models
- **ONNX Runtime** — speeds up model inference 3-4x
- **OpenCV** — image and video preprocessing
- **NumPy / SciPy** — frequency analysis (FFT)
- **InsightFace** — facial analysis
- **FAISS** — noise fingerprint similarity search

### Database / Storage / Auth
- **Supabase PostgreSQL** — stores users, scans, results, signal breakdown
- **Supabase Auth** — handles login, sessions, API keys
- **Supabase Storage** — stores uploaded files
- **Supabase Realtime** — pushes scan status updates to the browser
- **pgvector extension** (Supabase) — vector similarity for generator fingerprints

### Infrastructure
- **DigitalOcean Droplet** ($20/month) — runs FastAPI in early stages
- **Redis** (DigitalOcean managed or self-hosted) — job queue
- **AWS g4dn.xlarge** — GPU server for ML inference (add in Stage 3+)
- **Docker** — packages your FastAPI app so it runs the same everywhere
- **GitHub Actions** — automated deployment

---

## Part 3 — Project Structure

```
verifai/
├── frontend/                    # Next.js app
│   ├── app/
│   │   ├── page.tsx             # Upload page
│   │   ├── results/[id]/        # Results page
│   │   └── dashboard/           # User dashboard
│   ├── lib/
│   │   └── supabase.ts          # Supabase client
│   └── package.json
│
├── api/                         # FastAPI ML engine
│   ├── main.py                  # FastAPI app entry point
│   ├── routers/
│   │   └── scan.py              # /scan endpoint
│   ├── detection/
│   │   ├── frequency.py         # FFT signal
│   │   ├── classifier.py        # CNN + ViT models
│   │   ├── metadata.py          # EXIF forensics
│   │   ├── noise.py             # Fingerprint matching
│   │   ├── facial.py            # Face analysis
│   │   └── ensemble.py          # Combines all signals
│   ├── workers/
│   │   └── scan_worker.py       # Celery background jobs
│   ├── requirements.txt
│   └── Dockerfile
│
├── supabase/
│   └── migrations/              # Database schema files
│
└── docker-compose.yml           # Runs everything locally
```

---

## Part 4 — Supabase Setup

### Step 1 — Create your Supabase project

Go to supabase.com, create a new project. Save your:
- Project URL
- Anon public key
- Service role key (keep this secret — only used in FastAPI)

### Step 2 — Enable pgvector

In Supabase dashboard → SQL editor, run:

```sql
create extension if not exists vector;
```

### Step 3 — Create the database schema

Run this in the SQL editor:

```sql
-- Users are handled by Supabase Auth automatically

-- Scans table
create table scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  file_hash varchar(64) not null,
  file_name varchar(255),
  file_type varchar(10) not null, -- 'image' or 'video'
  file_size_bytes bigint,
  status varchar(20) default 'queued', -- queued, processing, complete, failed
  verdict varchar(20), -- ai, real, uncertain
  confidence_score decimal(5,2),
  model_attribution varchar(100),
  attribution_confidence decimal(5,2),
  processing_time_ms integer,
  model_version varchar(50),
  storage_path varchar(500),
  is_cached boolean default false,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Signal results (one row per signal per scan)
create table signal_results (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id) on delete cascade,
  signal_name varchar(50), -- frequency, neural, noise, metadata, facial, temporal
  score decimal(5,2),
  triggered boolean,
  weight_applied decimal(4,3),
  detail_json jsonb,
  processing_time_ms integer
);

-- Generator fingerprints
create table generator_fingerprints (
  id uuid primary key default gen_random_uuid(),
  generator_name varchar(100) not null,
  generator_version varchar(50) not null,
  noise_vector vector(512),
  frequency_template jsonb,
  sample_count integer,
  active boolean default true,
  created_at timestamptz default now()
);

-- Forensic reports
create table forensic_reports (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id),
  user_id uuid references auth.users(id),
  report_hash varchar(64),
  storage_path varchar(500),
  case_reference varchar(100),
  digital_signature text,
  jurisdiction varchar(50) default 'general',
  created_at timestamptz default now()
);

-- Audit log (append only - never update or delete)
create table audit_log (
  id bigserial primary key,
  event_type varchar(100) not null,
  scan_id uuid,
  user_id uuid,
  file_hash_at_event varchar(64),
  event_data jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

-- Indexes
create index idx_scans_file_hash on scans(file_hash);
create index idx_scans_user_id on scans(user_id, created_at desc);
create index idx_scans_status on scans(status) where status != 'complete';
create index idx_audit_scan_id on audit_log(scan_id);
create index idx_fingerprints_vector on generator_fingerprints
  using ivfflat (noise_vector vector_cosine_ops);

-- Row level security (users can only see their own scans)
alter table scans enable row level security;
create policy "Users see own scans" on scans
  for all using (auth.uid() = user_id);

alter table signal_results enable row level security;
create policy "Users see own signal results" on signal_results
  for all using (
    scan_id in (select id from scans where user_id = auth.uid())
  );
```

### Step 4 — Supabase Storage buckets

In Supabase dashboard → Storage, create two buckets:
- `uploads` — for user uploaded files (private)
- `reports` — for forensic PDF reports (private)

---

## Part 5 — FastAPI Setup

### Where FastAPI runs

FastAPI runs on its **own server**, completely separate from Supabase and your Next.js frontend.

In development: it runs on your laptop on port 8000.
In production: it runs on a cloud server (DigitalOcean droplet or AWS EC2).

### Step 1 — Install Python and dependencies

```bash
# Make sure you have Python 3.11+
python --version

# Create a virtual environment
cd api
python -m venv venv
source venv/bin/activate  # Mac/Linux
# or on Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn python-multipart celery redis
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install opencv-python numpy scipy onnxruntime
pip install supabase python-dotenv pillow exifread
```

### Step 2 — Environment variables

Create `api/.env`:

```env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
REDIS_URL=redis://localhost:6379
MODEL_VERSION=v1.0.0
```

The service role key (not the anon key) is used in FastAPI because it needs to write results to the database on behalf of users, bypassing RLS.

### Step 3 — Main FastAPI app

```python
# api/main.py
from fastapi import FastAPI, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from routers import scan
import os

app = FastAPI(title="VerifAI Detection API")

# Allow your Next.js frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/v1")

@app.get("/health")
def health():
    return {"status": "ok", "version": os.getenv("MODEL_VERSION")}
```

### Step 4 — The scan endpoint

```python
# api/routers/scan.py
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from supabase import create_client
from workers.scan_worker import process_scan
import hashlib, os, uuid

router = APIRouter()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

@router.post("/scan")
async def create_scan(
    file: UploadFile = File(...),
    user_id: str = None,
    background_tasks: BackgroundTasks = None
):
    # Read file
    contents = await file.read()
    file_size = len(contents)

    # Check file size limit (100MB for images, 2GB for video)
    if file_size > 2_000_000_000:
        raise HTTPException(status_code=413, detail="File too large")

    # Hash the file
    file_hash = hashlib.sha256(contents).hexdigest()

    # Check cache — same file scanned before?
    cached = supabase.table("scans").select("*").eq("file_hash", file_hash).eq("status", "complete").execute()
    if cached.data:
        return {"scan_id": cached.data[0]["id"], "cached": True, "status": "complete"}

    # Detect file type
    file_type = "video" if file.content_type and "video" in file.content_type else "image"

    # Store file in Supabase Storage
    storage_path = f"{user_id or 'anonymous'}/{file_hash}/{file.filename}"
    supabase.storage.from_("uploads").upload(storage_path, contents)

    # Create scan record
    scan_id = str(uuid.uuid4())
    supabase.table("scans").insert({
        "id": scan_id,
        "user_id": user_id,
        "file_hash": file_hash,
        "file_name": file.filename,
        "file_type": file_type,
        "file_size_bytes": file_size,
        "status": "queued",
        "storage_path": storage_path,
        "model_version": os.getenv("MODEL_VERSION")
    }).execute()

    # Queue the detection job
    process_scan.delay(scan_id, storage_path, file_type, file_hash)

    return {"scan_id": scan_id, "cached": False, "status": "queued"}
```

### Step 5 — The detection worker

```python
# api/workers/scan_worker.py
from celery import Celery
from supabase import create_client
from detection.frequency import analyze_frequency
from detection.classifier import run_classifier
from detection.metadata import analyze_metadata
from detection.noise import match_fingerprint
from detection.ensemble import compute_ensemble
import os, time

celery_app = Celery("verifai", broker=os.getenv("REDIS_URL"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

@celery_app.task
def process_scan(scan_id: str, storage_path: str, file_type: str, file_hash: str):
    start = time.time()

    # Update status to processing
    supabase.table("scans").update({"status": "processing"}).eq("id", scan_id).execute()

    try:
        # Download file from Supabase Storage
        file_bytes = supabase.storage.from_("uploads").download(storage_path)

        # Run all signals
        signals = {}
        signals["frequency"] = analyze_frequency(file_bytes)
        signals["neural"] = run_classifier(file_bytes, file_type)
        signals["metadata"] = analyze_metadata(file_bytes)
        signals["noise"] = match_fingerprint(file_bytes)

        # Compute ensemble verdict
        verdict, confidence, attribution = compute_ensemble(signals, file_type)

        # Write signal results
        for signal_name, result in signals.items():
            supabase.table("signal_results").insert({
                "scan_id": scan_id,
                "signal_name": signal_name,
                "score": result["score"],
                "triggered": result["triggered"],
                "weight_applied": result["weight"],
                "detail_json": result["detail"],
                "processing_time_ms": result["time_ms"]
            }).execute()

        # Update scan with final verdict
        supabase.table("scans").update({
            "status": "complete",
            "verdict": verdict,
            "confidence_score": confidence,
            "model_attribution": attribution["generator"],
            "attribution_confidence": attribution["confidence"],
            "processing_time_ms": int((time.time() - start) * 1000),
            "completed_at": "now()"
        }).eq("id", scan_id).execute()

    except Exception as e:
        supabase.table("scans").update({
            "status": "failed",
            "processing_time_ms": int((time.time() - start) * 1000)
        }).eq("id", scan_id).execute()
        raise e
```

### Step 6 — Run locally

```bash
# Terminal 1 — start Redis (needs Docker)
docker run -p 6379:6379 redis

# Terminal 2 — start FastAPI
cd api
uvicorn main:app --reload --port 8000

# Terminal 3 — start Celery worker
cd api
celery -A workers.scan_worker worker --loglevel=info
```

Your API is now running at `http://localhost:8000`. Test it:

```bash
curl -X POST http://localhost:8000/v1/scan \
  -F "file=@test_image.jpg"
```

---

## Part 6 — Next.js Frontend Setup

### Step 1 — Create the project

```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs uppy
```

### Step 2 — Supabase client

```typescript
// frontend/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Step 3 — Upload and poll for result

```typescript
// frontend/app/page.tsx (simplified)
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)

  async function handleUpload(file: File) {
    setScanning(true)

    // Send to FastAPI
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/scan`, {
      method: 'POST',
      body: form
    })
    const { scan_id } = await res.json()

    // Subscribe to real-time updates from Supabase
    const subscription = supabase
      .channel(`scan-${scan_id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scans',
        filter: `id=eq.${scan_id}`
      }, (payload) => {
        if (payload.new.status === 'complete') {
          setResult(payload.new)
          setScanning(false)
          subscription.unsubscribe()
        }
      })
      .subscribe()
  }

  return (
    <main>
      {/* Upload UI here */}
      {result && (
        <div>
          <h2>Verdict: {result.verdict}</h2>
          <p>Confidence: {result.confidence_score}%</p>
          <p>Model: {result.model_attribution}</p>
        </div>
      )}
    </main>
  )
}
```

### Step 4 — Environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Part 7 — Stage by Stage Build Guide

### Stage 1 — Proof of concept (Weeks 1-6)

**Goal:** Prove you can detect AI images. No frontend. No database. Just Python.

What to build:
- `frequency.py` — FFT analysis on images
- `classifier.py` — fine-tune EfficientNet-B4 on 10,000 image dataset (5k real, 5k AI)
- A Python script that takes an image path and prints a score

Dataset to use: Download real images from Flickr API (free), generate AI images from Midjourney and Stable Diffusion.

You pass this stage when you hit **70%+ accuracy** on a 1,000 image test set.

**Do not build anything else until this works.**

---

### Stage 2 — First working API (Weeks 7-12)

**Goal:** Someone can call your API and get a result.

What to build:
- FastAPI app with `/v1/scan` endpoint
- Celery + Redis job queue
- Supabase database schema (run the SQL from Part 4)
- Connect classifier output to Supabase scan record
- Add metadata forensics module

You pass this stage when you can `curl` your API with an image and get back a verdict with 2 signals (FFT + CNN).

---

### Stage 3 — First usable product (Weeks 13-20)

**Goal:** A real person can use this without technical knowledge.

What to build:
- Next.js upload page with drag-and-drop
- Results page showing verdict, confidence, signal breakdown
- Supabase Auth for user accounts
- Real-time status updates (uploading → analyzing → complete)
- Add noise fingerprinting module
- Add ensemble scoring (combine all signals)

You pass this stage when **you** can upload any image and trust the result. Internal testing only. Target: **85%+ accuracy**.

---

### Stage 4 — Public launch (Weeks 21-28)

**Goal:** 50 real users paying for this.

What to build:
- Heatmap output (GradCAM on the neural classifier)
- Plain English explanation of why the verdict was reached
- Stripe billing (Free tier + $29 Pro plan)
- Dashboard with scan history
- API keys for developers
- Basic documentation page

Deploy FastAPI to DigitalOcean. Deploy Next.js to Vercel (free tier).

You pass this stage when you have **50 paying users and MRR above $1,000**.

---

### Stage 5 — Differentiation (Weeks 29-40)

**Goal:** Pull ahead of every competitor.

What to build:
- Video processing pipeline (adaptive frame sampling + temporal analysis)
- Facial analysis module (eyes, skin texture, hands)
- Forensic report generator (signed PDF with chain of custody)
- Model attribution (which AI tool made this)
- Generator fingerprint database (start with 10 models)

Move FastAPI to AWS GPU instance for video processing speed.

You pass this stage when you can hand a forensic report to a lawyer and they accept it as evidence.

---

### Stage 6 — Scale and standard (Months 11-24)

What to build:
- Continuous retraining pipeline (Airflow + MLflow)
- Early warning system for new AI model releases
- Browser extension
- Mobile apps
- Enterprise API with SLA
- C2PA content credential integration
- NIST evaluation submission

---

## Part 8 — Deploying FastAPI to Production

### Simple setup (Stages 1-4): DigitalOcean

```bash
# On your DigitalOcean droplet (Ubuntu 22.04, $20/month)

# Install dependencies
sudo apt update
sudo apt install python3.11 python3-pip redis-server nginx

# Clone your repo and install
git clone https://github.com/yourname/verifai-api
cd verifai-api/api
pip install -r requirements.txt

# Run with gunicorn (production WSGI server)
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Run Celery worker
celery -A workers.scan_worker worker --loglevel=info --detach
```

Set up nginx to proxy port 80 → 8000. Use Certbot for HTTPS.

### GPU setup (Stage 5+): AWS

Switch to AWS EC2 `g4dn.xlarge` ($0.526/hour on-demand, ~$0.16/hour spot). This gives you an NVIDIA T4 GPU. Install CUDA drivers, then replace:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install onnxruntime-gpu
```

Your inference speed goes from ~8 seconds to ~2 seconds per image.

---

## Part 9 — When You Outgrow Supabase

Supabase will serve you well up to roughly **5,000 users and 100,000 scans per month**. After that you may hit connection limits, storage costs, and need more database control. Here is how to migrate with zero downtime.

### Signs you need to migrate
- Database connection pool is regularly maxing out
- Supabase storage costs are exceeding $200/month
- You need write-once buckets for forensic compliance
- You need more control over PostgreSQL configuration
- Monthly scans exceed 500,000

### Migration path: Supabase → AWS RDS + S3

The good news: you are already running PostgreSQL, so **the schema does not change at all**. You are just moving where that PostgreSQL lives.

**Step 1 — Export from Supabase**

```bash
pg_dump "postgresql://postgres:password@db.yourproject.supabase.co:5432/postgres" \
  --no-owner --no-acl -f verifai_backup.sql
```

**Step 2 — Create AWS RDS PostgreSQL instance**

Launch `db.t3.medium` (2 vCPU, 4GB RAM) as a starting point. Enable Multi-AZ for reliability. Enable automated backups. Same PostgreSQL version as Supabase (currently 15).

**Step 3 — Import data**

```bash
psql "postgresql://admin:password@yourdb.rds.amazonaws.com:5432/verifai" \
  < verifai_backup.sql
```

**Step 4 — Migrate file storage to S3**

```python
# Migration script — run once
import boto3
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
s3 = boto3.client('s3')

# List all files in Supabase Storage
files = supabase.storage.from_("uploads").list()
for f in files:
    file_bytes = supabase.storage.from_("uploads").download(f["name"])
    s3.put_object(Bucket="verifai-uploads", Key=f["name"], Body=file_bytes)
```

**Step 5 — Update FastAPI environment variables**

```env
DATABASE_URL=postgresql://admin:password@yourdb.rds.amazonaws.com:5432/verifai
S3_BUCKET=verifai-uploads
STORAGE_PROVIDER=s3  # was 'supabase'
```

**Step 6 — Handle auth migration**

Supabase Auth can be replaced with:
- **Auth0** (managed, easy migration, $0 up to 7,500 users)
- **self-hosted Supabase Auth** (open source, run it on your own server)
- **custom JWT** (most control, most work)

The session tokens change so users need to re-login once. Announce this 2 weeks in advance.

**Step 7 — Real-time updates**

Replace Supabase Realtime with **Pusher** or **Ably** (both have free tiers). Or self-host **Soketi** (open source Pusher-compatible server).

In your Next.js frontend, swap:
```typescript
// Before (Supabase Realtime)
supabase.channel(`scan-${scan_id}`).on('postgres_changes', ...)

// After (Pusher)
const channel = pusher.subscribe(`scan-${scan_id}`)
channel.bind('status-update', (data) => { ... })
```

And in FastAPI, after updating the database, push the event:
```python
pusher_client.trigger(f"scan-{scan_id}", "status-update", {"status": "complete", ...})
```

**Full migration takes about 2 weeks of work** and can be done with zero downtime using a read-replica cutover strategy.

---

## Part 10 — Things You Should Know

### On learning
Python is the most important skill to build first. Everything in the ML engine is Python. Start with FastAPI tutorials before touching PyTorch — understanding how to build an API is more immediately useful than understanding neural networks.

### On the dataset
You cannot buy a good labeled dataset for this problem. You have to build it. Start collecting real photos (Flickr API, Unsplash API — both free) and AI images (generate them yourself using free tiers of Midjourney, Stable Diffusion, DALL-E) from day one. Every week you wait is a week of dataset you do not have.

### On accuracy vs speed
Do not optimise for speed until you have accuracy. A slow accurate system can be made fast. A fast inaccurate system loses user trust that is very hard to recover.

### On the legal-grade angle
No other company is seriously pursuing court-admissible forensic reports. This is your biggest differentiator. Even if your accuracy in Year 1 is only 87%, a signed forensic report with a clear methodology is worth more to a law firm than a competitor's 92% score with no explanation. Build the report generator early.

### On competitors
Hive AI, Reality Defender, and Sensity AI all have head starts on raw detection accuracy. You cannot beat them on accuracy in Year 1. You beat them by being the only product with: (1) model attribution, (2) court-ready reports, and (3) a public methodology that researchers can validate. These are not technical problems — they are strategy problems, and they are where you invest first.

### On money
Do not spend money on GPU servers until Stage 5. In Stages 1-4, use CPU inference (slower but free) and Hugging Face's free inference API for prototyping. Your first AWS GPU bill should come after your first $1,000 in MRR.

### On open sourcing
Consider open-sourcing the benchmark test suite (not the models, just the evaluation code). Researchers will use it, cite it, and improve it. This builds credibility faster than any marketing spend.

---

## Summary — The Build Order

1. Python FFT module — detect AI images with one signal
2. Train EfficientNet-B4 on your dataset
3. FastAPI endpoint + Supabase storage
4. Celery job queue
5. Next.js upload UI + real-time results
6. Add metadata forensics + noise fingerprinting
7. Ensemble scoring — combine all signals
8. Heatmap output + plain English explanations
9. Stripe billing — charge money
10. Video processing pipeline
11. Forensic report generator
12. Continuous retraining pipeline
13. Migrate off Supabase when you hit 5,000+ users

Do not skip steps. Do not build step 8 before step 3 works perfectly.

---

*VerifAI Complete Development Guide — v1.0*
