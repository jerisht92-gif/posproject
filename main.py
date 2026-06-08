"""
Test Supabase / Postgres connectivity via SQLAlchemy (pooler).

Install deps:
  pip install python-dotenv sqlalchemy psycopg2-binary

Run:
  python main.py
"""

from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine

# from sqlalchemy.pool import NullPool
import os

# Load environment variables: standard name is .env; this project also supports "env".
load_dotenv(".env")
load_dotenv("env")

# Match app.py: DB_* keys first, then lowercase Supabase-style fallbacks
USER = (os.getenv("DB_USER") or os.getenv("user") or "").strip()
PASSWORD = (os.getenv("DB_PASSWORD") or os.getenv("password") or "").strip()
HOST = (os.getenv("DB_HOST") or os.getenv("host") or "").strip()
PORT = (os.getenv("DB_PORT") or os.getenv("port") or "5432").strip()
DBNAME = (os.getenv("DB_NAME") or os.getenv("dbname") or "").strip()
SSLMODE = (
    os.getenv("DB_SSLMODE")
    or ("require" if "supabase.co" in HOST else "prefer")
).strip()

if not all([USER, PASSWORD, HOST, PORT, DBNAME]) or PASSWORD == "[YOUR-PASSWORD]":
    print(
        "Set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME in .env "
        "(or user, password, host, port, dbname for Supabase)."
    )
    raise SystemExit(1)

# Construct the SQLAlchemy connection string (quote password for special chars)
DATABASE_URL = (
    f"postgresql+psycopg2://{quote_plus(USER)}:{quote_plus(PASSWORD)}"
    f"@{HOST}:{PORT}/{DBNAME}?sslmode={quote_plus(SSLMODE)}"
)

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL)
# Transaction / Session pooler: optional — disable SQLAlchemy client-side pooling:
# engine = create_engine(DATABASE_URL, poolclass=NullPool)

# Test the connection
if __name__ == "__main__":
    try:
        with engine.connect() as connection:
            print("Connection successful!")
    except Exception as e:
        print(f"Failed to connect: {e}")
