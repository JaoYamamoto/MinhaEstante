"""
Rotas de livros (CRUD)
──────────────────────
GET    /books?user_id=         → lista os livros do usuário
POST   /books                  → adiciona um livro
PUT    /books/<id>             → edita um livro
DELETE /books/<id>             → remove um livro
"""

from flask import Blueprint, request, jsonify
from extensions import db
from models import Book, User

books_bp = Blueprint("books", __name__, url_prefix="/books")

VALID_STATUSES = {"want_to_read", "reading", "read"}
EDITABLE_FIELDS = [
    "title", "authors", "publisher", "published_date",
    "description", "page_count", "categories",
    "language", "cover_url", "status",
]


def _err(msg, status=400):
    return jsonify({"ok": False, "error": msg}), status

def _ok(data=None):
    return jsonify({"ok": True, **(data or {})}), 200


# ── GET /books?user_id=X ─────────────────────────────────────────────────────
@books_bp.get("")
def list_books():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return _err("user_id é obrigatório.")

    books = (
        Book.query
        .filter_by(user_id=user_id)
        .order_by(Book.added_at.desc())
        .all()
    )
    return _ok({"books": [b.to_dict() for b in books]})


# ── POST /books ───────────────────────────────────────────────────────────────
@books_bp.post("")
def add_book():
    body    = request.get_json(silent=True) or {}
    user_id = body.get("user_id")
    title   = (body.get("title") or "").strip()

    if not user_id or not title:
        return _err("user_id e title são obrigatórios.")
    if not User.query.get(user_id):
        return _err("Usuário não encontrado.", 404)

    status = body.get("status", "want_to_read")
    if status not in VALID_STATUSES:
        status = "want_to_read"

    book = Book(
        user_id        = user_id,
        google_books_id= body.get("google_books_id"),
        title          = title,
        authors        = body.get("authors"),
        publisher      = body.get("publisher"),
        published_date = body.get("published_date"),
        description    = body.get("description"),
        page_count     = body.get("page_count"),
        categories     = body.get("categories"),
        language       = body.get("language"),
        cover_url      = body.get("cover_url"),
        status         = status,
    )
    db.session.add(book)
    db.session.commit()
    return _ok({"book": book.to_dict()})


# ── PUT /books/<id> ───────────────────────────────────────────────────────────
@books_bp.put("/<int:book_id>")
def update_book(book_id):
    body    = request.get_json(silent=True) or {}
    user_id = body.get("user_id")

    book = Book.query.get(book_id)
    if not book:
        return _err("Livro não encontrado.", 404)
    if book.user_id != user_id:
        return _err("Sem permissão.", 403)

    for field in EDITABLE_FIELDS:
        if field in body:
            if field == "status" and body[field] not in VALID_STATUSES:
                continue
            setattr(book, field, body[field])

    db.session.commit()
    return _ok({"book": book.to_dict()})


# ── DELETE /books/<id> ────────────────────────────────────────────────────────
@books_bp.delete("/<int:book_id>")
def delete_book(book_id):
    user_id = request.args.get("user_id", type=int)

    book = Book.query.get(book_id)
    if not book:
        return _err("Livro não encontrado.", 404)
    if book.user_id != user_id:
        return _err("Sem permissão.", 403)

    db.session.delete(book)
    db.session.commit()
    return _ok({"message": "Livro removido."})
