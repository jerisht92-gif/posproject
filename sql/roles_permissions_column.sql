-- Store RBAC permission matrix on each role as JSON (auto-applied on app startup via _ensure_roles_permissions_column).
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS permissions JSONB;
