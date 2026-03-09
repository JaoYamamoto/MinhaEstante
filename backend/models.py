from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username   = db.Column(db.String(80),  unique=True, nullable=False)
    # hash bcrypt da senha (werkzeug.security)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_public(self):
        """Retorna apenas os campos seguros para enviar ao cliente."""
        return {
            "id":         self.id,
            "email":      self.email,
            "username":   self.username,
            "created_at": self.created_at.isoformat(),
        }
