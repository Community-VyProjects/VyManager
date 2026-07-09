-- Drop the inert-phase DEFAULT on sites.orgId. The column stays NOT NULL, but
-- every insert path now supplies the organization explicitly (site creation,
-- the seed, and backup restore). Keeping the DEFAULT would let a future insert
-- that forgets orgId silently land a site in the default org once enforcement
-- is on; without it the same mistake fails closed.
ALTER TABLE "sites" ALTER COLUMN "orgId" DROP DEFAULT;
