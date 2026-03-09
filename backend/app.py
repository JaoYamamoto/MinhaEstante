"""
Ponto de entrada do backend – Flask app factory.

Para rodar em desenvolvimento:
    cd backend
    python -m venv .venv
    source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
    pip install -r requirements.txt
    python app.py
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from extensions import db
from routes.auth import auth_bp

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    # ── Configuração ─────────────────────────────────────────────────────
    app.config["SECRET_KEY"]                  = os.environ["SECRET_KEY"]
    app.config["SQLALCHEMY_DATABASE_URI"]     = os.getenv("DATABASE_URL", "sqlite:///minha_estante.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ── Extensões ────────────────────────────────────────────────────────
    db.init_app(app)
    CORS(app, origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")])

    # ── Blueprints ───────────────────────────────────────────────────────
    app.register_blueprint(auth_bp)

    # ── Cria tabelas se não existirem ────────────────────────────────────
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(debug=True, port=5000)
