import csv, io, json, re
from collections import Counter
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from .models import Product, Review, ReviewAnalysis, AnalysisJob
from .nlp import DISPLAY_NAMES, analyze, detect_aspects

# Keys are normalized to snake_case: ``ProductId``, ``product-id`` and
# `` product id `` become ``product_id``.  Compact Amazon-style names are kept
# as aliases so existing uploads continue to work.
ALIASES = {
    "review_id": ["review_id", "reviewid", "id"],
    "product_id": ["product_id", "productid", "product", "sku", "asin"],
    "product_name": ["product_name", "productname", "name", "product_title"],
    "rating": ["rating", "score", "star_rating", "stars", "review_score", "starrating"],
    "review_text": ["review_text", "reviewtext", "text", "review", "content", "comment", "body", "feedback"],
    "review_title": ["review_title", "reviewtitle", "summary", "title", "headline"],
    "author": ["user_id", "userid", "profile_name", "profilename", "author", "username"],
    "date": ["date", "time", "reviewed_at", "reviewedat", "review_date", "reviewdate", "timestamp"],
    "helpful_votes": ["helpful_votes", "helpfulvotes", "helpfulness_numerator", "helpfulnessnumerator", "helpful_count"],
    "total_votes": ["total_votes", "totalvotes", "helpfulness_denominator", "helpfulnessdenominator", "vote_count"],
}

def normalize(name: str) -> str:
    normalized = str(name).lstrip("\ufeff").strip().lower()
    normalized = re.sub(r"[\s-]+", "_", normalized)
    return re.sub(r"_+", "_", normalized).strip("_")

def column_map(fieldnames: list[str] | None) -> dict[str, str]:
    available = {normalize(name): name for name in fieldnames or [] if name}
    resolved = {}
    for field, aliases in ALIASES.items():
        resolved[field] = next((available[key] for key in aliases if key in available), None)
    return resolved

def validate_csv(payload: bytes) -> dict[str, str]:
    try:
        reader = csv.DictReader(io.StringIO(payload.decode("utf-8-sig", errors="replace")))
        mapping = column_map(reader.fieldnames)
    except csv.Error as exc:
        raise ValueError(f"Unable to read CSV headers: {exc}") from exc
    missing = []
    if not mapping["product_id"] and not mapping["product_name"]:
        missing.append("a product identifier (ProductId, product_id, product, SKU) or product name (product_name, name)")
    if not mapping["rating"]:
        missing.append("a rating column (Score, rating, stars)")
    if not mapping["review_text"] and not mapping["review_title"]:
        missing.append("review text (Text, review_text, review) or a summary/title")
    if missing:
        found = ", ".join(reader.fieldnames or []) or "no headers"
        raise ValueError(f"Missing required column(s): {'; '.join(missing)}. Found: {found}.")
    return mapping

def row_value(row: dict, mapping: dict[str, str], field: str, default=""):
    column = mapping.get(field)
    value = row.get(column) if column else None
    return value if value not in (None, "") else default

def integer(value, default=0) -> int:
    try: return int(float(value))
    except (TypeError, ValueError): return default

def reviewed_at(value) -> datetime:
    try:
        raw = str(value).strip()
        return datetime.fromtimestamp(float(raw)) if raw.replace(".", "", 1).isdigit() else datetime.fromisoformat(raw)
    except (TypeError, ValueError, OSError):
        return datetime.utcnow()

def import_csv(db: Session, payload: bytes, job_id: int):
    mapping = validate_csv(payload)
    job = db.get(AnalysisJob, job_id)
    job.status, job.progress, job.message = "running", 5, "Validated customer-review schema"
    db.commit()
    reader = csv.DictReader(io.StringIO(payload.decode("utf-8-sig", errors="replace")))
    estimated_rows = max(1, payload.count(b"\n") - 1)
    seen, imported, skipped, product_ids = set(), 0, 0, set()
    for index, row in enumerate(reader, start=1):
        title = str(row_value(row, mapping, "review_title")).strip()
        body = str(row_value(row, mapping, "review_text")).strip()
        text = "\n\n".join(part for part in (title, body) if part)
        try: rating = float(row_value(row, mapping, "rating"))
        except (TypeError, ValueError): skipped += 1; continue
        if not text or not 1 <= rating <= 5: skipped += 1; continue
        product_external_id = str(row_value(row, mapping, "product_id") or row_value(row, mapping, "product_name")).strip()
        if not product_external_id: skipped += 1; continue
        product = db.query(Product).filter_by(external_id=product_external_id).first()
        if not product:
            name = str(row_value(row, mapping, "product_name") or product_external_id).strip()
            product = Product(external_id=product_external_id, name=name)
            db.add(product); db.flush()
        review_external_id = str(row_value(row, mapping, "review_id") or f"row-{index}")
        if db.query(Review).filter_by(external_id=review_external_id, product_id=product.id).first(): skipped += 1; continue
        review = Review(external_id=review_external_id, product_id=product.id, author=str(row_value(row, mapping, "author")) or None, title=title or None, text=text, rating=rating, helpful_votes=integer(row_value(row, mapping, "helpful_votes")), total_votes=integer(row_value(row, mapping, "total_votes")), reviewed_at=reviewed_at(row_value(row, mapping, "date")))
        db.add(review); db.flush()
        db.add(ReviewAnalysis(review_id=review.id, **analyze(text, rating, text.lower() in seen)))
        seen.add(text.lower()); imported += 1; product_ids.add(product.id)
        if index % 250 == 0:
            job.progress = min(95, 5 + int(index / estimated_rows * 90))
            job.message = f"Analyzed {imported:,} reviews across {len(product_ids):,} products"
            db.commit()
    if not imported:
        raise ValueError("No valid review rows were found. Check that Score is between 1 and 5 and that Text or Summary contains content.")
    job.status, job.progress = "complete", 100
    job.message = f"Imported {imported:,} reviews across {len(product_ids):,} products ({skipped:,} skipped)"
    db.commit()

def _category_for(reviews: list[Review]) -> str:
    corpus = " ".join(review.text.lower() for review in reviews)
    categories = [
        ("Pet food & supplies", ("dog", "cat", "pet", "labrador", "puppy")),
        ("Food & beverage", ("food", "snack", "coffee", "tea", "peanut", "flavor", "taste")),
        ("Consumer electronics", ("battery", "charger", "screen", "device", "phone")),
        ("Health & personal care", ("skin", "vitamin", "health", "supplement")),
    ]
    return next((label for label, signals in categories if any(signal in corpus for signal in signals)), "Imported product")

def _aspect_explanation(name: str, item: dict) -> str:
    positive, negative, mentions = item["positive"], item["negative"], item["mentions"]
    label = DISPLAY_NAMES.get(name, name.replace("_", " ")).lower()
    if positive > negative:
        return f"Customers are largely positive about {label} ({positive}% positive across {mentions} mention{'s' if mentions != 1 else ''})."
    if negative > positive:
        return f"{label.title()} needs attention: {negative}% of its {mentions} mention{'s' if mentions != 1 else ''} are negative."
    return f"{label.title()} has mixed evidence across {mentions} mention{'s' if mentions != 1 else ''}."

ASPECT_RECOMMENDATION_TEMPLATES = {
    "quality": {
        "problem": "Product Quality & Consistency Variance",
        "action": "Audit supplier ingredient and material batches, enforce stricter production QA tolerances, and standardize recipe formulation.",
        "impact": "Reduces quality-related returns and elevates customer satisfaction across core usage.",
    },
    "delivery": {
        "problem": "Fulfillment Accuracy & Packaging Logistics",
        "action": "Audit SKU fulfillment barcodes at dispatch, partner with tier-1 logistics carriers, and provide automated tracking alerts.",
        "impact": "Eliminates mismatched product shipments, lowers shipping anxiety, and restores delivery confidence.",
    },
    "packaging": {
        "problem": "Container Seal Integrity & Transit Protection",
        "action": "Upgrade to reinforced tamper-evident barrier seals and add protective corrugated padding in transit boxes.",
        "impact": "Prevents leaks, container crushing, and product spoilage upon customer unboxing.",
    },
    "price_value": {
        "problem": "Price-to-Value & Portion Sizing Friction",
        "action": "Introduce multi-pack value options, clarify net servings clearly on the front label, and emphasize premium quality sourcing.",
        "impact": "Improves perceived buyer value and accelerates repeat reorder rates.",
    },
    "durability": {
        "problem": "Structural Durability & Material Longevity",
        "action": "Reinforce high-stress mechanical joints, use higher-grade wear-resistant materials, and test under rigorous stress conditions.",
        "impact": "Decreases breakage reports, lowers warranty claims, and improves long-term reliability ratings.",
    },
    "performance": {
        "problem": "Operational Efficiency & Functional Reliability",
        "action": "Eliminate functional bottlenecks, optimize core mechanism throughput, and ensure predictable operation.",
        "impact": "Prevents user frustration and boosts overall product reliability ratings.",
    },
    "ease_of_use": {
        "problem": "Usability Complexity & Onboarding Friction",
        "action": "Include concise visual quick-start documentation, streamline initial setup steps, and simplify daily handling.",
        "impact": "Reduces user onboarding errors and lowers avoidable product returns.",
    },
    "customer_support": {
        "problem": "Customer Support Response Speed & Resolution Friction",
        "action": "Implement a guaranteed 24-hour response SLA, empower agents with 1-click replacement workflows, and expand self-service FAQs.",
        "impact": "Recovers at-risk customers, resolving negative experiences before they result in negative public reviews.",
    },
    "battery": {
        "problem": "Battery Runtime & Power Consumption",
        "action": "Upgrade to higher-density battery chemistry, optimize standby firmware power management, and support rapid charging.",
        "impact": "Substantially cuts battery drain complaints and extends daily continuous use.",
    },
    "comfort": {
        "problem": "Ergonomic Fit & Physical Comfort",
        "action": "Redesign physical contact surfaces with softer ergonomic materials and contouring to reduce strain.",
        "impact": "Improves comfort during extended use and strengthens positive user reviews.",
    },
    "features": {
        "problem": "Feature Gaps & Missing Core Functionality",
        "action": "Incorporate most-requested customer capabilities in upcoming product revisions and clarify specifications.",
        "impact": "Closes feature gaps with competitive alternatives and expands user versatility.",
    },
    "design": {
        "problem": "Aesthetic Finish & Form Factor Polish",
        "action": "Refine exterior textures, modernize visual proportions, and eliminate fragile design elements.",
        "impact": "Elevates premium aesthetic perception and first-impression delight.",
    },
}

def _generate_recommendations(aspect_insights: list[dict], reviews: list[Review]) -> list[dict]:
    """Generate prioritized, evidence-grounded product improvement recommendations based ONLY on actual review data."""
    recommendations = []
    priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}

    for aspect in aspect_insights:
        key = aspect["key"]
        mentions = aspect["mentions"]
        negative_count = aspect.get("negative_count", 0)
        negative_pct = aspect.get("negative", 0)
        display_name = aspect.get("name", key.replace("_", " ").title())
        template = ASPECT_RECOMMENDATION_TEMPLATES.get(key, {
            "problem": f"{display_name} Performance Friction",
            "action": f"Review customer feedback regarding {display_name.lower()} and calibrate design specifications.",
            "impact": f"Improves {display_name.lower()} ratings and customer retention.",
        })

        aspect_reviews = [r for r in reviews if key in detect_aspects(r.text)]
        negative_reviews = [r for r in aspect_reviews if (r.analysis and r.analysis.sentiment == "negative") or r.rating <= 3.0]
        avg_rating_in_aspect = sum(r.rating for r in aspect_reviews) / len(aspect_reviews) if aspect_reviews else 3.0

        if negative_count > 0 or negative_reviews:
            sample_quote = ""
            if negative_reviews:
                best_neg = max(negative_reviews, key=lambda r: len(r.text))
                raw_snippet = best_neg.text.strip().replace("\n", " ")
                sample_quote = (raw_snippet[:127] + "...") if len(raw_snippet) > 130 else raw_snippet

            if (negative_pct >= 40 and avg_rating_in_aspect <= 2.5) or (negative_pct >= 50 and mentions >= 1):
                p_label, p_level, p_badge = "Critical", "critical", "🔴 Critical"
            elif negative_pct >= 25 or (key in ("quality", "performance", "durability", "delivery") and negative_count >= 1):
                p_label, p_level, p_badge = "High", "high", "🟠 High"
            elif negative_pct >= 10 or mentions >= 2:
                p_label, p_level, p_badge = "Medium", "medium", "🟡 Medium"
            else:
                p_label, p_level, p_badge = "Low", "low", "🟢 Low"

            evidence_parts = []
            if sample_quote:
                evidence_parts.append(f'"{sample_quote}"')
            evidence_parts.append(f"{negative_pct}% negative across {mentions} mention{'s' if mentions != 1 else ''} (avg rating: {round(avg_rating_in_aspect, 1)}/5)")
            evidence_str = " · ".join(evidence_parts)

            recommendations.append({
                "id": f"rec-{key}",
                "aspect": display_name,
                "problem": template["problem"],
                "evidence": evidence_str,
                "recommendation": template["action"],
                "impact": template["impact"],
                "priority": p_label,
                "priority_level": p_level,
                "priority_badge": p_badge,
                "mentions": mentions,
                "negative_count": negative_count,
                "negative_percentage": negative_pct,
                "aspect_score": aspect.get("score", 50),
            })

    if not recommendations and reviews:
        sample_positive = max(reviews, key=lambda r: len(r.text)).text.strip().replace("\n", " ")
        if len(sample_positive) > 130:
            sample_positive = sample_positive[:127] + "..."
        recommendations.append({
            "id": "rec-quality-sustain",
            "aspect": "Overall Quality",
            "problem": "Sustain Current Formulation & Sourcing Standards",
            "evidence": f'"{sample_positive}" · 100% positive/neutral satisfaction across {len(reviews)} analyzed reviews',
            "recommendation": "Preserve current supplier relationships and highlight strong customer satisfaction in marketing collateral.",
            "impact": "Maintains high customer retention and industry-leading AI product score.",
            "priority": "Low",
            "priority_level": "low",
            "priority_badge": "🟢 Low",
            "mentions": len(reviews),
            "negative_count": 0,
            "negative_percentage": 0,
            "aspect_score": 100,
        })

    recommendations.sort(
        key=lambda item: (
            priority_order.get(item["priority_level"], 0),
            item["negative_percentage"],
            item["mentions"],
        ),
        reverse=True,
    )
    return recommendations

def _generate_roadmap(aspect_insights: list[dict], recommendations: list[dict], reviews: list[Review]) -> dict:
    """Generate structured Product Improvement Roadmap with stages and priority rationale."""
    total_opportunities = len(recommendations)
    critical_count = sum(1 for r in recommendations if r["priority_level"] == "critical")
    high_count = sum(1 for r in recommendations if r["priority_level"] == "high")
    medium_count = sum(1 for r in recommendations if r["priority_level"] == "medium")
    low_count = sum(1 for r in recommendations if r["priority_level"] == "low")

    neg_aspects = [a for a in aspect_insights if a.get("negative_count", 0) > 0 or a.get("score", 100) < 70]
    if neg_aspects:
        major_category = max(neg_aspects, key=lambda a: (a.get("negative_count", 0), 100 - a.get("score", 100)))["name"]
    elif aspect_insights:
        major_category = aspect_insights[0]["name"]
    else:
        major_category = "Overall Quality"

    most_important_action = recommendations[0]["recommendation"] if recommendations else "Maintain current product quality standards."

    pipeline_items = []
    for rec in recommendations:
        plevel = rec["priority_level"]
        if plevel == "critical":
            stage = "Immediate"
            stage_key = "immediate"
            stage_timeline = "Phase 1 · Immediate (0–30 Days)"
            reason = f"Severe customer dissatisfaction impact ({rec.get('negative_percentage', 0)}% negative mentions) causing 1-star review drag."
        elif plevel == "high":
            stage = "Short Term"
            stage_key = "short_term"
            stage_timeline = "Phase 2 · Short Term (30–90 Days)"
            reason = f"Frequent customer friction in {rec['aspect']} affecting overall repurchase rate."
        elif plevel == "medium":
            stage = "Short Term"
            stage_key = "short_term"
            stage_timeline = "Phase 2 · Short Term (30–90 Days)"
            reason = f"Secondary operational/functional enhancement to improve customer convenience."
        else:
            stage = "Long Term"
            stage_key = "long_term"
            stage_timeline = "Phase 3 · Long Term (90+ Days)"
            reason = "Continuous quality assurance and brand loyalty reinforcement."

        pipeline_items.append({
            "id": f"road-{rec['id']}",
            "title": f"Resolve {rec['problem']}",
            "problem": rec["problem"],
            "aspect": rec["aspect"],
            "evidence": rec["evidence"],
            "recommendation": rec["recommendation"],
            "priority": rec["priority"],
            "priority_level": rec["priority_level"],
            "priority_badge": rec["priority_badge"],
            "impact": rec["impact"],
            "reason_for_priority": reason,
            "stage": stage,
            "stage_key": stage_key,
            "stage_timeline": stage_timeline,
            "mentions": rec.get("mentions", 0),
            "negative_percentage": rec.get("negative_percentage", 0),
        })

    fix_first = [
        {
            "id": item["id"],
            "problem": item["problem"],
            "aspect": item["aspect"],
            "why_it_matters": item["reason_for_priority"],
            "evidence": item["evidence"],
            "recommended_action": item["recommendation"],
            "expected_impact": item["impact"],
            "priority": item["priority"],
            "priority_level": item["priority_level"],
            "priority_badge": item["priority_badge"],
            "stage": item["stage"],
        }
        for item in pipeline_items[:3]
    ]

    return {
        "overview": {
            "total_opportunities": total_opportunities,
            "critical_count": critical_count,
            "high_count": high_count,
            "medium_count": medium_count,
            "low_count": low_count,
            "major_category": major_category,
            "most_important_action": most_important_action,
        },
        "pipeline": pipeline_items,
        "fix_first": fix_first,
    }

def _generate_customer_voice(aspect_insights: list[dict], reviews: list[Review], sentiments: dict, total: int) -> dict:
    """Generate Customer Voice intelligence from actual review evidence."""
    pos_count = sentiments["positive"]
    neu_count = sentiments["neutral"]
    neg_count = sentiments["negative"]
    pos_pct = round(pos_count / total * 100) if total else 0
    neu_pct = round(neu_count / total * 100) if total else 0
    neg_pct = round(neg_count / total * 100) if total else 0

    themes = []
    for a in aspect_insights:
        sentiment_label = "positive" if a["score"] >= 65 else "negative" if a["score"] <= 45 else "mixed"
        impact_desc = "Primary positive rating driver" if sentiment_label == "positive" else "Critical complaint vector" if sentiment_label == "negative" else "Mixed sentiment feedback"
        themes.append({
            "name": a["name"],
            "key": a["key"],
            "mentions": a["mentions"],
            "sentiment": sentiment_label,
            "score": a["score"],
            "positive_pct": a["positive"],
            "negative_pct": a["negative"],
            "neutral_pct": a["neutral"],
            "impact": impact_desc,
            "evidence": a["explanation"],
        })

    customers_love = []
    for a in aspect_insights:
        if a["positive_count"] > 0 and a["score"] >= 50:
            pos_reviews = [r for r in reviews if a["key"] in detect_aspects(r.text) and r.rating >= 4]
            sample = ""
            if pos_reviews:
                raw = pos_reviews[0].text.strip().replace("\n", " ")
                sample = (raw[:120] + "...") if len(raw) > 120 else raw
            customers_love.append({
                "feature": a["name"],
                "positive_pct": a["positive"],
                "mentions": a["mentions"],
                "score": a["score"],
                "evidence": sample or f"{a['positive']}% positive feedback across {a['mentions']} mentions.",
                "why_valued": f"Customers strongly appreciate {a['name'].lower()}, driving high 4 and 5-star review ratings.",
            })
    customers_love.sort(key=lambda x: (x["score"], x["mentions"]), reverse=True)

    customers_dislike = []
    for a in aspect_insights:
        if a["negative_count"] > 0 or a["score"] < 60:
            neg_reviews = [r for r in reviews if a["key"] in detect_aspects(r.text) and (r.rating <= 3 or (r.analysis and r.analysis.sentiment == "negative"))]
            sample = ""
            if neg_reviews:
                raw = neg_reviews[0].text.strip().replace("\n", " ")
                sample = (raw[:120] + "...") if len(raw) > 120 else raw
            customers_dislike.append({
                "problem": f"{a['name']} Deficiencies",
                "aspect": a["name"],
                "frequency": a["mentions"],
                "negative_pct": a["negative"],
                "evidence": sample or f"{a['negative']}% of mentions cite dissatisfaction.",
                "potential_impact": f"Negatively impacts brand trust and creates review churn.",
            })
    customers_dislike.sort(key=lambda x: (x["negative_pct"], x["frequency"]), reverse=True)

    most_discussed = max(aspect_insights, key=lambda x: x["mentions"])["name"] if aspect_insights else "Overall Product"
    most_positive = max(aspect_insights, key=lambda x: x["score"])["name"] if aspect_insights else "Overall Quality"
    most_negative = min(aspect_insights, key=lambda x: x["score"])["name"] if aspect_insights else "None detected"
    neg_with_mentions = [a for a in aspect_insights if a.get("negative_count", 0) > 0]
    biggest_complaint = max(neg_with_mentions, key=lambda x: x["negative_count"])["name"] if neg_with_mentions else "None"
    opportunity = max(aspect_insights, key=lambda x: (x["mentions"], 100 - x["score"]))["name"] if aspect_insights else "Overall Expansion"

    customer_priorities = {
        "most_discussed_aspect": most_discussed,
        "most_positive_aspect": most_positive,
        "most_negative_aspect": most_negative,
        "biggest_complaint_area": biggest_complaint,
        "biggest_opportunity": opportunity,
    }

    review_wall = [
        {
            "id": r.id,
            "rating": r.rating,
            "title": r.title or "Verified Review",
            "text": r.text,
            "sentiment": r.analysis.sentiment if r.analysis else "neutral",
            "emotion": r.analysis.emotion if r.analysis else "neutral",
            "credibility": r.analysis.credibility if r.analysis else 90,
            "keywords": json.loads(r.analysis.keywords_json) if r.analysis and r.analysis.keywords_json else [],
            "date": r.reviewed_at.strftime("%b %d, %Y") if r.reviewed_at else None,
        }
        for r in reviews[:12]
    ]

    return {
        "sentiment_breakdown": {
            "positive_count": pos_count,
            "neutral_count": neu_count,
            "negative_count": neg_count,
            "positive_pct": pos_pct,
            "neutral_pct": neu_pct,
            "negative_pct": neg_pct,
            "total_reviews": total,
        },
        "themes": themes,
        "customers_love": customers_love,
        "customers_dislike": customers_dislike,
        "priorities": customer_priorities,
        "review_wall": review_wall,
    }

def _generate_smart_insights(aspect_insights: list[dict], reviews: list[Review], ai_score: int, satisfaction: int, credibility: int, stars: float, sentiments: dict) -> dict:
    """Generate Smart Key Insights and concise Executive Summary answering key product questions."""
    insights = []
    total = len(reviews)

    top_aspects = sorted([a for a in aspect_insights if a["score"] >= 65], key=lambda a: (a["score"], a["mentions"]), reverse=True)
    if top_aspects:
        best = top_aspects[0]
        insights.append({
            "id": "ins-strength-1",
            "title": f"High Customer Praise for {best['name']}",
            "type": "Major Strength",
            "explanation": f"Customers consistently praise {best['name'].lower()}, with {best['positive']}% positive sentiment across {best['mentions']} verified mentions.",
            "supporting_metric": f"{best['score']}/100 Aspect Score · {best['positive']}% Positive",
            "evidence": best["explanation"],
            "impact_level": "High Impact",
            "priority": "High",
            "why_it_matters": "Core competitive differentiator and primary driver of 5-star customer ratings.",
        })

    weak_aspects = sorted([a for a in aspect_insights if a.get("negative_count", 0) > 0 or a["score"] < 60], key=lambda a: (a.get("negative_count", 0), 100 - a["score"]), reverse=True)
    if weak_aspects:
        worst = weak_aspects[0]
        insights.append({
            "id": "ins-weakness-1",
            "title": f"Friction Detected in {worst['name']}",
            "type": "Major Weakness",
            "explanation": f"{worst['name']} represents the largest concentration of customer dissatisfaction ({worst['negative']}% negative feedback).",
            "supporting_metric": f"{worst['score']}/100 Score · {worst['negative']}% Negative mentions",
            "evidence": worst["explanation"],
            "impact_level": "Critical Alert" if worst["score"] < 40 else "High Impact",
            "priority": "Critical" if worst["score"] < 40 else "High",
            "why_it_matters": "Directly causes rating reduction and is the primary reason for customer complaints.",
        })

    if satisfaction >= 70:
        insights.append({
            "id": "ins-sat-driver",
            "title": "Strong Positive Sentiment Health",
            "type": "Satisfaction Driver",
            "explanation": f"{satisfaction}% of all analyzed customer reviews express positive sentiment.",
            "supporting_metric": f"{satisfaction}% Positive Sentiment Ratio",
            "evidence": f"{sentiments['positive']} positive vs {sentiments['negative']} negative reviews across {total} total verified reviews.",
            "impact_level": "Positive Anchor",
            "priority": "Medium",
            "why_it_matters": "Indicates solid product-market fit and reliable customer retention foundation.",
        })
    else:
        insights.append({
            "id": "ins-sat-alert",
            "title": "Subdued Customer Satisfaction",
            "type": "Quality Concern",
            "explanation": f"Only {satisfaction}% of customer reviews reflect positive sentiment, indicating significant friction points.",
            "supporting_metric": f"{satisfaction}% Satisfaction · {sentiments['negative']} Negative Reviews",
            "evidence": f"Elevated negative review volume ({sentiments['negative']} out of {total} reviews).",
            "impact_level": "Critical Alert",
            "priority": "Critical",
            "why_it_matters": "Depresses word-of-mouth recommendations and risks churn to competitors.",
        })

    insights.append({
        "id": "ins-cred-audit",
        "title": "Verified Review Authenticity & Quality",
        "type": "Rating Mismatch" if credibility < 60 else "Satisfaction Driver",
        "explanation": f"Calculated review credibility score is {credibility}%, reflecting authentic customer feedback patterns.",
        "supporting_metric": f"{credibility}% Credibility Index",
        "evidence": "Evaluated for duplicate submissions, anomalous brevity, and extreme rating clustering.",
        "impact_level": "Medium Impact",
        "priority": "Low",
        "why_it_matters": "Ensures executive decisions are backed by genuine, trustworthy customer feedback.",
    })

    what_is_working = [f"Strong performance in {a['name']} ({a['score']}/100)" for a in top_aspects[:2]] or [f"Average customer star rating of {round(stars, 2)}/5"]
    what_is_failing = [f"Recurring complaints in {a['name']} ({a['negative']}% negative)" for a in weak_aspects[:2]] or ["No critical failure areas detected."]
    what_customers_care = [f"{a['name']} ({a['mentions']} mentions)" for a in sorted(aspect_insights, key=lambda x: x['mentions'], reverse=True)[:3]] or ["Overall product quality and price value"]
    what_should_improve = [f"Address {w['name'].lower()} to mitigate negative reviews" for w in weak_aspects[:2]] or ["Maintain current formulation and QA standards"]

    key_takeaways = {
        "what_is_working": what_is_working,
        "what_is_failing": what_is_failing,
        "what_customers_care_about": what_customers_care,
        "what_should_be_improved": what_should_improve,
    }

    return {
        "insights": insights,
        "key_takeaways": key_takeaways,
    }

def _score_explanation(ai_score: int, stars: float, satisfaction: int, credibility: int, aspects: list[dict]) -> str:
    strongest = next((aspect for aspect in aspects if aspect["mentions"]), None)
    base = f"The {ai_score}/100 AI score combines a {stars:.1f}/5 star rating, {satisfaction}% positive sentiment, and {credibility}% review credibility."
    if strongest:
        return f"{base} The most discussed area is {strongest['name'].lower()}, scored {strongest['score']}/100 from {strongest['mentions']} evidence-backed mentions."
    return f"{base} More aspect-specific review detail will sharpen the product diagnosis."

def product_analytics(db: Session, product_id: int):
    product = db.get(Product, product_id)
    reviews = db.query(Review).options(joinedload(Review.analysis)).filter_by(product_id=product_id).all()
    if not product or not reviews:
        return {"review_count": 0}

    sentiments = {name: 0 for name in ("positive", "neutral", "negative")}
    emotions: dict[str, int] = {}
    aspect_counts: dict[str, dict] = {}
    ratings = {str(rating): 0 for rating in range(1, 6)}
    trend: Counter = Counter()
    for review in reviews:
        analysis = review.analysis
        sentiments[analysis.sentiment] += 1
        emotions[analysis.emotion] = emotions.get(analysis.emotion, 0) + 1
        ratings[str(max(1, min(5, round(review.rating))))] += 1
        trend[review.reviewed_at.strftime("%b %Y")] += 1
        for aspect_name in detect_aspects(review.text):
            item = aspect_counts.setdefault(aspect_name, {"key": aspect_name, "name": DISPLAY_NAMES.get(aspect_name, aspect_name.replace("_", " ").title()), "positive_count": 0, "negative_count": 0, "neutral_count": 0, "mentions": 0})
            item[f"{analysis.sentiment}_count"] += 1
            item["mentions"] += 1

    total = len(reviews)
    average = lambda field: sum(getattr(review.analysis, field) for review in reviews) / total
    stars = sum(review.rating for review in reviews) / total
    satisfaction = round(sentiments["positive"] / total * 100)
    credibility = round(average("credibility"))
    ai_score = round(min(100, max(0, (stars / 5 * .30 + sentiments["positive"] / total * .25 + credibility / 100 * .20 + average("quality") / 100 * .10 + average("sentiment_intensity") * .15) * 100)))

    pred_sum = 0.0
    sentiment_sum = 0.0
    exact_count = 0
    within_one_count = 0
    mae_sum = 0.0
    for review in reviews:
        analysis = review.analysis
        pred_r = getattr(analysis, "predicted_rating", None) if analysis else None
        if pred_r is None or pred_r == 0:
            pred_r = round(max(1.0, min(5.0, 3.0 + (getattr(analysis, "sentiment_score", 0.0) * 2.0))), 1)
        pred_sum += pred_r
        sentiment_sum += getattr(analysis, "sentiment_score", 0.0) if analysis else 0.0
        diff = abs(pred_r - review.rating)
        mae_sum += diff
        if round(pred_r) == round(review.rating):
            exact_count += 1
        if diff <= 1.05:
            within_one_count += 1

    avg_predicted_rating = round(pred_sum / total, 2)
    avg_sentiment_score = round(sentiment_sum / total, 2)

    aspect_insights = []
    for item in aspect_counts.values():
        mentions = item["mentions"]
        positive = round(item["positive_count"] / mentions * 100)
        negative = round(item["negative_count"] / mentions * 100)
        neutral = 100 - positive - negative
        score = round((item["positive_count"] + item["neutral_count"] * .5) / mentions * 100)
        insight = {**item, "positive": positive, "negative": negative, "neutral": neutral, "score": score}
        insight["explanation"] = _aspect_explanation(item["key"], insight)
        aspect_insights.append(insight)
    aspect_insights.sort(key=lambda item: (item["mentions"], item["score"]), reverse=True)
    strengths = [item for item in sorted(aspect_insights, key=lambda item: item["score"], reverse=True) if item["mentions"]][:3]
    weaknesses = [item for item in sorted(aspect_insights, key=lambda item: item["score"]) if item["mentions"]][:3]
    dated_trend = [{"period": period, "reviews": count} for period, count in sorted(trend.items(), key=lambda pair: datetime.strptime(pair[0], "%b %Y"))]
    recommendation = "Highly recommended" if ai_score >= 75 else "Recommended with reservations" if ai_score >= 55 else "Consider alternatives"
    recommendations = _generate_recommendations(aspect_insights, reviews)
    roadmap = _generate_roadmap(aspect_insights, recommendations, reviews)
    customer_voice = _generate_customer_voice(aspect_insights, reviews, sentiments, total)
    smart_insights = _generate_smart_insights(aspect_insights, reviews, ai_score, satisfaction, credibility, stars, sentiments)

    high_cred = sum(1 for r in reviews if r.analysis.credibility >= 80)
    med_cred = sum(1 for r in reviews if 50 <= r.analysis.credibility < 80)
    low_cred = sum(1 for r in reviews if r.analysis.credibility < 50)
    avg_confidence = round(average("confidence"))
    credibility_distribution = [
        {"name": "High Authenticity (80–100%)", "value": high_cred, "percentage": round(high_cred / total * 100)},
        {"name": "Moderate (50–79%)", "value": med_cred, "percentage": round(med_cred / total * 100)},
        {"name": "Flagged Anomalies (<50%)", "value": low_cred, "percentage": round(low_cred / total * 100)},
    ]

    return {
        "product": {"id": product.id, "name": product.name, "external_id": product.external_id, "category": _category_for(reviews)},
        "review_count": total,
        "average_rating": round(stars, 2),
        "average_predicted_rating": avg_predicted_rating,
        "average_sentiment_score": avg_sentiment_score,
        "prediction_accuracy": {
            "exact_matches_pct": round(exact_count / total * 100, 1),
            "within_one_star_pct": round(within_one_count / total * 100, 1),
            "mae": round(mae_sum / total, 2),
        },
        "ai_score": ai_score,
        "satisfaction": satisfaction,
        "credibility": credibility,
        "avg_confidence": avg_confidence,
        "credibility_distribution": credibility_distribution,
        "recommendation": recommendation,
        "verdict": recommendation,
        "score_explanation": _score_explanation(ai_score, stars, satisfaction, credibility, aspect_insights),
        "sentiments": sentiments,
        "sentiment_comparison": [{"name": "Positive", "value": sentiments["positive"]}, {"name": "Negative", "value": sentiments["negative"]}],
        "rating_distribution": [{"rating": f"{rating} star", "count": ratings[str(rating)]} for rating in range(1, 6)],
        "review_trend": dated_trend,
        "emotions": emotions,
        "aspects": aspect_insights,
        "aspect_insights": aspect_insights,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "product_improvements": recommendations,
        "roadmap": roadmap,
        "customer_voice": customer_voice,
        "smart_insights": smart_insights,
    }

def dataset_overall_statistics(db: Session, product_id: int | None = None) -> dict:
    """Calculate aggregate review intelligence and rating prediction statistics across the dataset."""
    query = db.query(Review).options(joinedload(Review.analysis), joinedload(Review.product))
    if product_id:
        query = query.filter(Review.product_id == product_id)
    reviews = query.all()
    if not reviews:
        return {
            "total_reviews": 0,
            "total_products": 0,
            "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0, "positive_pct": 0, "neutral_pct": 0, "negative_pct": 0},
            "average_actual_rating": 0.0,
            "average_predicted_rating": 0.0,
            "average_sentiment_score": 0.0,
            "average_credibility": 0,
            "rating_distribution": [],
            "predicted_rating_distribution": [],
            "accuracy": {"exact_match_pct": 0, "within_one_star_pct": 0, "mae": 0.0},
            "top_aspects": [],
            "top_keywords": []
        }

    total = len(reviews)
    product_ids = set(r.product_id for r in reviews)
    sentiments = {"positive": 0, "neutral": 0, "negative": 0}
    actual_ratings = {str(i): 0 for i in range(1, 6)}
    pred_ratings = {str(i): 0 for i in range(1, 6)}
    
    total_sentiment_score = 0.0
    total_predicted_rating = 0.0
    total_actual_rating = 0.0
    total_credibility = 0.0
    
    exact_matches = 0
    within_one_star = 0
    mae_sum = 0.0

    all_aspects: dict[str, dict] = {}
    all_keywords: Counter = Counter()

    for r in reviews:
        analysis = r.analysis
        sent = analysis.sentiment if analysis else "neutral"
        sentiments[sent] = sentiments.get(sent, 0) + 1
        
        pred_r = getattr(analysis, "predicted_rating", None) if analysis else None
        if pred_r is None or pred_r == 0:
            pred_r = round(max(1.0, min(5.0, 3.0 + (getattr(analysis, "sentiment_score", 0.0) * 2.0))), 1)
        
        s_score = getattr(analysis, "sentiment_score", 0.0) if analysis else 0.0
        cred = getattr(analysis, "credibility", 90.0) if analysis else 90.0
        
        act_r = r.rating
        
        total_sentiment_score += s_score
        total_predicted_rating += pred_r
        total_actual_rating += act_r
        total_credibility += cred

        actual_ratings[str(max(1, min(5, round(act_r))))] += 1
        pred_ratings[str(max(1, min(5, round(pred_r))))] += 1

        diff = abs(pred_r - act_r)
        mae_sum += diff
        if round(pred_r) == round(act_r):
            exact_matches += 1
        if diff <= 1.05:
            within_one_star += 1

        if analysis and analysis.aspects_json:
            try:
                for asp in json.loads(analysis.aspects_json):
                    name = asp.get("name")
                    if name:
                        entry = all_aspects.setdefault(name, {"name": DISPLAY_NAMES.get(name, name.replace("_", " ").title()), "mentions": 0, "positive": 0, "negative": 0})
                        entry["mentions"] += 1
                        if asp.get("sentiment") == "positive": entry["positive"] += 1
                        elif asp.get("sentiment") == "negative": entry["negative"] += 1
            except Exception:
                pass

        if analysis and analysis.keywords_json:
            try:
                for kw in json.loads(analysis.keywords_json):
                    all_keywords[kw] += 1
            except Exception:
                pass

    return {
        "total_reviews": total,
        "total_products": len(product_ids),
        "sentiment_distribution": {
            "positive": sentiments["positive"],
            "neutral": sentiments["neutral"],
            "negative": sentiments["negative"],
            "positive_pct": round(sentiments["positive"] / total * 100, 1),
            "neutral_pct": round(sentiments["neutral"] / total * 100, 1),
            "negative_pct": round(sentiments["negative"] / total * 100, 1),
        },
        "average_actual_rating": round(total_actual_rating / total, 2),
        "average_predicted_rating": round(total_predicted_rating / total, 2),
        "average_sentiment_score": round(total_sentiment_score / total, 2),
        "average_credibility": round(total_credibility / total, 1),
        "rating_distribution": [{"rating": f"{k} star", "count": v, "pct": round(v / total * 100, 1)} for k, v in actual_ratings.items()],
        "predicted_rating_distribution": [{"rating": f"{k} star", "count": v, "pct": round(v / total * 100, 1)} for k, v in pred_ratings.items()],
        "accuracy": {
            "exact_match_pct": round(exact_matches / total * 100, 1),
            "within_one_star_pct": round(within_one_star / total * 100, 1),
            "mean_absolute_error": round(mae_sum / total, 2),
        },
        "top_aspects": sorted(all_aspects.values(), key=lambda x: x["mentions"], reverse=True)[:6],
        "top_keywords": [k for k, _ in all_keywords.most_common(8)],
    }

def product_comparison(db: Session, product_ids: list[int]) -> dict:
    """Compare multiple products side-by-side using real review intelligence data."""
    if not product_ids or len(product_ids) < 2:
        raise ValueError("Provide at least two product IDs for comparison.")

    products_data = []
    for pid in product_ids[:4]:
        analytics = product_analytics(db, pid)
        if analytics.get("review_count", 0) > 0:
            products_data.append(analytics)

    if len(products_data) < 2:
        return {
            "status": "insufficient_data",
            "message": "At least two products with analyzed reviews are required for side-by-side comparison.",
            "products": products_data,
            "aspect_matrix": [],
            "strengths_comparison": {"pA_wins": [], "pB_wins": []},
            "weaknesses_comparison": {},
            "verdict": "Insufficient data available to compare products.",
        }

    pA = products_data[0]
    pB = products_data[1]

    all_aspect_keys = set()
    for p in products_data:
        for a in p.get("aspects", []):
            all_aspect_keys.add(a["key"])

    aspect_matrix = []
    for key in sorted(all_aspect_keys):
        name = DISPLAY_NAMES.get(key, key.replace("_", " ").title())
        row = {"key": key, "name": name, "scores": {}}
        for p in products_data:
            p_aspect = next((a for a in p.get("aspects", []) if a["key"] == key), None)
            row["scores"][p["product"]["id"]] = {
                "score": p_aspect["score"] if p_aspect else None,
                "mentions": p_aspect["mentions"] if p_aspect else 0,
                "positive": p_aspect["positive"] if p_aspect else 0,
                "negative": p_aspect["negative"] if p_aspect else 0,
            }
        aspect_matrix.append(row)

    pA_wins = []
    pB_wins = []
    for row in aspect_matrix:
        sA = row["scores"].get(pA["product"]["id"], {}).get("score")
        sB = row["scores"].get(pB["product"]["id"], {}).get("score")
        if sA is not None and sB is not None:
            if sA > sB:
                pA_wins.append({
                    "aspect": row["name"],
                    "pA_score": sA,
                    "pB_score": sB,
                    "delta": sA - sB,
                    "evidence": f"{pA['product']['name']} leads in {row['name'].lower()} ({sA}/100 vs {sB}/100).",
                })
            elif sB > sA:
                pB_wins.append({
                    "aspect": row["name"],
                    "pA_score": sA,
                    "pB_score": sB,
                    "delta": sB - sA,
                    "evidence": f"{pB['product']['name']} leads in {row['name'].lower()} ({sB}/100 vs {sA}/100).",
                })

    weaknesses_comparison = {
        str(pA["product"]["id"]): [
            {"aspect": w["name"], "score": w["score"], "negative_pct": w["negative"], "evidence": w["explanation"]}
            for w in pA.get("weaknesses", [])
        ],
        str(pB["product"]["id"]): [
            {"aspect": w["name"], "score": w["score"], "negative_pct": w["negative"], "evidence": w["explanation"]}
            for w in pB.get("weaknesses", [])
        ],
    }

    score_diff = pA["ai_score"] - pB["ai_score"]
    if abs(score_diff) >= 5:
        leader = pA if score_diff > 0 else pB
        trailer = pB if score_diff > 0 else pA
        verdict = f"{leader['product']['name']} holds an overall performance lead with an AI Score of {leader['ai_score']}/100 (vs {trailer['ai_score']}/100) and {leader['satisfaction']}% customer satisfaction."
    else:
        verdict = f"Both products are competitively close ({pA['product']['name']} at {pA['ai_score']}/100 vs {pB['product']['name']} at {pB['ai_score']}/100). {pA['product']['name']} leads in {len(pA_wins)} aspect(s), while {pB['product']['name']} leads in {len(pB_wins)} aspect(s)."

    return {
        "status": "success",
        "products": products_data,
        "aspect_matrix": aspect_matrix,
        "strengths_comparison": {
            "pA_wins": pA_wins,
            "pB_wins": pB_wins,
        },
        "weaknesses_comparison": weaknesses_comparison,
        "verdict": verdict,
    }

def product_assistant_answer(data: dict, question: str) -> str:
    """A grounded local assistant: answers only from calculated product evidence."""
    question = question.strip().lower()
    if any(term in question for term in ("improve", "recommendation", "problem", "issue", "fix", "priority", "critical", "action")):
        recs = data.get("recommendations", [])
        if recs:
            top_rec = recs[0]
            summary_recs = "; ".join(f"[{r['priority_badge']}] {r['problem']}: {r['recommendation']}" for r in recs[:2])
            return f"Top improvement priorities based on review evidence: {summary_recs}. Key evidence: {top_rec['evidence']} (Expected impact: {top_rec['impact']})."
    aspects = data.get("aspect_insights", [])
    matched = next((item for item in aspects if item["key"].replace("_", " ") in question or item["name"].lower() in question), None)
    if matched:
        return f"{matched['name']} scores {matched['score']}/100 from {matched['mentions']} review mention{'s' if matched['mentions'] != 1 else ''}. {matched['explanation']}"
    if any(term in question for term in ("negative", "issue", "problem", "improve", "bad", "weak")):
        weak = data.get("weaknesses", [])
        if weak:
            return f"The clearest watch area is {weak[0]['name']} ({weak[0]['score']}/100). {weak[0]['explanation']}"
    if any(term in question for term in ("buy", "recommend", "worth", "verdict")):
        return f"{data['recommendation']}: the product scores {data['ai_score']}/100 with a {data['average_rating']}/5 rating and {data['satisfaction']}% positive sentiment. {data['score_explanation']}"
    if any(term in question for term in ("sentiment", "positive", "negative", "rating")):
        sentiments = data["sentiments"]
        return f"Sentiment evidence includes {sentiments['positive']} positive, {sentiments['neutral']} neutral, and {sentiments['negative']} negative reviews. The average rating is {data['average_rating']}/5."
    strongest = data.get("strengths", [])
    focus = strongest[0] if strongest else None
    extra = f" Strongest evidenced area: {focus['name']} at {focus['score']}/100." if focus else ""
    return f"Based on {data['review_count']} analyzed reviews, {data['score_explanation']}{extra} Ask about sentiment, recommendation, or a specific product aspect for a focused answer."
