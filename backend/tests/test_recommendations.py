from app.database import Base, SessionLocal, engine
from app.models import Product, Review, ReviewAnalysis
from app.nlp import analyze
from app.services import product_analytics, product_assistant_answer

def test_product_recommendations_with_complaints():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create a test product with negative delivery/packaging feedback
        p = Product(external_id="TEST_REC_PROD_1", name="Test Snack Box")
        db.add(p)
        db.flush()

        r1 = Review(external_id="rev-1", product_id=p.id, text="Product arrived broken with damaged packaging. Terrible delivery.", rating=1.0)
        db.add(r1)
        db.flush()
        db.add(ReviewAnalysis(review_id=r1.id, **analyze(r1.text, r1.rating)))

        r2 = Review(external_id="rev-2", product_id=p.id, text="Box was crushed upon delivery, very disappointed.", rating=1.0)
        db.add(r2)
        db.flush()
        db.add(ReviewAnalysis(review_id=r2.id, **analyze(r2.text, r2.rating)))
        db.commit()

        analytics = product_analytics(db, p.id)
        assert "recommendations" in analytics
        recs = analytics["recommendations"]
        assert len(recs) > 0
        assert recs[0]["priority"] in ("Critical", "High")
        assert "evidence" in recs[0]
        assert "impact" in recs[0]
        assert "recommendation" in recs[0]

        answer = product_assistant_answer(analytics, "What are the improvement recommendations?")
        assert "improvement" in answer.lower() or "priority" in answer.lower()
    finally:
        # cleanup
        db.query(ReviewAnalysis).filter(ReviewAnalysis.review_id.in_([r1.id, r2.id])).delete(synchronize_session=False)
        db.query(Review).filter(Review.product_id == p.id).delete(synchronize_session=False)
        db.query(Product).filter(Product.id == p.id).delete(synchronize_session=False)
        db.commit()
        db.close()
