-- Enforce one Document record per private storage object. This prevents two
-- athletes (or a replayed confirmation) from referencing the same sensitive
-- object, and makes duplicate confirmations fail safely.
CREATE UNIQUE INDEX "Document_privateStorageRef_key" ON "Document"("privateStorageRef");
