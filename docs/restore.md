# Database restore

Do not run backups or restores until the owner confirms secrets exist.

## Artifacts

Weekly GitHub Action `.github/workflows/backup-automation.yml` writes an encrypted custom-format dump:

- `backup.dump.age` when `BACKUP_AGE_RECIPIENT` is set
- `backup.dump.enc` when `BACKUP_OPENSSL_PASSPHRASE` is set (openssl aes-256-cbc -pbkdf2)

The dump includes schema and data for `public`, `auth`, and `storage` (grants/policies included; `--no-acl` removed). Upload target is R2. GitHub artifact retention is 7 days.

Never print `SUPABASE_DB_URL` or the R2 endpoint. Workflows use `::add-mask::`.

## Decrypt

```
# age
age -d -i backup-age.key -o backup.dump backup.dump.age

# openssl fallback
openssl enc -d -aes-256-cbc -pbkdf2 -in backup.dump.enc -out backup.dump -pass env:BACKUP_OPENSSL_PASSPHRASE
```

## Verify before restore

```
test -s backup.dump
pg_restore -l backup.dump
```

Client major version must be >= server major version (`pg_dump --version` vs `SHOW server_version`).

## Restore (staging only unless owner confirms production)

```
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --dbname="$STAGING_DB_URL" \
  backup.dump
```

Auth schema restore can rewrite `auth.users`. Do this only on staging or a disposable clone.

## Rollback of this workflow change

Revert `.github/workflows/backup-automation.yml` to the previous `--schema=public --no-acl` dump if encryption secrets are not yet present.
