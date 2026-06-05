-- Optional DB enforcement: unique company contact fields (run after cleaning duplicates).

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_information_gstin
  ON company_information (UPPER(TRIM(gstin)))
  WHERE TRIM(COALESCE(gstin, '')) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_information_registration_no
  ON company_information (UPPER(TRIM(registration_no)))
  WHERE TRIM(COALESCE(registration_no, '')) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_information_email
  ON company_information (LOWER(TRIM(email)))
  WHERE TRIM(COALESCE(email, '')) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_information_phone
  ON company_information (REGEXP_REPLACE(COALESCE(phone_number, ''), '[^0-9]', '', 'g'))
  WHERE TRIM(COALESCE(phone_number, '')) <> '';
