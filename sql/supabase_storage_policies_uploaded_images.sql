-- Supabase Storage RLS for bucket `uploaded-images`
-- Run in Supabase SQL Editor (or migrate) after the bucket exists.
-- Flask uploads use the S3-compatible API with project S3 keys; these policies still apply
-- to rows in storage.objects for REST flows and align with public bucket reads.

-- Optional: remove old test policy if the name collides
DROP POLICY IF EXISTS "pos_billing_upload 1jf57yd_0" ON storage.objects;

-- Anyone can read objects in this bucket (required for public URLs / browser display)
DROP POLICY IF EXISTS "pos_billing_public_read_uploaded_images" ON storage.objects;
CREATE POLICY "pos_billing_public_read_uploaded_images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'uploaded-images');

-- Inserts into this bucket (REST uploads; S3 path also creates rows here)
DROP POLICY IF EXISTS "pos_billing_insert_uploaded_images" ON storage.objects;
CREATE POLICY "pos_billing_insert_uploaded_images"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'uploaded-images');

-- Allow deletes when your app removes attachments (optional)
DROP POLICY IF EXISTS "pos_billing_delete_uploaded_images" ON storage.objects;
CREATE POLICY "pos_billing_delete_uploaded_images"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'uploaded-images');

-- Optional: allow authenticated users to update metadata (usually not needed)
-- DROP POLICY IF EXISTS "pos_billing_update_uploaded_images" ON storage.objects;
-- CREATE POLICY "pos_billing_update_uploaded_images"
--   ON storage.objects FOR UPDATE TO authenticated
--   USING (bucket_id = 'uploaded-images')
--   WITH CHECK (bucket_id = 'uploaded-images');
