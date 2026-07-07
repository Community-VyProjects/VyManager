-- The empty string is the "no org context" sentinel carried in the
-- app.org_id connection setting; an organization must never be able to
-- take it as a real id.
ALTER TABLE "organizations"
    ADD CONSTRAINT "organizations_id_not_empty" CHECK ("id" <> '');
