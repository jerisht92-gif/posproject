# Sample JSON for API Testing — All Edit Modules

Use these samples in Postman, curl, or any REST client.  
**Requirement:** Log in first (session cookie). Send `Content-Type: application/json` for all requests.

---

## 1. Edit Product

**Endpoint:** `PUT /api/products/<product_id>`  
**Example URL:** `http://127.0.0.1:5000/api/products/PRD-001`

**Required:** `product_name`  
**Validation:** `stock_level` ≥ 0 (integer), `price` > 0 (number)

### Sample JSON (full update)

```json
{
  "product_name": "Wireless Mouse Pro",
  "type": "Physical",
  "category": "Electronics",
  "status": "Active",
  "stock_level": 50,
  "price": 29.99,
  "description": "Ergonomic wireless mouse",
  "sub_category": "Peripherals",
  "tax_code": "GST18",
  "supplier": "Tech Supplies Ltd"
}
```

### Minimal (required + one optional)

```json
{
  "product_name": "Updated Product Name",
  "stock_level": 10,
  "price": 99.50
}
```

---

## 2. Edit Customer

**Endpoint:** `PUT /api/customer/<customer_id>`  
**Example URL:** `http://127.0.0.1:5000/api/customer/C101`

**Required:** `name`  
**Note:** Email must be unique across other customers (duplicate returns 409).

### Sample JSON

```json
{
  "name": "John Doe",
  "company": "ABC Enterprises",
  "customer_type": "Individual",
  "email": "john.doe@example.com",
  "credit_limit": "50000",
  "status": "Active",
  "city": "Chennai"
}
```

### Minimal

```json
{
  "name": "Updated Customer Name",
  "email": "customer@example.com"
}
```

---

## 3. Edit User (UI endpoint)

**Endpoint:** `POST /update-user`  
**Example URL:** `http://127.0.0.1:5000/update-user`

**Required:** `index` (0-based array index of the user in the list), `name`, `email`, `phone`, `role`

### Sample JSON

```json
{
  "index": 0,
  "name": "Jane Smith",
  "email": "jane.smith@company.com",
  "phone": "+919876543210",
  "role": "Admin"
}
```

**Note:** Get the user list from `GET /api/users` and use the array index (0, 1, 2, …) as `index`. Only Super Admin / Admin can edit.

---

## 4. Edit User (REST API)

**Endpoint:** `PUT /api/users/<user_index>`  
**Example URL:** `http://127.0.0.1:5000/api/users/0`

**Optional fields:** Send only the fields you want to update (partial update).

### Sample JSON (partial)

```json
{
  "name": "Jane Smith",
  "email": "jane.smith@company.com",
  "phone": "+919876543210",
  "role": "Admin",
  "department": "Sales",
  "branch": "HQ"
}
```

### Full update example

```json
{
  "name": "Updated User Name",
  "email": "updated@example.com",
  "phone": "+911234567890",
  "role": "Manager",
  "department": "Operations",
  "branch": "Branch 1"
}
```

**Note:** `user_index` is the 0-based index from `GET /api/users`. Only Super Admin / Admin can edit.

---

## 5. Edit Department (UI endpoint)

**Endpoint:** `POST /department-roles/edit`  
**Example URL:** `http://127.0.0.1:5000/department-roles/edit`

**Required:** `id` (department ID from list), `code`, `name`  
**Optional:** `description`

### Sample JSON

```json
{
  "id": "1",
  "code": "HR",
  "name": "Human Resources",
  "description": "HR and recruitment department"
}
```

### Minimal

```json
{
  "id": 1,
  "code": "IT",
  "name": "Information Technology",
  "description": ""
}
```

**Note:** `id` can be number or string (e.g. `1` or `"1"`). Code and name must be unique (excluding current department).

---

## 6. Edit Department (REST API)

**Endpoint:** `PUT /api/departments/<dept_id>`  
**Example URL:** `http://127.0.0.1:5000/api/departments/1`

### Sample JSON

```json
{
  "code": "FIN",
  "name": "Finance",
  "description": "Finance and accounts department"
}
```

**Note:** Only Super Admin or Admin can edit. Duplicate code/name returns 409.

---

## Quick reference

| Module     | Method | Endpoint                              | Required body fields        |
|-----------|--------|----------------------------------------|-----------------------------|
| Product   | PUT    | `/api/products/<product_id>`          | `product_name`              |
| Customer  | PUT    | `/api/customer/<customer_id>`        | `name`                      |
| User (UI) | POST   | `/update-user`                        | `index`, `name`, `email`, `phone`, `role` |
| User (API)| PUT    | `/api/users/<user_index>`             | (any subset)                |
| Dept (UI) | POST   | `/department-roles/edit`              | `id`, `code`, `name`        |
| Dept (API)| PUT    | `/api/departments/<dept_id>`          | `code`, `name` (description optional) |

---

## Authentication

1. **Login:** `POST /login` with body e.g. `{"email":"your@email.com","password":"yourpassword","rememberMe":false}`  
2. Use the session cookie returned by the server for all edit requests (same-origin or include credentials in your client).

## Example curl (after login, with session cookie)

```bash
# Edit Product
curl -X PUT "http://127.0.0.1:5000/api/products/PRD-001" \
  -H "Content-Type: application/json" \
  -b "session=<your-session-cookie>" \
  -d '{"product_name":"Updated Name","stock_level":20,"price":49.99}'

# Edit Customer
curl -X PUT "http://127.0.0.1:5000/api/customer/C101" \
  -H "Content-Type: application/json" \
  -b "session=<your-session-cookie>" \
  -d '{"name":"New Name","email":"new@example.com","city":"Mumbai"}'

# Edit User (POST)
curl -X POST "http://127.0.0.1:5000/update-user" \
  -H "Content-Type: application/json" \
  -b "session=<your-session-cookie>" \
  -d '{"index":0,"name":"User One","email":"user1@example.com","phone":"+919999999999","role":"Admin"}'

# Edit Department (POST)
curl -X POST "http://127.0.0.1:5000/department-roles/edit" \
  -H "Content-Type: application/json" \
  -b "session=<your-session-cookie>" \
  -d '{"id":"1","code":"HR","name":"Human Resources","description":"HR dept"}'
```
