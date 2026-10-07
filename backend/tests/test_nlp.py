from app.nlp import analyze
from app.database import SessionLocal
from app.services import dataset_overall_statistics

def test_positive_review_is_positive():
    result = analyze("Excellent fresh food, great flavor and quality", 5)
    assert result["sentiment"] == "positive"
    assert result["sentiment_score"] > 0.3
    assert result["predicted_rating"] >= 4.0
    assert "explanation" in result and len(result["explanation"]) > 0
    assert result["credibility"] > 50

def test_negative_review_rating_prediction():
    result = analyze("Terrible taste and stale packaging, completely broken and disappointed")
    assert result["sentiment"] == "negative"
    assert result["sentiment_score"] < -0.3
    assert result["predicted_rating"] <= 2.0
    assert "negative signal" in result["explanation"] or "Predicted rating" in result["explanation"]

def test_neutral_review_rating_prediction():
    result = analyze("The item is okay, standard packaging and average price")
    assert result["sentiment"] in ("neutral", "positive")
    assert 2.5 <= result["predicted_rating"] <= 3.5

def test_short_duplicate_is_suspicious():
    assert analyze("bad", 1, duplicate=True)["suspicious_probability"] > 40

def test_overall_dataset_statistics():
    db = SessionLocal()
    try:
        stats = dataset_overall_statistics(db)
        assert "total_reviews" in stats
        assert "sentiment_distribution" in stats
        assert "average_actual_rating" in stats
        assert "average_predicted_rating" in stats
        assert "average_sentiment_score" in stats
        assert "accuracy" in stats
    finally:
        db.close()

