# POS API Endpoints — Postman Guide

Base URL: `http://127.0.0.1:5000` (or your deployed URL)

**Auth:** All endpoints require an active session (login first via the web UI or POST `/login` with form data).  
For Postman: use cookies from a logged-in session, or ensure the session cookie is sent.

**JSON responses:** Add `Accept: application/json` header **or** `?format=json` query param for HTML routes.

---

## 1. Manage Users

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/manage-users` | No body |
| GET | `/api/users` | No body |
| GET | `/api/users/<index>` | No body |
| POST | `/api/users` | JSON (see below) |
| PUT | `/api/users/<index>` | JSON (see below) |
| DELETE | `/api/users/<index>` | No body |

### GET /manage-users | GET /api/users | GET /api/users/<index>

**Body:** None

**Query params (for /manage-users):** `?format=json` for JSON response

---

### POST /api/users (Create User)

**Headers:** `Content-Type: application/json`

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "country_code": "+91",
  "contact_number": "9876543210",
  "branch": "Main",
  "department": "Sales",
  "role": "User",
  "reporting_to": "Manager Name",
  "available_branches": "1",
  "employee_id": "EMP001"
}
```

---

### PUT /api/users/<index> (Update User)

**Headers:** `Content-Type: application/json`

```json
{
  "name": "John Doe",
  "email": "john.updated@example.com",
  "phone": "+919876543210",
  "role": "Admin",
  "department": "IT",
  "branch": "HQ"
}
```

---

### DELETE /api/users/<index>

**Body:** None

---

## 2. Department & Roles

### 2.1 Departments

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/department-roles` | No body |
| GET | `/api/departments` | No body |
| GET | `/api/departments/<dept_id>` | No body |
| POST | `/api/departments` | JSON (see below) |
| PUT | `/api/departments/<dept_id>` | JSON (see below) |
| DELETE | `/api/departments/<dept_id>` | No body |

#### GET /department-roles | GET /api/departments | GET /api/departments/<dept_id>

**Body:** None

**Query params (for /department-roles):** `?format=json` for JSON response

---

#### POST /api/departments (Create Department)

**Headers:** `Content-Type: application/json`

```json
{
  "code": "D001",
  "name": "Sales",
  "branch": "Main",
  "description": "Sales department"
}
```

---

#### PUT /api/departments/<dept_id> (Update Department)

**Headers:** `Content-Type: application/json`

```json
{
  "code": "D001",
  "name": "Sales & Marketing",
  "description": "Updated description"
}
```

---

#### DELETE /api/departments/<dept_id>

**Body:** None

---

### 2.2 Roles

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/roles` | No body |
| GET | `/api/roles/<role_index>` | No body |
| POST | `/api/roles` | JSON (see below) |
| PUT | `/api/roles/<role_index>` | JSON (see below) |
| DELETE | `/api/roles/<role_index>` | No body |

#### GET /api/roles | GET /api/roles/<role_index>

**Body:** None

---

#### POST /api/roles (Create Role)

**Headers:** `Content-Type: application/json`

```json
{
  "department": "Sales",
  "branch": "Main",
  "role": "Sales Rep",
  "description": "Sales representative role (max 50 chars)",
  "permissions": {
    "new_enquiry": {"view": true, "create": true, "edit": true, "delete": false},
    "quotation": {"view": true, "create": true, "edit": true, "delete": false},
    "sales": {"view": true, "create": false, "edit": false, "delete": false}
  }
}
```

---

#### PUT /api/roles/<role_index> (Update Role)

**Headers:** `Content-Type: application/json`

```json
{
  "role": "Senior Sales Rep",
  "description": "Updated description",
  "department": "Sales",
  "branch": "Main",
  "permissions": {
    "new_enquiry": {"view": true, "create": true, "edit": true, "delete": true}
  }
}
```

---

#### DELETE /api/roles/<role_index>

**Body:** None

---

## 3. Products

### 3.1 Products Master

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/products` | No body |
| GET | `/api/products` | No body |
| GET | `/api/products/<product_id>` | No body |
| POST | `/api/products` | JSON (see below) |
| PUT | `/api/products/<product_id>` | JSON (see below) |
| PATCH | `/api/products/<product_id>` | JSON (see below) |
| DELETE | `/api/products/<product_id>` | No body |

#### GET /products | GET /api/products | GET /api/products/<product_id>

**Body:** None

**Query params for GET /api/products:** `q`, `type`, `category`, `status`, `stock`, `page`, `page_size`, `format=json`

---

#### POST /api/products (Create Product)

**Headers:** `Content-Type: application/json`

```json
{
  "product_name": "Widget A",
  "type": "Physical",
  "category": "Electronics",
  "status": "Active",
  "stock_level": 100,
  "price": 29.99,
  "description": "Product description",
  "sub_category": "Gadgets",
  "unit_price": "29.99",
  "discount": "0",
  "tax_code": "GST 18%",
  "quantity": "1",
  "uom": "Piece",
  "reorder_level": "10",
  "warehouse": "Main Warehouse",
  "size": "Medium",
  "color": "Black",
  "weight": "500g",
  "specifications": "Spec details",
  "related_products": "P102, P103",
  "supplier": "Supplier A",
  "product_usage": "General use",
  "image": ""
}
```

---

#### PUT /api/products/<product_id> (Full Update)

**Headers:** `Content-Type: application/json`

```json
{
  "product_name": "Widget A Updated",
  "type": "Physical",
  "category": "Electronics",
  "status": "Active",
  "stock_level": 150,
  "price": 34.99,
  "description": "Updated description",
  "sub_category": "Gadgets",
  "tax_code": "GST 18%",
  "supplier": "Supplier B"
}
```

---

#### PATCH /api/products/<product_id> (Partial Update)

**Headers:** `Content-Type: application/json`

```json
{
  "product_name": "Widget A v2",
  "stock_level": 200,
  "price": 39.99
}
```

---

#### DELETE /api/products/<product_id>

**Body:** None

---

### 3.2 Product Categories

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/product-categories` | No body |
| POST | `/api/product-categories` | JSON (see below) |

#### GET /api/product-categories

**Body:** None

**Query params:** `?type=Electronics`

---

#### POST /api/product-categories

**Headers:** `Content-Type: application/json`

```json
{
  "name": "Headphones",
  "product_type": "Electronics"
}
```

---

### 3.3 Product Tax Codes

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/product-tax-codes` | No body |
| POST | `/api/product-tax-codes` | JSON (see below) |

#### GET /api/product-tax-codes

**Body:** None

---

#### POST /api/product-tax-codes

**Headers:** `Content-Type: application/json`

```json
{
  "code": "GST 18% (18%)",
  "description": "Standard GST rate",
  "percent": 18
}
```

---

### 3.4 Product UOMs

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/product-uoms` | No body |
| POST | `/api/product-uoms` | JSON (see below) |

#### GET /api/product-uoms

**Body:** None

---

#### POST /api/product-uoms

**Headers:** `Content-Type: application/json`

```json
{
  "name": "Piece",
  "items": 1,
  "description": "Single unit"
}
```

---

### 3.5 Product Warehouses

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/product-warehouses` | No body |
| POST | `/api/product-warehouses` | JSON (see below) |

#### GET /api/product-warehouses

**Body:** None

---

#### POST /api/product-warehouses

**Headers:** `Content-Type: application/json`

```json
{
  "name": "Main Warehouse",
  "location": "Mumbai",
  "manager": "John Doe",
  "contact": "+919876543210",
  "notes": "Primary storage"
}
```

---

### 3.6 Product Sizes

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/product-sizes` | No body |
| POST | `/api/product-sizes` | JSON (see below) |

#### GET /api/product-sizes

**Body:** None

---

#### POST /api/product-sizes

**Headers:** `Content-Type: application/json`

```json
{
  "name": "Large"
}
```

---

### 3.7 Product Colors

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/product-colors` | No body |
| POST | `/api/product-colors` | JSON (see below) |

#### GET /api/product-colors

**Body:** None

---

#### POST /api/product-colors

**Headers:** `Content-Type: application/json`

```json
{
  "name": "Red"
}
```

---

### 3.8 Product Suppliers

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/product-suppliers` | No body |
| POST | `/api/product-suppliers` | JSON (see below) |

#### GET /api/product-suppliers

**Body:** None

---

#### POST /api/product-suppliers

**Headers:** `Content-Type: application/json`

```json
{
  "name": "Acme Supplies",
  "contact": "Jane Smith",
  "phone": "+919876543210",
  "email": "supplier@acme.com",
  "address": "123 Industrial Area"
}
```

---

## 4. Customers

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/customer` | No body |
| GET | `/api/customer` | No body |
| GET | `/api/customer/<customer_id>` | No body |
| POST | `/api/customers` | JSON (see below) |
| PUT | `/api/customer/<customer_id>` | JSON (see below) |
| DELETE | `/api/customer/<customer_id>` | No body |

### GET /customer | GET /api/customer | GET /api/customer/<customer_id>

**Body:** None

**Query params for GET /api/customer:** `q`, `status`, `type`, `sales_rep`, `page`, `page_size`

**Query params for /customer:** `?format=json` for JSON response

---

### POST /api/customers (Create Customer)

**Headers:** `Content-Type: application/json`

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "customerType": "Retail",
  "company": "Acme Inc",
  "customerStatus": "Active",
  "email": "john@acme.com",
  "creditLimit": "50000",
  "city": "Mumbai",
  "salesRep": "Rep Name",
  "salesRepCustom": "",
  "phoneNumber": "+919876543210",
  "gstNumber": "27AABCU9603R1ZM",
  "address": "123 Main St",
  "street": "Main Street",
  "state": "Maharashtra",
  "zipCode": "400001",
  "country": "India",
  "billingAddress": "123 Main St",
  "shippingAddress": "123 Main St",
  "paymentTerms": "Net 30",
  "paymentTermsCustom": "",
  "creditTerm": "30 days",
  "creditTermCustom": "",
  "availableLimit": "50000"
}
```

---

### PUT /api/customer/<customer_id> (Update Customer)

**Headers:** `Content-Type: application/json`

```json
{
  "name": "John Doe",
  "company": "Acme Inc",
  "customer_type": "Retail",
  "email": "john@acme.com",
  "status": "Active",
  "credit_limit": "75000",
  "city": "Mumbai"
}
```

---

### DELETE /api/customer/<customer_id>

**Body:** None

---

## Postman Quick Tips

1. **JSON responses:** Add header `Accept: application/json` or query `?format=json`.
2. **Session:** Login via browser first, then copy the `session` cookie into Postman (or use Postman's cookie jar).
3. **Base URL variable:** Set `{{baseUrl}}` = `http://127.0.0.1:5000` in Postman environment.
