"""
Dev helper: tests the SQLAlchemy engine configured in `app.py`.

Run:
  python main.py
"""

from app import engine


if __name__ == "__main__":
    if engine is None:
        print("SQLAlchemy engine not configured. Check .env values (user/password/host/port/dbname).")
    else:
        try:
            with engine.connect() as connection:
                print("Connection successful!")
        except Exception as e:
            print(f"Failed to connect: {e}")

