import json, re
from collections import Counter

POSITIVE = {
    "good", "great", "excellent", "love", "amazing", "fresh", "best", "perfect",
    "delicious", "happy", "recommend", "quality", "fast", "easy", "reliable",
    "comfortable", "worth", "tasty", "awesome", "fantastic", "wonderful", "superb",
    "fabulous", "nice", "pleased", "favorite", "favourite", "impressive", "flawless",
    "authentic", "smooth", "crisp", "rich", "sweet", "clean", "healthy", "solid",
    "durable", "sturdy", "effective", "helpful", "convenient", "affordable", "value",
    "satisfied", "enjoy", "enjoyed", "glad", "ideal", "brilliant", "outstanding",
    "loved", "likes", "liking", "finest", "exceptional"
}

NEGATIVE = {
    "bad", "terrible", "worst", "poor", "hate", "disappointed", "problem", "broken",
    "slow", "expensive", "stale", "damaged", "awful", "not", "difficult", "uncomfortable",
    "cheap", "horrible", "disappointing", "waste", "useless", "defective", "bland",
    "rotten", "spoiled", "disgusting", "gross", "sick", "nasty", "leaking", "crushed",
    "wrong", "flawed", "regret", "inferior", "unhappy", "frustrating", "annoying",
    "overpriced", "soured", "expired", "failed", "garbage", "trash", "hated",
    "dissatisfied", "horrid", "mediocre", "tasteless", "avoid"
}

INTENSIFIERS = {"very", "extremely", "super", "highly", "absolutely", "so", "really", "truly", "completely", "totally", "definitely"}
NEGATIONS = {"not", "never", "no", "hardly", "barely", "scarcely", "without", "didn't", "don't", "wasn't", "cannot", "can't", "wouldn't", "couldn't", "won't"}

# These are intentionally transparent, local signals rather than a black-box model. The
# names form the Product Intelligence taxonomy used by both new and already-imported reviews.
ASPECTS = {
    "quality": ["quality", "fresh", "taste", "flavor", "flavour", "ingredient", "ingredients"],
    "performance": ["performance", "works", "working", "fast", "slow", "reliable", "effective"],
    "design": ["design", "look", "looks", "style", "appearance", "shape"],
    "durability": ["durable", "broken", "lasts", "lasting", "damage", "damaged", "sturdy"],
    "price_value": ["price", "cost", "expensive", "value", "worth", "affordable", "cheap"],
    "battery": ["battery", "charge", "charging", "power", "recharge"],
    "comfort": ["comfort", "comfortable", "fit", "ergonomic"],
    "features": ["feature", "features", "function", "functions", "option", "options"],
    "ease_of_use": ["easy", "ease", "simple", "intuitive", "usability", "use"],
    # Keep useful legacy signals available for imports that mention them.
    "delivery": ["delivery", "shipping", "arrived"],
    "packaging": ["packaging", "package", "box", "bag"],
    "customer_support": ["support", "service", "refund", "seller"],
}

DISPLAY_NAMES = {
    "price_value": "Price & value",
    "ease_of_use": "Ease of use",
    "customer_support": "Customer support",
}

def detect_aspects(text: str) -> list[str]:
    """Return every product aspect explicitly evidenced by the review text."""
    words = set(re.findall(r"[a-z']+", text.lower()))
    return [name for name, terms in ASPECTS.items() if any(term in words for term in terms)]

def analyze(text: str, rating: float | None = None, duplicate: bool = False) -> dict:
    words = re.findall(r"[a-z']+", text.lower())
    
    # Calculate positive and negative signals with negation and intensifier sensitivity
    pos_score = 0.0
    neg_score = 0.0
    pos_terms = []
    neg_terms = []
    hits = []

    for i, w in enumerate(words):
        is_negated = any(words[j] in NEGATIONS for j in range(max(0, i - 2), i))
        is_intensified = any(words[j] in INTENSIFIERS for j in range(max(0, i - 2), i))
        multiplier = 1.5 if is_intensified else 1.0

        if w in POSITIVE and w not in NEGATIONS:
            hits.append(w)
            if is_negated:
                neg_score += 1.2 * multiplier
                neg_terms.append(f"not {w}")
            else:
                pos_score += 1.0 * multiplier
                pos_terms.append(w)
        elif w in NEGATIVE and w not in NEGATIONS:
            hits.append(w)
            if is_negated:
                pos_score += 0.8 * multiplier
                pos_terms.append(f"not {w}")
            else:
                neg_score += 1.0 * multiplier
                neg_terms.append(w)

    # Calculate AI sentiment score (normalized -1.0 to +1.0)
    total_signals = pos_score + neg_score
    if total_signals > 0:
        sentiment_score = round((pos_score - neg_score) / (total_signals + 0.3), 2)
    else:
        sentiment_score = 0.0

    sentiment_score = max(-1.0, min(1.0, sentiment_score))

    # Calculate predicted / estimated rating from text (1.0 to 5.0 scale)
    base_est = 3.0 + (sentiment_score * 2.0)
    if pos_score >= 3 and neg_score == 0:
        base_est = max(base_est, 4.5)
    elif pos_score >= 1.5 and neg_score == 0:
        base_est = max(base_est, 4.0)
    elif neg_score >= 3 and pos_score == 0:
        base_est = min(base_est, 1.2)
    elif neg_score >= 1.5 and pos_score == 0:
        base_est = min(base_est, 1.8)

    predicted_rating = round(max(1.0, min(5.0, base_est)), 1)

    # If an actual rating is provided (e.g. from dataset import), incorporate into overall classification signal
    if rating is not None and rating > 0:
        rating_signal = (rating - 3.0) * 1.2
        combined_signal = (pos_score - neg_score) + rating_signal
    else:
        combined_signal = (pos_score - neg_score) * 1.4

    if combined_signal > 0.35 or sentiment_score >= 0.20:
        sentiment = "positive"
    elif combined_signal < -0.35 or sentiment_score <= -0.20:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    intensity = min(1.0, abs(sentiment_score) * 0.85 + (0.15 if len(words) > 15 else 0.05))

    if sentiment == "positive":
        emotion = "excited" if intensity > 0.7 or any(w in words for w in ("amazing", "love", "loved", "perfect", "superb")) else "satisfied"
    elif sentiment == "negative":
        emotion = "angry" if intensity > 0.7 or any(w in words for w in ("hate", "hated", "terrible", "worst", "awful", "horrible")) else "disappointed"
    else:
        emotion = "neutral"

    aspects = [{"name": name, "sentiment": sentiment, "confidence": round(65 + intensity * 30)} for name in detect_aspects(text)]
    length_score = min(100, len(words) * 1.4)
    specificity = min(20, len(set(words)) * 0.5)
    quality = round(min(100, length_score + specificity))
    
    suspicious = (35 if duplicate else 0) + (25 if len(words) < 5 else 0) + (15 if rating in (1, 5) and len(words) < 12 else 0)
    credibility = round(max(5, min(100, 92 - suspicious + (10 if len(words) > 25 else 0))))
    confidence = round(min(98, 55 + intensity * 35 + (10 if len(words) > 10 else 0)))
    keywords = [w for w, _ in Counter(hits).most_common(6)]

    # Generate clear explanation for the AI prediction
    reasons = [f"Predicted rating is {predicted_rating}/5.0 ({sentiment.title()}) with sentiment score {sentiment_score:+.2f}"]
    if pos_terms:
        reasons.append(f"{len(pos_terms)} positive signal{'s' if len(pos_terms) != 1 else ''} ({', '.join(repr(t) for t in pos_terms[:3])})")
    if neg_terms:
        reasons.append(f"{len(neg_terms)} negative signal{'s' if len(neg_terms) != 1 else ''} ({', '.join(repr(t) for t in neg_terms[:3])})")
    if not pos_terms and not neg_terms:
        reasons.append("balanced neutral vocabulary")
    if rating is not None and rating > 0:
        reasons.append(f"actual customer rating: {rating}/5")

    explanation = "; ".join(reasons) + "."

    return {
        "sentiment": sentiment,
        "sentiment_score": sentiment_score,
        "sentiment_intensity": round(intensity, 2),
        "predicted_rating": predicted_rating,
        "emotion": emotion,
        "confidence": confidence,
        "credibility": credibility,
        "quality": quality,
        "suspicious_probability": min(95, suspicious),
        "aspects_json": json.dumps(aspects),
        "keywords_json": json.dumps(keywords),
        "explanation": explanation,
    }
