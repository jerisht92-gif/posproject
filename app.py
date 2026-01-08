# =============
# ✅ IMPORTS 
# ============
from flask import Flask, render_template, request, jsonify, session, url_for, redirect, flash, send_from_directory, send_file
from flask_cors import CORS
import smtplib
import random
import json
import os
import time
from datetime import timedelta
import uuid
import re
import ssl
import csv
import io
from email.mime.text import MIMEText
from werkzeug.utils import secure_filename
import pandas as pd
from openpyxl import load_workbook
from openpyxl.worksheet.datavalidation import DataValidation

# =========================================
# ✅ EMAIL SENDER (SMTP / UNIVERSAL)
# =========================================
def send_email_universal(to_email, subject, body, from_email, password):
    """Send email using Gmail SMTP only."""
    smtp_server = "smtp.gmail.com"
    port = 587
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(smtp_server, port) as server:
            server.starttls(context=context)
            server.login(from_email, password)
            server.sendmail(from_email, to_email, msg.as_string())
        return True

    except Exception as e:
        print("❌ Email send error:", e)
        return False


# =========================================
# ✅ FLASK APP SETUP
# =========================================
app = Flask(__name__)
CORS(app)


# =========================================
# ✅ SESSION SETTINGS & GLOBAL CONSTANTS
# =========================================
app.secret_key = "supersecretkey"
app.permanent_session_lifetime = timedelta(days=7)     # for Remember Me
# Inactivity timeout for normal sessions (in seconds)
# 10 minutes = 600 seconds
INACTIVITY_TIMEOUT = 600


# =========================================
# ✅ FILE PATH CONSTANTS (JSON FILES)
# =========================================
USER_FILE = os.path.join(app.root_path, "users.json")
ROLE_FILE = os.path.join(app.root_path, "roles.json")
FAILED_ATTEMPTS_FILE = os.path.join(app.root_path, "failed_attempts.json")
OTP_FILE = os.path.join(app.root_path, "email_otps.json")
DEPARTMENT_FILE = os.path.join(app.root_path, "departments.json")
UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")
PRODUCT_FILE = os.path.join(app.root_path, "product.json")
CATEGORY_FILE = os.path.join(app.root_path, "product_categories.json")
TAX_CODE_FILE = os.path.join(app.root_path, "product_tax_codes.json")
UOM_FILE = os.path.join(app.root_path, "product_uoms.json")
WAREHOUSE_FILE = os.path.join(app.root_path, "product_warehouses.json")
SIZE_FILE = os.path.join(app.root_path, "product_sizes.json")
COLOR_FILE = os.path.join(app.root_path, "product_colors.json")
SUPPLIER_FILE = os.path.join(app.root_path, "product_suppliers.json")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =========================================
# ✅ EMAIL CONFIG
# =========================================
EMAIL_ADDRESS = "amritha2025j@gmail.com"
EMAIL_PASSWORD = "szwwyraaobpbrcpd"


# =========================================
# ✅ FORGOT PASSWORD + LOCKOUT CONFIG
# =========================================
BASE_URL = "https://anithag.pythonanywhere.com"
RESET_SEND_COUNT = {}
MAX_RESET_SENDS = 5
LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION = 120  # seconds
RESET_TOKENS = {}
RESET_LOCK = {}
RESET_TOKEN_EXPIRY = 600


# =========================================
# ✅ REGEX VALIDATION RULES
# =========================================
EMAIL_REGEX = re.compile(
    r"^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|thestackly\.com|stackly\.in)$",
    re.IGNORECASE
)

MAX_EMAIL_LENGTH = 40
PHONE_REGEX = re.compile(r"^[0-9]{10}$")
NAME_REGEX = re.compile(r"^[A-Za-z\s]{3,20}$")


# =========================================
# ✅ GLOBAL BEFORE_REQUEST
#   - AUTO SESSION TIMEOUT CHECK
# =========================================
@app.before_request
def auto_session_timeout():
    allowed_paths = [
        "/",                     # root
        "/login",
        "/signup",
        "/forgot-password",
        "/check-email",
        "/check-your-mail",
        "/reset-password",
        "/send_otp",
        "/verify_otp",
        "/send-reset-link",
        "/static",
    ]

    # allow static files
    if request.path.startswith("/static/"):
        return

    # allow the routes above
    if request.path in allowed_paths:
        return

    # for all other pages → check session timeout
    if not check_session_timeout():
        return redirect(url_for("login", message="session_expired"))

    # =========================================
    # ✅ INNER LINK RESTRICTION
    #   - Prevent direct URL / new-tab access to
    #     internal pages without coming from
    #     another page inside the app.
    #   - Skip APIs and AJAX JSON endpoints.
    # =========================================
    # Only apply for normal HTML GET requests
    if request.method == "GET" and not request.path.startswith("/api/"):
        ref = request.referrer or ""
        # host_url example: "http://127.0.0.1:5000/"
        base = (request.host_url or "").rstrip("/")

        # If there is no referrer or it is from outside this app,
        # block direct navigation and send user to login.
        if (not ref) or (base and not ref.startswith(base)):
            return redirect(url_for("login", message="invalid_navigation"))


# =========================================
# ✅ SESSION DEFAULT HELPERS
# =========================================
def ensure_role():
    if "user" in session and "role" not in session:
        session["role"] = "user"


# =========================================
# ✅ JSON HELPERS
# =========================================
def load_users():
    """Read users from users.json as a list of dicts."""
    if not os.path.exists(USER_FILE):
        return []
    with open(USER_FILE, "r") as f:
        try:
            data = json.load(f)
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return list(data.values())
            return []
        except json.JSONDecodeError:
            return []


def load_roles():
    if not os.path.exists(ROLE_FILE):
        return []
    with open(ROLE_FILE, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return list(data.values())
            return []
        except json.JSONDecodeError:
            return []


def save_users(data):
    """Write users back to users.json as list."""
    if isinstance(data, dict):
        data = list(data.values())
    with open(USER_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_failed_attempts():
    if os.path.exists(FAILED_ATTEMPTS_FILE):
        try:
            with open(FAILED_ATTEMPTS_FILE, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}


def save_failed_attempts(data):
    with open(FAILED_ATTEMPTS_FILE, "w") as f:
        json.dump(data, f)


# =========================================
# ✅ EMAIL WRAPPER HELPER
# =========================================
def send_email(to_email, subject, body):
    """Wrapper around universal email sender (supports Gmail, Outlook, Yahoo, etc.)."""
    try:
        return send_email_universal(
            to_email=to_email,
            subject=subject,
            body=body,
            from_email=EMAIL_ADDRESS,
            password=EMAIL_PASSWORD,
        )
    except Exception as e:
        print("Email send error:", e)
        return False


# =========================================
# ✅ OTP HELPERS
# =========================================
def load_otps():
    """Return dict: { email: {otp, verified, timestamp} }"""
    try:
        with open(OTP_FILE, "r") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
            return {}
    except FileNotFoundError:
        return {}


def save_otps(otps: dict):
    with open(OTP_FILE, "w") as f:
        json.dump(otps, f, indent=2)


def generate_otp():
    return str(random.randint(100000, 999999))



def save_otp_in_db(email, otp):
    """Store/overwrite OTP for this email, mark as not verified yet."""
    email = (email or "").strip().lower()
    otps = load_otps()
    otps[email] = {
        "otp": otp,
        "verified": False,
        "timestamp": time.time(),
    }
    save_otps(otps)


def verify_otp_in_db(email, otp, expiry_seconds=300):
    """
    Check OTP for email with expiry.
    If valid, mark as verified and return True.
    """
    email = (email or "").strip().lower()
    otps = load_otps()
    entry = otps.get(email)

    if not entry:
        return False

    now = time.time()
    if now - entry.get("timestamp", 0) > expiry_seconds:
        return False

    if entry.get("otp") != otp:
        return False

    entry["verified"] = True
    otps[email] = entry
    save_otps(otps)
    return True


def is_email_otp_verified(email: str) -> bool:
    """Used during signup to ensure email's OTP was verified."""
    email = (email or "").strip().lower()
    otps = load_otps()
    entry = otps.get(email)

    if not entry:
        return False

    max_age = 10 * 60
    if time.time() - entry.get("timestamp", 0) > max_age:
        return False

    return bool(entry.get("verified"))


def send_otp_email(to_email, otp):
    """Send the signup OTP using the universal email helper."""
    subject = "Your OTP Verification Code - Stackly POS"
    body = (
        f"Hi,\n\n"
        f"Your OTP for Stackly POS signup is: {otp}\n"
        f"It is valid for 5 minutes.\n\n"
        f"If you did not request this, you can ignore this email.\n\n"
        f"- Stackly Team"
    )
    send_email(to_email, subject, body)


# =========================================
# ✅ DEPARTMENT HELPERS
# =========================================
def load_departments():
    if not os.path.exists(DEPARTMENT_FILE):
        return []
    try:
        with open(DEPARTMENT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def save_departments(departments):
    with open(DEPARTMENT_FILE, "w", encoding="utf-8") as f:
        json.dump(departments, f, indent=2, ensure_ascii=False)


def load_products():
    
    if not os.path.exists(PRODUCT_FILE):
        return []

    try:
        with open(PRODUCT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        return []

    if isinstance(data, dict):
        data = [data]

    products = []
    for p in data:
        if not isinstance(p, dict):
            continue

        pid = p.get("product_id")
        if pid is None:
            continue
        # ✅ always keep IDs as string
        p["product_id"] = str(pid)

        products.append(p)

    return products


def save_products(products):
    with open(PRODUCT_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2)


def generate_product_id():
    """Generate a new numeric product_id as STRING: '101', '102', ..."""
    products = load_products()
    if not products:
        return "101"

    ids = []
    for p in products:
        pid = str(p.get("product_id", "")).strip()
        if pid.isdigit():
            ids.append(int(pid))

    return str(max(ids) + 1) if ids else "101"


# =========================================
# ✅ PRODUCT CATEGORY HELPERS
# =========================================
def load_product_categories():
    """
    Load saved product categories from JSON.
    Structure: [ { "product_type": "Electronics", "name": "Headphones" }, ... ]
    """
    if not os.path.exists(CATEGORY_FILE):
        return []
    try:
        with open(CATEGORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            cleaned = []
            for item in data:
                if not isinstance(item, dict):
                    continue
                name = (item.get("name") or "").strip()
                ptype = (item.get("product_type") or "").strip()
                if not name:
                    continue
                cleaned.append({"product_type": ptype, "name": name})
            return cleaned
        return []
    except json.JSONDecodeError:
        return []


def save_product_categories(categories):
    """Persist product categories list to JSON."""
    if not isinstance(categories, list):
        categories = []
    with open(CATEGORY_FILE, "w", encoding="utf-8") as f:
        json.dump(categories, f, indent=2, ensure_ascii=False)


# =========================================
# ✅ PRODUCT MASTER DROPDOWN HELPERS
#    (Tax codes, UOM, Warehouse, Size, Color, Supplier)
# =========================================
def _load_simple_list(path, cleaner):
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            return []
        cleaned = []
        for item in data:
            if not isinstance(item, dict):
                continue
            cleaned_item = cleaner(item)
            if cleaned_item:
                cleaned.append(cleaned_item)
        return cleaned
    except json.JSONDecodeError:
        return []


def _save_simple_list(path, items):
    if not isinstance(items, list):
        items = []
    with open(path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)


def load_tax_codes():
    def cleaner(item):
        name = (item.get("code") or "").strip()
        if not name:
            return None
        return {
            "code": name,
            "percent": float(item.get("percent", 0)),
            "description": (item.get("description") or "").strip(),
        }

    return _load_simple_list(TAX_CODE_FILE, cleaner)


def save_tax_codes(items):
    _save_simple_list(TAX_CODE_FILE, items)


def load_uoms():
    def cleaner(item):
        name = (item.get("name") or "").strip()
        if not name:
            return None
        try:
            items = int(item.get("items", 0))
        except (TypeError, ValueError):
            items = 0
        return {
            "name": name,
            "items": items,
            "description": (item.get("description") or "").strip(),
        }

    return _load_simple_list(UOM_FILE, cleaner)


def save_uoms(items):
    _save_simple_list(UOM_FILE, items)


def load_warehouses():
    def cleaner(item):
        name = (item.get("name") or "").strip()
        if not name:
            return None
        return {
            "name": name,
            "location": (item.get("location") or "").strip(),
            "manager": (item.get("manager") or "").strip(),
            "contact": (item.get("contact") or "").strip(),
            "notes": (item.get("notes") or "").strip(),
        }

    return _load_simple_list(WAREHOUSE_FILE, cleaner)


def save_warehouses(items):
    _save_simple_list(WAREHOUSE_FILE, items)


def load_sizes():
    def cleaner(item):
        name = (item.get("name") or "").strip()
        if not name:
            return None
        return {"name": name}

    return _load_simple_list(SIZE_FILE, cleaner)


def save_sizes(items):
    _save_simple_list(SIZE_FILE, items)


def load_colors():
    def cleaner(item):
        name = (item.get("name") or "").strip()
        if not name:
            return None
        return {"name": name}

    return _load_simple_list(COLOR_FILE, cleaner)


def save_colors(items):
    _save_simple_list(COLOR_FILE, items)


def load_suppliers():
    def cleaner(item):
        name = (item.get("name") or "").strip()
        if not name:
            return None
        return {
            "name": name,
            "contact": (item.get("contact") or "").strip(),
            "phone": (item.get("phone") or "").strip(),
            "email": (item.get("email") or "").strip(),
            "address": (item.get("address") or "").strip(),
        }

    return _load_simple_list(SUPPLIER_FILE, cleaner)


def save_suppliers(items):
    _save_simple_list(SUPPLIER_FILE, items)


# =========================================
# ✅ ROLE HELPERS
# =========================================
def save_roles(roles):
    with open(ROLE_FILE, "w", encoding="utf-8") as f:
        json.dump(roles, f, indent=2, ensure_ascii=False)


# =========================================
# ✅ GLOBAL AFTER_REQUEST HEADERS
# =========================================
@app.after_request
def set_security_headers(resp):
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0, private"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


# =========================================
# ✅ ROUTES: BASIC
# =========================================
@app.route("/")
def root():
    return redirect(url_for("login"))


# =========================================
# ✅ ROUTES: DASHBOARD + MAIN PAGES
# =========================================
@app.route("/dashboard")
def dashboard():
    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()

    user_name = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            break

    return render_template(
        "dashboard.html",
        page="dashboard",
        title="Dashboard",
        user_email=user_email,
        user_name=user_name,
    )


# =========================================
# ✅ ROUTES: AUTH PAGES (GET)
# =========================================
@app.route("/signup")
def home():
    return render_template("signup.html")


@app.route("/login")
def login():
    message = request.args.get("message", "")
    return render_template("index.html", message=message)


@app.route("/forgot-password")
def forgot_password():
    return render_template("forgot-password.html")


@app.route("/check-your-mail")
def check_your_mail_page():
    email = request.args.get("email", "")
    return render_template("check-your-mail.html", email=email)


# =========================================
# ✅ ROUTES: MANAGE USERS (UI)
# =========================================
@app.route("/manage-users")
def manage_users():
    user_email = session.get("user")
    if not user_email:
        # Check if JSON request
        if request.is_json or request.content_type == "application/json" or request.args.get("format") == "json":
            return jsonify({"success": False, "message": "Session expired"}), 401
        return redirect(url_for("login", message="session_expired"))

    users = load_users()

    user_name = "User"
    user_role = "User"

    current_email = (user_email or "").strip().lower()

    for u in users:
        if not isinstance(u, dict):
            continue

        u_email = (u.get("email") or "").strip().lower()
        if u_email == current_email:
            user_name = u.get("name") or "User"
            user_role = (u.get("role") or "User").strip()
            break

    print("DEBUG manage_users: email =", user_email, "role =", user_role)

    # Check if JSON response is requested
    is_json_request = (
        request.is_json or 
        request.content_type == "application/json" or 
        request.args.get("format") == "json" or
        request.headers.get("Accept") == "application/json"
    )

    if is_json_request:
        # Return JSON response for API/Postman
        return jsonify({
            "success": True,
            "users": users,
            "total": len(users),
            "current_user": {
                "email": user_email,
                "name": user_name,
                "role": user_role
            }
        }), 200

    # Return HTML response for browser
    return render_template(
        "manage-users.html",
        users=users,
        title="Manage Users - Stackly",
        page="manage_users",
        section="masters",
        user_email=user_email,
        user_name=user_name,
        user_role=user_role,
    )


# =========================================
# ✅ ROUTES: DEPARTMENT & ROLES (UI)
# =========================================
@app.route("/department-roles")
def department_roles():
    user_email = session.get("user")
    if not user_email:
        # Check if JSON request
        is_json_request = (
            request.is_json or 
            request.content_type == "application/json" or 
            request.args.get("format") == "json" or
            request.headers.get("Accept") == "application/json"
        )
        if is_json_request:
            return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
        return redirect(url_for("login", message="session_expired"))

    users = load_users()
    departments = load_departments()

    user_name = "User"
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            user_role = u.get("role") or "User"
            break

    # Check if JSON response is requested
    is_json_request = (
        request.is_json or 
        request.content_type == "application/json" or 
        request.args.get("format") == "json" or
        request.headers.get("Accept") == "application/json"
    )

    if is_json_request:
        # Return JSON response for API/Postman
        return jsonify({
            "success": True,
            "departments": departments,
            "total": len(departments),
            "current_user": {
                "email": user_email,
                "name": user_name,
                "role": user_role
            }
        }), 200

    # Return HTML response for browser
    return render_template(
        "department-roles.html",
        title="Department & Roles - Stackly",
        page="department_roles",
        section="masters",
        user_email=user_email,
        user_name=user_name,
        user_role=user_role,
        departments=departments,
    )


@app.route("/department-roles/create", methods=["GET", "POST"])
def create_department():
    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()
    user_name = "User"
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            user_role = u.get("role") or "User"
            break

    branches_list = [
        {"id": "main_branch", "name": "Main Branch"},
        {"id": "branch_1", "name": "Branch 1"},
        {"id": "branch_2", "name": "Branch 2"},
    ]

    roles = load_roles()
    print("ROLES COUNT:", len(roles))

    if request.method == "POST":
        # -----------------------------------------
        #  ROLE-BASED ACCESS CHECK
        #  Only Super Admin and Admin can create departments
        # -----------------------------------------
        normalized_role = user_role.replace(" ", "").replace("_", "").lower()
        if normalized_role not in ["superadmin", "admin"]:
            error = "User cannot create new departments."
            return render_template(
                "create-department.html",
                title="Create Department - Stackly",
                page="department_roles",
                section="masters",
                user_email=user_email,
                user_name=user_name,
                user_role=user_role,
                error=error,
                branches=branches_list,
                roles=roles,
            )

        code = (request.form.get("code") or "").strip()
        name = (request.form.get("department_name") or "").strip()
        branch = (request.form.get("branch") or "").strip()
        desc = (request.form.get("description") or "").strip()

        if not code:
            error = "Department code is required."
            return render_template(
                "create-department.html",
                title="Create Department - Stackly",
                page="department_roles",
                section="masters",
                user_email=user_email,
                user_name=user_name,
                user_role=user_role,
                error=error,
                form={"code": code, "department_name": name, "branch": branch, "description": desc},
                branches=[],
                roles=roles,
            )

        if not name:
            error = "Department name is required."
            return render_template(
                "create-department.html",
                title="Create Department - Stackly",
                page="department_roles",
                section="masters",
                user_email=user_email,
                user_name=user_name,
                user_role=user_role,
                error=error,
                form={"code": code, "department_name": name, "branch": branch, "description": desc},
                branches=[],
                roles=roles,
            )

        departments = load_departments()

        # Check for duplicates (case-insensitive) - either code OR name should be unique
        for d in departments:
            existing_code = (d.get("code") or "").strip().lower()
            existing_name = (d.get("name") or "").strip().lower()
            new_code = code.lower()
            new_name = name.lower()
            
            if existing_code == new_code:
                error = "Department code already exists. Please use a different code."
                return render_template(
                    "create-department.html",
                    title="Create Department - Stackly",
                    page="department_roles",
                    section="masters",
                    user_email=user_email,
                    user_name=user_name,
                user_role=user_role,
                    error=error,
                    form={"code": code, "department_name": name, "branch": branch, "description": desc},
                    branches=branches_list,
                roles=roles,
                )
            
            if existing_name == new_name:
                error = "Department name already exists. Please use a different name."
                return render_template(
                    "create-department.html",
                    title="Create Department - Stackly",
                    page="department_roles",
                    section="masters",
                    user_email=user_email,
                    user_name=user_name,
                    user_role=user_role,
                    error=error,
                    form={"code": code, "department_name": name, "branch": branch, "description": desc},
                    branches=branches_list,
                    roles=roles,
                )

        new_dept = {
            "id": str(uuid.uuid4()),
            "code": code,
            "name": name,
            "branch": branch,
            "description": desc,
        }
        departments.append(new_dept)
        save_departments(departments)
        return redirect(url_for("department_roles"))

    return render_template(
        "create-department.html",
        title="Create Department - Stackly",
        page="department_roles",
        section="masters",
        user_email=user_email,
        user_name=user_name,
        user_role=user_role,
        branches=branches_list,
        roles=roles,
    )


# =========================================
# ✅ ROUTES: DEPARTMENTS (APIs)
# =========================================
@app.route("/department-roles/edit", methods=["POST"])
def edit_department():
    try:
        data = request.get_json()

        dept_id = data.get("id")
        code = (data.get("code") or "").strip()
        name = (data.get("name") or "").strip()
        description = data.get("description")

        if not dept_id:
            return jsonify(success=False, error="Missing department ID")

        # ⚠️ PATH MISMATCH (you already have DEPARTMENT_FILE constant)
        file_path = DEPARTMENT_FILE

        if not os.path.exists(file_path):
            return jsonify(success=False, error="departments.json not found")

        with open(file_path, "r") as f:
            departments = json.load(f)

        # Check for duplicates (case-insensitive) - exclude current department
        new_code = code.lower()
        new_name = name.lower()
        
        for dept in departments:
            # Skip the current department being edited
            if dept.get("id") == dept_id:
                continue
                
            existing_code = (dept.get("code") or "").strip().lower()
            existing_name = (dept.get("name") or "").strip().lower()
            
            if existing_code == new_code:
                return jsonify(success=False, error="Department code already exists. Please use a different code.")
            
            if existing_name == new_name:
                return jsonify(success=False, error="Department name already exists. Please use a different name.")

        updated = False

        for dept in departments:
            if dept.get("id") == dept_id:
                dept["code"] = code
                dept["name"] = name
                dept["description"] = description
                updated = True
                break

        if not updated:
            return jsonify(success=False, error="Department ID not found")

        with open(file_path, "w") as f:
            json.dump(departments, f, indent=2)

        return jsonify(success=True)

    except Exception as e:
        print("EDIT ERROR:", e)
        return jsonify(success=False, error=str(e))


@app.route("/department-roles/delete", methods=["POST"])
def delete_department():
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "error": "session_expired"}), 401

    data = request.get_json(silent=True) or {}
    dept_id = data.get("id")

    if not dept_id:
        return jsonify({"success": False, "error": "missing_id"}), 400

    departments = load_departments()
    before_count = len(departments)

    departments = [d for d in departments if str(d.get("id")) != str(dept_id)]
    after_count = len(departments)

    if after_count == before_count:
        return jsonify({"success": False, "error": "not_found"}), 404

    save_departments(departments)
    return jsonify({"success": True})


# =========================================
# ✅ API ENDPOINTS: DEPARTMENTS (JSON)
# =========================================
@app.route("/api/departments", methods=["GET"])
def api_departments():
    """Get all departments - supports JSON response for Postman"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    users = load_users()
    departments = load_departments()
    
    user_name = "User"
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            user_role = (u.get("role") or "User").strip()
            break
    
    return jsonify({
        "success": True,
        "departments": departments,
        "total": len(departments),
        "current_user": {
            "email": user_email,
            "name": user_name,
            "role": user_role
        }
    }), 200


@app.route("/api/departments/<dept_id>", methods=["GET"])
def api_get_department(dept_id):
    """Get single department by ID"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    departments = load_departments()
    department = next((d for d in departments if str(d.get("id")) == str(dept_id)), None)
    
    if not department:
        return jsonify({"success": False, "message": "Department not found"}), 404
    
    return jsonify({
        "success": True,
        "department": department
    }), 200


@app.route("/api/departments", methods=["POST"])
def api_create_department():
    """Create new department"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    # Check user role
    users = load_users()
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_role = (u.get("role") or "User").strip()
            break
    
    normalized_role = user_role.replace(" ", "").replace("_", "").lower()
    if normalized_role not in ["superadmin", "admin"]:
        return jsonify({
            "success": False,
            "message": "User cannot create new departments."
        }), 403
    
    data = request.get_json() or {}
    code = (data.get("code") or "").strip()
    name = (data.get("name") or data.get("department_name") or "").strip()
    branch = (data.get("branch") or "").strip()
    description = (data.get("description") or "").strip()
    
    # Validation
    if not code:
        return jsonify({"success": False, "message": "Department code is required."}), 400
    
    if not name:
        return jsonify({"success": False, "message": "Department name is required."}), 400
    
    departments = load_departments()
    
    # Check for duplicates (case-insensitive)
    for d in departments:
        existing_code = (d.get("code") or "").strip().lower()
        existing_name = (d.get("name") or "").strip().lower()
        new_code = code.lower()
        new_name = name.lower()
        
        if existing_code == new_code:
            return jsonify({
                "success": False,
                "message": "Department code already exists. Please use a different code."
            }), 409
        
        if existing_name == new_name:
            return jsonify({
                "success": False,
                "message": "Department name already exists. Please use a different name."
            }), 409
    
    new_dept = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": name,
        "branch": branch,
        "description": description,
    }
    departments.append(new_dept)
    save_departments(departments)
    
    return jsonify({
        "success": True,
        "message": "Department created successfully",
        "department": new_dept
    }), 201


@app.route("/api/departments/<dept_id>", methods=["PUT"])
def api_update_department(dept_id):
    """Update existing department"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    # Check user role
    users = load_users()
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_role = (u.get("role") or "User").strip()
            break
    
    normalized_role = user_role.replace(" ", "").replace("_", "").lower()
    if normalized_role not in ["superadmin", "admin"]:
        return jsonify({
            "success": False,
            "message": "Only Super Admin or Admin can edit departments."
        }), 403
    
    data = request.get_json() or {}
    code = (data.get("code") or "").strip()
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    
    if not dept_id:
        return jsonify({"success": False, "message": "Department ID is required."}), 400
    
    departments = load_departments()
    
    # Check for duplicates (case-insensitive) - exclude current department
    new_code = code.lower()
    new_name = name.lower()
    
    for dept in departments:
        if str(dept.get("id")) == str(dept_id):
            continue
        
        existing_code = (dept.get("code") or "").strip().lower()
        existing_name = (dept.get("name") or "").strip().lower()
        
        if existing_code == new_code:
            return jsonify({
                "success": False,
                "message": "Department code already exists. Please use a different code."
            }), 409
        
        if existing_name == new_name:
            return jsonify({
                "success": False,
                "message": "Department name already exists. Please use a different name."
            }), 409
    
    updated = False
    for dept in departments:
        if str(dept.get("id")) == str(dept_id):
            dept["code"] = code
            dept["name"] = name
            if description:
                dept["description"] = description
            updated = True
            break
    
    if not updated:
        return jsonify({"success": False, "message": "Department not found"}), 404
    
    save_departments(departments)
    return jsonify({
        "success": True,
        "message": "Department updated successfully",
        "department": next((d for d in departments if str(d.get("id")) == str(dept_id)), None)
    }), 200


@app.route("/api/departments/<dept_id>", methods=["DELETE"])
def api_delete_department(dept_id):
    """Delete department by ID"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    # Check user role
    users = load_users()
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_role = (u.get("role") or "User").strip()
            break
    
    normalized_role = user_role.replace(" ", "").replace("_", "").lower()
    if normalized_role not in ["superadmin", "admin"]:
        return jsonify({
            "success": False,
            "message": "Only Super Admin or Admin can delete departments."
        }), 403
    
    if not dept_id:
        return jsonify({"success": False, "message": "Department ID is required."}), 400
    
    departments = load_departments()
    before_count = len(departments)
    
    departments = [d for d in departments if str(d.get("id")) != str(dept_id)]
    after_count = len(departments)
    
    if after_count == before_count:
        return jsonify({"success": False, "message": "Department not found"}), 404
    
    save_departments(departments)
    return jsonify({
        "success": True,
        "message": "Department deleted successfully"
    }), 200


# =========================================
# ✅ ROUTES: ROLE PAGE (UI)
# =========================================
@app.route("/department-role/create/new")
def department_new():
    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()

    user_name = "User"
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            user_role = (u.get("role") or "User").strip()
            break

    return render_template(
        "create-role.html",
        page="department_role",
        section="masters",
        user_email=user_email,
        user_name=user_name,
        user_role=user_role
    )


# =========================================
# ✅ ROUTES: ROLES (APIs)
# =========================================
@app.route("/save_role", methods=["POST"])
def save_role():
    data = request.get_json() or {}

    try:
        # -----------------------------------------
        #  ROLE-BASED ACCESS CHECK
        #  Only Super Admin and Admin can create roles
        # -----------------------------------------
        user_email = session.get("user")
        if not user_email:
            return jsonify({"status": "error", "message": "session_expired"}), 401

        users = load_users()
        user_role = "User"
        for u in users:
            if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
                user_role = (u.get("role") or "User").strip().lower()
                break

        # Normalize role for comparison
        normalized_role = user_role.replace(" ", "").replace("_", "").lower()
        if normalized_role not in ["superadmin", "admin"]:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "User cannot create roles.",
                    }
                ),
                403,
            )

        # -----------------------------------------
        #  VALIDATION: Description max 50 characters
        # -----------------------------------------
        description = (data.get("description") or "").strip()
        if description and len(description) > 50:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Description must not exceed 50 characters.",
                    }
                ),
                400,
            )

        roles = load_roles()          # ✅ use same loader

        # -----------------------------------------
        #  DUPLICATE CHECK
        #  - Combination of department + branch + role must be unique
        # -----------------------------------------
        new_dept   = (data.get("department") or "").strip().lower()
        new_branch = (data.get("branch") or "").strip().lower()
        new_role   = (data.get("role") or "").strip().lower()

        for r in roles:
            dept   = (r.get("department") or "").strip().lower()
            branch = (r.get("branch") or "").strip().lower()
            role   = (r.get("role") or "").strip().lower()

            if dept == new_dept and branch == new_branch and role == new_role:
                # Duplicate found → do NOT save
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "This combination of Department, Branch and Role already exists.",
                        }
                    ),
                    409,
                )

        # No duplicate → append and save
        roles.append(data)
        save_roles(roles)             # ✅ use same saver
        return jsonify({"status": "success"})
    except Exception as e:
        print("❌ data save error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/department-roles/create/edit", methods=["POST"])
def edit_role():
    try:
        data = request.get_json() or {}

        old_role = (data.get("old_role") or "").strip()
        new_role = (data.get("role") or "").strip()
        description = (data.get("description") or "").strip()
        new_department = (data.get("department") or "").strip()

        if not old_role or not new_role:
            return jsonify(success=False, error="Missing role data")
        
        # Validate description max 50 characters
        if description and len(description) > 50:
            return jsonify(success=False, error="Description must not exceed 50 characters.")

        roles = load_roles()
        
        # -----------------------------------------
        #  DUPLICATE CHECK
        #  - Combination of Role + Department must be unique (case-insensitive)
        #  - Exclude the current role being edited
        # -----------------------------------------
        new_role_lower = new_role.lower()
        new_dept_lower = new_department.lower() if new_department else ""
        
        for r in roles:
            existing_role = (r.get("role") or "").strip()
            existing_dept = (r.get("department") or "").strip()
            
            # Skip the current role being edited
            if existing_role == old_role:
                continue
            
            # Check for duplicate combination (case-insensitive)
            if existing_role.lower() == new_role_lower and existing_dept.lower() == new_dept_lower:
                return jsonify(
                    success=False,
                    error="This combination of Role and Department already exists."
                )
        
        # No duplicate found → proceed with update
        updated = False
        for r in roles:
            if (r.get("role") or "").strip() == old_role:
                r["role"] = new_role
                r["description"] = description

                # Update department field if provided
                if new_department:
                    r["department"] = new_department

                updated = True
                break

        if not updated:
            return jsonify(success=False, error="Role not found")

        save_roles(roles)
        return jsonify(success=True)

    except Exception as e:
        print("EDIT ERROR:", e)
        return jsonify(success=False, error=str(e))


@app.route("/department-roles/create/delete", methods=["POST"])
def delete_role():
    data = request.get_json(silent=True) or {}
    print("DELETE DATA:", data)

    description = data.get("description")

    if not description:
        return jsonify(success=False, error="missing_description"), 400

    roles = load_roles()
    before = len(roles)

    roles = [
        r for r in roles
        if r.get("description", "").strip().lower()
        != description.strip().lower()
    ]

    if len(roles) == before:
        return jsonify(success=False, error="not_found"), 404

    save_roles(roles)
    return jsonify(success=True)


# =========================================
# ✅ API ENDPOINTS: ROLES (JSON)
# =========================================
@app.route("/api/roles", methods=["GET"])
def api_roles():
    """Get all roles - supports JSON response for Postman"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    users = load_users()
    roles = load_roles()
    
    user_name = "User"
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            user_role = (u.get("role") or "User").strip()
            break
    
    return jsonify({
        "success": True,
        "roles": roles,
        "total": len(roles),
        "current_user": {
            "email": user_email,
            "name": user_name,
            "role": user_role
        }
    }), 200


@app.route("/api/roles/<int:role_index>", methods=["GET"])
def api_get_role(role_index):
    """Get single role by index (0-based)"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    roles = load_roles()
    
    if role_index < 0 or role_index >= len(roles):
        return jsonify({"success": False, "message": "Role index out of range"}), 404
    
    return jsonify({
        "success": True,
        "role": roles[role_index],
        "index": role_index
    }), 200


@app.route("/api/roles", methods=["POST"])
def api_create_role():
    """Create new role"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    # Check user role
    users = load_users()
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_role = (u.get("role") or "User").strip()
            break
    
    normalized_role = user_role.replace(" ", "").replace("_", "").lower()
    if normalized_role not in ["superadmin", "admin"]:
        return jsonify({
            "success": False,
            "message": "User cannot create roles."
        }), 403
    
    data = request.get_json() or {}
    department = (data.get("department") or "").strip()
    branch = (data.get("branch") or "").strip()
    role_name = (data.get("role") or "").strip()
    description = (data.get("description") or "").strip()
    
    # Validation
    if not department:
        return jsonify({"success": False, "message": "Department is required."}), 400
    
    if not branch:
        return jsonify({"success": False, "message": "Branch is required."}), 400
    
    if not role_name:
        return jsonify({"success": False, "message": "Role is required."}), 400
    
    if not description:
        return jsonify({"success": False, "message": "Description is required."}), 400
    
    if len(description) > 50:
        return jsonify({
            "success": False,
            "message": "Description must not exceed 50 characters."
        }), 400
    
    roles = load_roles()
    
    # Check for duplicates (case-insensitive) - combination of department + branch + role
    new_dept = department.lower()
    new_branch = branch.lower()
    new_role = role_name.lower()
    
    for r in roles:
        dept = (r.get("department") or "").strip().lower()
        br = (r.get("branch") or "").strip().lower()
        role = (r.get("role") or "").strip().lower()
        
        if dept == new_dept and br == new_branch and role == new_role:
            return jsonify({
                "success": False,
                "message": "This combination of Department, Branch and Role already exists."
            }), 409
    
    new_role_data = {
        "department": department,
        "branch": branch,
        "role": role_name,
        "description": description
    }
    
    # Add permissions if provided
    if "permissions" in data:
        new_role_data["permissions"] = data["permissions"]
    
    roles.append(new_role_data)
    save_roles(roles)
    
    return jsonify({
        "success": True,
        "message": "Role created successfully",
        "role": new_role_data
    }), 201


@app.route("/api/roles/<int:role_index>", methods=["PUT"])
def api_update_role(role_index):
    """Update existing role by index"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    # Check user role
    users = load_users()
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_role = (u.get("role") or "User").strip()
            break
    
    normalized_role = user_role.replace(" ", "").replace("_", "").lower()
    if normalized_role not in ["superadmin", "admin"]:
        return jsonify({
            "success": False,
            "message": "Only Super Admin or Admin can edit roles."
        }), 403
    
    if role_index < 0:
        return jsonify({"success": False, "message": "Invalid role index"}), 400
    
    data = request.get_json() or {}
    new_role_name = (data.get("role") or "").strip()
    description = (data.get("description") or "").strip()
    new_department = (data.get("department") or "").strip()
    
    roles = load_roles()
    
    if role_index >= len(roles):
        return jsonify({"success": False, "message": "Role index out of range"}), 404
    
    old_role = roles[role_index]
    old_role_name = (old_role.get("role") or "").strip()
    
    # Validate description max 50 characters
    if description and len(description) > 50:
        return jsonify({
            "success": False,
            "message": "Description must not exceed 50 characters."
        }), 400
    
    # Check for duplicates (case-insensitive) - exclude current role
    new_role_lower = new_role_name.lower()
    new_dept_lower = new_department.lower() if new_department else ""
    
    for idx, r in enumerate(roles):
        if idx == role_index:
            continue
        
        existing_role = (r.get("role") or "").strip()
        existing_dept = (r.get("department") or "").strip()
        
        if existing_role.lower() == new_role_lower and existing_dept.lower() == new_dept_lower:
            return jsonify({
                "success": False,
                "message": "This combination of Role and Department already exists."
            }), 409
    
    # Update role
    if new_role_name:
        roles[role_index]["role"] = new_role_name
    if description:
        roles[role_index]["description"] = description
    if new_department:
        roles[role_index]["department"] = new_department
    
    # Update other fields if provided
    if "branch" in data:
        roles[role_index]["branch"] = data["branch"]
    if "permissions" in data:
        roles[role_index]["permissions"] = data["permissions"]
    
    save_roles(roles)
    return jsonify({
        "success": True,
        "message": "Role updated successfully",
        "role": roles[role_index]
    }), 200


@app.route("/api/roles/<int:role_index>", methods=["DELETE"])
def api_delete_role(role_index):
    """Delete role by index"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    
    # Check user role
    users = load_users()
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_role = (u.get("role") or "User").strip()
            break
    
    normalized_role = user_role.replace(" ", "").replace("_", "").lower()
    if normalized_role not in ["superadmin", "admin"]:
        return jsonify({
            "success": False,
            "message": "Only Super Admin or Admin can delete roles."
        }), 403
    
    if role_index < 0:
        return jsonify({"success": False, "message": "Invalid role index"}), 400
    
    roles = load_roles()
    
    if role_index >= len(roles):
        return jsonify({"success": False, "message": "Role index out of range"}), 404
    
    deleted_role = roles.pop(role_index)
    save_roles(roles)
    
    return jsonify({
        "success": True,
        "message": "Role deleted successfully",
        "deleted_role": deleted_role
    }), 200


# =========================================
# ✅ ROUTES: PROFILE
# =========================================
@app.route("/profile")
def profile():
    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()

    user_name = "User"
    mobile = ""

    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").strip().lower() == user_email.lower():
            user_name = u.get("name", "User")
            mobile = u.get("phone", "")
            break

    return render_template(
        "profile.html",
        user_email=user_email,
        user_name=user_name,
        mobile=mobile,
        page="profile",
    )


# =========================================
# ✅ ROUTES: CHECK EMAIL EXISTS (AJAX)
# =========================================
@app.route("/check-email", methods=["POST"])
def check_email():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"status": "error", "message": "Email is required."}), 400

    users = load_users()
    exists = False

    if isinstance(users, list):
        for u in users:
            if isinstance(u, dict) and (u.get("email") or "").strip().lower() == email:
                exists = True
                break
    elif isinstance(users, dict) and email in users:
        exists = True

    if not exists:
        return jsonify({"status": "error", "message": "Email not registered."}), 404

    return jsonify({"status": "ok"}), 200


# =========================================
# ✅ ROUTES: FORGOT PASSWORD – SEND LINK (AJAX)
# =========================================
@app.route("/send-reset-link", methods=["POST"])
def send_reset_link():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"status": "error", "message": "Email is required"}), 400

    try:
        users = load_users()
        exists = False
        if isinstance(users, list):
            for u in users:
                if not isinstance(u, dict):
                    continue
                if (u.get("email") or "").strip().lower() == email:
                    exists = True
                    break
        elif isinstance(users, dict):
            for u in users.values():
                if not isinstance(u, dict):
                    continue
                if (u.get("email") or "").strip().lower() == email:
                    exists = True
                    break

        if not exists:
            return jsonify({"status": "error", "message": "Email not registered."}), 400

        now = time.time()
        locked_until = RESET_LOCK.get(email)
        if locked_until and now < locked_until:
            remaining = int(locked_until - now)
            return jsonify({
                "status": "error",
                "message": f"This email is locked. Try again after {remaining} seconds."
            }), 429

        count = RESET_SEND_COUNT.get(email, 0)
        if count >= MAX_RESET_SENDS:
            RESET_LOCK[email] = now + LOCKOUT_DURATION
            RESET_SEND_COUNT[email] = 0
            return jsonify({
                "status": "error",
                "message": "Reset link already sent 5 times. Email is locked for 2 minutes."
            }), 429

        RESET_SEND_COUNT[email] = count + 1

        token = str(uuid.uuid4())
        RESET_TOKENS[token] = email
        reset_link = url_for("reset_password_page", token=token, _external=True)

        subject = "Reset Your Password - Stackly POS"
        body = (
            "Hi,\n\n"
            "Click the link below to reset your password:\n\n"
            f"{reset_link}\n\n"
            "If you did not request this, please ignore this email.\n\n"
            "- Stackly Team"
        )

        send_email(email, subject, body)
        return jsonify({"status": "ok"}), 200

    except Exception as e:
        print("DEBUG send-reset-link error:", e)
        return jsonify({"status": "error", "message": "Server error while sending reset link."}), 500


# =========================================
# ✅ ROUTES: RESET PASSWORD PAGES
# =========================================
@app.route("/reset-password")
def reset_password_page():
    token = request.args.get("token")
    if not token or token not in RESET_TOKENS:
        return "Invalid or expired reset link.", 400
    return render_template("reset-password.html", token=token)


@app.route("/reset-password", methods=["POST"])
def reset_password_submit():
    try:
        data = request.get_json() or {}
        token = data.get("token")
        new_password = (data.get("password") or "").strip()

        if not token or not new_password:
            return jsonify({"status": "error", "message": "Token and password are required."}), 400

        email = RESET_TOKENS.get(token)
        if not email:
            return jsonify({"status": "error", "message": "Invalid or expired token."}), 400

        email_key = email.strip().lower()
        users = load_users()
        updated = False

        for u in users:
            if not isinstance(u, dict):
                continue
            if (u.get("email") or "").strip().lower() == email_key:
                u["password"] = new_password
                updated = True
                break

        if not updated:
            return jsonify({"status": "error", "message": "User not found."}), 400

        save_users(users)
        RESET_TOKENS.pop(token, None)

        print("✅ Password reset for:", email_key)
        return jsonify({"status": "ok"}), 200

    except Exception as e:
        print("❌ Reset password error:", e)
        return jsonify({"status": "error", "message": "Server error while updating password."}), 500


# =========================================
# ✅ ROUTES: CREATE USER (GET/POST)
# =========================================
@app.route("/create-user", methods=["GET", "POST"])
def create_user():
    user_email = session.get("user")
    if not user_email:
        # Check if JSON request
        if request.is_json or request.content_type == "application/json":
            return jsonify({"success": False, "message": "Session expired"}), 401
        return redirect(url_for("login", message="session_expired"))

    users = load_users()

    user_name = "User"
    user_role = "User"

    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            user_role = u.get("role") or "User"
            break

    if request.method == "GET":
        return render_template(
            "create-user.html",
            title="Create User - Stackly",
            page="manage_users",
            section="masters",
            user_email=user_email,
            user_name=user_name,
            user_role=user_role,
        )

    # -----------------------------------------
    #  ROLE-BASED ACCESS CHECK
    #  Only Super Admin and Admin can create branch users
    # -----------------------------------------
    normalized_role = user_role.replace(" ", "").replace("_", "").lower()
    if normalized_role not in ["superadmin", "admin"]:
        error_message = "Create new branch user is restricted for your credentials."
        if request.is_json or request.content_type == "application/json":
            return jsonify({"success": False, "message": error_message}), 403
        else:
            flash(error_message, "error")
            return redirect(url_for("create_user"))

    # Determine if request is JSON or form data
    is_json_request = request.is_json or request.content_type == "application/json"
    
    if is_json_request:
        data = request.get_json(silent=True) or {}
        first_name = (data.get("first_name") or "").strip()
        last_name = (data.get("last_name") or "").strip()
        email = (data.get("email") or "").strip()
        country_code = (data.get("country_code") or "").strip()
        contact_number = (data.get("contact_number") or "").strip()
        branch = (data.get("branch") or "").strip()
        department = (data.get("department") or "").strip()
        role = (data.get("role") or "").strip()
        reporting_to = (data.get("reporting_to") or "").strip()
        available_branches = (data.get("available_branches") or "").strip()
        employee_id = (data.get("employee_id") or "").strip()
    else:
        first_name = request.form.get("first_name", "").strip()
        last_name = request.form.get("last_name", "").strip()
        email = request.form.get("email", "").strip()
        country_code = request.form.get("country_code", "").strip()
        contact_number = request.form.get("contact_number", "").strip()
        branch = request.form.get("branch", "").strip()
        department = request.form.get("department", "").strip()
        role = request.form.get("role", "").strip()
        reporting_to = request.form.get("reporting_to", "").strip()
        available_branches = request.form.get("available_branches", "").strip()
        employee_id = request.form.get("employee_id", "").strip()

    # Validation errors list
    errors = []

    # Validate First Name
    if not first_name:
        errors.append("First Name is required")
    elif len(first_name) < 3:
        errors.append("First Name must be at least 3 characters")
    elif not NAME_REGEX.match(first_name):
        errors.append("First Name should contain only letters and spaces (3-20 characters)")

    # Validate Last Name
    if not last_name:
        errors.append("Last Name is required")
    elif len(last_name) < 3:
        errors.append("Last Name must be at least 3 characters")
    elif not NAME_REGEX.match(last_name):
        errors.append("Last Name should contain only letters and spaces (3-20 characters)")

    # Validate Email
    if not email:
        errors.append("Email is required")
    elif len(email) > MAX_EMAIL_LENGTH:
        errors.append(f"Email is too long (max {MAX_EMAIL_LENGTH} characters)")
    elif not EMAIL_REGEX.match(email):
        errors.append("Enter a valid email address")

    # Validate Country Code
    valid_country_codes = ["+91", "+971", "+974", "+966", "+94", "+880", "+977", "+1", "+44", "+61"]
    phone_rules = {
        "+91": 10,   # India
        "+971": 9,   # United Arab Emirates
        "+974": 8,   # Qatar
        "+966": 9,   # Saudi Arabia
        "+94": 9,    # Sri Lanka
        "+880": 10,  # Bangladesh
        "+977": 10,  # Nepal
        "+1": 10,    # United States
        "+44": 10,   # United Kingdom (mobile)
        "+61": 9     # Australia
    }
    
    is_valid_country_code = country_code in valid_country_codes
    
    if not country_code:
        errors.append("Country code is required")
    elif not is_valid_country_code:
        errors.append(f"Invalid country code. Valid codes are: {', '.join(valid_country_codes)}")

    # Validate Contact Number
    if not contact_number:
        errors.append("Contact Number is required")
    elif not re.match(r"^\d+$", contact_number):
        errors.append("Contact Number must contain digits only")
    elif is_valid_country_code and country_code in phone_rules:
        # Only validate length if country code is valid
        required_phone_len = phone_rules[country_code]
        if len(contact_number) != required_phone_len:
            errors.append(f"Contact Number must be exactly {required_phone_len} digits for {country_code}")

    # Validate Branch
    if not branch:
        errors.append("Branch is required")

    # Validate Department
    if not department:
        errors.append("Department is required")

    # Validate Role
    if not role:
        errors.append("Role is required")

    # Validate Reporting To
    if not reporting_to:
        errors.append("Reporting To is required")
    elif len(reporting_to) < 3:
        errors.append("Reporting To must be at least 3 characters")
    elif not re.match(r"^[A-Za-z.\-\s]{3,40}$", reporting_to):
        errors.append("Reporting To may contain letters, dots, hyphens and spaces (3-40 characters)")

    # Validate Available Branches (digits only per memory)
    if not available_branches:
        errors.append("Available Branches is required")
    elif not re.match(r"^\d+$", available_branches):
        errors.append("Available Branches must contain only digits")

    # Validate Employee ID
    if not employee_id:
        errors.append("Employee ID is required")
    elif not re.match(r"^[A-Za-z0-9\-]{1,20}$", employee_id):
        errors.append("Employee ID may have letters, numbers and '-' (max 20 characters)")

    # Check for duplicate email
    if email:
        for u in users:
            if isinstance(u, dict) and (u.get("email") or "").strip().lower() == email.lower():
                errors.append("Email already exists")
                break

    # Check for duplicate contact number
    if contact_number:
        for u in users:
            if isinstance(u, dict) and (u.get("contact_number") or "") == contact_number:
                errors.append("Contact number already exists")
                break

    # Check for duplicate employee ID
    if employee_id:
        for u in users:
            if isinstance(u, dict) and (u.get("employee_id") or "") == employee_id:
                errors.append("Employee ID already exists")
                break

    # Return errors if any
    if errors:
        if is_json_request:
            return jsonify({"success": False, "message": "; ".join(errors), "errors": errors}), 400
        else:
            for error in errors:
                flash(error, "error")
            return redirect(url_for("create_user"))

    # Create new user
    full_name = (first_name + " " + last_name).strip()
    full_phone = f"{country_code}{contact_number}" if country_code and contact_number else contact_number

    new_user = {
        "id": str(uuid.uuid4()),
        "name": full_name,
        "phone": full_phone,
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "country_code": country_code,
        "contact_number": contact_number,
        "branch": branch,
        "department": department,
        "role": role,
        "reporting_to": reporting_to,
        "available_branches": available_branches,
        "employee_id": employee_id,
    }

    users.append(new_user)
    save_users(users)

    # Return appropriate response
    if is_json_request:
        return jsonify({
            "success": True,
            "message": "User created successfully",
            "user": {
                "id": new_user["id"],
                "name": new_user["name"],
                "phone": new_user["phone"],
                "first_name": new_user["first_name"],
                "last_name": new_user["last_name"],
                "email": new_user["email"],
                "country_code": new_user["country_code"],
                "contact_number": new_user["contact_number"],
                "branch": new_user["branch"],
                "department": new_user["department"],
                "role": new_user["role"],
                "reporting_to": new_user["reporting_to"],
                "available_branches": new_user["available_branches"],
                "employee_id": new_user["employee_id"]
            }
        }), 201
    else:
        flash("User created successfully", "success")
        return redirect(url_for("manage_users"))

def normalize_role(role: str) -> str:
    return (role or "").strip().lower().replace(" ", "").replace("_", "")
# =========================================
# ✅ ROUTES: UPDATE USER (API)
# =========================================
@app.route("/update-user", methods=["POST"])
def update_user():
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired"}), 401

    users = load_users()

    current_email = (user_email or "").strip().lower()
    current_user = None

    for usr in users:
        if not isinstance(usr, dict):
            continue
        u_email = (usr.get("email") or "").strip().lower()
        if u_email == current_email:
            current_user = usr
            break

    if not current_user:
        return jsonify({"success": False, "message": "Current user not found"}), 403

    current_role = (current_user.get("role") or "").strip().lower()
    current_role = normalize_role(current_user.get("role"))
    if current_role not in ["superadmin", "admin"]:
        return jsonify({"success": False, "message": "Only Super Admin / Admin can edit users."}), 403

    data = request.get_json(silent=True) or {}
    try:
        idx = int(data.get("index", -1))
    except (TypeError, ValueError):
        idx = -1

    if idx < 0:
        return jsonify({"success": False, "message": "Invalid index"}), 400

    if idx >= len(users):
        return jsonify({"success": False, "message": "User index out of range"}), 400

    u = users[idx]
    if not isinstance(u, dict):
        return jsonify({"success": False, "message": "User record invalid"}), 400

    u["name"]  = (data.get("name") or "").strip()
    u["email"] = (data.get("email") or "").strip()
    u["phone"] = (data.get("phone") or "").strip()
    u["role"]  = (data.get("role") or "").strip() or "Admin"

    save_users(users)
    return jsonify({"success": True})


@app.route("/products")
def products():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("products.html", title="Product Master - Stackly", page="products", section="masters")


# =========================================
# ✅ API: PRODUCT CATEGORIES (PERSISTENT)
# =========================================
@app.route("/api/product-categories", methods=["GET", "POST"])
def api_product_categories():
    """
    GET  /api/product-categories?type=Electronics
         → { success, categories: ["Headphones", ...] }
    POST /api/product-categories
         JSON: { "name": "Headphones", "product_type": "Electronics" }
    """
    if request.method == "GET":
        product_type = (request.args.get("type") or "").strip()
        all_cats = load_product_categories()

        if product_type:
            # When a product type is specified, return categories
            # saved for that type PLUS any "global" categories
            # that were saved without a product_type.
            pt_norm = product_type.strip().lower()
            names = []
            for c in all_cats:
                ptype = (c.get("product_type") or "").strip().lower()
                if ptype in ("", pt_norm):
                    names.append(c.get("name") or "")
        else:
            # If no product_type is specified, return all names
            names = [c.get("name") or "" for c in all_cats]

        # remove duplicates (case-insensitive) while preserving order
        seen = set()
        unique = []
        for n in names:
            name_clean = (n or "").strip()
            if not name_clean:
                continue
            key = name_clean.lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(name_clean)

        return jsonify({"success": True, "categories": unique}), 200

    # POST → save new category
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    product_type = (data.get("product_type") or "").strip()

    if not name:
        return jsonify({"success": False, "message": "Category name is required."}), 400
    if len(name) < 3 or len(name) > 50:
        return jsonify({"success": False, "message": "Category Name Should contain atleast 3 characters."}), 400
    # Only alphabets and spaces allowed
    if not re.fullmatch(r"[A-Za-z\s]+", name):
        return jsonify({"success": False, "message": "Category name can contain only letters and spaces."}), 400

    # optional product_type – but we still store it for filtering
    all_cats = load_product_categories()
    name_lower = name.lower()
    type_lower = product_type.lower()

    for c in all_cats:
        if (c.get("name") or "").strip().lower() == name_lower and \
           (c.get("product_type") or "").strip().lower() == type_lower:
            return jsonify({"success": False, "message": "Category already exists for this product type."}), 409

    all_cats.append({"product_type": product_type, "name": name})
    save_product_categories(all_cats)

    return jsonify({"success": True, "message": "Category saved successfully."}), 201


# =========================================
# ✅ API: PRODUCT MASTER DROPDOWNS
#    Tax codes, UOM, Warehouse, Size, Color, Supplier
# =========================================
def _require_login_json():
    user_email = session.get("user")
    if not user_email:
        return None, jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    return user_email, None, None


@app.route("/api/product-tax-codes", methods=["GET", "POST"])
def api_product_tax_codes():
    if request.method == "GET":
        codes = load_tax_codes()
        return jsonify({"success": True, "items": codes}), 200

    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    description = (data.get("description") or "").strip()
    try:
        percent = float(data.get("percent", 0))
    except (TypeError, ValueError):
        percent = 0

    if not code:
        return jsonify({"success": False, "message": "Tax name is required."}), 400

    # Extract pure tax name (before "(xx%)") for validation & duplicate check
    base_name = code.split("(")[0].strip()

    # Tax name: only alphabets and spaces, at least 3 characters
    if len(base_name) < 3:
        return jsonify({"success": False, "message": "Tax Name should contain atleast 3 characters."}), 400
    if not re.fullmatch(r"[A-Za-z\s]+", base_name):
        return jsonify({"success": False, "message": "Tax name can contain only letters and spaces."}), 400

    items = load_tax_codes()
    key = base_name.lower()
    for item in items:
        existing = (item.get("code") or "").strip()
        existing_base = existing.split("(")[0].strip().lower()
        if existing_base == key:
            # same tax name already present → treat as duplicate name
            return jsonify({"success": False, "message": "This tax name already exists."}), 409

    items.append({"code": code, "percent": percent, "description": description})
    save_tax_codes(items)
    return jsonify({"success": True, "message": "Tax code saved."}), 201


@app.route("/api/product-uoms", methods=["GET", "POST"])
def api_product_uoms():
    if request.method == "GET":
        uoms = load_uoms()
        return jsonify({"success": True, "items": uoms}), 200

    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    try:
        items_val = int(data.get("items", 0))
    except (TypeError, ValueError):
        items_val = 0
    description = (data.get("description") or "").strip()

    if not name:
        return jsonify({"success": False, "message": "UOM name is required."}), 400
    if len(name) < 3:
        return jsonify({"success": False, "message": "UOM Name should contain atleast 3 characters."}), 400
    if len(name) > 50:
        return jsonify({"success": False, "message": "UOM Name should not exceed 50 characters."}), 400

    items = load_uoms()
    key = name.strip().lower()
    for item in items:
        if (item.get("name") or "").strip().lower() == key:
            # Duplicate UOM name not allowed
            return jsonify({"success": False, "message": "UOM name already exists."}), 409

    items.append({"name": name, "items": items_val, "description": description})
    save_uoms(items)
    return jsonify({"success": True, "message": "UOM saved."}), 201


@app.route("/api/product-warehouses", methods=["GET", "POST"])
def api_product_warehouses():
    if request.method == "GET":
        warehouses = load_warehouses()
        return jsonify({"success": True, "items": warehouses}), 200

    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    location = (data.get("location") or "").strip()
    manager = (data.get("manager") or "").strip()
    contact = (data.get("contact") or "").strip()
    notes = (data.get("notes") or "").strip()

    if not name:
        return jsonify({"success": False, "message": "Warehouse name is required."}), 400
    if len(name) < 3:
        return jsonify({"success": False, "message": "Warehouse Name should contain atleast 3 characters."}), 400
    if len(notes) > 50:
        return jsonify({"success": False, "message": "Notes must be 50 characters or less."}), 400

    items = load_warehouses()
    key = name.strip().lower()
    for item in items:
        if (item.get("name") or "").strip().lower() == key:
            # Duplicate warehouse name not allowed
            return jsonify({"success": False, "message": "Warehouse name already exists."}), 409

    items.append(
        {
            "name": name,
            "location": location,
            "manager": manager,
            "contact": contact,
            "notes": notes,
        }
    )
    save_warehouses(items)
    return jsonify({"success": True, "message": "Warehouse saved."}), 201


@app.route("/api/product-sizes", methods=["GET", "POST"])
def api_product_sizes():
    if request.method == "GET":
        sizes = load_sizes()
        return jsonify({"success": True, "items": sizes}), 200

    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"success": False, "message": "Size name is required."}), 400
    if len(name) < 3:
        return jsonify({"success": False, "message": "Size Name should contain atleast 3 characters."}), 400

    items = load_sizes()
    key = name.strip().lower()
    for item in items:
        if (item.get("name") or "").strip().lower() == key:
            return jsonify({"success": True, "message": "Size already exists."}), 200

    items.append({"name": name})
    save_sizes(items)
    return jsonify({"success": True, "message": "Size saved."}), 201


@app.route("/api/product-colors", methods=["GET", "POST"])
def api_product_colors():
    if request.method == "GET":
        colors = load_colors()
        return jsonify({"success": True, "items": colors}), 200

    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({"success": False, "message": "Color name is required."}), 400
    if len(name) < 3:
        return jsonify({"success": False, "message": "Color Name should contain atleast 3 characters."}), 400

    items = load_colors()
    key = name.strip().lower()
    for item in items:
        if (item.get("name") or "").strip().lower() == key:
            return jsonify({"success": True, "message": "Color already exists."}), 200

    items.append({"name": name})
    save_colors(items)
    return jsonify({"success": True, "message": "Color saved."}), 201


@app.route("/api/product-suppliers", methods=["GET", "POST"])
def api_product_suppliers():
    if request.method == "GET":
        suppliers = load_suppliers()
        return jsonify({"success": True, "items": suppliers}), 200

    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    contact = (data.get("contact") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    address = (data.get("address") or "").strip()

    if not name:
        return jsonify({"success": False, "message": "Supplier name is required."}), 400
    if len(name) < 3:
        return jsonify({"success": False, "message": "Supplier Name should contain atleast 3 characters."}), 400
    if not re.fullmatch(r"[A-Za-z\s]+", name):
        return jsonify({"success": False, "message": "Supplier Name should contain atleast 3 characters."}), 400

    # Contact person: apply same rules as Supplier Name
    if not contact or len(contact.strip()) < 3 or not re.fullmatch(r"[A-Za-z\s]+", contact.strip()):
        return jsonify({"success": False, "message": "Contact Person Name should contain atleast 3 characters."}), 400

    items = load_suppliers()
    key = name.strip().lower()
    for item in items:
        if (item.get("name") or "").strip().lower() == key:
            # Duplicate supplier name not allowed
            return jsonify({"success": False, "message": "Supplier name already exists."}), 409

    items.append(
        {
            "name": name,
            "contact": contact,
            "phone": phone,
            "email": email,
            "address": address,
        }
    )
    save_suppliers(items)
    return jsonify({"success": True, "message": "Supplier saved."}), 201

@app.route("/api/products/<product_id>", methods=["GET"])
def api_get_product(product_id):
    products = load_products()
    p = next((x for x in products if x.get("product_id") == product_id), None)
    if not p:
        return jsonify(success=False, message="Product not found"), 404
    return jsonify(success=True, product=p)

@app.route("/api/products/<product_id>", methods=["PUT"])
def api_update_product(product_id):
    data = request.get_json(silent=True) or {}

    products = load_products()
    updated = False

    for p in products:
        if p.get("product_id") == product_id:
            p["product_name"] = (data.get("product_name") or p.get("product_name") or "").strip()
            p["type"]         = (data.get("type") or p.get("type") or "").strip()
            p["category"]     = (data.get("category") or p.get("category") or "").strip()
            p["status"]       = (data.get("status") or p.get("status") or "Active").strip()

            try:
                p["stock_level"] = int(data.get("stock_level", p.get("stock_level", 0)))
            except:
                p["stock_level"] = 0

            try:
                p["price"] = float(data.get("price", p.get("price", 0)))
            except:
                p["price"] = 0.0

            updated = True
            break

    if not updated:
        return jsonify(success=False, message="Product not found"), 404

    save_products(products)
    return jsonify(success=True, message="Product updated")


# =========================================
# ✅ ROUTES: OTHER PAGES
# =========================================
@app.route("/products/create")
def create_new_product_page():
    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()
    user_name = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            break

    return render_template(
        "create-new-product.html",
        title="Create Product - Stackly",
        page="products",
        section="masters",
        user_email=user_email,
        user_name=user_name,
    )


@app.route("/download-template")
def download_template():
    # 1. Create empty dataframe
    df = pd.DataFrame(columns=[
        "Product ID",
        "Product Name",
        "Type",
        "Category",
        "Status",
        "Stock Level",
        "Price"
    ])

    # 2. Save to Excel in memory
    output = io.BytesIO()
    df.to_excel(output, index=False, sheet_name="Products")
    output.seek(0)

    # 3. Load workbook to add validations
    wb = load_workbook(output)
    ws = wb.active

    # ---------- DROPDOWN VALIDATIONS ----------
    type_validation = DataValidation(
        type="list",
        formula1='"Physical,Digital"',
        allow_blank=False
    )

    category_validation = DataValidation(
        type="list",
        formula1='"Electronics,Clothing,Food,Furniture"',
        allow_blank=False
    )

    status_validation = DataValidation(
        type="list",
        formula1='"Active,Inactive"',
        allow_blank=False
    )

    # ---------- NUMBER VALIDATIONS ----------
    stock_validation = DataValidation(
        type="whole",
        operator="greaterThanOrEqual",
        formula1="0",
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Invalid Stock Level",
        error="Stock Level must be a whole number (0 or greater)."
    )

    price_validation = DataValidation(
        type="decimal",
        operator="greaterThan",
        formula1="0",
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Invalid Price",
        error="Price must be a number greater than 0."
    )

    product_id_validation = DataValidation(
        type="whole",
        operator="greaterThan",
        formula1="0",
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Invalid Product ID",
        error="Product ID must contain ONLY numbers (no letters or special characters)."
    )

    product_name_validation = DataValidation(
        type="custom",
        # Custom validation formulas in openpyxl should NOT include a leading "="
        formula1=(
            'AND(B2<>"",'
            'NOT(OR('
            'ISNUMBER(SEARCH("0",B2)),'
            'ISNUMBER(SEARCH("1",B2)),'
            'ISNUMBER(SEARCH("2",B2)),'
            'ISNUMBER(SEARCH("3",B2)),'
            'ISNUMBER(SEARCH("4",B2)),'
            'ISNUMBER(SEARCH("5",B2)),'
            'ISNUMBER(SEARCH("6",B2)),'
            'ISNUMBER(SEARCH("7",B2)),'
            'ISNUMBER(SEARCH("8",B2)),'
            'ISNUMBER(SEARCH("9",B2))'
            '))'
            ')'
        ),
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Invalid Product Name",
        error="Only alphabets and spaces are allowed. Numbers are not permitted."
    )

    # Add validations to worksheet
    ws.add_data_validation(product_id_validation)
    ws.add_data_validation(type_validation)
    ws.add_data_validation(category_validation)
    ws.add_data_validation(status_validation)
    ws.add_data_validation(stock_validation)
    ws.add_data_validation(price_validation)
    ws.add_data_validation(product_name_validation)

    # Apply validation to columns (row 2 to 1000)
    product_id_validation.add("A2:A1000")
    product_name_validation.add("B2:B1000")
    type_validation.add("C2:C1000")
    category_validation.add("D2:D1000")
    status_validation.add("E2:E1000")
    stock_validation.add("F2:F1000")
    price_validation.add("G2:G1000")

    # 4. Save workbook again
    final_output = io.BytesIO()
    wb.save(final_output)
    final_output.seek(0)

    # 5. Download file
    return send_file(
        final_output,
        as_attachment=True,
        download_name="Product_Import_Template.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.route("/import", methods=["GET", "POST"])
def import_products():
    user_email = session.get("user")
    if not user_email:
        if request.method == "POST":
            return jsonify({
                "status": "error",
                "message": "Session expired. Please login first."
            }), 401
        return redirect(url_for("login", message="session_expired"))

    if request.method == "POST":
        file = request.files.get("file")

        if not file:
            return jsonify({
                "status": "error",
                "message": "No file uploaded"
            })

        # Save uploaded file
        upload_folder = "uploads"
        os.makedirs(upload_folder, exist_ok=True)
        file.save(os.path.join(upload_folder, file.filename))

        # Dummy response (replace later)
        return jsonify({
            "status": "success",
            "valid": 120,
            "invalid": 5,
            "skipped": 2,
            "errors": [
                'Missing "UOM" in Row 10,12,13',
                'Invalid GST Rate in Row 18'
            ]
        })

    # GET → open import page
    users = load_users()
    user_name = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            break

    return render_template(
        "import-product.html",
        title="Import Products - Stackly",
        page="products",
        section="masters",
        user_email=user_email,
        user_name=user_name,
    )


@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        df = pd.read_excel(file)
    except Exception:
        return jsonify({"error": "Invalid Excel file"}), 400

    valid_rows = 0
    invalid_rows = 0
    skipped_rows = 0
    error_details = []
    skipped_row_numbers = []  # Track which rows were skipped (completely blank)
    
    # Track seen row combinations for duplicate detection
    seen_rows = {}  # key: tuple of (Product ID, Product Name, Type, Category, Status, Stock Level, Price), value: first row number

    # Helper to check blank (NaN or empty/whitespace)
    def is_blank(val):
        if pd.isna(val):
            return True
        return str(val).strip() == ""
    
    # Helper to normalize value for comparison
    def normalize_value(val):
        if pd.isna(val):
            return ""
        return str(val).strip()

    for index, row in df.iterrows():
        errors = []

        # Treat rows where ALL A–G columns are blank as skipped
        if all(
            is_blank(row.get(col_name))
            for col_name in ["Product ID", "Product Name", "Type", "Category", "Status", "Stock Level", "Price"]
        ):
            skipped_rows += 1
            skipped_row_numbers.append(index + 2)  # Store row number (Excel row, +2 for header)
            # Don't validate or count as valid/invalid; just skip
            continue

        # --- Product ID (mandatory, numeric > 0) ---
        pid_raw = row.get("Product ID")
        if is_blank(pid_raw):
            errors.append("Product ID is required")
        else:
            try:
                # Try to convert to float first (handles both "12" and "12.0" from Excel)
                pid_num = float(pid_raw)
                # Check if it's a whole number (no decimal part)
                if not pid_num.is_integer():
                    errors.append("Product ID must be a whole number")
                elif int(pid_num) <= 0:
                    errors.append("Product ID must be greater than 0")
            except (ValueError, TypeError):
                # If conversion fails, it's not a valid number
                errors.append("Product ID must be a whole number")

        # --- Product Name (mandatory, alphabets + spaces, min length 3) ---
        pname_raw = row.get("Product Name")
        if is_blank(pname_raw):
            errors.append("Product Name is required")
        else:
            product_name = str(pname_raw).strip()
            if not re.fullmatch(r"^[A-Za-z ]+$", product_name):
                errors.append("Product Name must contain ONLY letters and spaces")
            elif len(product_name) < 3:
                errors.append("Product Name must be at least 3 characters")

        # --- Type (mandatory) ---
        type_raw = row.get("Type")
        if is_blank(type_raw):
            errors.append("Type is required")

        # --- Category (mandatory) ---
        category_raw = row.get("Category")
        if is_blank(category_raw):
            errors.append("Category is required")

        # --- Status (mandatory) ---
        status_raw = row.get("Status")
        if is_blank(status_raw):
            errors.append("Status is required")

        # --- Stock Level (mandatory, whole number >= 0) ---
        stock_raw = row.get("Stock Level")
        if is_blank(stock_raw):
            errors.append("Stock Level is required")
        else:
            try:
                stock_num = float(stock_raw)
                if not stock_num.is_integer():
                    errors.append("Stock Level must be a whole number")
                elif stock_num < 0:
                    errors.append("Stock Level must be 0 or greater")
            except Exception:
                errors.append("Stock Level must be a number")

        # --- Price (mandatory, number > 0) ---
        price_raw = row.get("Price")
        if is_blank(price_raw):
            errors.append("Price is required")
        else:
            try:
                price_num = float(price_raw)
                if price_num <= 0:
                    errors.append("Price must be greater than 0")
            except Exception:
                errors.append("Price must be a valid number")

        # --- Duplicate Row Check (based on all columns A-G) ---
        # Create a signature from all 7 columns for duplicate detection
        row_signature = (
            normalize_value(row.get("Product ID")),
            normalize_value(row.get("Product Name")),
            normalize_value(row.get("Type")),
            normalize_value(row.get("Category")),
            normalize_value(row.get("Status")),
            normalize_value(row.get("Stock Level")),
            normalize_value(row.get("Price"))
        )
        
        # Check if this exact row combination was seen before
        if row_signature in seen_rows:
            first_row = seen_rows[row_signature]
            errors.append(f"Duplicate row: This row is identical to row {first_row}")
        else:
            # Only track non-empty rows (at least one field filled)
            if any(row_signature):  # If at least one field is not empty
                seen_rows[row_signature] = index + 2  # Store the row number (Excel row, +2 for header)

        if errors:
            invalid_rows += 1
            error_details.append({
                "row": index + 2,  # +2 because header is row 1
                "errors": errors
            })
        else:
            valid_rows += 1

    return jsonify({
        "total_rows": len(df),
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "skipped_rows": skipped_rows,
        "skipped_row_numbers": skipped_row_numbers,  # List of row numbers that were skipped
        "error_details": error_details
    })

@app.route("/import-products-validated", methods=["POST"])
def import_products_validated():
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        df = pd.read_excel(file)
    except Exception:
        return jsonify({"error": "Invalid Excel file"}), 400

    products = load_products()
    added = 0

    for _, row in df.iterrows():
        errors = []

        # Product Name validation (same rules as /upload)
        raw_name = row.get("Product Name")
        if pd.isna(raw_name):
            errors.append("Product Name is required")
        else:
            product_name = str(raw_name).strip()
            if not re.fullmatch(r"^[A-Za-z ]+$", product_name):
                errors.append("Product Name must contain ONLY letters and spaces")
            elif len(product_name) < 3:
                errors.append("Product Name must be at least 3 characters")

        if errors:
            # Skip invalid rows, we only import validated rows
            continue

        # Basic extraction of remaining fields
        raw_id = row.get("Product ID")
        product_id = "" if pd.isna(raw_id) else str(raw_id).strip()

        # Require non-empty product ID, but allow duplicates so all validated rows are imported
        if not product_id:
            continue

        type_val = "" if pd.isna(row.get("Type")) else str(row.get("Type")).strip()
        category_val = "" if pd.isna(row.get("Category")) else str(row.get("Category")).strip()
        status_val = "" if pd.isna(row.get("Status")) else str(row.get("Status")).strip() or "Active"

        stock_raw = row.get("Stock Level")
        price_raw = row.get("Price")

        try:
            stock_level = int(stock_raw) if not pd.isna(stock_raw) else 0
        except Exception:
            stock_level = 0

        try:
            price = float(price_raw) if not pd.isna(price_raw) else 0.0
        except Exception:
            price = 0.0

        item = {
            "product_id": product_id,
            "product_name": product_name,
            "type": type_val,
            "category": category_val,
            "status": status_val,
            "stock_level": stock_level,
            "price": price,
        }

        products.append(item)
        added += 1

    save_products(products)

    return jsonify({"success": True, "added": added})


@app.route("/save-product", methods=["POST"])
def save_product():
    try:
        product_id = generate_product_id()

        # ------- safe converters so empty / bad values won't crash ------
        def to_int(val, default=0):
            try:
                return int(val)
            except (TypeError, ValueError):
                return default

        def to_float(val, default=0.0):
            try:
                return float(val)
            except (TypeError, ValueError):
                return default

        # -------------------- IMAGE HANDLING ----------------------------
        image = request.files.get("product_image")
        image_filename = None

        if image and image.filename:
            image_filename = secure_filename(image.filename)

            # ensure upload folder exists
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)

            image_path = os.path.join(UPLOAD_FOLDER, image_filename)
            image.save(image_path)

        # -------------------- PRODUCT OBJECT ----------------------------
        form = request.form

        product = {
            "product_id": str(product_id),
            "product_name": (form.get("product_name") or "").strip(),
            "type": (form.get("product_type") or "").strip(),
            "category": (form.get("category") or "").strip(),
            "status": (form.get("status") or "active").strip(),

            # fields used in table
            "stock_level": to_int(form.get("stock_level")),          
            "price": to_float(form.get("unit_price")),               

            # extra fields (for future use)
            "description": (form.get("description") or "").strip(),
            "sub_category": (form.get("sub_category") or "").strip(),
            "unit_price": (form.get("unit_price") or "").strip(),
            "discount": (form.get("discount") or "").strip(),
            "tax_code": (form.get("tax_code") or "").strip(),
            "quantity": (form.get("quantity") or "").strip(),
            "uom": (form.get("uom") or "").strip(),
            "reorder_level": (form.get("reorder_level") or "").strip(),
            "warehouse": (form.get("warehouse") or "").strip(),
            "size": (form.get("size") or "").strip(),
            "color": (form.get("color") or "").strip(),
            "weight": (form.get("weight") or "").strip(),
            "specifications": (form.get("specifications") or "").strip(),
            "related_products": (form.get("related_products") or "").strip(),
            "supplier": (form.get("supplier") or "").strip(),
            "product_usage": (form.get("product_usage") or "").strip(),
            "image": image_filename,
        }

        # -------------------- SAVE TO JSON -----------------------------
        products = load_products()
        products.append(product)
        save_products(products)

        return jsonify(success=True, product_id=product_id)

    except Exception as e:
        
        print("ERROR in /save-product:", e)
        return jsonify(success=False, message="Internal server error"), 500


@app.route("/customer")
def customer():
    return render_template("customer.html", page="customer", section="masters")


@app.route("/crm")
def crm():
    return render_template("crm.html", page="crm")


# =========================================
# ✅ ROUTES: OTP (APIs)
# =========================================
@app.route("/send_otp", methods=["POST"])
def send_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify(success=False, message="Email is required"), 400

    if len(email) > MAX_EMAIL_LENGTH:
        return jsonify(success=False, message="Email is too long. Max 50 characters."), 400

    if not EMAIL_REGEX.match(email):
        return jsonify(success=False, message="Enter a valid email address like name@gmail.com or name@yahoo.com"), 400

    otp = generate_otp()
    print("DEBUG OTP for", email, "=", otp)

    save_otp_in_db(email, otp)

    try:
        send_otp_email(email, otp)
    except Exception as e:
        print("Error sending OTP:", e)
        return jsonify(success=False, message="Error sending OTP. Try again."), 500

    return jsonify(success=True, message="OTP sent successfully!")


@app.route("/verify_otp", methods=["POST"])
def verify_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if verify_otp_in_db(email, otp):
        return jsonify({"success": True, "message": "OTP verified successfully!"}), 200
    return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400


# =========================================
# ✅ ROUTES: SIGNUP (POST API)
# =========================================
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    missing = []
    if not name:
        missing.append("Name")
    if not phone:
        missing.append("Phone number")
    if not email:
        missing.append("Email")
    if not password:
        missing.append("Password")

    if missing:
        if len(missing) == 1:
            msg = f"⚠️ {missing[0]} is required"
        else:
            msg = "⚠️ " + ", ".join(missing[:-1]) + f" and {missing[-1]} are required"
        return jsonify({"success": False, "message": msg}), 400

    if not NAME_REGEX.match(name):
        return jsonify({"success": False, "message": "⚠️ Name must be 3–20 letters only"}), 400

    if not re.match(r"^\+\d{8,15}$", phone):
       return jsonify({"success": False, "message": "Enter valid phone with country code like +91XXXXXXXXXX"}), 400

    if len(email) > MAX_EMAIL_LENGTH:
        return jsonify({"success": False, "message": "⚠️ Email is too long (max 50 characters)"}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"success": False, "message": "⚠️ Enter a valid email address (like name@gmail.com or name@outlook.com)"}), 400

    if not is_email_otp_verified(email):
        return jsonify({
            "success": False,
            "message": "⚠️ Please verify OTP for this email before signing up."
        }), 400

    users = load_users()
    if any((u.get("email") or "").strip().lower() == email for u in users):
        return jsonify({"success": False, "message": "⚠️ User already exists"}), 409

    users.append({
        "name": name,
        "phone": phone,
        "email": email,
        "password": password,
        "role": "User",   # ✅ assigned automatically
    })
    save_users(users)

    otps = load_otps()
    otps.pop(email, None)
    save_otps(otps)

    send_email(email, "Welcome!", f"Hello {name}, your account has been created successfully!")

    return jsonify({"success": True, "message": "🎉 Signup successful!"}), 200


# =========================================
# ✅ ROUTES: LOGIN (POST API)
# =========================================
@app.route("/login", methods=["POST"])
def login_post():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    remember_me = data.get("rememberMe", False)

    users = load_users()
    failed_attempts = load_failed_attempts()
    user = next((u for u in users if (u.get("email") or "").strip().lower() == email), None)

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    info = failed_attempts.get(email, {})
    if "locked_until" in info and time.time() < info["locked_until"]:
        remaining = int(info["locked_until"] - time.time())
        return jsonify({"success": False, "message": f"Account locked. Try again in {remaining}s."}), 403

    if user.get("password") != password:
        info.setdefault("count", 0)
        info["count"] += 1

        if info["count"] >= LOCKOUT_THRESHOLD:
            info["locked_until"] = time.time() + LOCKOUT_DURATION
            failed_attempts[email] = info
            save_failed_attempts(failed_attempts)
            return jsonify({"success": False, "message": f"Too many failed attempts. Locked for {LOCKOUT_DURATION//60} min."}), 403

        failed_attempts[email] = info
        save_failed_attempts(failed_attempts)
        remaining = LOCKOUT_THRESHOLD - info["count"]
        return jsonify({"success": False, "message": f"Incorrect password. {remaining} attempts left."}), 401

    if email in failed_attempts:
        failed_attempts.pop(email, None)
        save_failed_attempts(failed_attempts)

    session.permanent = bool(remember_me)
    session["user"] = email
    session["remember_me"] = bool(remember_me)  # Store remember_me flag in session

    # ⚠️ POSSIBLE KEY ERROR if user has no "role"
    session["role"] = user.get("role", "User")

    session["last_active"] = time.time()
    print("✅ Login success, session active")
    return jsonify({"success": True, "message": "Login successful"}), 200


# =========================
# API: LIST + FILTER + PAGINATION
# =========================
@app.route("/api/products")
def api_products():
    products = load_products()

    q = (request.args.get("q") or "").strip().lower()
    ptype = (request.args.get("type") or "").strip()
    cat = (request.args.get("category") or "").strip()
    status = (request.args.get("status") or "").strip()
    stock = (request.args.get("stock") or "").strip()

    page = int(request.args.get("page") or 1)
    page_size = int(request.args.get("page_size") or 10)

    # filter
    def match(p):
        if q:
            hay = " ".join([
                str(p.get("product_id","")),
                str(p.get("product_name","")),
                str(p.get("type","")),
                str(p.get("category","")),
                str(p.get("status","")),
            ]).lower()

            if q not in hay:
                return False
        if ptype and p.get("type") != ptype:
            return False
        if cat and p.get("category") != cat:
            return False
        if status and p.get("status") != status:
            return False

        # stock buckets
        level = int(p.get("stock_level") or 0)
        if stock == "out" and level != 0:
            return False
        if stock == "low" and not (1 <= level <= 5):
            return False
        if stock == "ok" and level <= 5:
            return False

        return True

    filtered = [p for p in products if match(p)]

    # meta for dropdown
    types = sorted({p.get("type","") for p in products if p.get("type")})
    categories = sorted({p.get("category","") for p in products if p.get("category")})

    # pagination
    total_items = len(filtered)
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))

    start = (page - 1) * page_size
    end = start + page_size
    items = filtered[start:end]

    return jsonify({
        "items": items,
        "page": page,
        "total_pages": total_pages,
        "total_items": total_items,
        "meta": {"types": types, "categories": categories}
    })



# =========================
# API: DELETE
# =========================
@app.route("/api/products/<product_id>", methods=["DELETE"])
def api_delete_product(product_id):
    products = load_products()
    before = len(products)
    products = [p for p in products if p.get("product_id") != product_id]
    save_products(products)

    if len(products) == before:
     return jsonify(success=False, message="Product not found"), 404
    return jsonify(success=True, message="Product deleted")
# =========================
# API: IMPORT CSV
# CSV columns: product_id,product_name,type,category,status,stock_level,price
# =========================
@app.route("/api/products/import", methods=["POST"])
def api_import_products():
    if "file" not in request.files:
        return jsonify({"message": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename.lower().endswith(".csv"):
        return jsonify({"message": "Only CSV supported"}), 400

    products = load_products()
    existing_ids = {p.get("product_id") for p in products}

    decoded = file.stream.read().decode("utf-8", errors="ignore").splitlines()
    reader = csv.DictReader(decoded)

    added = 0
    for row in reader:
        pid = (row.get("product_id") or "").strip()
        if not pid or pid in existing_ids:
            continue

        item = {
            "product_id": pid,
            "product_name": (row.get("product_name") or "").strip(),
            "type": (row.get("type") or "").strip(),
            "category": (row.get("category") or "").strip(),
            "status": (row.get("status") or "Active").strip(),
            "stock_level": int((row.get("stock_level") or 0)),
            "price": float((row.get("price") or 0))
        }
        products.append(item)
        existing_ids.add(pid)
        added += 1

    save_products(products)
    return jsonify({"message": f"Import done ✅ Added {added} products"})


# =========================================
# ✅ SESSION TIMEOUT FUNCTION
# =========================================
def check_session_timeout():
    if "user" not in session:
        return False

    # If "Remember Me" is checked, skip inactivity timeout check
    remember_me = session.get("remember_me", False)
    if remember_me:
        # Still update last_active for tracking, but don't expire session
        session["last_active"] = time.time()
        return True

    # For normal sessions, check inactivity timeout
    last_active = session.get("last_active", 0)
    now = time.time()

    if now - last_active > INACTIVITY_TIMEOUT:
        session.clear()
        return False

    session["last_active"] = now
    return True


# =========================================
# ✅ ROUTES: LOGOUT
# =========================================
@app.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("last_active", None)
    session.pop("remember_me", None)
    return redirect(url_for("login", message="logged_out"))


# =========================================
# ✅ ROUTES: GLOBAL SEARCH (API)
# =========================================
@app.route("/search")
def global_search():
    q = (request.args.get("q") or "").strip().lower()
    results = []

    if not q:
        return jsonify({"results": []})

    users = load_users()
    for u in users:
        if not isinstance(u, dict):
            continue

        name = (u.get("name") or "").strip()
        email = (u.get("email") or "").strip()
        phone = (u.get("phone") or "").strip()

        if (q in name.lower() or q in email.lower() or q in phone):
            results.append({
                "type": "User",
                "label": f"{name} - {email}",
                "url": "/manage-users",
            })

    menu_items = [
        ("Dashboard", "/dashboard"),
        ("Masters", "/manage-users"),
        ("Manage Users", "/manage-users"),
        ("Products", "/products"),
        ("Customer", "/customer"),
        ("Department Role", "/department-role"),
        ("CRM", "/crm"),
        ("New Enquiry", "/crm"),
        ("Quotation Module", "/crm"),
        ("Sales", "/crm"),
        ("Delivery Note Module", "/crm"),
        ("Invoice Module", "/crm"),
        ("Delivery Note Return", "/crm"),
        ("Invoice Return Module", "/crm"),
    ]

    for label, url in menu_items:
        if q in label.lower():
            results.append({
                "type": "Menu",
                "label": label,
                "url": url,
            })

    return jsonify({"results": results})


# =========================================
# ✅ ROUTES: API - GET ALL USERS (JSON)
# =========================================
@app.route("/api/users", methods=["GET"])
def api_get_users():
    """Get all users as JSON - for Postman/API testing"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    users = load_users()

    user_name = "User"
    user_role = "User"

    current_email = (user_email or "").strip().lower()

    for u in users:
        if not isinstance(u, dict):
            continue
        u_email = (u.get("email") or "").strip().lower()
        if u_email == current_email:
            user_name = u.get("name") or "User"
            user_role = (u.get("role") or "User").strip()
            break

    return jsonify({
        "success": True,
        "users": users,
        "total": len(users),
        "current_user": {
            "email": user_email,
            "name": user_name,
            "role": user_role
        }
    }), 200


# ✅ ROUTES: API - GET SINGLE USER BY INDEX (JSON)
# =========================================
@app.route("/api/users/<int:user_index>", methods=["GET"])
def api_get_user(user_index):
    """Get a single user by index as JSON - for Postman/API testing"""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    users = load_users()

    if user_index < 0 or user_index >= len(users):
        return jsonify({"success": False, "message": "User index out of range"}), 404

    user = users[user_index]
    if not isinstance(user, dict):
        return jsonify({"success": False, "message": "Invalid user data"}), 400

    return jsonify({
        "success": True,
        "user": user,
        "index": user_index
    }), 200


# ✅ ROUTES: DELETE USER (API)
# =========================================
@app.route("/delete-user/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        user_email = session.get("user")
        if not user_email:
            return jsonify({"success": False, "message": "Not logged in"}), 401

        users = load_users()

        current_email = (user_email or "").strip().lower()
        current_user = None

        for u in users:
            if not isinstance(u, dict):
                continue
            u_email = (u.get("email") or "").strip().lower()
            if u_email == current_email:
                current_user = u
                break

        if not current_user:
            return jsonify({"success": False, "message": "Current user not found"}), 403

        current_role = (current_user.get("role") or "").strip().lower()
        if current_role != "admin":
            return jsonify({
                "success": False,
                "message": "Only admins can delete users."
            }), 403

        if user_id < 0 or user_id >= len(users):
            return jsonify({"success": False, "message": "Invalid user ID"}), 404

        deleted_user = users.pop(user_id)
        save_users(users)

        return jsonify({
            "success": True,
            "message": "User deleted successfully",
            "deleted_email": deleted_user.get("email", "")
        }), 200

    except Exception as e:
        print("❌ Delete user error:", e)
        return jsonify({
            "success": False,
            "message": "Server error while deleting user"
        }), 500


# =========================================
# ✅ RUN APP
# =========================================
if __name__ == "__main__":
    app.run(debug=True)
