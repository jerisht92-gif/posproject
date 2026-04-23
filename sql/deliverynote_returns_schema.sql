-- Delivery Note Return (PostgreSQL)
-- Tables are created in schema "public" so they match pgAdmin / default search_path.
-- (App connections often use search_path=pos,public; unqualified names would land in "pos".)

CREATE TABLE IF NOT EXISTS public.deliverynote_returns (
    dnr_id VARCHAR(20) PRIMARY KEY,
    dnr_date DATE NOT NULL,
    invoice_return_ref_id VARCHAR(50),
    customer_ref_no VARCHAR(50),
    customer_id VARCHAR(50),
    customer_name TEXT,
    email TEXT,
    phone TEXT,
    contact_person TEXT,
    status VARCHAR(20) DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.deliverynote_return_items (
    id SERIAL PRIMARY KEY,
    dnr_id VARCHAR(20) NOT NULL REFERENCES public.deliverynote_returns(dnr_id) ON DELETE CASCADE,
    product_id VARCHAR(50),
    product_name TEXT,
    uom VARCHAR(20),
    invoiced_qty INT CHECK (invoiced_qty >= 0),
    returned_qty INT CHECK (returned_qty >= 0),
    serial_no TEXT,
    return_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.deliverynote_return_history (
    id SERIAL PRIMARY KEY,
    dnr_id VARCHAR(20) NOT NULL REFERENCES public.deliverynote_returns(dnr_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.deliverynote_return_comments (
    id SERIAL PRIMARY KEY,
    dnr_id VARCHAR(20) NOT NULL REFERENCES public.deliverynote_returns(dnr_id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.deliverynote_return_attachments (
    id SERIAL PRIMARY KEY,
    dnr_id VARCHAR(20) NOT NULL REFERENCES public.deliverynote_returns(dnr_id) ON DELETE CASCADE,
    file_name TEXT,
    file_path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dnr_items_dnr_id ON public.deliverynote_return_items(dnr_id);
CREATE INDEX IF NOT EXISTS idx_dnr_hist_dnr_id ON public.deliverynote_return_history(dnr_id);
CREATE INDEX IF NOT EXISTS idx_dnr_comments_dnr_id ON public.deliverynote_return_comments(dnr_id);
