# Post API seed and Postman checks

## Seed data

From `Source_Code/backend`, run:

```powershell
npm run db:migrate
npm run db:seed
```

The post seeder creates two local-only demo accounts and three posts:

| Account | Username | Password | Purpose |
| --- | --- | --- | --- |
| Owner | `owner` | `12345678` | Creates and deletes its own post |
| Viewer | `viewer` | `12345678` | Verifies that a non-owner receives `403` |

These are public test credentials, not production secrets. The seeder can be
run repeatedly. It refreshes only these reserved demo accounts and their posts.

## Run in Postman

1. Start the backend with `npm run dev`.
2. Import `Instagram_Posts_API.postman_collection.json` into Postman.
3. Open the imported collection and select **Run collection**.
4. Keep the request order and run all requests.
5. Confirm that every assertion passes.

Access tokens are created by the login requests and kept only as runtime
collection variables. The JSON file contains no access token, JWT secret,
database password, or `.env` value.

## Optional command-line run

With the backend running on port 8000:

```powershell
npx --yes newman run docs/postman/Instagram_Posts_API.postman_collection.json
```

Do not commit a raw Newman JSON export because request headers can contain the
runtime Bearer tokens. Record only the sanitized summary in
`POST_API_TEST_RESULTS.md` and attach a screenshot of the Postman Collection
Runner summary to the pull request description.

## Share the seed with the team

Commit and push the migration, models, seeders, and Postman files. After the
branch is merged, each teammate pulls `dev` and runs the migration and seed
commands above against their own local PostgreSQL database. There is no need to
share a database dump or local Docker volume.
