from app.database import SessionLocal
from app.services import product_analytics, product_comparison

def test_four_layers_generated():
    db = SessionLocal()
    try:
        analytics = product_analytics(db, 14)
        assert "roadmap" in analytics
        assert "customer_voice" in analytics
        assert "smart_insights" in analytics

        # Roadmap checks
        roadmap = analytics["roadmap"]
        assert "overview" in roadmap
        assert "pipeline" in roadmap
        assert "fix_first" in roadmap

        # Customer Voice checks
        cv = analytics["customer_voice"]
        assert "sentiment_breakdown" in cv
        assert "themes" in cv
        assert "customers_love" in cv
        assert "customers_dislike" in cv
        assert "priorities" in cv

        # Smart Insights checks
        si = analytics["smart_insights"]
        assert "insights" in si
        assert "key_takeaways" in si

        # Comparison checks
        comp = product_comparison(db, [14, 29])
        assert comp["status"] == "success"
        assert len(comp["products"]) == 2
        assert "aspect_matrix" in comp
        assert "strengths_comparison" in comp
        assert "weaknesses_comparison" in comp
        assert "verdict" in comp
    finally:
        db.close()
