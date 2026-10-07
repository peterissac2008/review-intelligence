import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./review_intelligence.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def init_schema():
    Base.metadata.create_all(bind=engine)
    if DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE review_analyses ADD COLUMN sentiment_score FLOAT DEFAULT 0.0"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE review_analyses ADD COLUMN predicted_rating FLOAT DEFAULT 3.0"))
                conn.commit()
            except Exception:
                pass

init_schema()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
