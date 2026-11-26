BEGIN;

LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;
SELECT setval(
    'products_id_seq',
    GREATEST(
        COALESCE((SELECT MAX(id)::bigint + 1 FROM products), 1),
        last_value + CASE WHEN is_called THEN 1 ELSE 0 END
    ),
    false
)
FROM products_id_seq;

COMMIT;
