import os, json, io, zipfile
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from .database import Base, engine, get_db, SessionLocal
from .models import AnalysisJob, Product, Review
from .assistant import process_assistant_query
from .nlp import analyze
from .services import dataset_overall_statistics, import_csv, product_analytics, product_comparison, validate_csv

Base.metadata.create_all(bind=engine)
app=FastAPI(title="Customer Review Intelligence API", version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=os.getenv("CORS_ORIGINS","http://localhost:5173").split(","),allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

@app.get("/api/health")
def health(): return {"status":"ok"}

@app.post("/api/reviews/upload")
async def upload(background_tasks:BackgroundTasks, file:UploadFile=File(...), db:Session=Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith((".csv", ".zip")): raise HTTPException(400,"Upload a CSV or an archive containing a CSV")
    payload=await file.read()
    if len(payload)>int(os.getenv("MAX_UPLOAD_MB","512"))*1024*1024: raise HTTPException(413,"File is too large")
    if file.filename.lower().endswith(".zip"):
        try:
            archive=zipfile.ZipFile(io.BytesIO(payload)); candidates=[n for n in archive.namelist() if n.lower().endswith(".csv")]
            if not candidates: raise HTTPException(400,"Archive contains no CSV file")
            payload=archive.read(candidates[0])
        except zipfile.BadZipFile: raise HTTPException(400,"Invalid ZIP archive")
    try:
        validate_csv(payload)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    job=AnalysisJob(); db.add(job); db.commit(); db.refresh(job)
    def run():
        local=SessionLocal()
        try:
            import_csv(local,payload,job.id)
        except Exception as exc:
            local.rollback()
            failed_job=local.get(AnalysisJob, job.id)
            if failed_job:
                failed_job.status="failed"
                failed_job.message=f"Import failed: {str(exc)[:260]}"
                local.commit()
        finally:
            local.close()
    background_tasks.add_task(run); return {"job_id":job.id,"status":job.status}

@app.get("/api/jobs/{job_id}")
def job(job_id:int,db:Session=Depends(get_db)):
    result=db.get(AnalysisJob,job_id)
    if not result: raise HTTPException(404,"Job not found")
    return {"id":result.id,"status":result.status,"progress":result.progress,"message":result.message}

@app.get("/api/products")
def products(db:Session=Depends(get_db)):
    items=db.query(Product).all(); return [{"id":p.id,"external_id":p.external_id,"name":p.name,"review_count":len(p.reviews)} for p in items]

@app.get("/api/products/{product_id}/analytics")
def analytics(product_id:int,db:Session=Depends(get_db)): return product_analytics(db,product_id)

@app.get("/api/statistics")
@app.get("/api/reviews/stats")
def statistics(product_id:int|None=None, db:Session=Depends(get_db)):
    return dataset_overall_statistics(db, product_id)

@app.post("/api/reviews/analyze")
@app.post("/api/analyze-review")
def analyze_review_text(body: dict):
    text = str(body.get("text", "")).strip()
    if not text:
        raise HTTPException(400, "Review text is required for AI rating prediction")
    raw_rating = body.get("rating")
    rating = float(raw_rating) if raw_rating is not None and str(raw_rating).strip() != "" else None
    result = analyze(text=text, rating=rating)
    return {
        "text": text,
        "rating": rating,
        "sentiment": result["sentiment"],
        "sentiment_score": result["sentiment_score"],
        "sentiment_intensity": result["sentiment_intensity"],
        "predicted_rating": result["predicted_rating"],
        "emotion": result["emotion"],
        "confidence": result["confidence"],
        "credibility": result["credibility"],
        "quality": result["quality"],
        "suspicious_probability": result["suspicious_probability"],
        "aspects": json.loads(result["aspects_json"]),
        "keywords": json.loads(result["keywords_json"]),
        "explanation": result["explanation"],
    }

@app.post("/api/products/compare")
def compare(body:dict,db:Session=Depends(get_db)):
    ids=body.get("product_ids",[])
    if not isinstance(ids,list) or len(ids)<2: raise HTTPException(400,"Provide at least two product_ids")
    return product_comparison(db, ids)

@app.get("/api/reviews")
def reviews(product_id:int|None=None,sentiment:str|None=None,limit:int=Query(50,le=200),offset:int=0,db:Session=Depends(get_db)):
    q=db.query(Review).options(joinedload(Review.analysis))
    if product_id: q=q.filter(Review.product_id==product_id)
    rows=q.order_by(Review.reviewed_at.desc()).offset(offset).limit(limit).all()
    result=[]
    for r in rows:
        if sentiment and r.analysis and r.analysis.sentiment!=sentiment: continue
        pred_r = getattr(r.analysis, "predicted_rating", None) if r.analysis else None
        if pred_r is None or pred_r == 0:
            pred_r = round(max(1.0, min(5.0, 3.0 + (getattr(r.analysis, "sentiment_score", 0.0) * 2.0))), 1)
        s_score = getattr(r.analysis, "sentiment_score", 0.0) if r.analysis else 0.0
        
        result.append({
            "id": r.id,
            "rating": r.rating,
            "title": r.title,
            "text": r.text,
            "date": r.reviewed_at,
            "analysis": {
                "sentiment": r.analysis.sentiment if r.analysis else "neutral",
                "sentiment_score": s_score,
                "predicted_rating": pred_r,
                "sentiment_intensity": getattr(r.analysis, "sentiment_intensity", 0.0) if r.analysis else 0.0,
                "emotion": r.analysis.emotion if r.analysis else "neutral",
                "confidence": r.analysis.confidence if r.analysis else 85,
                "credibility": r.analysis.credibility if r.analysis else 90,
                "aspects": json.loads(r.analysis.aspects_json) if r.analysis and r.analysis.aspects_json else [],
                "keywords": json.loads(r.analysis.keywords_json) if r.analysis and r.analysis.keywords_json else [],
                "explanation": r.analysis.explanation if r.analysis else "",
            }
        })
    return result

@app.get("/api/reviews/{review_id}")
def review(review_id:int,db:Session=Depends(get_db)):
    r=db.query(Review).options(joinedload(Review.analysis)).get(review_id)
    if not r: raise HTTPException(404,"Review not found")
    return {"id":r.id,"text":r.text,"rating":r.rating,"analysis":r.analysis.__dict__}

@app.post("/api/assistant/chat")
def assistant_chat(body:dict, db:Session=Depends(get_db)):
    product_id = body.get("product_id")
    question = str(body.get("question", "") or body.get("message", ""))
    history = body.get("history", [])
    compared_product_id = body.get("compared_product_id")
    active_tab = body.get("active_tab")
    if not product_id:
        raise HTTPException(400, "product_id is required")
    return process_assistant_query(
        db=db,
        product_id=int(product_id),
        question=question,
        history=history,
        compared_product_id=int(compared_product_id) if compared_product_id else None,
        active_tab=active_tab,
    )

@app.post("/api/chat")
def chat(body:dict, db:Session=Depends(get_db)):
    product_id = body.get("product_id")
    question = str(body.get("question", "") or body.get("message", ""))
    if not product_id:
        return {"answer": "Select a product to begin AI guidance."}
    res = process_assistant_query(db=db, product_id=int(product_id), question=question)
    return {"answer": res.get("answer", "")}

_frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(_frontend_dist):
    _assets_dir = os.path.join(_frontend_dist, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "API endpoint not found")
        file_path = os.path.join(_frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_frontend_dist, "index.html"))


