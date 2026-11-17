# Auth API

Base URL local:

```text
http://localhost:8000/v1/api
```

Refresh token được lưu trong HTTP-only cookie có tên `jwt`. Access token trả về trong JSON và được gửi ở header:

```text
Authorization: Bearer <accessToken>
```

## Register

`POST /auth/register`

`/auth/sign-up` là alias tương thích với frontend hiện tại.

Request body:

```json
{
  "email": "user@example.com",
  "fullName": "Demo User",
  "username": "demo_user",
  "password": "Demo1234"
}
```

Success `201`:

```json
{
  "status": 201,
  "message": "Registered successfully",
  "data": {
    "_id": "uuid",
    "username": "demo_user",
    "email": "user@example.com",
    "fullName": "Demo User",
    "role": { "id": "uuid", "name": "user" }
  }
}
```

Duplicate email or username returns `409` with `message` equal to `email` or `username`.

## Login

`POST /auth/login`

Request body:

```json
{
  "username": "demo_user",
  "password": "Demo1234"
}
```

Success `200`:

```json
{
  "userInfo": {
    "_id": "uuid",
    "username": "demo_user",
    "email": "user@example.com",
    "fullName": "Demo User",
    "role": { "id": "uuid", "name": "user" }
  },
  "accessToken": "<jwt>"
}
```

Wrong username or password returns `401` with `message` equal to `username` or `password`.

## Current user

`GET /auth/me`

Requires the Bearer access token. Success `200` returns:

```json
{
  "userInfo": { "_id": "uuid", "username": "demo_user" }
}
```

## Refresh access token

`GET /auth/refresh-access-token`

Requires the `jwt` cookie. Success `200` returns `newAccessToken`. The compatibility key `refreshToken` is also returned because the current frontend reads that key while refreshing.

## Logout

`POST /auth/logout`

Requires the Bearer access token. The server clears the stored refresh token and expires the `jwt` cookie.

## Error conventions

- `400`: request body validation failed.
- `401`: authentication is missing or credentials are invalid.
- `403`: access or refresh token is invalid/expired.
- `404`: requested user does not exist.
- `409`: email or username already exists.
- `501`: Facebook login is not configured in the PostgreSQL auth flow yet.
