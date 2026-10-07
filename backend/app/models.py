from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), default="Imported product")
    reviews: Mapped[list["Review"]] = relationship(back_populates="product", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(120), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    author: Mapped[str | None] = mapped_column(String(160), nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    rating: Mapped[float] = mapped_column(Float)
    helpful_votes: Mapped[int] = mapped_column(Integer, default=0)
    total_votes: Mapped[int] = mapped_column(Integer, default=0)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    product: Mapped[Product] = relationship(back_populates="reviews")
    analysis: Mapped["ReviewAnalysis"] = relationship(back_populates="review", uselist=False, cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("external_id", "product_id", name="uq_review_external_product"),)

class ReviewAnalysis(Base):
    __tablename__ = "review_analyses"
    id: Mapped[int] = mapped_column(primary_key=True)
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id"), unique=True)
    sentiment: Mapped[str] = mapped_column(String(20))
    sentiment_score: Mapped[float] = mapped_column(Float, default=0.0)
    sentiment_intensity: Mapped[float] = mapped_column(Float)
    predicted_rating: Mapped[float] = mapped_column(Float, default=3.0)
    emotion: Mapped[str] = mapped_column(String(30))
    confidence: Mapped[float] = mapped_column(Float)
    credibility: Mapped[float] = mapped_column(Float)
    quality: Mapped[float] = mapped_column(Float)
    suspicious_probability: Mapped[float] = mapped_column(Float)
    aspects_json: Mapped[str] = mapped_column(Text, default="[]")
    keywords_json: Mapped[str] = mapped_column(Text, default="[]")
    explanation: Mapped[str] = mapped_column(Text, default="")
    review: Mapped[Review] = relationship(back_populates="analysis")

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(String(300), default="Waiting to start")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
