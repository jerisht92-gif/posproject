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

# Load environment variables from .env (same folder as this file)
load_dotenv()

# Fetch variables (lowercase keys match Supabase / .env examples)
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

if not all([USER, PASSWORD, HOST, PORT, DBNAME]) or PASSWORD.strip() == "[YOUR-PASSWORD]":
    print(
        "Set user, password, host, port, dbname in .env "
        "(replace [YOUR-PASSWORD] with your real database password)."
    )
    raise SystemExit(1)

# Construct the SQLAlchemy connection string (quote password for special chars)
DATABASE_URL = (
    f"postgresql+psycopg2://{quote_plus(USER)}:{quote_plus(PASSWORD)}"
    f"@{HOST}:{PORT}/{DBNAME}?sslmode=require"
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
