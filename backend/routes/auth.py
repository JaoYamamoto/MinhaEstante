from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _err(msg, status=400):
    return jsonify({"ok": False, "error": msg}), status

def _ok(data=None):
    return jsonify({"ok": True, **(data or {})}), 200


@auth_bp.post("/verify-otp")
def verify_otp():
    """Cria o usuário após verificação OTP bem-sucedida no frontend."""
    body     = request.get_json(silent=True) or {}
    email    = (body.get("email")    or "").strip().lower()
    username = (body.get("username") or "").strip()
    password =  body.get("password") or ""

    if not all([email, username, password]):
        return _err("Dados incompletos.")
    if len(password) < 8 or not any(c.isdigit() for c in password):
        return _err("Senha inválida.")
    if User.query.filter_by(email=email).first():
        return _err("Este e-mail já está cadastrado.")
    if User.query.filter_by(username=username).first():
        return _err("Este username já está em uso.")

    user = User(
        email=email,
        username=username,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()
    return _ok({"user": user.to_public()})


@auth_bp.post("/login")
def login():
    body     = request.get_json(silent=True) or {}
    email    = (body.get("email")    or "").strip().lower()
    password =  body.get("password") or ""

    if not email or not password:
        return _err("E-mail e senha são obrigatórios.")

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return _err("E-mail ou senha incorretos.", 401)

    return _ok({"user": user.to_public()})


@auth_bp.get("/check-email")
def check_email():
    email  = (request.args.get("email") or "").strip().lower()
    exists = bool(email and User.query.filter_by(email=email).first())
    return _ok({"exists": exists})


@auth_bp.get("/check-username")
def check_username():
    username = (request.args.get("username") or "").strip()
    exists   = bool(username and User.query.filter_by(username=username).first())
    return _ok({"exists": exists})
