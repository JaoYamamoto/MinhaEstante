from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    books = db.relationship("Book", back_populates="user",
                            cascade="all, delete-orphan", lazy="dynamic")

    def to_public(self):
        return {
            "id":         self.id,
            "email":      self.email,
            "username":   self.username,
            "created_at": self.created_at.isoformat(),
        }


class Book(db.Model):
    __tablename__ = "books"

    id             = db.Column(db.Integer, primary_key=True)
    user_id        = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Identificador da Google Books (para referência)
    google_books_id = db.Column(db.String(50), nullable=True)

    # Campos editáveis pelo usuário
    title          = db.Column(db.String(512), nullable=False)
    authors        = db.Column(db.String(512), nullable=True)   # CSV: "Autor A, Autor B"
    publisher      = db.Column(db.String(256), nullable=True)
    published_date = db.Column(db.String(32),  nullable=True)
    description    = db.Column(db.Text,        nullable=True)
    page_count     = db.Column(db.Integer,     nullable=True)
    categories     = db.Column(db.String(512), nullable=True)   # CSV
    language       = db.Column(db.String(10),  nullable=True)
    cover_url      = db.Column(db.String(1024), nullable=True)

    # Status de leitura definido pelo usuário
    status         = db.Column(db.String(20), default="want_to_read")
    # Opções: "want_to_read" | "reading" | "read"

    added_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="books")

    def to_dict(self):
        return {
            "id":              self.id,
            "google_books_id": self.google_books_id,
            "title":           self.title,
            "authors":         self.authors,
            "publisher":       self.publisher,
            "published_date":  self.published_date,
            "description":     self.description,
            "page_count":      self.page_count,
            "categories":      self.categories,
            "language":        self.language,
            "cover_url":       self.cover_url,
            "status":          self.status,
            "added_at":        self.added_at.isoformat(),
            "updated_at":      self.updated_at.isoformat(),
        }
