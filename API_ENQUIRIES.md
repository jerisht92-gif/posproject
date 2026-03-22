# Enquiry List — REST API (Postman)

Base URL: `http://127.0.0.1:5000` (adjust for your environment).

### If you see HTML “Login” instead of JSON

1. **Use the API URL:** `GET /api/enquiries` — not `/enquiry-list` (that URL is mainly for the browser UI).
2. **Session:** Log in first, then send the **Cookie** Postman stores (`session=...`). Expired or wrong-domain cookies will look “logged in” in Postman but the server will treat you as a guest.
3. **Headers:** Prefer **`Accept: application/json`**. (`Content-Type: application/json` on a GET is also treated as JSON mode in this app.)

---

All endpoints require a **logged-in session** (same as the web app). In Postman:

1. **POST** `http://127.0.0.1:5000/login`  
   - Body → **raw** → **JSON**, e.g.  
     `{ "email": "your@email.com", "password": "yourpassword", "rememberMe": true }`
2. Ensure **cookies** are stored (Postman cookie jar enabled).
3. Call the APIs below with header: `Accept: application/json` (optional but consistent with other modules).

---

## List enquiries

**GET** `/api/enquiries`

Query params (optional):

| Param    | Description                          |
|----------|--------------------------------------|
| `search` | Substring match on id, name, email, phone, status |
| `status` | Exact match on status (e.g. `New`)  |

**200** — `{ "success": true, "enquiries": [ ... ], "total": N, "current_user": { ... } }`

Each enquiry includes `enquiry_details`, `items`, and flat fields (`first_name`, `last_name`, `email`, `phone`, `phone_number`, `status`).

---

## Get one enquiry

**GET** `/api/enquiries/<enquiry_id>`

Example: `/api/enquiries/ENQ-0001`

**200** — `{ "success": true, "enquiry": { ... } }`  
**404** — not found

---

## Create enquiry

**POST** `/api/enquiries`  
**Auth:** Admin or Super Admin only.

Body (JSON):

```json
{
  "enquiry_id": "ENQ-0099",
  "enquiry_details": {
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "9876543210",
    "email": "jane@gmail.com",
    "street": "1 Main St",
    "unit": "",
    "city": "Chennai",
    "state": "TN",
    "zip": "600001",
    "country": "India",
    "status": "New"
  },
  "items": {}
}
```

- Omit `enquiry_id` to **auto-generate** the next `ENQ-####` id.
- You may send `phone_number` instead of `phone`; it is stored as `phone`.

**201** — created  
**409** — `enquiry_id` already exists

---

## Update enquiry

**PUT** `/api/enquiries/<enquiry_id>`  
**Auth:** Admin or Super Admin only.

Body (JSON) — all keys optional:

```json
{
  "enquiry_details": {
    "first_name": "Updated",
    "status": "In Progress"
  },
  "items": {
    "P132": {
      "item_code": "P132",
      "item_name": "LED Bulb 9W",
      "quantity": "2",
      "unit_price": "1000",
      "selling_price": "5",
      "description": "Energy efficient 9W LED bulb",
      "total": 10
    }
  }
}
```

- `enquiry_details`: merged into existing details.
- `items`: merged into existing line items (same keys updated).

**200** — updated  
**404** — not found

---

## Delete enquiry

**DELETE** `/api/enquiries/<enquiry_id>`  
**Auth:** Super Admin only.

**200** — `{ "success": true, "message": "...", "deleted_id": "ENQ-0001" }`

---

## Legacy endpoints (unchanged)

- `GET /api/enquiry/<enquiry_id>` — short customer fields only  
- `GET /api/enquiry-items/<enquiry_id>` — items dict only  
- `POST /update-enquiry/<enquiry_id>`, `DELETE /delete-enquiry/<enquiry_id>` — UI/AJAX style  

Prefer **`/api/enquiries/...`** for full CRUD in Postman.
