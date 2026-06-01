-- Supabase Storage RLS for bucket `pos-billing-upload`
-- Run in Supabase SQL Editor after the bucket exists and is set to public (if needed).

DROP POLICY IF EXISTS "pos_billing_public_read_pos_billing_upload" ON storage.objects;
CREATE POLICY "pos_billing_public_read_pos_billing_upload"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'pos-billing-upload');

DROP POLICY IF EXISTS "pos_billing_insert_pos_billing_upload" ON storage.objects;
CREATE POLICY "pos_billing_insert_pos_billing_upload"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'pos-billing-upload');

DROP POLICY IF EXISTS "pos_billing_delete_pos_billing_upload" ON storage.objects;
CREATE POLICY "pos_billing_delete_pos_billing_upload"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'pos-billing-upload');
