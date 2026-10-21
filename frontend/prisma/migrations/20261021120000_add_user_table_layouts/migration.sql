-- Per-user table column layouts (visibility and order). One row per account,
-- not per router: hiding a column should follow the person onto the next
-- device. Unlike firewall_separators, this is not shared with other users.
-- No foreign key, matching dashboard_layouts: a merge restore can skip a
-- user row on email collision, and a child FK would fail that restore.

CREATE TABLE IF NOT EXISTS "user_table_layouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layouts" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_table_layouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_table_layouts_userId_key" ON "user_table_layouts"("userId");
