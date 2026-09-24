# Post API test results

- Date: 2026-09-24
- Database: PostgreSQL 16 in local Docker
- Runner: Newman 6.2.2
- Collection: `Instagram_Posts_API.postman_collection.json`
- Result: **Passed**

## Summary

| Metric | Executed | Failed |
| --- | ---: | ---: |
| Iterations | 1 | 0 |
| Requests | 13 | 0 |
| Test scripts | 13 | 0 |
| Assertions | 13 | 0 |

Total run duration was 2.4 seconds. Average response time was 108 ms on the
local test machine.

## Verified scenarios

| Scenario | Expected status | Result |
| --- | ---: | --- |
| Owner login | 200 | Passed |
| Viewer login | 200 | Passed |
| Authenticated post creation | 201 | Passed |
| Post creation without token | 401 | Passed |
| Paginated feed | 200 | Passed |
| Feed limit above 50 | 400 | Passed |
| Existing post detail | 200 | Passed |
| Invalid post UUID | 400 | Passed |
| Delete without token | 401 | Passed |
| Delete by a non-owner | 403 | Passed |
| Post remains after non-owner deletion attempt | 200 | Passed |
| Delete by the owner | 200 | Passed |
| Detail after deletion | 404 | Passed |

## Reproduce

Start the backend, then run from `Source_Code/backend`:

```powershell
npx --yes newman run docs/postman/Instagram_Posts_API.postman_collection.json
```

This report contains no access token, JWT secret, database password, or `.env`
value. For the pull request, link this file and attach a screenshot of the
Postman Collection Runner summary showing all requests and assertions passed.
