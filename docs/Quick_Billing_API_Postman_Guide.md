# Quick Billing API – Postman Testing Guide

**To use as a Word document:** Open this file in Microsoft Word (File → Open → select this .md file), then use **Save As** and choose **Word Document (.docx)**.

---

**Base URL:** `http://127.0.0.1:5000` (or your server URL)

**Authentication:** All endpoints require a logged-in session. Log in via the app in the browser first, then use the same session (cookies) in Postman, or use Postman’s “Send cookies with requests” so the session cookie is sent.

---

## 1. GET – List all bills

**Request**
- **Method:** GET  
- **URL:** `http://127.0.0.1:5000/api/quick-billing`  
- **Query parameters (optional):**

| Parameter   | Description                    | Example   |
|------------|--------------------------------|-----------|
| `q`        | Search in id, user, created_at | `q=1`     |
| `page`     | Page number (default: 1)      | `page=1`  |
| `page_size`| Items per page (default: 10)  | `page_size=5` |
| `user`     | Filter by user email          | `user=user@example.com` |
| `date_from`| Filter bills from this date   | `date_from=2025-01-01` |
| `date_to`  | Filter bills until this date | `date_to=2025-12-31` |

**Example URL with params:**  
`http://127.0.0.1:5000/api/quick-billing?page=1&page_size=10`

**Sample response (200 OK):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "created_at": "2025-01-15T10:30:00",
        "user": "user@example.com",
        "items": [
          {
            "product_code": "P135",
            "product_name": "Clinic Plus Shampoo 180ml",
            "qty": 1,
            "price": 135,
            "total": 149.74
          }
        ],
        "totals": {
          "invoice_total": 149.74
        },
        "payment": {
          "mode": "Cash"
        }
      }
    ],
    "page": 1,
    "total_pages": 1,
    "total_items": 1
  }
}
```

---

## 2. GET – Get single bill by ID

**Request**
- **Method:** GET  
- **URL:** `http://127.0.0.1:5000/api/quick-billing/1`  
  (Replace `1` with the bill `id`.)

**Sample response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2025-01-15T10:30:00",
    "user": "user@example.com",
    "items": [
      {
        "product_code": "P135",
        "product_name": "Clinic Plus Shampoo 180ml",
        "qty": 1,
        "price": 135,
        "discount": 6,
        "taxable_value": 126.9,
        "cgst": 11.42,
        "sgst": 11.42,
        "total": 149.74
      }
    ],
    "totals": {
      "taxable_amount": 126.9,
      "total_tax": 22.84,
      "total_amount": 149.74,
      "round_off": 0.26,
      "invoice_total": 149.74
    },
    "payment": {
      "mode": "Cash"
    }
  }
}
```

**Sample response – not found (404):**
```json
{
  "success": false,
  "message": "Bill not found"
}
```

---

## 3. POST – Create a new bill

**Request**
- **Method:** POST  
- **URL:** `http://127.0.0.1:5000/api/quick-billing`  
- **Headers:**  
  `Content-Type: application/json`  
- **Body (raw JSON):**

**Minimal sample (required fields):**
```json
{
  "items": [
    {
      "product_code": "P135",
      "product_name": "Clinic Plus Shampoo 180ml",
      "qty": 1,
      "price": 135,
      "total": 149.74
    }
  ],
  "totals": {
    "invoice_total": 149.74
  },
  "payment": {
    "mode": "Cash"
  }
}
```

**Extended sample (with tax/discount fields):**
```json
{
  "items": [
    {
      "product_code": "P135",
      "product_name": "Clinic Plus Shampoo 180ml",
      "qty": 2,
      "price": 135,
      "discount": 6,
      "taxable_value": 253.8,
      "cgst": 22.84,
      "sgst": 22.84,
      "total": 299.48
    },
    {
      "product_code": "P134",
      "product_name": "Sunflower Cooking Oil",
      "qty": 1,
      "price": 200,
      "discount": 0,
      "taxable_value": 200,
      "cgst": 18,
      "sgst": 18,
      "total": 236
    }
  ],
  "totals": {
    "taxable_amount": 453.8,
    "total_tax": 60.84,
    "total_amount": 535.48,
    "round_off": -0.48,
    "invoice_total": 535
  },
  "payment": {
    "mode": "UPI"
  }
}
```

**Sample response (201 Created):**
```json
{
  "success": true,
  "message": "Bill created successfully",
  "data": {
    "id": 2,
    "created_at": "2025-01-15T11:00:00",
    "user": "user@example.com",
    "items": [
      {
        "product_code": "P135",
        "product_name": "Clinic Plus Shampoo 180ml",
        "qty": 1,
        "price": 135,
        "total": 149.74
      }
    ],
    "totals": {
      "invoice_total": 149.74
    },
    "payment": {
      "mode": "Cash"
    }
  }
}
```

**Sample response – validation error (400):**
```json
{
  "success": false,
  "message": "At least one item is required"
}
```

---

## 4. PUT – Update an existing bill

**Request**
- **Method:** PUT  
- **URL:** `http://127.0.0.1:5000/api/quick-billing/1`  
  (Replace `1` with the bill `id`.)  
- **Headers:**  
  `Content-Type: application/json`  
- **Body (raw JSON):** You can send only the fields you want to update (`items`, `totals`, `payment`). Omitted keys are left unchanged.

**Sample – update payment only:**
```json
{
  "payment": {
    "mode": "Card"
  }
}
```

**Sample – update items and totals:**
```json
{
  "items": [
    {
      "product_code": "P135",
      "product_name": "Clinic Plus Shampoo 180ml",
      "qty": 3,
      "price": 135,
      "total": 449.22
    }
  ],
  "totals": {
    "invoice_total": 449.22
  }
}
```

**Sample response (200 OK):**
```json
{
  "success": true,
  "message": "Bill updated",
  "data": {
    "id": 1,
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T11:15:00",
    "user": "user@example.com",
    "items": [
      {
        "product_code": "P135",
        "product_name": "Clinic Plus Shampoo 180ml",
        "qty": 3,
        "price": 135,
        "total": 449.22
      }
    ],
    "totals": {
      "invoice_total": 449.22
    },
    "payment": {
      "mode": "Card"
    }
  }
}
```

**Sample response – not found (404):**
```json
{
  "success": false,
  "message": "Bill not found"
}
```

---

## 5. DELETE – Delete a bill

**Request**
- **Method:** DELETE  
- **URL:** `http://127.0.0.1:5000/api/quick-billing/1`  
  (Replace `1` with the bill `id`.)  
- **Body:** None required.

**Sample response (200 OK):**
```json
{
  "success": true,
  "message": "Bill deleted successfully"
}
```

**Sample response – not found (404):**
```json
{
  "success": false,
  "message": "Bill not found"
}
```

---

## 6. GET – Get next bill ID

**Request**
- **Method:** GET  
- **URL:** `http://127.0.0.1:5000/api/quick-billing/new-id`  

**Sample response (200 OK):**
```json
{
  "billId": 3
}
```

---

## Postman setup tips

1. **Session:** Log in at `http://127.0.0.1:5000/login` in the same browser you use for Postman (or enable “Cookies” in Postman so the session cookie is sent).
2. **Environment:** Create a variable `base_url` = `http://127.0.0.1:5000` and use `{{base_url}}/api/quick-billing` in requests.
3. **Collection:** Add one request per endpoint above; use the sample JSON in the “Body” tab for POST and PUT.
4. **401:** If you get `401 Unauthorized` or “Session expired”, log in again in the app and retry.

---

## Quick reference – endpoints summary

| Method | Endpoint                          | Description        |
|--------|------------------------------------|--------------------|
| GET    | /api/quick-billing                | List bills         |
| GET    | /api/quick-billing/{id}           | Get one bill       |
| POST   | /api/quick-billing                | Create bill        |
| PUT    | /api/quick-billing/{id}           | Update bill        |
| DELETE | /api/quick-billing/{id}           | Delete bill        |
| GET    | /api/quick-billing/new-id         | Get next bill ID   |

All endpoints require an active login session (cookie).
