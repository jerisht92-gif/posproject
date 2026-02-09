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
from datetime import timedelta, datetime
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
# Inactivity timeout for normal sessions when "Remember Me" is not checked (in seconds)
# 15 minutes = 900 seconds — after this, user is logged out and redirected to login
INACTIVITY_TIMEOUT = 900


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
CUSTOMER_FILE = os.path.join(app.root_path, "customer.json")
ENQUIRY_FILE = os.path.join(app.root_path, "new-enquiry.json")
ENQUIRY_PRODUCT_FILE = os.path.join(app.root_path, "enquiry_product.json")
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
# ✅ SIGNUP OTP RATE LIMITING
# =========================================
# BUG_008: Too many OTP resend attempts should return HTTP 429 instead of 200.
# We keep a simple in‑memory counter of recent OTP sends per email.
OTP_SEND_COUNT = {}  # { email: [timestamps...] }
MAX_OTP_SENDS = 5    # max OTPs within the window
OTP_WINDOW_SECONDS = 5 * 60  # 5 minutes


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
# ✅ CONTENT NEGOTIATION (HTML vs JSON for Postman)
# =========================================
def wants_json():
    """Check if client wants JSON response (API/Postman).
    Returns True for: Accept: application/json, ?format=json, or request.is_json"""
    accept = request.headers.get("Accept", "")
    return "application/json" in accept or request.args.get("format") == "json" or request.is_json


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
    # Skip session check for API endpoints (they handle their own auth if needed)
    # API endpoints can work with or without session (for AJAX calls from authenticated pages)
    if not request.path.startswith("/api/"):
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
    """Generate a new product_id in format 'P101', 'P102', ..."""
    products = load_products()
    if not products:
        return "P101"

    max_num = 0
    for p in products:
        pid = str(p.get("product_id", "")).strip()
        # Extract numeric part from formats like "P101", "101", "P-101", etc.
        match = re.search(r"(\d+)$", pid)
        if match:
            max_num = max(max_num, int(match.group(1)))

    return f"P{max_num + 1}"


@app.route('/api/products/new-id', methods=['GET'])
def get_new_product_id():
    """Returns the next auto-generated product ID"""
    product_id = generate_product_id()
    return jsonify({"productId": product_id})


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
# MODULE INDEX (matches sidebar: Dashboard → Masters → CRM)
# =========================================
# 1. ROOT & AUTH         — /, /login, /signup, /logout, forgot-password, reset-password, OTP
# 2. DASHBOARD           — /dashboard
# 3. MASTERS — Manage Users   — /manage-users, /create-user, /update-user, /delete-user, /api/users
# 4. MASTERS — Department & Roles — /department-roles, /api/departments, /api/roles
# 5. MASTERS — Products  — /products, /products/create, /import, /api/products
# 6. MASTERS — Customer  — /customer, /import-customer, /addnew-customer, /api/customer, /api/customers
# 7. CRM — Enquiry List  — /enquiry-list
# 8. CRM — New Enquiry   — /new-enquiry, /save-enquiry, /add-product, enquiry APIs
# 9. UTILITY             — /profile, /search, /logout
# =========================================

# =========================================
# 1. ROOT & AUTH
# =========================================
@app.route("/")
def root():
    return redirect(url_for("login"))


# =========================================
# 2. DASHBOARD
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
# 1. ROOT & AUTH — Auth pages (GET)
# =========================================
@app.route("/signup")
def home():
    return render_template("signup.html")


@app.route("/login")
def login():
    message = request.args.get("message", "")

    # BUG_009: When the client explicitly asks for JSON (eg. Postman),
    # treat GET on /login as an invalid HTTP method for the JSON API.
    if wants_json():
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Method not allowed. Use POST /login for authentication.",
                }
            ),
            405,
        )

    return render_template("index.html", message=message)


@app.route("/forgot-password")
def forgot_password():
    return render_template("forgot-password.html")


@app.route("/check-your-mail")
def check_your_mail_page():
    email = request.args.get("email", "")
    return render_template("check-your-mail.html", email=email)


# =========================================
# 3. MASTERS — Manage Users
# =========================================
@app.route("/manage-users")
def manage_users():
    user_email = session.get("user")
    if not user_email:
        if wants_json():
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

    if wants_json():
        return jsonify({
            "success": True,
            "users": users,
            "total": len(users),
            "current_user": {"email": user_email, "name": user_name, "role": user_role}
        }), 200

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
# 4. MASTERS — Department & Roles
# =========================================
@app.route("/department-roles")
def department_roles():
    user_email = session.get("user")
    if not user_email:
        if wants_json():
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

    if wants_json():
        return jsonify({
            "success": True,
            "departments": departments,
            "total": len(departments),
            "current_user": {"email": user_email, "name": user_name, "role": user_role}
        }), 200

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
        flash("Department has been created successfully", "success")
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
# 4. MASTERS — Department & Roles — Edit/Delete (UI)
# =========================================
@app.route("/department-roles/edit", methods=["POST"])
def edit_department():
    # Session check (same as Edit Product / other edit modules)
    user_email = session.get("user")
    if not user_email:
        return jsonify(success=False, error="Session expired. Please login first."), 401

    try:
        data = request.get_json(silent=True) or {}
        dept_id = data.get("id")
        code = (data.get("code") or "").strip()
        name = (data.get("name") or "").strip()
        description = data.get("description")

        # Allow 0 as valid id; reject only None or empty string
        if dept_id is None or (isinstance(dept_id, str) and not dept_id.strip()):
            return jsonify(success=False, error="Missing department ID"), 400

        departments = load_departments()
        if not isinstance(departments, list):
            departments = []

        # Check for duplicates (case-insensitive) - exclude current department (compare as string)
        new_code = code.lower()
        new_name = name.lower()
        dept_id_str = str(dept_id)

        for dept in departments:
            if str(dept.get("id")) == dept_id_str:
                continue
            existing_code = (dept.get("code") or "").strip().lower()
            existing_name = (dept.get("name") or "").strip().lower()
            if existing_code == new_code:
                return jsonify(success=False, error="Department code already exists. Please use a different code."), 409
            if existing_name == new_name:
                return jsonify(success=False, error="Department name already exists. Please use a different name."), 409

        updated = False
        for dept in departments:
            if str(dept.get("id")) == dept_id_str:
                dept["code"] = code
                dept["name"] = name
                if description is not None:
                    dept["description"] = description
                updated = True
                break

        if not updated:
            return jsonify(success=False, error="Department ID not found"), 404

        save_departments(departments)
        return jsonify(success=True), 200

    except Exception as e:
        print("EDIT ERROR:", e)
        return jsonify(success=False, error=str(e)), 500


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
# =========================================
# 4. MASTERS — Department & Roles — APIs
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
# 4. MASTERS — Department & Roles — Role UI
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
        page="department_roles",
        section="masters",
        user_email=user_email,
        user_name=user_name,
        user_role=user_role
    )


# =========================================
# 4. MASTERS — Department & Roles — Save/Edit Role (UI)
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
# 4. MASTERS — Department & Roles — APIs (continued)
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
# 9. UTILITY — Profile
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
# 1. ROOT & AUTH — Check Email (AJAX)
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
# 1. ROOT & AUTH — Forgot Password (AJAX)
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
# 1. ROOT & AUTH — Reset Password
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
# 3. MASTERS — Manage Users — Create User
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
# 3. MASTERS — Manage Users — Update User
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
    return jsonify({"success": True, "message": "User updated"}), 200


# =========================================
# 5. MASTERS — Products
# =========================================
@app.route("/products")
def products():
    user_email = session.get("user")
    if not user_email:
        if wants_json():
            return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
        return redirect(url_for("login"))
    
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
    
    if wants_json():
        products_list = load_products()
        return jsonify({
            "success": True,
            "products": products_list,
            "total": len(products_list),
            "current_user": {"email": user_email, "name": user_name, "role": user_role}
        }), 200
    
    return render_template(
        "products.html",
        title="Product Master - Stackly",
        page="products",
        section="masters",
        user_email=user_email,
        user_name=user_name,
        user_role=user_role
    )


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

    if percent < 1 or percent > 100:
        return jsonify({"success": False, "message": "Tax percentage must be between 1 and 100."}), 400

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

# =========================
# API: GET SINGLE PRODUCT (Supports HTML & JSON)
# =========================
@app.route("/api/products/<product_id>", methods=["GET"])
def api_get_product(product_id):
    """
    GET /api/products/<product_id>
    
    Returns a single product by ID
    Supports both JSON and HTML responses
    """
    # BUG_001 / BUG_006: Require login for product APIs and return JSON 401
    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    products = load_products()
    p = next((x for x in products if x.get("product_id") == str(product_id)), None)
    
    if not p:
        error_response = {
            "success": False,
            "message": "Product not found",
            "error": f"Product with ID '{product_id}' does not exist"
        }
        if wants_json():
            return jsonify(error_response), 404
        else:
            return jsonify(error_response), 404
    
    response_data = {
        "success": True,
        "data": p,
        "message": "Product retrieved successfully"
    }
    
    if wants_json():
        return jsonify(response_data), 200
    else:
        return jsonify(response_data), 200

# =========================
# API: CREATE PRODUCT (Supports HTML & JSON)
# =========================
@app.route("/api/products", methods=["POST"])
def api_create_product():
    """
    POST /api/products
    Content-Type: application/json
    
    Request Body (JSON):
    {
        "product_name": "Product Name",
        "type": "Physical",
        "category": "Electronics",
        "status": "Active",
        "stock_level": 100,
        "price": 99.99,
        ... (other optional fields)
    }
    
    Returns created product with generated ID
    """
    # BUG_001 / BUG_006: Require login for product APIs
    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    if not request.is_json:
        error_response = {
            "success": False,
            "message": "Content-Type must be application/json",
            "error": "Invalid request format"
        }
        if wants_json():
            return jsonify(error_response), 400
        else:
            return jsonify(error_response), 400
    
    data = request.get_json() or {}
    
    # Validation
    product_name = (data.get("product_name") or "").strip()
    if not product_name:
        error_response = {
            "success": False,
            "message": "Product name is required",
            "error": "Validation failed"
        }
        if wants_json():
            return jsonify(error_response), 400
        else:
            return jsonify(error_response), 400
    
    # Generate product ID
    product_id = generate_product_id()
    
    # Build product object
    product = {
        "product_id": str(product_id),
        "product_name": product_name,
        "type": (data.get("type") or "").strip(),
        "category": (data.get("category") or "").strip(),
        "status": (data.get("status") or "Active").strip(),
        "stock_level": int(data.get("stock_level", 0)),
        "price": float(data.get("price", 0.0)),
        "description": (data.get("description") or "").strip(),
        "sub_category": (data.get("sub_category") or "").strip(),
        "unit_price": (data.get("unit_price") or "").strip(),
        "discount": (data.get("discount") or "").strip(),
        "tax_code": (data.get("tax_code") or "").strip(),
        "quantity": (data.get("quantity") or "").strip(),
        "uom": (data.get("uom") or "").strip(),
        "reorder_level": (data.get("reorder_level") or "").strip(),
        "warehouse": (data.get("warehouse") or "").strip(),
        "size": (data.get("size") or "").strip(),
        "color": (data.get("color") or "").strip(),
        "weight": (data.get("weight") or "").strip(),
        "specifications": (data.get("specifications") or "").strip(),
        "related_products": (data.get("related_products") or "").strip(),
        "supplier": (data.get("supplier") or "").strip(),
        "product_usage": (data.get("product_usage") or "").strip(),
        "image": (data.get("image") or "").strip(),
    }
    
    # Save product
    products = load_products()
    products.append(product)
    save_products(products)
    
    response_data = {
        "success": True,
        "message": "Product created successfully",
        "data": product
    }
    
    if wants_json():
        return jsonify(response_data), 201
    else:
        return jsonify(response_data), 201


# =========================
# API: UPDATE PRODUCT (PUT - Full Update) (Supports HTML & JSON)
# =========================
@app.route("/api/products/<product_id>", methods=["PUT"])
def api_update_product(product_id):
    """
    PUT /api/products/<product_id>
    Content-Type: application/json
    
    Full update - replaces entire product
    """
    # BUG_001 / BUG_006: Require login for product APIs
    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    if not request.is_json:
        error_response = {
            "success": False,
            "message": "Content-Type must be application/json",
            "error": "Invalid request format"
        }
        if wants_json():
            return jsonify(error_response), 400
        else:
            return jsonify(error_response), 400
    
    data = request.get_json(silent=True) or {}

    # BUG_005: Validate payload and reject obviously invalid values
    errors = []
    product_name = (data.get("product_name") or "").strip()
    if not product_name:
        errors.append("Product name is required.")

    if "stock_level" in data:
        try:
            stock_val = int(data.get("stock_level"))
            if stock_val < 0:
                errors.append("Stock level must be 0 or greater.")
        except (TypeError, ValueError):
            errors.append("Stock level must be a whole number.")

    if "price" in data:
        try:
            price_val = float(data.get("price"))
            if price_val <= 0:
                errors.append("Price must be greater than 0.")
        except (TypeError, ValueError):
            errors.append("Price must be a valid number.")

    if errors:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Validation failed",
                    "errors": errors,
                }
            ),
            400,
        )
    products = load_products()
    updated = False
    product = None

    for p in products:
        if str(p.get("product_id")) == str(product_id):
            # Full update - replace all fields
            p["product_name"] = (data.get("product_name") or p.get("product_name") or "").strip()
            p["type"] = (data.get("type") or p.get("type") or "").strip()
            p["category"] = (data.get("category") or p.get("category") or "").strip()
            p["status"] = (data.get("status") or p.get("status") or "Active").strip()

            try:
                p["stock_level"] = int(data.get("stock_level", p.get("stock_level", 0)))
            except:
                p["stock_level"] = 0

            try:
                p["price"] = float(data.get("price", p.get("price", 0)))
            except:
                p["price"] = 0.0

            # Update optional fields if provided
            if "description" in data:
                p["description"] = (data.get("description") or "").strip()
            if "sub_category" in data:
                p["sub_category"] = (data.get("sub_category") or "").strip()
            if "tax_code" in data:
                p["tax_code"] = (data.get("tax_code") or "").strip()
            if "supplier" in data:
                p["supplier"] = (data.get("supplier") or "").strip()

            product = p
            updated = True
            break

    if not updated:
        error_response = {
            "success": False,
            "message": "Product not found",
            "error": f"Product with ID '{product_id}' does not exist"
        }
        if wants_json():
            return jsonify(error_response), 404
        else:
            return jsonify(error_response), 404

    # -------------------- DUPLICATE VALIDATION (exclude current product) -----------------------------
    # Normalize values for comparison (case-insensitive for text, exact for numbers)
    updated_product_name = (product.get("product_name") or "").strip().lower()
    updated_type = (product.get("type") or "").strip().lower()
    updated_category = (product.get("category") or "").strip().lower()
    updated_status = (product.get("status") or "").strip().lower()
    updated_stock_level = product.get("stock_level", 0)
    updated_price = product.get("price", 0.0)
    
    # Check 1: Duplicate product name (case-insensitive, exclude current product)
    for existing in products:
        if str(existing.get("product_id")) == str(product_id):
            continue  # Skip the product being updated
        existing_name = (existing.get("product_name") or "").strip().lower()
        if existing_name == updated_product_name:
            error_response = {
                "success": False,
                "message": f"Product with name '{product.get('product_name')}' already exists. Please use a different product name."
            }
            if wants_json():
                return jsonify(error_response), 409
            else:
                return jsonify(error_response), 409
    
    # Check 2: Duplicate combination (exclude current product)
    for existing in products:
        if str(existing.get("product_id")) == str(product_id):
            continue  # Skip the product being updated
        existing_name = (existing.get("product_name") or "").strip().lower()
        existing_type = (existing.get("type") or "").strip().lower()
        existing_category = (existing.get("category") or "").strip().lower()
        existing_status = (existing.get("status") or "").strip().lower()
        existing_stock_level = existing.get("stock_level", 0)
        existing_price = existing.get("price", 0.0)
        
        # Compare all fields (case-insensitive for text, exact for numbers)
        if (existing_name == updated_product_name and
            existing_type == updated_type and
            existing_category == updated_category and
            existing_status == updated_status and
            existing_stock_level == updated_stock_level and
            abs(existing_price - updated_price) < 0.01):  # Float comparison with tolerance
            error_response = {
                "success": False,
                "message": f"A product with the same combination (Name: '{product.get('product_name')}', Type: '{product.get('type')}', Category: '{product.get('category')}', Status: '{product.get('status')}', Stock Level: {updated_stock_level}, Price: {updated_price}) already exists."
            }
            if wants_json():
                return jsonify(error_response), 409
            else:
                return jsonify(error_response), 409

    save_products(products)
    
    response_data = {
        "success": True,
        "message": "Product updated successfully",
        "data": product
    }
    
    if wants_json():
        return jsonify(response_data), 200
    else:
        return jsonify(response_data), 200


# =========================
# API: PARTIAL UPDATE PRODUCT (PATCH) (Supports HTML & JSON)
# =========================
@app.route("/api/products/<product_id>", methods=["PATCH"])
def api_patch_product(product_id):
    """
    PATCH /api/products/<product_id>
    Content-Type: application/json
    
    Partial update - only updates provided fields
    """
    # BUG_001 / BUG_006: Require login for product APIs
    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    if not request.is_json:
        error_response = {
            "success": False,
            "message": "Content-Type must be application/json",
            "error": "Invalid request format"
        }
        if wants_json():
            return jsonify(error_response), 400
        else:
            return jsonify(error_response), 400
    
    data = request.get_json(silent=True) or {}

    # BUG_005: Validate any fields that are provided
    errors = []
    if "product_name" in data:
        name = (data.get("product_name") or "").strip()
        if not name:
            errors.append("Product name cannot be blank.")
    if "stock_level" in data:
        try:
            stock_val = int(data.get("stock_level"))
            if stock_val < 0:
                errors.append("Stock level must be 0 or greater.")
        except (TypeError, ValueError):
            errors.append("Stock level must be a whole number.")
    if "price" in data:
        try:
            price_val = float(data.get("price"))
            if price_val <= 0:
                errors.append("Price must be greater than 0.")
        except (TypeError, ValueError):
            errors.append("Price must be a valid number.")

    if errors:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Validation failed",
                    "errors": errors,
                }
            ),
            400,
        )
    products = load_products()
    updated = False
    product = None

    for p in products:
        if str(p.get("product_id")) == str(product_id):
            # Partial update - only update provided fields
            if "product_name" in data:
                p["product_name"] = (data.get("product_name") or "").strip()
            if "type" in data:
                p["type"] = (data.get("type") or "").strip()
            if "category" in data:
                p["category"] = (data.get("category") or "").strip()
            if "status" in data:
                p["status"] = (data.get("status") or "Active").strip()
            if "stock_level" in data:
                try:
                    p["stock_level"] = int(data.get("stock_level", 0))
                except:
                    p["stock_level"] = 0
            if "price" in data:
                try:
                    p["price"] = float(data.get("price", 0))
                except:
                    p["price"] = 0.0
            if "description" in data:
                p["description"] = (data.get("description") or "").strip()
            if "sub_category" in data:
                p["sub_category"] = (data.get("sub_category") or "").strip()
            if "tax_code" in data:
                p["tax_code"] = (data.get("tax_code") or "").strip()
            if "supplier" in data:
                p["supplier"] = (data.get("supplier") or "").strip()

            product = p
            updated = True
            break

    if not updated:
        error_response = {
            "success": False,
            "message": "Product not found",
            "error": f"Product with ID '{product_id}' does not exist"
        }
        if wants_json():
            return jsonify(error_response), 404
        else:
            return jsonify(error_response), 404

    # -------------------- DUPLICATE VALIDATION (exclude current product) -----------------------------
    # Normalize values for comparison (case-insensitive for text, exact for numbers)
    updated_product_name = (product.get("product_name") or "").strip().lower()
    updated_type = (product.get("type") or "").strip().lower()
    updated_category = (product.get("category") or "").strip().lower()
    updated_status = (product.get("status") or "").strip().lower()
    updated_stock_level = product.get("stock_level", 0)
    updated_price = product.get("price", 0.0)
    
    # Check 1: Duplicate product name (case-insensitive, exclude current product)
    for existing in products:
        if str(existing.get("product_id")) == str(product_id):
            continue  # Skip the product being updated
        existing_name = (existing.get("product_name") or "").strip().lower()
        if existing_name == updated_product_name:
            error_response = {
                "success": False,
                "message": f"Product with name '{product.get('product_name')}' already exists. Please use a different product name."
            }
            if wants_json():
                return jsonify(error_response), 409
            else:
                return jsonify(error_response), 409
    
    # Check 2: Duplicate combination (exclude current product)
    for existing in products:
        if str(existing.get("product_id")) == str(product_id):
            continue  # Skip the product being updated
        existing_name = (existing.get("product_name") or "").strip().lower()
        existing_type = (existing.get("type") or "").strip().lower()
        existing_category = (existing.get("category") or "").strip().lower()
        existing_status = (existing.get("status") or "").strip().lower()
        existing_stock_level = existing.get("stock_level", 0)
        existing_price = existing.get("price", 0.0)
        
        # Compare all fields (case-insensitive for text, exact for numbers)
        if (existing_name == updated_product_name and
            existing_type == updated_type and
            existing_category == updated_category and
            existing_status == updated_status and
            existing_stock_level == updated_stock_level and
            abs(existing_price - updated_price) < 0.01):  # Float comparison with tolerance
            error_response = {
                "success": False,
                "message": f"A product with the same combination (Name: '{product.get('product_name')}', Type: '{product.get('type')}', Category: '{product.get('category')}', Status: '{product.get('status')}', Stock Level: {updated_stock_level}, Price: {updated_price}) already exists."
            }
            if wants_json():
                return jsonify(error_response), 409
            else:
                return jsonify(error_response), 409

    save_products(products)
    
    response_data = {
        "success": True,
        "message": "Product updated successfully",
        "data": product
    }
    
    if wants_json():
        return jsonify(response_data), 200
    else:
        return jsonify(response_data), 200


# =========================================
# 5. MASTERS — Products (continued)
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


@app.route("/download-customer-template")
def download_customer_template():

    # 1. Empty dataframe
    df = pd.DataFrame(columns=[
        "Customer ID",
        "Name",
        "Company",
        "Customer Type",
        "Email",
        "Status",
        "Credit Limit",
        "City"
    ])

    # 2. Save to memory
    output = io.BytesIO()
    df.to_excel(output, index=False, sheet_name="Customers")
    output.seek(0)

    # 3. Load workbook
    wb = load_workbook(output)
    ws = wb.active

    # ---------------- DROPDOWNS ----------------
    customer_type_validation = DataValidation(
        type="list",
        formula1='"Retail,Wholesale,Corporate,Online,Distributor"',
        allow_blank=False
    )

    status_validation = DataValidation(
        type="list",
        formula1='"Active,Inactive"',
        allow_blank=False
    )

    # ---------------- CUSTOMER ID VALIDATION (NUMBERS ONLY) ----------------
    # Match the simple numeric rule used for Product ID:
    # Allow: Whole number, greater than 0
    customer_id_validation = DataValidation(
        type="whole",
        operator="greaterThan",
        formula1="0",
        allow_blank=True,
        showErrorMessage=True,
        errorTitle="Invalid Customer ID",
        error="Customer ID must contain ONLY numbers greater than 0 (no letters or special characters)."
    )





    

    credit_limit_validation = DataValidation(
        type="decimal",
        operator="greaterThanOrEqual",
        formula1="0",
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Invalid Credit Limit",
        error="Credit Limit must be 0 or greater."
    )

    # ---------------- TEXT VALIDATIONS ----------------
    # Name validation (Customer template) – mirror the Product Name rule:
    # =AND(B2<>"",NOT(OR(ISNUMBER(SEARCH("0",B2)),...,ISNUMBER(SEARCH("9",B2)))))
    # NOTE: For openpyxl custom validations, formula1 should NOT start with "=".
    name_validation = DataValidation(
        type="custom",
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
        errorTitle="Invalid Name",
        error="Name must contain only alphabets (letters) and spaces. Numbers and special characters are not allowed."
    )

    city_validation = DataValidation(
        type="custom",
        formula1='=AND(H2<>"",NOT(ISNUMBER(SEARCH("0",H2))))',
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Invalid City",
        error="City must contain only letters."
    )

    email_validation = DataValidation(
        type="custom",
        formula1='=AND(E2<>"",ISNUMBER(SEARCH("@",E2)),ISNUMBER(SEARCH(".",E2)))',
        allow_blank=False,
        showErrorMessage=True,
        errorTitle="Invalid Email",
        error="Enter a valid email address."
    )

    # Add validations
    ws.add_data_validation(customer_id_validation)
    ws.add_data_validation(name_validation)
    ws.add_data_validation(customer_type_validation)
    ws.add_data_validation(email_validation)
    ws.add_data_validation(status_validation)
    ws.add_data_validation(credit_limit_validation)
    ws.add_data_validation(city_validation)

    # Apply validations (Row 2–1000)
    customer_id_validation.add("A2:A1000")
    name_validation.add("B2:B1000")
    customer_type_validation.add("D2:D1000")
    email_validation.add("E2:E1000")
    status_validation.add("F2:F1000")
    credit_limit_validation.add("G2:G1000")
    city_validation.add("H2:H1000")

    # Save final file
    final_output = io.BytesIO()
    wb.save(final_output)
    final_output.seek(0)

    return send_file(
        final_output,
        as_attachment=True,
        download_name="Customer_Import_Template.xlsx",
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

    # BUG_003 / BUG_004: validate file extension early (expect Excel template)
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls")):
        return (
            jsonify(
                {
                    "error": "Invalid file format. Please upload the provided Excel template (.xlsx or .xls)."
                }
            ),
            400,
        )

    try:
        df = pd.read_excel(file)
    except Exception:
        return jsonify({"error": "Invalid Excel file"}), 400

    # Check if file is empty (no data rows, only headers)
    if df.empty or len(df) == 0:
        return jsonify({
            "error": "No data found",
            "message": "The uploaded file contains no data. Please ensure the file has at least one row of product data."
        }), 400

    # Ensure required columns exist in the uploaded template
    required_columns = [
        "Product ID",
        "Product Name",
        "Type",
        "Category",
        "Status",
        "Stock Level",
        "Price",
    ]
    missing_cols = [c for c in required_columns if c not in df.columns]
    if missing_cols:
        return (
            jsonify(
                {
                    "error": "Invalid template",
                    "message": "The uploaded Excel file does not match the required product import template.",
                    "missing_columns": missing_cols,
                }
            ),
            400,
        )

    valid_rows = 0
    invalid_rows = 0
    skipped_rows = 0
    error_details = []
    skipped_row_numbers = []  # Track which rows were skipped (completely blank)
    
    # Load existing products to check against database
    existing_products = load_products()
    existing_product_ids = {str(p.get("product_id", "")) for p in existing_products if p.get("product_id")}
    
    # Track Product IDs for uniqueness validation within uploaded file
    seen_product_ids = {}  # key: Product ID (as string), value: first row number
    
    # Track seen row combinations for duplicate detection (excluding Product ID)
    seen_rows = {}  # key: tuple of (Product Name, Type, Category, Status, Stock Level, Price), value: first row number

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

        # --- Product ID (optional - will be auto-generated if blank, must be unique if provided) ---
        pid_raw = row.get("Product ID")
        if not is_blank(pid_raw):
            # Only validate if Product ID is provided
            pid_str = str(pid_raw).strip()
            
            # Check if Product ID already has "P" prefix (e.g., "P124")
            if pid_str.upper().startswith("P") and len(pid_str) > 1:
                # Extract numeric part after "P"
                numeric_part = pid_str[1:].strip()
                try:
                    pid_num = float(numeric_part)
                    if not pid_num.is_integer() or int(pid_num) <= 0:
                        errors.append("Product ID must be a valid number after 'P' prefix")
                    else:
                        # Normalize to uppercase (P124)
                        pid_str = f"P{int(pid_num)}"
                except (ValueError, TypeError):
                    errors.append("Product ID must be a valid number after 'P' prefix")
            else:
                # Try to convert to number (handles both "12" and "12.0" from Excel)
                try:
                    pid_num = float(pid_str)
                    # Check if it's a whole number (no decimal part)
                    if not pid_num.is_integer():
                        errors.append("Product ID must be a whole number")
                    elif int(pid_num) <= 0:
                        errors.append("Product ID must be greater than 0")
                    else:
                        # Prepend "P" to numeric Product ID (e.g., 124 becomes P124)
                        pid_str = f"P{int(pid_num)}"
                except (ValueError, TypeError):
                    # If conversion fails, it's not a valid number
                    errors.append("Product ID must be a whole number")
                    pid_str = None
            
            # Validate uniqueness if Product ID is valid
            if pid_str and not any("Product ID" in err for err in errors):
                # Check if Product ID already exists in the uploaded file
                if pid_str in seen_product_ids:
                    first_row = seen_product_ids[pid_str]
                    errors.append(f"Duplicate Product ID: Product ID {pid_str} already exists in row {first_row}")
                # Check if Product ID already exists in the database
                elif pid_str in existing_product_ids:
                    errors.append(f"Duplicate Product ID: Product ID {pid_str} already exists in the system")
                else:
                    seen_product_ids[pid_str] = index + 2  # Store the row number (Excel row, +2 for header)
            # Note: If Product ID is blank, it will be auto-generated during import (P101, P102, etc.)

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

        # --- Duplicate Row Check (based on Product Name, Type, Category, Status, Stock Level, Price) ---
        # Create a signature from the 6 fields (excluding Product ID) for duplicate detection
        row_signature = (
            normalize_value(row.get("Product Name")),
            normalize_value(row.get("Type")),
            normalize_value(row.get("Category")),
            normalize_value(row.get("Status")),
            normalize_value(row.get("Stock Level")),
            normalize_value(row.get("Price"))
        )
        
        # Check if this row combination (excluding Product ID) was seen before
        if row_signature in seen_rows:
            first_row = seen_rows[row_signature]
            errors.append(f"Duplicate row: This combination of Product Name, Type, Category, Status, Stock Level, and Price is identical to row {first_row}")
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
        return jsonify({"success": False, "message": "No file uploaded"}), 400

    # BUG_003 / BUG_004: enforce correct Excel template here as well
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".xlsx") or filename_lower.endswith(".xls")):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Invalid file format. Please upload the product Excel template (.xlsx or .xls).",
                }
            ),
            400,
        )

    try:
        df = pd.read_excel(file)
    except Exception:
        return jsonify({"success": False, "message": "Invalid Excel file"}), 400

    products = load_products()
    
    # Get existing product IDs to determine next sequence number
    existing_ids = {str(p.get("product_id", "")).strip() for p in products if p.get("product_id")}
    
    # Find the maximum numeric value from existing product IDs
    max_num = 0
    for pid in existing_ids:
        # Extract numeric part from formats like "P101", "101", "P-101", etc.
        match = re.search(r"(\d+)$", pid)
        if match:
            max_num = max(max_num, int(match.group(1)))
    
    added = 0
    current_sequence = 0

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

        # Auto-generate Product ID if blank
        if not product_id:
            # Generate next Product ID based on existing products + already added in this batch
            current_sequence += 1
            product_id = f"P{max_num + current_sequence}"
        else:
            # If Product ID is provided, normalize it to "P###" format
            # Check if Product ID already has "P" prefix (case-insensitive)
            if product_id.upper().startswith("P") and len(product_id) > 1:
                # Extract numeric part after "P"
                numeric_part = product_id[1:].strip()
                try:
                    pid_num = float(numeric_part)
                    if pid_num.is_integer() and int(pid_num) > 0:
                        # Normalize to "P###" format (e.g., "P124", "p124" -> "P124")
                        product_id = f"P{int(pid_num)}"
                        num_val = int(pid_num)
                        max_num = max(max_num, num_val)
                    else:
                        # Invalid format, keep as-is but try to extract numeric part for max_num
                        match = re.search(r"(\d+)$", product_id)
                        if match:
                            num_val = int(match.group(1))
                            max_num = max(max_num, num_val)
                except (ValueError, TypeError):
                    # Invalid format, keep as-is but try to extract numeric part for max_num
                    match = re.search(r"(\d+)$", product_id)
                    if match:
                        num_val = int(match.group(1))
                        max_num = max(max_num, num_val)
            else:
                # Product ID doesn't start with "P" - check if it's purely numeric
                try:
                    # Try to convert to number (handles both "124" and "124.0" from Excel)
                    pid_num = float(product_id)
                    if pid_num.is_integer() and int(pid_num) > 0:
                        # Prepend "P" to numeric Product ID (e.g., 124 becomes P124)
                        product_id = f"P{int(pid_num)}"
                        num_val = int(pid_num)
                        max_num = max(max_num, num_val)
                    else:
                        # Not a valid positive integer, keep as-is but try to extract numeric part
                        match = re.search(r"(\d+)$", product_id)
                        if match:
                            num_val = int(match.group(1))
                            max_num = max(max_num, num_val)
                except (ValueError, TypeError):
                    # If conversion fails, it might be alphanumeric, extract numeric part if present
                    match = re.search(r"(\d+)$", product_id)
                    if match:
                        num_val = int(match.group(1))
                        max_num = max(max_num, num_val)
                    # If no numeric part found, keep as-is

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

    return jsonify({"success": True, "added": added, "message": f"Successfully imported {added} product(s)"})

  
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

        # -------------------- DUPLICATE VALIDATION -----------------------------
        products = load_products()
        
        # Normalize values for comparison (case-insensitive for text, exact for numbers)
        new_product_name = (product.get("product_name") or "").strip().lower()
        new_type = (product.get("type") or "").strip().lower()
        new_category = (product.get("category") or "").strip().lower()
        new_status = (product.get("status") or "").strip().lower()
        new_stock_level = product.get("stock_level", 0)
        new_price = product.get("price", 0.0)
        
        # Check 1: Duplicate product name (case-insensitive)
        for existing in products:
            existing_name = (existing.get("product_name") or "").strip().lower()
            if existing_name == new_product_name:
                return jsonify(
                    success=False, 
                    message=f"Product with name '{product.get('product_name')}' already exists. Please use a different product name."
                ), 409
        
        # Check 2: Duplicate combination (product_name + type + category + status + stock_level + price)
        for existing in products:
            existing_name = (existing.get("product_name") or "").strip().lower()
            existing_type = (existing.get("type") or "").strip().lower()
            existing_category = (existing.get("category") or "").strip().lower()
            existing_status = (existing.get("status") or "").strip().lower()
            existing_stock_level = existing.get("stock_level", 0)
            existing_price = existing.get("price", 0.0)
            
            # Compare all fields (case-insensitive for text, exact for numbers)
            if (existing_name == new_product_name and
                existing_type == new_type and
                existing_category == new_category and
                existing_status == new_status and
                existing_stock_level == new_stock_level and
                abs(existing_price - new_price) < 0.01):  # Float comparison with tolerance
                return jsonify(
                    success=False,
                    message=f"A product with the same combination (Name: '{product.get('product_name')}', Type: '{product.get('type')}', Category: '{product.get('category')}', Status: '{product.get('status')}', Stock Level: {new_stock_level}, Price: {new_price}) already exists."
                ), 409
        
        # -------------------- SAVE TO JSON -----------------------------
        products.append(product)
        save_products(products)

        return jsonify(success=True, product_id=product_id)

    except Exception as e:
        
        print("ERROR in /save-product:", e)
        return jsonify(success=False, message="Internal server error"), 500


# =========================================
# 6. MASTERS — Customer
# =========================================
@app.route("/customer")
def customer():
    user_email = session.get("user")
    if not user_email:
        if wants_json():
            return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
        return redirect(url_for("login", message="session_expired"))
    
    users = load_users()
    user_name = "User"
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            user_role = u.get("role") or "User"
            break
    
    if wants_json():
        customers_list = load_customer()
        return jsonify({
            "success": True,
            "customers": customers_list,
            "total": len(customers_list),
            "current_user": {"email": user_email, "name": user_name, "role": user_role}
        }), 200
    
    return render_template(
        "customer.html",
        page="customer",
        section="masters",
        user_email=user_email,
        user_name=user_name,
        user_role=user_role
    )


@app.route("/import-customer", methods=["GET", "POST"])
def import_customer():
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
        "import-customer.html",
        title="Import Customers - Stackly",
        page="customer",
        section="masters",
        user_email=user_email,
        user_name=user_name,
    )

def load_customer():
    if not os.path.exists(CUSTOMER_FILE):
        return []
    try:
        with open(CUSTOMER_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error loading customer data: {e}")
        return []


def save_customer(customer):
    """Save customer data to JSON file."""
    with open(CUSTOMER_FILE, "w", encoding="utf-8") as f:
        json.dump(customer, f, indent=2, ensure_ascii=False)


@app.route("/import-customers-validated", methods=["POST"])
def import_customers_validated():
    user_email = session.get("user")
    if not user_email:
        return jsonify(success=False, message="Session expired. Please login."), 401

    file = request.files.get("file")
    if not file or file.filename.strip() == "":
        return jsonify(success=False, message="No file uploaded"), 400

    # ---- Read file (csv/xlsx) ----
    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
    except Exception as e:
        return jsonify(success=False, message=f"Invalid file: {e}"), 400
    

    

    # ---- Required columns ----
    required_columns = [
        "Customer ID", "Name", "Company",
        "Customer Type", "Email", "Status",
        "Credit Limit", "City"
    ]
    
    
    for col in required_columns:
        if col not in df.columns:
            return jsonify(success=False, message=f"Missing column: {col}"), 400

    customers = load_customer()  # your existing function
    # Normalize Customer IDs for comparison (lowercase for case-insensitive matching)
    existing_ids = {str(c.get("customer_id", "")).strip().lower() for c in customers if c.get("customer_id")}

    existing_emails = {
        str(c.get("email", "")).strip().lower()
        for c in customers
        if str(c.get("email", "")).strip() != ""
    }

    added = 0
    updated = 0
    skipped = 0
    errors = []
    seen_emails = {}
    seen_customer_ids_in_batch = {}  # Track Customer IDs in this import batch

    def is_valid_email(v):
        s = str(v or "").strip().lower()
        if not re.fullmatch(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$", s):
            return False
        allowed_tlds = {"com", "in", "net", "org", "co.in"}  # Match upload-customer route
        tld = s.rsplit(".", 1)[-1] if "." in s else ""
        return tld in allowed_tlds

    # ✅ Script detection
    def has_script(val):
        if pd.isna(val):
            return False
        s = str(val).lower()
        patterns = [
            "<script", "</script", "javascript:",
            "onerror=", "onload=", "<img", "<svg", "<iframe"
        ]
        return any(p in s for p in patterns)

    # ✅ SQL injection detection
    def has_sql_injection(val):
        if pd.isna(val):
            return False
        s = str(val).lower()
        patterns = [
            r"\bor\s+1\s*=\s*1\b",
            r"\bunion\s+select\b",
            r"\bdrop\s+table\b",
            r"\bdelete\s+from\b",
            r"\binsert\s+into\b",
            r"\bupdate\s+\w+\s+set\b",
            r"--",
            r";"
        ]
        return any(re.search(p, s) for p in patterns)

    def is_blank(v):
        return pd.isna(v) or str(v).strip() == ""
    
    # Find the maximum numeric value from existing customer IDs (same pattern as product import)
    max_num = 0
    for x in existing_ids:
        s = str(x).strip()
        # Extract numeric part from formats like "C101", "101", "C-101", etc.
        match = re.search(r"(\d+)$", s)
        if match:
            max_num = max(max_num, int(match.group(1)))
    
    current_sequence = 0
    
    def get_next_customer_id():
        # Generate next Customer ID based on existing customers + already added in this batch
        nonlocal current_sequence, max_num
        current_sequence += 1
        return f"C{max_num + current_sequence}"



    for idx, row in df.iterrows():
        row_no = idx + 2
        try:
            # ✅ Skip fully empty row
            if all(is_blank(row[col]) for col in required_columns):
                skipped += 1
                continue

            # ✅ Block Script/HTML injection
            if any(has_script(row.get(col, "")) for col in required_columns):
                skipped += 1
                errors.append(f"Row {row_no}: Script/HTML content detected")
                continue

            # ✅ Block SQL injection patterns
            if any(has_sql_injection(row.get(col, "")) for col in required_columns):
                skipped += 1
                errors.append(f"Row {row_no}: SQL injection pattern detected")
                continue

            # Extract fields first
            name = str(row.get("Name", "")).strip()
            company = str(row.get("Company", "")).strip()
            ctype = str(row.get("Customer Type", "")).strip()
            email = str(row.get("Email", "")).strip().lower()
            status = str(row.get("Status", "")).strip()
            # Keep raw value for correct NaN/blank detection (must match /upload-customer logic)
            credit_val_raw = row.get("Credit Limit")
            city = str(row.get("City", "")).strip()
            
            # ---- Comprehensive validation during import (same as upload phase) ----
            # Apply same validation rules as /upload-customer to ensure only valid rows are imported
            validation_errors = []
            
            # Name validation (mandatory, letters + spaces, min length 3, max 40)
            if is_blank(name):
                validation_errors.append("Name is required")
            else:
                if not re.fullmatch(r"^[A-Za-z ]+$", name):
                    validation_errors.append("Name must contain ONLY letters and spaces")
                elif len(name) < 3:
                    validation_errors.append("Name must be at least 3 characters")
                elif len(name) > 40:
                    validation_errors.append("Name must not exceed 40 characters")
            
            # Company validation (mandatory, min 3, max 50)
            if is_blank(company):
                validation_errors.append("Company is required")
            else:
                if len(company) < 3:
                    validation_errors.append("Company must be at least 3 characters")
                elif len(company) > 50:
                    validation_errors.append("Company must not exceed 50 characters")
                elif not re.fullmatch(r"^[A-Za-z0-9 &.,'()\/-]+$", company):
                    validation_errors.append("Company contains invalid characters")
            
            # Customer Type validation (mandatory)
            if is_blank(ctype):
                validation_errors.append("Customer Type is required")
            else:
                allowed_types = ["Retail", "Wholesale", "Corporate", "Online", "distributor", "Individual", "Business", "Organization"]
                if ctype not in allowed_types:
                    validation_errors.append(f"Customer Type must be one of: {', '.join(allowed_types)}")
            
            # Email validation (mandatory, valid format, unique)
            if is_blank(email):
                validation_errors.append("Email is required")
            elif not is_valid_email(email):
                validation_errors.append("Invalid email format")
            elif len(email) > 50:
                validation_errors.append("Email must not exceed 50 characters")
            else:
                # Check for duplicate Email in uploaded file
                if email in seen_emails:
                    validation_errors.append(f"Duplicate Email: Email already exists in row {seen_emails[email]}")
                # Check if Email already exists in the database
                elif email in existing_emails:
                    validation_errors.append("Duplicate Email: Email already exists in the system")
                else:
                    seen_emails[email] = row_no
            
            # Status validation (mandatory)
            if is_blank(status):
                validation_errors.append("Status is required")
            elif status not in ["Active", "Inactive"]:
                validation_errors.append("Status must be 'Active' or 'Inactive'")
            
            # Credit Limit validation (mandatory, number >= 0, max 10,000,000)
            # Use the SAME logic as /upload-customer so that a row considered invalid
            # during validation is also treated as invalid during import.
            if is_blank(credit_val_raw):
                validation_errors.append("Credit Limit is required")
            else:
                try:
                    credit_limit_num = float(credit_val_raw)
                    if credit_limit_num < 0:
                        validation_errors.append("Credit Limit must be 0 or greater")
                    elif credit_limit_num > 10000000:
                        validation_errors.append("Credit Limit must not exceed 10,000,000")
                except (ValueError, TypeError):
                    validation_errors.append("Credit Limit must be a valid number")
            
            # City validation (mandatory, letters + spaces, min length 3, max 40)
            if is_blank(city):
                validation_errors.append("City is required")
            else:
                if not re.fullmatch(r"^[A-Za-z ]+$", city):
                    validation_errors.append("City must contain ONLY letters and spaces")
                elif len(city) < 3:
                    validation_errors.append("City must be at least 3 characters")
                elif len(city) > 40:
                    validation_errors.append("City must not exceed 40 characters")
            
            # Now that validation has passed, normalize Credit Limit for storage
            credit_raw = "" if pd.isna(credit_val_raw) else str(credit_val_raw).strip()

            # ---------------- Customer ID validation (add to validation_errors) ----------------
            cid_raw = row.get("Customer ID")
            customer_id = None
            customer_id_lower = None
            is_existing_id = False  # Track if this ID exists in original database
            
            if is_blank(cid_raw):
                # Auto-generate Customer ID if blank (same as product import)
                customer_id = get_next_customer_id()
                customer_id_lower = customer_id.lower()
            else:
                # If Customer ID is provided, normalize it (same pattern as product import)
                cid_str = str(cid_raw).strip()
                
                # Check if Customer ID already has "C" prefix (e.g., "C124")
                if cid_str.upper().startswith("C") and len(cid_str) > 1:
                    # Extract numeric part after "C"
                    numeric_part = cid_str[1:].strip()
                    try:
                        cid_num = float(numeric_part)
                        if cid_num.is_integer() and int(cid_num) > 0:
                            # Normalize to uppercase (C124)
                            customer_id = f"C{int(cid_num)}"
                        else:
                            validation_errors.append("Customer ID must be a valid number after 'C' prefix")
                    except (ValueError, TypeError):
                        validation_errors.append("Customer ID must be a valid number after 'C' prefix")
                else:
                    # Try to convert to number (handles both "12" and "12.0" from Excel)
                    try:
                        cid_num = float(cid_str)
                        # Check if it's a whole number (no decimal part)
                        if cid_num.is_integer() and int(cid_num) > 0:
                            # Prepend "C" to numeric Customer ID (e.g., 124 becomes C124)
                            customer_id = f"C{int(cid_num)}"
                        else:
                            validation_errors.append("Customer ID must be a whole number greater than 0")
                    except (ValueError, TypeError):
                        validation_errors.append("Customer ID must contain only numbers (digits 0-9).")
                
                # Only proceed with Customer ID checks if Customer ID is valid
                if customer_id:
                    # Update max_num if this Customer ID has a higher number
                    match = re.search(r"(\d+)$", customer_id)
                    if match:
                        num_val = int(match.group(1))
                        max_num = max(max_num, num_val)
                    
                    customer_id_lower = customer_id.lower()
                    
                    # Check for duplicate Customer ID in this import batch
                    if customer_id_lower in seen_customer_ids_in_batch:
                        validation_errors.append(f"Duplicate Customer ID: Customer ID '{customer_id}' already exists in row {seen_customer_ids_in_batch[customer_id_lower]}")
                    else:
                        seen_customer_ids_in_batch[customer_id_lower] = row_no
                    
                    # Check if Customer ID already exists in ORIGINAL database (before we start adding)
                    is_existing_id = customer_id_lower in existing_ids
            
            # Skip row if validation errors exist (only import valid rows)
            if validation_errors:
                skipped += 1
                errors.append(f"Row {row_no}: " + ", ".join(validation_errors))
                continue
            
            # At this point, all validations passed, so customer_id and customer_id_lower should be set
            if not customer_id or not customer_id_lower:
                # This shouldn't happen, but safety check
                skipped += 1
                errors.append(f"Row {row_no}: Customer ID validation failed")
                continue
            
            # Update existing_ids to track IDs in this batch (for duplicate prevention)
            if customer_id_lower not in existing_ids:
                existing_ids.add(customer_id_lower)

            # ---- Update if duplicate ID exists in original database ----
            if is_existing_id:
                for c in customers:
                    if str(c.get("customer_id", "")).strip().lower() == customer_id_lower:
                        c["name"] = name
                        c["company"] = company
                        c["customer_type"] = ctype
                        c["company_type"] = ctype
                        c["status"] = status
                        c["email"] = email
                        c["credit_limit"] = credit_raw
                        c["city"] = city
                        break
                updated += 1
                continue

            # # ✅ Duplicate row check (inside same file)
            # row_key = (
            #     str(customer_id).strip().lower(),
            #     str(name).strip().lower(),
            #     str(company).strip().lower(),
            #     str(email).strip().lower()
            # )

            # if row_key in seen_rows:
            #     skipped += 1
            #     errors.append(f"Row {row_no}: Duplicate row found in file (same as row {seen_rows[row_key]})")
            #     continue
            # else:
            #     seen_rows[row_key] = row_no


            # ---- Add new customer ----
            customers.append({
                "customer_id": customer_id,
                "name": name,
                "company": company,
                "customer_type": ctype,
                "company_type": ctype,
                "status": status,
                "email": email,
                "credit_limit": credit_raw,
                "city": city,
                "sales_rep": ""
            })
            existing_ids.add(customer_id_lower)
            email_key = email.strip().lower()
            existing_emails.add(email_key)
            added += 1

        except Exception as e:
            errors.append(f"Row {row_no}: {e}")

    save_customer(customers)

    return jsonify(
        success=True,
        added=added,
        updated=updated,
        skipped=skipped,
        error_details=errors
    )

# =========================================
# ✅ API — Get All Customer(JSON)
# =========================================
@app.route("/api/customer", methods=["GET"])
def api_customer():
    """GET /api/customer — requires login (same as /api/products)."""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401
    try:
        customers = load_customer()
        
        # Ensure we return an array, even if empty
        if not isinstance(customers, list):
            customers = []
        
        # Get query parameters
        q = (request.args.get("q") or "").strip().lower()
        status = (request.args.get("status") or "").strip()
        ctype = (request.args.get("type") or "").strip()
        sales_rep = (request.args.get("sales_rep") or "").strip()
        
        page = int(request.args.get("page") or 1)
        page_size = int(request.args.get("page_size") or 10)
        
        # Filter function
        def match(c):
            # Search filter
            if q:
                hay = " ".join([
                    str(c.get("customer_id", "")),
                    str(c.get("name", "")),
                    str(c.get("company", "")),
                ]).lower()
                if q not in hay:
                    return False
            
            # Status filter
            if status:
                c_status = str(c.get("status") or "").lower()
                if c_status != status.lower():
                    return False
            
            # Customer Type filter
            if ctype:
                c_customer_type = str(c.get("customer_type") or c.get("company_type") or "").lower()
                if c_customer_type != ctype.lower():
                    return False
            
            # Sales Rep filter
            if sales_rep:
                c_rep = str(c.get("sales_rep") or "").lower()
                if c_rep != sales_rep.lower():
                    return False
            
            return True
        
        # Apply filters
        filtered = [c for c in customers if match(c)]
        
        # Extract meta data for dropdowns (from all customers, not filtered)
        statuses = sorted({str(c.get("status", "")) for c in customers if c.get("status")})
        types = sorted({str(c.get("customer_type") or c.get("company_type", "")) for c in customers if (c.get("customer_type") or c.get("company_type"))})
        sales_reps = sorted({str(c.get("sales_rep", "")) for c in customers if c.get("sales_rep")})
        
        # Pagination
        total_items = len(filtered)
        total_pages = max(1, (total_items + page_size - 1) // page_size)
        page = max(1, min(page, total_pages))
        
        start = (page - 1) * page_size
        end = start + page_size
        items = filtered[start:end]
        
        # Build response (same structure as /api/products)
        response_data = {
            "success": True,
            "data": {
                "items": items,
                "page": page,
                "total_pages": total_pages,
                "total_items": total_items,
                "meta": {
                    "statuses": statuses,
                    "types": types,
                    "sales_reps": sales_reps
                }
            }
        }

        response = jsonify(response_data)
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        print(f"Error in /api/customer: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "data": {
                "items": [],
                "page": 1,
                "total_pages": 1,
                "total_items": 0,
                "meta": {
                    "statuses": [],
                    "types": [],
                    "sales_reps": []
                }
            }
        }), 500


@app.route("/api/customer/<customer_id>", methods=["GET"])
def api_get_customer(customer_id):
    """
    GET /api/customer/<customer_id>
    
    Returns a single customer by ID (same pattern as /api/products/<product_id>)
    """
    try:
        customers = load_customer()
        customer = next((c for c in customers if str(c.get("customer_id")) == str(customer_id)), None)
        
        if not customer:
            return jsonify({
                "success": False,
                "message": "Customer not found"
            }), 404
        
        return jsonify({
            "success": True,
            "data": customer,
            "message": "Customer retrieved successfully"
        }), 200
        
    except Exception as e:
        print(f"Error in /api/customer/<customer_id>: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================================
# ✅ API: UPDATE CUSTOMER (PUT /api/customer/<id>) — JSON for Postman
# =========================================
@app.route("/api/customer/<customer_id>", methods=["PUT"])
def api_update_customer(customer_id):
    """Update customer by ID. Requires JSON body. Same pattern as PUT /api/products/<id>."""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    if not request.is_json:
        return jsonify({"success": False, "message": "Content-Type must be application/json"}), 400

    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify({"success": False, "message": "JSON body required"}), 400

    name = (data.get("name") or data.get("Name") or "").strip()
    if not name:
        return jsonify({"success": False, "message": "Customer name is required"}), 400

    try:
        customers = load_customer()
        if not isinstance(customers, list):
            customers = []

        email = (data.get("email") or data.get("Email") or "").strip().lower()

        for cust in customers:
            if str(cust.get("customer_id")) != str(customer_id) and (cust.get("email") or "").strip().lower() == email and email:
                return jsonify({"success": False, "message": "Duplicate email already exists."}), 409

        found = False
        for cust in customers:
            if str(cust.get("customer_id")) == str(customer_id):
                cust["name"] = (data.get("name") or data.get("Name") or cust.get("name", "")).strip()
                cust["company"] = (data.get("company") or data.get("Company") or cust.get("company", "")).strip()
                cust["customer_type"] = (data.get("customer_type") or data.get("Customer Type") or cust.get("customer_type", "")).strip()
                cust["company_type"] = cust["customer_type"]
                cust["email"] = (data.get("email") or data.get("Email") or cust.get("email", "")).strip().lower()
                cust["credit_limit"] = str(data.get("credit_limit") or data.get("Credit Limit") or cust.get("credit_limit", "")).strip()
                cust["status"] = (data.get("status") or data.get("Status") or cust.get("status", "")).strip()
                cust["city"] = (data.get("city") or data.get("City") or cust.get("city", "")).strip()
                found = True
                break

        if not found:
            return jsonify({"success": False, "message": "Customer not found"}), 404

        save_customer(customers)
        updated = next((c for c in customers if str(c.get("customer_id")) == str(customer_id)), None)
        return jsonify({"success": True, "message": "Customer updated", "customer": updated}), 200
    except Exception as e:
        print(f"Error in api_update_customer: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


# =========================================
# ✅ API: DELETE CUSTOMER (DELETE /api/customer/<id>) — JSON for Postman
# =========================================
@app.route("/api/customer/<customer_id>", methods=["DELETE"])
def api_delete_customer(customer_id):
    """Delete customer by ID."""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    customers = load_customer()
    new_list = [c for c in customers if str(c.get("customer_id")) != str(customer_id)]

    if len(new_list) == len(customers):
        return jsonify({"success": False, "message": "Customer not found"}), 404

    save_customer(new_list)
    return jsonify({"success": True, "message": "Customer deleted successfully"}), 200


@app.route("/update-customer/<customer_id>", methods=["POST"])
def update_customer(customer_id):
    # Require login (same as Edit Product / api_update_customer)
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    customer = load_customer()
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    company = (data.get("company") or "").strip()
    # accept both keys, but prefer "customer_type"
    customer_type = (
        (data.get("customer_type") or "").strip()
        or (data.get("company_type") or "").strip()
    )
    email = (data.get("email") or "").strip().lower()
    credit_limit = (data.get("credit_limit") or "").strip()
    status = (data.get("status") or "").strip()
    city = (data.get("city") or "").strip()

 # ✅ DUPLICATE EMAIL CHECK (exclude current customer)
    for cust in customer:
        if str(cust.get("customer_id")) != str(customer_id):
            existing_email = (cust.get("email") or "").strip().lower()
            if email and existing_email == email:
                return jsonify({
                    "success": False,
                    "message": "Duplicate email! This email already exists."
                }), 409

    # find the matching customer
    found = False
    for cust in customer:
        if str(cust.get("customer_id")) == str(customer_id):
            cust["name"] = name
            cust["company"] = company
            # update both keys so data is consistent
            cust["customer_type"] = customer_type
            cust["company_type"] = customer_type
            cust["email"] = email
            cust["credit_limit"] = credit_limit
            cust["status"] = status
            cust["city"] = city
            found = True
            break

    if not found:
        return jsonify({"success": False, "message": "Customer not found"}), 404

    save_customer(customer)
    return jsonify({"success": True, "message": "Customer updated"}), 200


# =========================================
# ✅ DELETE CUSTOMER (POST)
# =========================================
@app.route("/delete-customer/<cust_id>", methods=["POST"])
def delete_customer(cust_id):
    customer = load_customer()
    # 🔽 safer: compare as string
    new_list = [c for c in customer if str(c.get("customer_id")) != str(cust_id)]

    if len(new_list) == len(customer):
        return jsonify({"ok": False, "message": "Customer not found"}), 404

    save_customer(new_list)
    return jsonify({"ok": True, "message": "Customer deleted"})


# =========================================
# 6. MASTERS — Customer — Add New Customer
# =========================================
@app.route("/addnew-customer")
def addnew_customer():
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
        "customer-addnew-customer.html",
        title="Add New Customer - Stackly",
        page="customer",
        section="masters",
        user_email=user_email,
        user_name=user_name,
    )


NEW_CUSTOMER = os.path.join(app.root_path, "New_Customer.json")


# =========================================
# ✅ API — Get All Customers (Add New Customer)
# =========================================
@app.route("/api/customers", methods=["GET"])
def get_customers():
    # Load customers from customer.json (same file used for Customer Master)
    customers = load_customer()
    return jsonify(customers)


# =========================================
# ✅ API — Save Customer (Add New Customer)
# =========================================
@app.route("/api/customers", methods=["POST"])
def create_customer():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data received"}), 400

    gst_id = (data.get("gstNumber") or "").strip().upper()

    try:
        # Load existing customers from customer.json
        customers = load_customer()

        # DUPLICATE GST CHECK
        if gst_id:
            for c in customers:
                if (c.get("gstNumber") or "").strip().upper() == gst_id:
                    return jsonify({
                        "error": "GST/Tax ID already exists"
                    }), 409  # Conflict

        # Generate customer ID in format C101, C102, etc.
        customer_id = generate_customer_id_for_master()
        
        # Transform form data to match customer.json format
        first_name = (data.get("firstName") or "").strip()
        last_name = (data.get("lastName") or "").strip()
        full_name = (first_name + " " + last_name).strip()
        
        # For company field: use name if customer type is Individual, otherwise leave empty
        # (The form doesn't have a company field, so we'll use name as company for consistency)
        company_name = full_name if data.get("customerType") == "Individual" else (data.get("company") or "")
        
        customer_data = {
            "customer_id": customer_id,
            "name": full_name or "Unknown",
            "company": company_name or full_name,
            "customer_type": data.get("customerType") or "",
            "status": data.get("customerStatus") or "Active",
            "email": (data.get("email") or "").strip().lower(),
            "credit_limit": str(data.get("creditLimit") or "0"),
            "city": data.get("city") or "",
            "sales_rep": (data.get("salesRep") if data.get("salesRep") != "custom" else data.get("salesRepCustom")) or "",
            "company_type": data.get("customerType") or "",
            "phone": data.get("phoneNumber") or "",
            "gstNumber": gst_id,
            "address": data.get("address") or "",
            "street": data.get("street") or "",
            "state": data.get("state") or "",
            "zipCode": data.get("zipCode") or "",
            "country": data.get("country") or "",
            "billingAddress": data.get("billingAddress") or "",
            "shippingAddress": data.get("shippingAddress") or "",
            "paymentTerms": (data.get("paymentTerms") if data.get("paymentTerms") != "custom" else data.get("paymentTermsCustom")) or "",
            "creditTerm": (data.get("creditTerm") if data.get("creditTerm") != "custom" else data.get("creditTermCustom")) or "",
            "availableLimit": str(data.get("availableLimit") or "0")
        }

        # ✅ SAVE CUSTOMER to customer.json
        customers.append(customer_data)
        save_customer(customers)

        return jsonify({
            "message": "Customer saved successfully",
            "customerId": customer_id
        }), 201

    except Exception as e:
        print(f"Error saving customer: {e}")
        return jsonify({"error": str(e)}), 500


# =========================================
# ✅ ID GENERATION
# =========================================
def generate_customer_id():
    prefix = "CUST-"
    last_id = 0

    if os.path.exists(NEW_CUSTOMER):
        with open(NEW_CUSTOMER, 'r', encoding='utf-8') as f:
            try:
                customers = json.load(f)
                ids = []
                for c in customers:
                    cust_id = c.get('customerId', '')
                    parts = cust_id.split('-')
                    if len(parts) == 2 and parts[1].isdigit():
                        ids.append(int(parts[1]))
                if ids:
                    last_id = max(ids)
            except json.JSONDecodeError:
                print("JSON file empty or corrupt, resetting IDs")
                pass

    return f"{prefix}{str(last_id + 1).zfill(4)}"


# =========================================
# ✅ ID GENERATION FOR CUSTOMER MASTER (C101, C102, etc.)
# =========================================
def generate_customer_id_for_master():
    prefix = "C"
    last_id = 0

    customers = load_customer()
    if customers:
        ids = []
        for c in customers:
            cust_id = c.get('customer_id', '')
            # Extract number from C101, C102, etc.
            if cust_id.startswith('C') and len(cust_id) > 1:
                num_str = cust_id[1:]
                if num_str.isdigit():
                    ids.append(int(num_str))
        if ids:
            last_id = max(ids)

    return f"{prefix}{last_id + 1:03d}"


@app.route('/api/customers/new-id', methods=['GET'])
def get_new_customer_id():
    return jsonify({"customerId": generate_customer_id()})


@app.route('/api/customers/master-id', methods=['GET'])
def get_master_customer_id():
    return jsonify({"customerId": generate_customer_id_for_master()})


@app.route("/upload-customer", methods=["POST"])
def upload_customer_file():
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
    except Exception:
        return jsonify({"error": "Invalid Excel/CSV file"}), 400

    # Check if file is empty (no data rows, only headers)
    if df.empty or len(df) == 0:
        return jsonify({
            "error": "No data found",
            "message": "The uploaded file contains no data. Please ensure the file has at least one row of customer data."
        }), 400

    valid_rows = 0
    invalid_rows = 0
    skipped_rows = 0
    error_details = []
    skipped_row_numbers = []  # Track which rows were skipped (completely blank)
    
    # Load existing customers to check against database
    existing_customers = load_customer()
    # Normalize Customer IDs for comparison (same pattern as product import)
    existing_customer_ids = {str(c.get("customer_id", "")).strip().lower() for c in existing_customers if c.get("customer_id")}
    
    # Track Customer IDs for uniqueness validation within uploaded file
    seen_customer_ids = {}  # key: Customer ID (as string, lowercase), value: first row number
    
    # Track Emails for uniqueness validation within uploaded file
    seen_emails = {}  # key: Email (as string, lowercase), value: first row number
    
    # Load existing emails from database for uniqueness check
    existing_emails = {
        str(c.get("email", "")).strip().lower()
        for c in existing_customers
        if str(c.get("email", "")).strip() != ""
    }
    
    # Track seen row combinations for duplicate detection (excluding Customer ID)
    seen_rows = {}  # key: tuple of (Name, Company, Customer Type, Email, Status, Credit Limit, City), value: first row number

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
    
    

    # Security validation helpers
    def has_script(v):
        if pd.isna(v):
            return False
        s = str(v).lower()
        patterns = [
            "<script", "</script", "javascript:", "onerror=", "onload=",
            "<img", "<svg", "<iframe"
        ]
        return any(p in s for p in patterns)
    
    def has_sql_injection(v):
        if pd.isna(v):
            return False
        s = str(v).lower()
        patterns = [
            r"\bor\s+1\s*=\s*1\b",      # or 1=1
            r"\bunion\s+select\b",      # union select
            r"\bdrop\s+table\b",        # drop table
            r"\bdelete\s+from\b",       # delete from
            r"\binsert\s+into\b",       # insert into
            r"\bupdate\s+\w+\s+set\b",  # update x set
            r"--",                      # SQL comment
            r";"                        # multiple statements
        ]
        return any(re.search(p, s) for p in patterns)

    # Required columns for validation
    required_columns = [
        "Customer ID", "Name", "Company",
        "Customer Type", "Email", "Status",
        "Credit Limit", "City"
    ]

    # Check if all required columns exist
    for col in required_columns:
        if col not in df.columns:
            return jsonify({
                "total_rows": len(df),
                "valid_rows": 0,
                "invalid_rows": len(df),
                "skipped_rows": 0,
                "skipped_row_numbers": [],
                "error_details": [{"row": 0, "errors": [f"Missing column: {col}"]}]
            }), 400

    # ---------------- ROW VALIDATION ----------------
    for index, row in df.iterrows():
        errors = []
        row_no = index + 2  # Excel row number (header is row 1)

        # Treat rows where ALL required columns are blank as skipped
        if all(
            is_blank(row.get(col_name))
            for col_name in required_columns
        ):
            skipped_rows += 1
            skipped_row_numbers.append(row_no)  # Store row number (Excel row, +2 for header)
            # Don't validate or count as valid/invalid; just skip
            continue

        # Block Script/HTML injection in ANY column
        if any(has_script(row.get(col)) for col in required_columns):
            invalid_rows += 1
            error_details.append({
                "row": row_no,
                "errors": ["Script/HTML content detected"]
            })
            continue
        
        # Block SQL injection patterns in ANY column
        if any(has_sql_injection(row.get(col)) for col in required_columns):
            invalid_rows += 1
            error_details.append({
                "row": row_no,
                "errors": ["SQL injection pattern detected"]
            })
            continue

                
        # ---------------- Customer ID (optional - will be auto-generated if blank, must be unique if provided) ----------------
        # Same validation pattern as Product ID in product import
        cid_raw = row.get("Customer ID")
        customer_id = None
        
        if not is_blank(cid_raw):
            # Only validate if Customer ID is provided
            cid_str = str(cid_raw).strip()
            
            # Check if Customer ID already has "C" prefix (e.g., "C124")
            if cid_str.upper().startswith("C") and len(cid_str) > 1:
                # Extract numeric part after "C"
                numeric_part = cid_str[1:].strip()
                try:
                    cid_num = float(numeric_part)
                    if not cid_num.is_integer() or int(cid_num) <= 0:
                        errors.append("Customer ID must be a valid number after 'C' prefix")
                    else:
                        # Normalize to uppercase (C124)
                        cid_str = f"C{int(cid_num)}"
                except (ValueError, TypeError):
                    errors.append("Customer ID must be a valid number after 'C' prefix")
            else:
                # Try to convert to number (handles both "12" and "12.0" from Excel)
                try:
                    cid_num = float(cid_str)
                    # Check if it's a whole number (no decimal part)
                    if not cid_num.is_integer():
                        errors.append("Customer ID must be a whole number")
                    elif int(cid_num) <= 0:
                        errors.append("Customer ID must be greater than 0")
                    else:
                        # Prepend "C" to numeric Customer ID (e.g., 124 becomes C124)
                        cid_str = f"C{int(cid_num)}"
                except (ValueError, TypeError):
                    # If conversion fails, it's not a valid number
                    errors.append("Customer ID must be a whole number")
                    cid_str = None
            
            # Validate uniqueness if Customer ID is valid
            if cid_str and not any("Customer ID" in err for err in errors):
                # Normalize to lowercase for comparison
                cid_normalized = cid_str.lower()
                
                # Check if Customer ID already exists in the uploaded file
                if cid_normalized in seen_customer_ids:
                    first_row = seen_customer_ids[cid_normalized]
                    errors.append(f"Duplicate Customer ID: Customer ID {cid_str} already exists in row {first_row}")
                # Check if Customer ID already exists in the database
                elif cid_normalized in existing_customer_ids:
                    errors.append(f"Duplicate Customer ID: Customer ID {cid_str} already exists in the system")
                else:
                    seen_customer_ids[cid_normalized] = row_no  # Store the row number (Excel row, +2 for header)
                    customer_id = cid_str
            # Note: If Customer ID is blank, it will be auto-generated during import (C101, C102, etc.)





        # ---------------- Name (mandatory, letters + spaces, min length 3) ----------------
        name_raw = row.get("Name")
        if is_blank(name_raw):
            errors.append("Name is required")
        else:
            name = str(name_raw).strip()
            if not re.fullmatch(r"^[A-Za-z ]+$", name):
                errors.append("Name must contain ONLY letters and spaces")
            elif len(name) < 3:
                errors.append("Name must be at least 3 characters")
            elif len(name) > 40:
                errors.append("Name must not exceed 40 characters")

        # ---------------- Company (mandatory) ----------------
        company_raw = row.get("Company")
        if is_blank(company_raw):
            errors.append("Company is required")
        else:
            company = str(company_raw).strip()
            if len(company) < 3:
                errors.append("Company must be at least 3 characters")
            elif len(company) > 50:
                errors.append("Company must not exceed 50 characters")
            # Allow letters, numbers, spaces, and common business symbols
            if not re.fullmatch(r"^[A-Za-z0-9 &.,'()\/-]+$", company):
                errors.append("Company contains invalid characters")

        # ---------------- Customer Type (mandatory) ----------------
        customer_type_raw = row.get("Customer Type")
        if is_blank(customer_type_raw):
            errors.append("Customer Type is required")
        else:
            customer_type = str(customer_type_raw).strip()
            allowed_types = ["Retail", "Wholesale", "Corporate", "Online", "distributor", "Individual", "Business", "Organization"]
            if customer_type not in allowed_types:
                errors.append(f"Customer Type must be one of: {', '.join(allowed_types)}")

        # ---------------- Email (mandatory, valid format, must be unique) ----------------
        email_raw = row.get("Email")
        if is_blank(email_raw):
            errors.append("Email is required")
        else:
            email_str = str(email_raw).strip().lower()
            
            # Basic email format check
            basic_ok = re.fullmatch(
                r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$",
                email_str
            )
            
            # Allowed TLDs (matching product import pattern)
            allowed_tlds = {"com", "in", "net", "org", "co.in"}
            tld = email_str.rsplit(".", 1)[-1] if "." in email_str else ""
            
            if not basic_ok:
                errors.append("Invalid email format")
            elif tld not in allowed_tlds:
                errors.append(f"Email domain must end with one of: {', '.join(allowed_tlds)}")
            elif len(email_str) > 50:
                errors.append("Email must not exceed 50 characters")
            else:
                # Check for duplicate Email in uploaded file (same pattern as Product ID uniqueness)
                if email_str in seen_emails:
                    first_row = seen_emails[email_str]
                    errors.append(f"Duplicate Email: Email already exists in row {first_row}")
                # Check if Email already exists in the database
                elif email_str in existing_emails:
                    errors.append(f"Duplicate Email: Email already exists in the system")
                else:
                    seen_emails[email_str] = row_no  # Store the row number (Excel row, +2 for header)

        # ---------------- Status (mandatory) ----------------
        status_raw = row.get("Status")
        if is_blank(status_raw):
            errors.append("Status is required")
        else:
            status = str(status_raw).strip()
            if status not in ["Active", "Inactive"]:
                errors.append("Status must be 'Active' or 'Inactive'")

        # ---------------- Credit Limit (mandatory, number >= 0) ----------------
        credit_limit_raw = row.get("Credit Limit")
        if is_blank(credit_limit_raw):
            errors.append("Credit Limit is required")
        else:
            try:
                credit_limit_num = float(credit_limit_raw)
                if credit_limit_num < 0:
                    errors.append("Credit Limit must be 0 or greater")
                elif credit_limit_num > 10000000:
                    errors.append("Credit Limit must not exceed 10,000,000")
            except (ValueError, TypeError):
                errors.append("Credit Limit must be a valid number")

        # ---------------- City (mandatory, letters + spaces, min length 3) ----------------
        city_raw = row.get("City")
        if is_blank(city_raw):
            errors.append("City is required")
        else:
            city = str(city_raw).strip()
            if not re.fullmatch(r"^[A-Za-z ]+$", city):
                errors.append("City must contain ONLY letters and spaces")
            elif len(city) < 3:
                errors.append("City must be at least 3 characters")
            elif len(city) > 40:
                errors.append("City must not exceed 40 characters")

        # --- Duplicate Row Check (based on Name, Company, Customer Type, Email, Status, Credit Limit, City) ---
        # Create a signature from the 7 fields (excluding Customer ID) for duplicate detection
        # Same pattern as product import: use normalize_value() without lowercase (except Email which should be case-insensitive)
        row_signature = (
            normalize_value(row.get("Name")),
            normalize_value(row.get("Company")),
            normalize_value(row.get("Customer Type")),
            normalize_value(row.get("Email")).lower(),  # Email should be case-insensitive
            normalize_value(row.get("Status")),
            normalize_value(row.get("Credit Limit")),
            normalize_value(row.get("City"))
        )
        
        # Check if this row combination (excluding Customer ID) was seen before
        if row_signature in seen_rows:
            first_row = seen_rows[row_signature]
            errors.append(f"Duplicate row: This combination of Name, Company, Customer Type, Email, Status, Credit Limit, and City is identical to row {first_row}")
        else:
            # Only track non-empty rows (at least one field filled)
            if any(row_signature):  # If at least one field is not empty
                seen_rows[row_signature] = row_no  # Store the row number (Excel row, +2 for header)

        if errors:
            invalid_rows += 1
            error_details.append({
                "row": row_no,  # +2 because header is row 1
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

# =========================================
# ✅ CUSTOM DROPDOWNS
# =========================================
CUSTOM_DROPDOWNS = os.path.join(app.root_path, "custom_dropdowns.json")


@app.route("/api/custom-dropdowns", methods=["GET"])
def get_custom_dropdowns():
    if not os.path.exists(CUSTOM_DROPDOWNS):
        return jsonify({
            "paymentTerms": [],
            "creditTerms": [],
            "salesReps": []
        })

    with open(CUSTOM_DROPDOWNS, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            data = {}

    return jsonify({
        "paymentTerms": data.get("paymentTerms", []),
        "creditTerms": data.get("creditTerms", []),
        "salesReps": data.get("salesReps", [])
    })


@app.route("/api/custom-dropdowns", methods=["POST"])
def save_custom_dropdown():
    data = request.get_json()
    field = data.get("field")
    value = data.get("value")

    if not field or not value:
        return jsonify({"error": "Invalid data"}), 400

    # default structure
    dropdowns = {
        "paymentTerms": [],
        "creditTerms": [],
        "salesReps": []
    }

    # load existing data safely
    if os.path.exists(CUSTOM_DROPDOWNS):
        with open(CUSTOM_DROPDOWNS, "r", encoding="utf-8") as f:
            try:
                existing = json.load(f)
                dropdowns.update(existing)  # 🔥 merge safely
            except json.JSONDecodeError:
                pass

    # ensure key exists (important)
    if field not in dropdowns:
        dropdowns[field] = []

    # avoid duplicates (case-insensitive)
    if value.lower() not in [v.lower() for v in dropdowns[field]]:
        dropdowns[field].append(value)

    with open(CUSTOM_DROPDOWNS, "w", encoding="utf-8") as f:
        json.dump(dropdowns, f, indent=2, ensure_ascii=False)

    return jsonify({"success": True})


@app.route("/crm")
def crm():
    return render_template("crm.html", page="crm")


# =========================================
# 1. ROOT & AUTH — OTP APIs
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

    # =========================================
    # BUG_008 — Simple per‑email OTP rate limit
    # Return HTTP 429 if too many OTPs are requested in a short window.
    # =========================================
    now = time.time()
    history = OTP_SEND_COUNT.get(email, [])
    # Keep only recent timestamps inside the window
    history = [ts for ts in history if now - ts <= OTP_WINDOW_SECONDS]
    if len(history) >= MAX_OTP_SENDS:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Too many OTP requests. Please wait a few minutes before trying again.",
                }
            ),
            429,
        )
    history.append(now)
    OTP_SEND_COUNT[email] = history

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
# 1. ROOT & AUTH — Signup API
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
# 1. ROOT & AUTH — Login API
# =========================================
@app.route("/login", methods=["POST"])
def login_post():
    """
    Login endpoint (JSON API).
    Handles:
      - basic validation
      - account lockout after repeated failures
      - session creation on success
    """
    try:
        # Safely get JSON data
        if not request.is_json:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid request format. Expected JSON.",
                    }
                ),
                400,
            )

        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        password = (data.get("password") or "").strip()
        remember_me = data.get("rememberMe", False)

        # Validate input
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400
        if not password:
            return jsonify({"success": False, "message": "Password is required"}), 400

        # Load users and failed attempts with error handling
        try:
            users = load_users()
            failed_attempts = load_failed_attempts()
        except Exception as e:  # pragma: no cover - defensive
            print(f"❌ Error loading users/failed attempts: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Server error. Please try again later.",
                    }
                ),
                500,
            )

        # Find user
        user = next(
            (
                u
                for u in users
                if (u.get("email") or "").strip().lower() == email
            ),
            None,
        )
        if not user:
            return (
                jsonify({"success": False, "message": "User not found"}),
                404,
            )

        # Check if account is locked
        info = failed_attempts.get(email, {})
        if "locked_until" in info and time.time() < info["locked_until"]:
            remaining = int(info["locked_until"] - time.time())
            return (
                jsonify(
                    {
                        "success": False,
                        "message": f"Account locked. Try again in {remaining}s.",
                    }
                ),
                403,
            )

        # Verify password
        if user.get("password") != password:
            info.setdefault("count", 0)
            info["count"] += 1

            if info["count"] >= LOCKOUT_THRESHOLD:
                info["locked_until"] = time.time() + LOCKOUT_DURATION
                failed_attempts[email] = info
                try:
                    save_failed_attempts(failed_attempts)
                except Exception as e:  # pragma: no cover - defensive
                    print(f"❌ Error saving failed attempts: {e}")
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Too many failed attempts. Locked for {LOCKOUT_DURATION//60} min.",
                        }
                    ),
                    403,
                )

            failed_attempts[email] = info
            try:
                save_failed_attempts(failed_attempts)
            except Exception as e:  # pragma: no cover - defensive
                print(f"❌ Error saving failed attempts: {e}")

            remaining = LOCKOUT_THRESHOLD - info["count"]
            return (
                jsonify(
                    {
                        "success": False,
                        "message": f"Incorrect password. {remaining} attempts left.",
                    }
                ),
                401,
            )

        # Clear failed attempts on successful login
        if email in failed_attempts:
            failed_attempts.pop(email, None)
            try:
                save_failed_attempts(failed_attempts)
            except Exception as e:  # pragma: no cover - defensive
                print(f"❌ Error saving failed attempts: {e}")

        # Set session
        try:
            session.permanent = bool(remember_me)
            session["user"] = email
            session["remember_me"] = bool(
                remember_me
            )  # Store remember_me flag in session
            session["role"] = user.get("role", "User")
            session["last_active"] = time.time()
            print("✅ Login success, session active")
            return (
                jsonify({"success": True, "message": "Login successful"}),
                200,
            )
        except Exception as e:  # pragma: no cover - defensive
            print(f"❌ Error setting session: {e}")
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Server error. Please try again later.",
                    }
                ),
                500,
            )

    except Exception as e:  # pragma: no cover - defensive
        print(f"❌ Unexpected error in login_post: {e}")
        import traceback

        traceback.print_exc()
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Server error. Please try again later.",
                }
            ),
            500,
        )


# =========================
# API: LIST + FILTER + PAGINATION (Supports HTML & JSON)
# =========================
@app.route("/api/products", methods=["GET"])
def api_products():
    """
    GET /api/products
    Query Parameters:
        - q: Search query
        - type: Filter by product type
        - category: Filter by category
        - status: Filter by status
        - stock: Filter by stock level (out/low/ok)
        - page: Page number (default: 1)
        - page_size: Items per page (default: 10)
        - format: Force format (json/html)
    
    Returns JSON or HTML based on Accept header
    """
    # BUG_001 / BUG_006: Require login for product list API
    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    products = load_products()

    q = (request.args.get("q") or "").strip().lower()
    ptype = (request.args.get("type") or "").strip()
    cat = (request.args.get("category") or "").strip()
    status = (request.args.get("status") or "").strip()
    brand = (request.args.get("brand") or "").strip()
    stock = (request.args.get("stock") or "").strip()

    # BUG_002: Robust validation for pagination parameters
    raw_page = request.args.get("page", "1")
    raw_page_size = request.args.get("page_size", "10")
    try:
        page = int(raw_page)
        page_size = int(raw_page_size)
    except (TypeError, ValueError):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Invalid pagination parameters. 'page' and 'page_size' must be integers.",
                }
            ),
            400,
        )

    if page <= 0 or page_size <= 0:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Invalid pagination parameters. 'page' and 'page_size' must be greater than 0.",
                }
            ),
            400,
        )

    # Optional upper bound to avoid huge pages
    if page_size > 1000:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Invalid pagination parameters. 'page_size' is too large.",
                }
            ),
            400,
        )

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
        if brand and p.get("brand") != brand:
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

    # meta for dropdown - extract unique values from database
    types = sorted({p.get("type","") for p in products if p.get("type")})
    categories = sorted({p.get("category","") for p in products if p.get("category")})
    statuses = sorted({p.get("status","") for p in products if p.get("status")})
    brands = sorted({p.get("brand","") for p in products if p.get("brand")})

    # pagination
    total_items = len(filtered)
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    page = max(1, min(page, total_pages))

    start = (page - 1) * page_size
    end = start + page_size
    items = filtered[start:end]

    response_data = {
        "success": True,
        "data": {
        "items": items,
        "page": page,
        "total_pages": total_pages,
        "total_items": total_items,
            "meta": {
                "types": types,
                "categories": categories,
                "statuses": statuses,
                "brands": brands
            }
        }
    }

    if wants_json():
        return jsonify(response_data), 200
    else:
        # For HTML, redirect to products page or return JSON anyway
        return jsonify(response_data), 200



# =========================
# API: DELETE PRODUCT (Supports HTML & JSON)
# =========================
@app.route("/api/products/<product_id>", methods=["DELETE"])
def api_delete_product(product_id):
    """
    DELETE /api/products/<product_id>
    
    Deletes a product by ID
    """
    # BUG_001 / BUG_006: Require login for delete API
    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

    products = load_products()
    before = len(products)
    deleted_product = next((p for p in products if str(p.get("product_id")) == str(product_id)), None)
    
    products = [p for p in products if str(p.get("product_id")) != str(product_id)]
    save_products(products)

    if len(products) == before:
        error_response = {
            "success": False,
            "message": "Product not found",
            "error": f"Product with ID '{product_id}' does not exist"
        }
        if wants_json():
            return jsonify(error_response), 404
        else:
            return jsonify(error_response), 404
    
    response_data = {
        "success": True,
        "message": "Product deleted successfully",
        "data": deleted_product
    }
    
    if wants_json():
        return jsonify(response_data), 200
    else:
        return jsonify(response_data), 200
# =========================
# API: IMPORT CSV
# CSV columns: product_id,product_name,type,category,status,stock_level,price
# =========================
@app.route("/api/products/import", methods=["POST"])
def api_import_products():
    # BUG_001 / BUG_006: Require login for import API
    user_email, resp, status = _require_login_json()
    if resp is not None:
        return resp, status

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
# 9. UTILITY — Logout
# =========================================
@app.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("last_active", None)
    session.pop("remember_me", None)
    return redirect(url_for("login", message="logged_out"))


# =========================================
# 9. UTILITY — Global Search
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
        ("Enquiry List", "/crm"),
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
# 3. MASTERS — Manage Users — API
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


# 3. MASTERS — Manage Users — API (continued)
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


# =========================================
# ✅ API: CREATE USER (POST /api/users) — JSON for Postman
# =========================================
@app.route("/api/users", methods=["POST"])
def api_create_user():
    """Create new user. Requires JSON body. Use ?format=json or Accept: application/json."""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    users = load_users()
    user_role = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_role = (u.get("role") or "User").strip()
            break

    if normalize_role(user_role) not in ["superadmin", "admin"]:
        return jsonify({"success": False, "message": "Only Super Admin/Admin can create users."}), 403

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "JSON body required"}), 400

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

    errors = []
    if not first_name or len(first_name) < 3:
        errors.append("First Name required (min 3 chars)")
    if not last_name or len(last_name) < 3:
        errors.append("Last Name required (min 3 chars)")
    if not email:
        errors.append("Email required")
    elif not EMAIL_REGEX.match(email):
        errors.append("Invalid email format")
    if not branch:
        errors.append("Branch required")
    if not department:
        errors.append("Department required")
    if not role:
        errors.append("Role required")
    if not reporting_to:
        errors.append("Reporting To required")
    if not available_branches:
        errors.append("Available Branches required")
    if not employee_id:
        errors.append("Employee ID required")

    for u in users:
        if isinstance(u, dict):
            if (u.get("email") or "").strip().lower() == email.lower():
                errors.append("Email already exists")
                break
            if (u.get("employee_id") or "") == employee_id:
                errors.append("Employee ID already exists")
                break

    if errors:
        return jsonify({"success": False, "message": "; ".join(errors), "errors": errors}), 400

    full_name = (first_name + " " + last_name).strip()
    full_phone = f"{country_code}{contact_number}" if country_code and contact_number else contact_number

    new_user = {
        "id": str(uuid.uuid4()),
        "name": full_name, "phone": full_phone, "first_name": first_name, "last_name": last_name,
        "email": email, "country_code": country_code, "contact_number": contact_number,
        "branch": branch, "department": department, "role": role,
        "reporting_to": reporting_to, "available_branches": available_branches, "employee_id": employee_id,
    }
    users.append(new_user)
    save_users(users)

    return jsonify({
        "success": True,
        "message": "User created successfully",
        "user": new_user
    }), 201


# =========================================
# ✅ API: UPDATE USER (PUT /api/users/<index>) — JSON for Postman
# =========================================
@app.route("/api/users/<int:user_index>", methods=["PUT"])
def api_update_user(user_index):
    """Update user by index. Requires JSON body."""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    users = load_users()
    current_user = next((u for u in users if isinstance(u, dict) and (u.get("email") or "").strip().lower() == user_email.strip().lower()), None)
    if not current_user or normalize_role(current_user.get("role")) not in ["superadmin", "admin"]:
        return jsonify({"success": False, "message": "Only Super Admin/Admin can edit users."}), 403

    if user_index < 0 or user_index >= len(users):
        return jsonify({"success": False, "message": "User index out of range"}), 404

    data = request.get_json(silent=True) or {}
    u = users[user_index]
    if data.get("name") is not None:
        u["name"] = str(data.get("name", "")).strip()
    if data.get("email") is not None:
        u["email"] = str(data.get("email", "")).strip()
    if data.get("phone") is not None:
        u["phone"] = str(data.get("phone", "")).strip()
    if data.get("role") is not None:
        u["role"] = str(data.get("role", "")).strip() or "User"
    if data.get("department") is not None:
        u["department"] = str(data.get("department", "")).strip()
    if data.get("branch") is not None:
        u["branch"] = str(data.get("branch", "")).strip()

    save_users(users)
    return jsonify({"success": True, "message": "User updated", "user": users[user_index]}), 200


# =========================================
# ✅ API: DELETE USER (DELETE /api/users/<index>) — JSON for Postman
# =========================================
@app.route("/api/users/<int:user_index>", methods=["DELETE"])
def api_delete_user(user_index):
    """Delete user by index."""
    user_email = session.get("user")
    if not user_email:
        return jsonify({"success": False, "message": "Session expired. Please login first."}), 401

    users = load_users()
    current_user = next((u for u in users if isinstance(u, dict) and (u.get("email") or "").strip().lower() == user_email.strip().lower()), None)
    if not current_user or normalize_role(current_user.get("role")) not in ["superadmin", "admin"]:
        return jsonify({"success": False, "message": "Only Super Admin/Admin can delete users."}), 403

    if user_index < 0 or user_index >= len(users):
        return jsonify({"success": False, "message": "User index out of range"}), 404

    deleted_user = users.pop(user_index)
    save_users(users)
    return jsonify({
        "success": True,
        "message": "User deleted successfully",
        "deleted_email": deleted_user.get("email", "")
    }), 200


# 3. MASTERS — Manage Users — Delete API
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
# ✅ NEW-ENQUIRY 
# =========================================

def generate_enquiry_id():
    """Generate next enquiry ID based on the file at ENQUIRY_FILE."""
    if not os.path.exists(ENQUIRY_FILE):
        return "ENQ0001"

    try:
        with open(ENQUIRY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        # if file is empty or not list
        if not data or not isinstance(data, list):
            return "ENQ0001"

        last_id = data[-1].get("enquiry_id", "ENQ0000")
        number = int(last_id.replace("ENQ", ""))
        return f"ENQ{number + 1:04d}"

    except Exception:
        return "ENQ0001"


def read_products():
    """
    Read enquiry-related products from ENQUIRY_PRODUCT_FILE (D:\\POS_Project_Latest\\Pos project\\enquiry_product.json).
    """
    if not os.path.exists(ENQUIRY_PRODUCT_FILE):
        return []
    with open(ENQUIRY_PRODUCT_FILE, "r") as f:
        return json.load(f)


def write_products(data):
    with open(ENQUIRY_PRODUCT_FILE, "w") as f:
        json.dump(data, f, indent=4)


# =========================================
# 7. CRM — Enquiry List
# =========================================
@app.route("/enquiry-list")
def enquiry_list():
    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()
    user_name = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            break

    # Load enquiries from JSON file (Pos project/new-enquiry.json)
    enquiries = []
    if os.path.exists(ENQUIRY_FILE):
        try:
            with open(ENQUIRY_FILE, "r", encoding="utf-8") as f:
                enquiries = json.load(f)
                if not isinstance(enquiries, list):
                    enquiries = []
        except Exception:
            enquiries = []

    return render_template(
        "enquiry-list.html",
        title="Enquiry List - Stackly",
        page="enquiry_list",
        section="crm",
        user_email=user_email,
        user_name=user_name,
        enquiries=enquiries,
    )


# =========================================
# 8. CRM — New Enquiry
# =========================================
@app.route("/new-enquiry")
def new_enquiry():
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
        "new-enquiry.html",
        title="New-Enquiry - Stackly",
        page="enquiry_list",
        section="crm",
        user_email=user_email,
        user_name=user_name,
    )


@app.route("/save-enquiry", methods=["POST"])
def save_enquiry():

    # Support both JSON (AJAX) and regular form POST submissions
    if request.is_json:
        enquiry_data = request.get_json(silent=True) or {}
    else:
        enquiry_data = request.form.to_dict() or {}

    if not enquiry_data:
        return jsonify({"status": "error", "message": "No data received"}), 400

    # 🔥 generate ID
    enquiry_data["enquiry_id"] = generate_enquiry_id()

    # 🔥 read existing data (Pos project/new-enquiry.json)
    if os.path.exists(ENQUIRY_FILE):
        with open(ENQUIRY_FILE, "r", encoding="utf-8") as f:
            try:
                all_data = json.load(f)
                if not isinstance(all_data, list):
                    all_data = []
            except json.JSONDecodeError:
                all_data = []
    else:
        all_data = []

    # 🔥 append new enquiry
    all_data.append(enquiry_data)

    # 🔥 save back
    with open(ENQUIRY_FILE, "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=4)

    # Build a common response payload
    payload = {
        "status": "success",
        "enquiry_id": enquiry_data["enquiry_id"],
    }

    # If this is an AJAX/JSON request, return JSON
    if request.is_json or wants_json():
        return jsonify(payload), 200

    # Otherwise, it's a normal form POST → navigate to Enquiry List page
    # with a query flag so front-end can show a toast
    return redirect(url_for("enquiry_list", created="success"))


@app.route("/add-product", methods=["POST"])
def add_product():
    product = request.json
    products = read_products()
    products.append(product)
    write_products(products)
    return jsonify({"success": True})


@app.route("/get-products")
def get_products():
    return jsonify(read_products())


# Delete product
@app.route("/delete-product/<product_id>", methods=["DELETE"])
def delete_product(product_id):
    products = read_products()
    products = [p for p in products if p["product_id"] != product_id]
    write_products(products)  # correct function
    return jsonify({"status": "success"})


@app.route("/update-product/<product_id>", methods=["PUT"])
def update_product(product_id):
    products = read_products()  # read all products
    updated_data = request.json

    for i, p in enumerate(products):
        if p["product_id"] == product_id:
            products[i].update(updated_data)
            break

    write_products(products)
    return jsonify({"success": True})


# ITEM CODE GENERATE
@app.route("/generate-product-id")
def generate_product_id_enquiry():
    products = read_products()

    if products:
        last_id = products[-1]["product_id"]  # e.g., "PRD-005"
        last_num = int(last_id.split("-")[1])  # get numeric part
        new_num = last_num + 1
    else:
        new_num = 1  # first product

    # Format with 3 digits, leading zeros
    new_id = f"PRD-{new_num:03d}"

    return jsonify({"product_id": new_id})


# EMAIL CHECK (uses Pos project/new-enquiry.json)
@app.route("/check-email", methods=["POST"])
def check_emails():
    data = request.get_json()
    email = data.get("email")

    try:
        with open(ENQUIRY_FILE, "r", encoding="utf-8") as f:
            enquiries = json.load(f)
    except FileNotFoundError:
        enquiries = []

    exists = any(e.get("email") == email for e in enquiries)

    return jsonify({"exists": exists})


@app.route("/delete-enquiry/<enquiry_id>", methods=["DELETE"])
def delete_enquiry(enquiry_id):
    try:
        # Always use Pos project/new-enquiry.json
        if not os.path.exists(ENQUIRY_FILE):
            return jsonify({"success": False, "message": "No enquiries found"}), 404

        with open(ENQUIRY_FILE, "r", encoding="utf-8") as f:
            enquiries = json.load(f)
            if not isinstance(enquiries, list):
                enquiries = []

        # Find and remove the enquiry
        original_count = len(enquiries)
        enquiries = [e for e in enquiries if str(e.get("enquiry_id", "")) != str(enquiry_id) and str(e.get("id", "")) != str(enquiry_id)]

        if len(enquiries) == original_count:
            return jsonify({"success": False, "message": "Enquiry not found"}), 404

        # Save back to Pos project/new-enquiry.json
        with open(ENQUIRY_FILE, "w", encoding="utf-8") as f:
            json.dump(enquiries, f, indent=4)

        return jsonify({"success": True, "message": "Enquiry deleted successfully"}), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Error deleting enquiry: {str(e)}"}), 500


@app.route("/api/enquiry/<enquiry_id>", methods=["GET"])
def get_enquiry(enquiry_id):
    try:
        # Always use Pos project/new-enquiry.json
        if not os.path.exists(ENQUIRY_FILE):
            return jsonify({"success": False, "message": "No enquiries found"}), 404

        with open(ENQUIRY_FILE, "r", encoding="utf-8") as f:
            enquiries = json.load(f)
            if not isinstance(enquiries, list):
                enquiries = []

        # Find the enquiry
        enquiry = None
        for e in enquiries:
            if str(e.get("enquiry_id", "")) == str(enquiry_id) or str(e.get("id", "")) == str(enquiry_id):
                enquiry = e
                break

        if not enquiry:
            return jsonify({"success": False, "message": "Enquiry not found"}), 404

        return jsonify({
            "success": True,
            "data": enquiry
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Error fetching enquiry: {str(e)}"}), 500


@app.route("/update-enquiry/<enquiry_id>", methods=["POST"])
def update_enquiry(enquiry_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400

        # Always use Pos project/new-enquiry.json
        if not os.path.exists(ENQUIRY_FILE):
            return jsonify({"success": False, "message": "No enquiries found"}), 404

        with open(ENQUIRY_FILE, "r", encoding="utf-8") as f:
            enquiries = json.load(f)
            if not isinstance(enquiries, list):
                enquiries = []

        # Find and update the enquiry
        updated = False
        for e in enquiries:
            if str(e.get("enquiry_id", "")) == str(enquiry_id) or str(e.get("id", "")) == str(enquiry_id):
                e.update({
                    "first_name": data.get("first_name", ""),
                    "last_number": data.get("last_number", ""),
                    "email": data.get("email", ""),
                    "phone_number": data.get("phone_number", "")
                })
                updated = True
                break

        if not updated:
            return jsonify({"success": False, "message": "Enquiry not found"}), 404

        # Save back
        with open(ENQUIRY_FILE, "w", encoding="utf-8") as f:
            json.dump(enquiries, f, indent=4)

        # Find the updated enquiry to return
        updated_enquiry = next((e for e in enquiries if str(e.get("enquiry_id", "")) == str(enquiry_id) or str(e.get("id", "")) == str(enquiry_id)), None)

        return jsonify({
            "success": True,
            "message": "Enquiry updated successfully",
            "data": updated_enquiry
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Error updating enquiry: {str(e)}"}), 500


# =========================================
# ✅ RUN APP
# =========================================
if __name__ == "__main__":
    app.run(debug=True)
