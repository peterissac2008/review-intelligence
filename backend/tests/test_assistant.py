from app.database import SessionLocal
from app.assistant import build_product_context, process_assistant_query

def test_assistant_context_builder():
    db = SessionLocal()
    try:
        context = build_product_context(db, product_id=14, compared_product_id=29)
        assert "product" in context
        assert "overview_metrics" in context
        assert "sentiment_distribution" in context
        assert "strengths" in context
        assert "top_recommendations" in context
        assert "roadmap_fix_first" in context
        assert "customer_voice" in context
        assert "smart_insights" in context
        assert "comparison" in context
    finally:
        db.close()

def test_assistant_queries():
    db = SessionLocal()
    try:
        # 1. Biggest problem query
        res1 = process_assistant_query(db, product_id=14, question="What is the biggest problem with this product?")
        assert res1["answer"] is not None
        assert len(res1["sources"]) > 0
        assert res1["navigate_to_tab"] in ["roadmap", "voice", "overview"]

        # 2. What customers love
        res2 = process_assistant_query(db, product_id=14, question="What do customers like most?")
        assert res2["answer"] is not None
        assert "favorite" in res2["answer"].lower() or "customer" in res2["answer"].lower()

        # 3. What to fix first
        res3 = process_assistant_query(db, product_id=14, question="What should the company fix first?")
        assert res3["answer"] is not None
        assert "roadmap" in res3["answer"].lower() or "priority" in res3["answer"].lower()

        # 4. Explain AI Score
        res4 = process_assistant_query(db, product_id=14, question="Explain the AI product score")
        assert "ai product score" in res4["answer"].lower() or "weight" in res4["answer"].lower()

        # 5. Navigation guide
        res5 = process_assistant_query(db, product_id=14, question="Where can I see customer complaints?")
        assert "customer voice" in res5["answer"].lower()

        # 6. Multi-turn resolution ("How can it be improved?")
        history = [
            {"role": "user", "content": "What is the biggest weakness?"},
            {"role": "assistant", "content": "The packaging and freshness aspects have some negative feedback."}
        ]
        res6 = process_assistant_query(db, product_id=14, question="How can it be improved?", history=history)
        assert res6["answer"] is not None

        # 7. Out of scope / guardrails
        res7 = process_assistant_query(db, product_id=14, question="What is the GPU clock speed and processor?")
        assert "don't have enough review data" in res7["answer"].lower() or "unsupported" in res7["answer"].lower()
    finally:
        db.close()
