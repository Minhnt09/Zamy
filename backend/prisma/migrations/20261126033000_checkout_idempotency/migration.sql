ALTER TABLE "orders"
ADD COLUMN "idempotency_key" VARCHAR(128),
ADD COLUMN "request_hash" VARCHAR(64);

CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key"
ON "orders"("user_id", "idempotency_key");
