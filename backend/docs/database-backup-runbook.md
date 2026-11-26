# PostgreSQL backup and recovery runbook

This runbook protects the Render Free PostgreSQL database with portable local
backup archives. It is a portfolio/demo operating target, not a managed backup
guarantee.

## Operating targets

- RPO target: 24 hours.
- RTO target: a few hours.
- Cadence: run a backup daily; weekly is the absolute minimum if it must be
  manual.
- Retention: `KEEP_BACKUPS=7` by default.

## Prerequisites

Install PostgreSQL client tools on Ubuntu before running these commands:

```bash
sudo apt update
sudo apt install postgresql-client
```

Use the Render **External Database URL** only in your shell environment. Never
put it in this repository, a script, shell history shared with others, or a
frontend environment variable.

## Backup

From `backend/`:

```bash
DATABASE_URL='postgresql://…' ./scripts/backup-production-db.sh
```

The script creates a custom-format archive in `backend/backups/`, verifies it
with `pg_restore --list`, and then applies retention. Backup archives can
contain user, address, order, and payment metadata, so treat them as sensitive
private files. They are ignored by Git and must not be uploaded to public
storage. Any future cloud storage must be private and encrypted.
The backup script sets the directory to mode `700` and archives to `600`.

To keep a different number of archives:

```bash
KEEP_BACKUPS=14 DATABASE_URL='postgresql://…' ./scripts/backup-production-db.sh
```

## Verify an archive

```bash
./scripts/verify-backup.sh ./backups/zamy-prod-YYYY-MM-DDTHHMMSSZ.dump
```

Verification checks that the archive is readable and includes `users`,
`orders`, `order_items`, `payments`, and `product_variants`. It does not restore
or print row contents.

## Restore drill

1. Create an empty temporary PostgreSQL database, for example
   `zamy_restore_test`. Do not use the production database.
2. Copy the temporary database URL.
3. Run:

   ```bash
   DATABASE_URL='postgresql://production-url' \
   BACKUP_FILE='./backups/zamy-prod-YYYY-MM-DDTHHMMSSZ.dump' \
   TARGET_DATABASE_URL='postgresql://temporary-url' \
   ./scripts/restore-production-db.sh
   ```

4. Review the printed row counts only; do not print customer rows.
5. Optionally run Prisma validation and read-only application checks against the
   temporary database.
6. Delete the temporary database after the drill.

The restore script rejects an exact `TARGET_DATABASE_URL` match with
`DATABASE_URL`, never drops a database, and does not use `--clean`.

## Emergency recovery

1. Check the PostgreSQL status and backend logs in Render. A `200` from
   `/health` means Express is responding. A `503` from `/ready` means the
   service's database query failed. If the existing database is available,
   verify the backend's `DATABASE_URL` and whether checkout migrations were
   applied.
2. If the existing database is unrecoverable, choose the most recent verified
   backup and record its timestamp. Changes made after that timestamp will
   need to be recovered separately. Restore into an empty replacement database
   using the drill above and preserve the original database.
3. Check the restored catalog and migration history. Apply any pending
   migrations with `npx prisma migrate deploy` from `backend/` against the
   replacement. The demo seed rewrites catalog fields and stock, so keep it
   for initializing a new demo catalog without a backup.
4. Set `DATABASE_URL` on the Render backend to the datastore's internal URL if
   both services are in the same account and region. Deploy the backend with
   the updated environment. For releases with schema changes, run
   `npm run db:deploy` against the target before starting the new backend.
   A Render pre-deploy command can do this, or include it before `npm start`
   when the service has the Prisma CLI installed and pre-deploy is unavailable.
5. Check that `/ready` returns `200` and `/products` returns a nonempty
   `data` array. Open the storefront and verify the catalog, a category page,
   and a product detail page load.
