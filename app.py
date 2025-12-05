from flask import Flask, render_template, request, jsonify, session, url_for, redirect
from flask_cors import CORS
import smtplib, random, json, os, time
from datetime import timedelta
import uuid
import re
import ssl                               
from email.mime.text import MIMEText    

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
    
app = Flask(__name__)
CORS(app)

# ==============================
# 🔐 Session & global constants
# ==============================
app.secret_key = "supersecretkey"
app.permanent_session_lifetime = timedelta(days=7)     # for Remember Me
INACTIVITY_TIMEOUT = 300  # 300seconds = 5 minutes


USER_FILE = "users.json"
FAILED_ATTEMPTS_FILE = "failed_attempts.json"
OTP_FILE = "email_otps.json"

EMAIL_ADDRESS = "amritha2025j@gmail.com"
EMAIL_PASSWORD = "szwwyraaobpbrcpd"   # 16-digit Gmail App Password

# Forgot-password & lockout
BASE_URL = "https://anithag.pythonanywhere.com"
RESET_SEND_COUNT = {}
MAX_RESET_SENDS = 5
LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION = 120  # seconds
RESET_TOKENS = {}
RESET_LOCK = {}
RESET_TOKEN_EXPIRY = 600 

# ==============================
# ✅ Regex rules
# ==============================
EMAIL_REGEX = re.compile(
    r"^[A-Za-z0-9._%+-]{3,40}@(gmail\.com|yahoo\.com|yahoo\.co\.in|outlook\.com|hotmail\.com|stackly\.com|stackly\.in)$",
    re.IGNORECASE
)

MAX_EMAIL_LENGTH = 40
PHONE_REGEX = re.compile(r"^[0-9]{10}$")
NAME_REGEX = re.compile(r"^[A-Za-z\s]{3,20}$")

# ========================================
# 🔐 GLOBAL AUTO-SESSION-CHECK (Once Only)
# ========================================
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
        "/static",               # will be handled below
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


# ==============================
# 🧠 Helper functions
# ==============================
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


# ============== OTP helpers ==============

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

    # expiry check
    now = time.time()
    if now - entry.get("timestamp", 0) > expiry_seconds:
        return False

    if entry.get("otp") != otp:
        return False

    # mark verified
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

    # optional expiry check here too (same window as above)
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
    # reuse the existing send_email wrapper
    send_email(to_email, subject, body)


# ==============================
# 🌐 Global headers
# ==============================
@app.after_request
def set_security_headers(resp):
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0, private"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


# ==============================
# 🧭 Routes
# ==============================
@app.route("/")
def root():
    return redirect(url_for("login"))


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

# ==============================
# 📄 Manage Users page
# ==============================
@app.route("/manage-users")
def manage_users():

    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()

    # find user name
    user_name = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            break

    return render_template(
        "manage-users.html",
        users=users,
        title="Manage Users - Stackly",
        page="manage_users",
        section="masters",
        user_email=user_email,
        user_name=user_name,
    )



# ==============================
# 👤 Profile page
# ==============================
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

# ==============================
# 🔍 Check email exists (AJAX)
# ==============================
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


# ==============================
# 📩 Forgot password – send link
# ==============================
@app.route("/send-reset-link", methods=["POST"])
def send_reset_link():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"status": "error", "message": "Email is required"}), 400

    try:
        # 1️⃣ Email must exist
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

        # 2️⃣ Lockout for spam
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

        # 3️⃣ Generate token + save mapping
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


# ==============================
# 🔁 Reset password pages
# ==============================
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

@app.route("/create-user")
def create_user():
    user_email = session.get("user")
    if not user_email:
        return redirect(url_for("login", message="session_expired"))

    users = load_users()

    # find user name from users.json
    user_name = "User"
    for u in users:
        if isinstance(u, dict) and (u.get("email") or "").lower() == user_email.lower():
            user_name = u.get("name") or "User"
            break

    return render_template(
        "create-user.html",
        title="Create User - Stackly",
        page="manage_users",          # highlight Masters → Manage Users
        section="masters",
        user_email=user_email,
        user_name=user_name,
    )


@app.route("/department-role")
def department_role():
    return render_template("department_role.html", page="department_role")


@app.route("/products")
def products():
    return render_template("products.html", page="products", section="masters")

@app.route("/customer")
def customer():
    return render_template("customer.html", page="customer", section="masters")

@app.route("/crm")
def crm():
    return render_template("crm.html", page="crm")




# ==============================
# 📲 Send OTP for signup
# ==============================
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

    # 👇 ADD THIS DEBUG LINE
    print("DEBUG OTP for", email, "=", otp)

    save_otp_in_db(email, otp)

    try:
        send_otp_email(email, otp)
    except Exception as e:
        print("Error sending OTP:", e)
        return jsonify(success=False, message="Error sending OTP. Try again."), 500

    return jsonify(success=True, message="OTP sent successfully!")

# ==============================
# ✅ Verify OTP
# ==============================
@app.route("/verify_otp", methods=["POST"])
def verify_otp():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if verify_otp_in_db(email, otp):
        return jsonify({"success": True, "message": "OTP verified successfully!"}), 200
    return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400


# ==============================
# 📝 Signup
# ==============================
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    # 1️⃣ Basic required checks - show exactly which field(s) missing
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

    if not PHONE_REGEX.match(phone):
        return jsonify({"success": False, "message": "⚠️ Phone must be 10 digits"}), 400

    if len(email) > MAX_EMAIL_LENGTH:
        return jsonify({"success": False, "message": "⚠️ Email is too long (max 50 characters)"}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"success": False, "message": "⚠️ Enter a valid email address (like name@gmail.com or name@outlook.com)"}), 400

    # 2️⃣ 🔐 VERY IMPORTANT: require verified OTP for THIS email
    if not is_email_otp_verified(email):
        return jsonify({
            "success": False,
            "message": "⚠️ Please verify OTP for this email before signing up."
        }), 400

    # 3️⃣ Check duplicate user
    users = load_users()
    if any((u.get("email") or "").strip().lower() == email for u in users):
        return jsonify({"success": False, "message": "⚠️ User already exists"}), 409

    # 4️⃣ Save new user
    users.append({
        "name": name,
        "phone": phone,
        "email": email,
        "password": password,   # NOTE: plain text (ok for demo, hash later)
    })
    save_users(users)

    # 5️⃣ 🧹 Remove OTP for this email so it can't be reused
    otps = load_otps()
    otps.pop(email, None)
    save_otps(otps)

    # 6️⃣ Send welcome email
    send_email(email, "Welcome!", f"Hello {name}, your account has been created successfully!")

    return jsonify({"success": True, "message": "🎉 Signup successful!"}), 200

# ==============================
# 🔐 Login + lockout + remember
# ==============================
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

    # lockout check
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

    # success: clear failed attempts
    if email in failed_attempts:
        failed_attempts.pop(email, None)
        save_failed_attempts(failed_attempts)

    session.permanent = bool(remember_me)
    session["user"] = email
    session["last_active"] = time.time()
    print("✅ Login success, session active")
    return jsonify({"success": True, "message": "Login successful"}), 200

def check_session_timeout():
    if "user" not in session:
        return False

    last_active = session.get("last_active", 0)
    now = time.time()

    # if inactive for more than 5 minutes
    if now - last_active > INACTIVITY_TIMEOUT:
        session.clear()
        return False
    
    # refresh timestamp
    session["last_active"] = now
    return True


# ==============================
# 🚪 Logout
# ==============================
@app.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("last_active", None)
    return redirect(url_for("login", message="logged_out"))

# ==============================
# 🔍 GLOBAL SEARCH API
# ==============================
@app.route("/search")
def global_search():
    q = (request.args.get("q") or "").strip().lower()
    results = []

    # empty search → no results
    if not q:
        return jsonify({"results": []})

    # 1️⃣ Search Users (name, email, phone)
    users = load_users()
    for u in users:
        if not isinstance(u, dict):
            continue

        name = (u.get("name") or "").strip()
        email = (u.get("email") or "").strip()
        phone = (u.get("phone") or "").strip()

        if (
            q in name.lower()
            or q in email.lower()
            or q in phone
        ):
            results.append({
                "type": "User",
                "label": f"{name} - {email}",
                "url": "/manage-users",
            })

    # 2️⃣ Search Menu Items (Dashboard, Masters, etc.)
    menu_items = [
    ("Dashboard", "/dashboard"),

    # Masters
    ("Masters", "/manage-users"),
    ("Manage Users", "/manage-users"),
    ("Products", "/products"),
    ("Customer", "/customer"),
    ("Department Role", "/department-role"),

    # CRM full submenu
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


# ==============================
# ▶️ Run app
# ==============================
if __name__ == "__main__":
    app.run(debug=True)
