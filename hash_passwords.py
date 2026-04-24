import sys, os, hashlib
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv
load_dotenv('.env')
load_dotenv('env')
 
import psycopg2
 
conn = psycopg2.connect(
    host=os.getenv('host') or os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('dbname') or os.getenv('DB_NAME', 'POS_Billing'),
    user=os.getenv('user') or os.getenv('DB_USER', 'postgres'),
    password=os.getenv('password') or os.getenv('DB_PASSWORD', 'Pos@123'),
    port=os.getenv('port') or os.getenv('DB_PORT', '5432'),
)
cur = conn.cursor()
 
# Get all users with plaintext passwords (not already 64-char SHA-256 hash)
cur.execute("SELECT user_id, password FROM users WHERE password IS NOT NULL AND length(password) != 64")
users = cur.fetchall()
 
if not users:
    print("No plaintext passwords found. All passwords are already hashed or null.")
else:
    for user_id, plain_pwd in users:
        hashed = hashlib.sha256(plain_pwd.encode()).hexdigest()
        cur.execute("UPDATE users SET password = %s WHERE user_id = %s", (hashed, user_id))
        print(f"Hashed password for user_id={user_id}")
 
    conn.commit()
    print(f"\nDone. Updated {len(users)} user(s).")
 
cur.close()
conn.close()
 
 