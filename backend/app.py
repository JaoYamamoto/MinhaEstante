"""
Para rodar:
    cd backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    python app.py
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db
from routes.auth import auth_bp
from routes.books import books_bp

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"]                     = os.environ["SECRET_KEY"]
    app.config["SQLALCHEMY_DATABASE_URI"]        = os.getenv("DATABASE_URL", "sqlite:///minha_estante.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    CORS(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(books_bp)

    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
