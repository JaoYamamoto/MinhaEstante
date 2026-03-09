"""
Rotas de autenticação
─────────────────────
POST /auth/register        → valida dados, persiste registro pendente, retorna sucesso
POST /auth/verify-otp      → verifica código OTP (gerado no frontend via EmailJS),
                             cria o User no BD e devolve os dados do usuário
POST /auth/login           → autentica email + senha, devolve dados do usuário
GET  /auth/check-email     → verifica se e-mail já está cadastrado
GET  /auth/check-username  → verifica se username já está em uso
"""

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


# ── helpers ───────────────────────────────────────────────────────────────────

def _json_error(message: str, status: int = 400):
    return jsonify({"ok": False, "error": message}), status


def _json_ok(data: dict = None):
    payload = {"ok": True}
    if data:
        payload.update(data)
    return jsonify(payload), 200


def _validate_password(password: str):
    """Regras mínimas de senha."""
    if len(password) < 8:
        return "A senha deve ter no mínimo 8 caracteres."
    if not any(c.isdigit() for c in password):
        return "A senha deve conter ao menos um número."
    return None


# ── endpoints ─────────────────────────────────────────────────────────────────

@auth_bp.post("/register")
def register():
    """
    Valida os dados de cadastro ANTES de enviar o OTP.
    Não persiste nada ainda – o usuário só é salvo após verificar o OTP.
    """
    body = request.get_json(silent=True) or {}
    email    = (body.get("email")    or "").strip().lower()
    username = (body.get("username") or "").strip()
    password = body.get("password")  or ""

    # Validações básicas
    if not email or "@" not in email:
        return _json_error("E-mail inválido.")
    if not username or len(username) < 3:
        return _json_error("Username deve ter no mínimo 3 caracteres.")
    if not username.replace("_", "").replace(".", "").isalnum():
        return _json_error("Username só pode conter letras, números, _ e .")

    pwd_error = _validate_password(password)
    if pwd_error:
        return _json_error(pwd_error)

    # Unicidade
    if User.query.filter_by(email=email).first():
        return _json_error("Este e-mail já está cadastrado.")
    if User.query.filter_by(username=username).first():
        return _json_error("Este username já está em uso.")

    # Tudo ok – o frontend pode agora disparar o OTP via EmailJS
    return _json_ok({"message": "Dados válidos. OTP pode ser enviado."})


@auth_bp.post("/verify-otp")
def verify_otp():
    """
    Chamado após o usuário inserir o código OTP correto no frontend.
    O frontend já verificou o código localmente (lib/otp.ts);
    aqui apenas persistimos o usuário no banco.
    """
    body = request.get_json(silent=True) or {}
    email    = (body.get("email")    or "").strip().lower()
    username = (body.get("username") or "").strip()
    password = body.get("password")  or ""

    if not all([email, username, password]):
        return _json_error("Dados incompletos.")

    # Dupla-checagem de unicidade (race condition safety)
    if User.query.filter_by(email=email).first():
        return _json_error("Este e-mail já está cadastrado.")
    if User.query.filter_by(username=username).first():
        return _json_error("Este username já está em uso.")

    pwd_error = _validate_password(password)
    if pwd_error:
        return _json_error(pwd_error)

    user = User(
        email         = email,
        username      = username,
        password_hash = generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()

    return _json_ok({"user": user.to_public()})


@auth_bp.post("/login")
def login():
    """Autentica com e-mail + senha."""
    body = request.get_json(silent=True) or {}
    email    = (body.get("email")    or "").strip().lower()
    password = body.get("password")  or ""

    if not email or not password:
        return _json_error("E-mail e senha são obrigatórios.")

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        # Mensagem genérica para não revelar quais e-mails existem
        return _json_error("E-mail ou senha incorretos.", 401)

    return _json_ok({"user": user.to_public()})


@auth_bp.get("/check-email")
def check_email():
    """Retorna se o e-mail já existe (para feedback em tempo real no cadastro)."""
    email = (request.args.get("email") or "").strip().lower()
    exists = bool(email and User.query.filter_by(email=email).first())
    return _json_ok({"exists": exists})


@auth_bp.get("/check-username")
def check_username():
    """Retorna se o username já existe (para feedback em tempo real no cadastro)."""
    username = (request.args.get("username") or "").strip()
    exists = bool(username and User.query.filter_by(username=username).first())
    return _json_ok({"exists": exists})
