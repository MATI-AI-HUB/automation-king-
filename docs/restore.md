# Restore from encrypted backup

Do not run restore against production without an explicit owner confirmation.

Secrets used by `.github/workflows/backup-automation.yml` (names only):

- `SUPABASE_DB_URL`
- `BACKUP_AGE_RECIPIENT` (preferred) or `BACKUP_OPENSSL_PASSPHRASE`
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

## Decrypt

Age (preferred):

```bash
age -d -i "$BACKUP_AGE_IDENTITY_FILE" -o backup.dump backup.dump.age
```

OpenSSL fallback:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in backup.dump.enc \
  -out backup.dump \
  -pass env:BACKUP_OPENSSL_PASSPHRASE
```

## Verify

```bash
test -s backup.dump
pg_restore -l backup.dump | head
```

Client major version must be greater than or equal to the dump server version.

## Restore (staging only until confirmed)

```bash
pg_restore \
  --no-owner \
  --dbname="$STAGING_DB_URL" \
  backup.dump
```

The dump includes schema and data for `public`, `auth`, and `storage`, plus grants and policies (ACL is no longer stripped). Do not print connection URLs.
