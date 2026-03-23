
import json
import psycopg2
import uuid

conn = psycopg2.connect(
    host="localhost",
    database="POS_Billing",
    user="postgres",
    password="Pos@123"
)

cursor = conn.cursor()

with open("users.json", "r") as f:
    users = json.load(f)

for u in users:

    user_id = u.get("id")

    # check if id is valid UUID
    try:
        uuid.UUID(str(user_id))
    except:
        user_id = str(uuid.uuid4())

    cursor.execute(
    """
    INSERT INTO users (
        id, name, phone, first_name, last_name, email,
        country_code, contact_number, branch, department,
        role, reporting_to, available_branches, employee_id, password
    )
    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    ON CONFLICT (id) DO NOTHING;
    """,
    (
        user_id,
        u.get("name"),
        u.get("phone"),
        u.get("first_name"),
        u.get("last_name"),
        u.get("email"),
        u.get("country_code"),
        u.get("contact_number"),
        u.get("branch"),
        u.get("department"),
        u.get("role"),
        u.get("reporting_to"),
        u.get("available_branches"),
        u.get("employee_id"),
        u.get("password")  
    )
)
conn.commit()
cursor.close()
conn.close()

print("Users migrated successfully!")