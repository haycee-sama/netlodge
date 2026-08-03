-- drizzle/0002_add_booking_ref_sequence.sql
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Re-create the function defensively in case its definition also drifted —
-- this is idempotent and matches what the existing default() call expects.
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS varchar(30)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'NL-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('booking_ref_seq')::text, 6, '0');
END;
$$;