# Movie Notes

A Next.js app for collecting your favorite movie and discovering AI-generated trivia about it. Sign in with Google, add a movie, and see a new fact on each dashboard visit.

## Requirements

- Node.js 20.19 or newer and npm
- PostgreSQL, or Docker with Compose
- A Google OAuth web client and an OpenAI API key

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env`. The example database URL matches the included Compose service; use your own `DATABASE_URL` if you already have PostgreSQL. Set:
   - `AUTH_URL` to the app's public origin (locally `http://localhost:3000`).
   - `AUTH_SECRET` to a random secret, for example the output of `openssl rand -base64 32`.
   - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to your Google OAuth client credentials.
   - `OPENAI_API_KEY` to your OpenAI API key. `OPENAI_MODEL` defaults to `gpt-4o-mini` if omitted.

   Keep `.env` private. In production, set environment variables through your hosting provider, use the deployed HTTPS origin for `AUTH_URL`, and only use a trusted host/proxy.

3. In Google Cloud, configure the OAuth consent screen and create a **Web application** OAuth client. Add `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI. Add test users if the consent screen is in testing mode. For deployment, register the corresponding HTTPS origin and callback URI.

4. Start PostgreSQL if using the included service, then apply the committed migration:

   ```sh
   docker compose up -d --wait
   npx prisma migrate deploy
   ```

   Skip the Compose command when using an existing PostgreSQL server. The Compose database is for local development only and binds to `127.0.0.1:5433`.

5. Start the app:

   ```sh
   npm run dev
   ```

   Open `http://localhost:3000`. To stop the local database without deleting its data, run `docker compose down`.

## Behavior

- New Google users choose a movie once; the server trims the title and requires 1–100 characters. Returning users go straight to the dashboard. Movie editing is not included.
- Each dashboard visit requests a new fact. The server sends the movie title to OpenAI and saves a successful response in PostgreSQL under the signed-in user. Generated text can be inaccurate. If generation or saving fails, the dashboard remains available and offers a retry.
- Facts are retained in the database, but the app displays only the newly generated fact. Signing out invalidates the database session.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Tests mock Google authentication and OpenAI. The PostgreSQL integration test is skipped unless `TEST_DATABASE_URL` is set. To run it, apply the migrations to a **dedicated test database** and set both `DATABASE_URL` and `TEST_DATABASE_URL` to that database's URL before running `npm test`. The test creates and removes its own users and facts.

Real Google sign-in and OpenAI generation require valid external credentials and network access. The production build requires development dependencies because it runs Prisma client generation.
