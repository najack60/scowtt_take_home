# Movie Notes

A Next.js app for collecting your favorite movie and discovering AI-generated trivia about it. Sign in with Google, add a movie, and discover facts on the dashboard.

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

- New Google users choose a movie; the server trims the title and requires 1–100 characters. Returning users go straight to the dashboard, where they can edit the movie inline. Saving updates the display optimistically and rolls it back if the request fails.
- React Query and browser storage cache the latest fact per user and movie for 30 seconds, including across reloads. A request after expiry generates a new fact; **Get a new fact** bypasses the cache. A successful movie change invalidates the old fact and requests a new one. Signing out clears the local fact and invalidates the database session.
- The server sends the current movie title to OpenAI and saves a successful response in PostgreSQL under the signed-in user. Generated text can be inaccurate. If generation or saving fails, the dashboard remains available and offers a retry.

## Architecture overview

- **Authentication:** Auth.js handles Google sign-in with a Prisma adapter and database-backed sessions. Server pages, actions, and API routes resolve the signed-in user from the session; client-supplied user IDs are never used to choose whose data to read or update. Signing out ends the session and clears the local fact cache.
- **User flow:** Visitors sign in, then first-time users choose a movie during onboarding. Returning users go to the dashboard, where they can edit their movie. The dashboard loads a matching fact or requests a new one; movie updates are optimistic and roll back if saving fails.
- **Database:** PostgreSQL is accessed through Prisma. `User` stores the profile and favorite movie; `Account` and `Session` support Auth.js; `Fact` stores generated trivia with its movie, owner, and timestamp. Facts are associated with their user and removed when that user is deleted.
- **APIs:** Authenticated routes expose the profile, update the favorite movie, fetch the latest fact for that movie, and generate a new fact. Mutations validate the same-origin request, endpoints derive ownership from the session, and private responses disable HTTP caching. See the [API](#api) section for endpoint contracts.
- **Caching:** React Query keeps client-side query data, while browser storage preserves the latest fact for that user across reloads. A fact is reused only when it matches the current movie and is younger than 30 seconds. Explicit refreshes and movie changes bypass or invalidate stale facts; cache keys and query keys are scoped to the user.
- **Tests:** Vitest covers validation, cache expiry and invalidation, page routing, API contracts, and dashboard interactions with mocked auth and external services. An optional PostgreSQL integration test verifies onboarding and fact persistence against a dedicated test database.

## API

All endpoints use the current authenticated session, return `Cache-Control: no-store`, and respond to failures with `{ "error": "message" }`. A missing session returns 401; forbidden requests return 403; invalid input returns 400; server failures return 500. Mutations require a same-origin `Origin` header.

| Endpoint | Contract |
| --- | --- |
| `GET /api/me` | Returns `{ id, name, email, image, favoriteMovie }`; profile fields and movie may be null. |
| `PUT /api/me/movie` | Accepts `{ "movie": "title" }` and returns the updated profile. Titles are trimmed and must contain 1–100 characters. |
| `GET /api/fact` | Returns `{ "fact": { "movie", "content", "createdAt" } }` for the latest saved fact matching the user's current movie, or `{ "fact": null }`. |
| `POST /api/facts` | Generates and saves a new fact for the current user's movie and returns `{ "fact": { "movie", "content", "createdAt" } }`. |

Fact timestamps are ISO 8601 strings. Fact endpoints return 403 until onboarding is complete. Users cannot select another user or movie through the fact API. API keys and provider credentials remain server-side.

The dashboard sends `X-Expected-User-Id` with movie and fact requests to detect a session switched in another tab; a mismatch returns 409. The header is only a precondition and never selects the account to access.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Tests mock Google authentication and OpenAI. The PostgreSQL integration test is skipped unless `TEST_DATABASE_URL` is set. To run it, apply the migrations to a **dedicated test database** and set both `DATABASE_URL` and `TEST_DATABASE_URL` to that database's URL before running `npm test`. The test creates and removes its own users and facts.

Real Google sign-in and OpenAI generation require valid external credentials and network access. The production build requires development dependencies because it runs Prisma client generation.

## Which Variant I Chose and Why?

I decided to choose **Variant B**. This is because, generally speaking, I am more comfortable working with basic client side caching since that what my previous posistion required me to work with the most. I am comfortable working with backends as well, but for this project I thought it best to stick to what I'm more familiar with instead of using a lot of time to research the more backend heavy optimizations.

## Key Tradeoffs I made

**Client Side Caching Strategy**: 
I looked into the three suggested caching strategies: React state, SWR, and React Query. I ended up choosing React Query in the end for a few reasons. One, because unlike React state, it can handle caching across page refreshes, and the second main reason is because it has a lot nicer support for cache windows and optimistic updates that SWR. The tradeoff is that it isn't as lightweight as SWR, so it increases the bundle size, and the learning curve is a bit steeper. However, since the caching strategy was relatively simple for this web app, I decided that it would be worth it to get access to the convinient out-of-the-box caching features.

**Where To Store Cached Fact Data**: 
I decided to store the fact data in the browser memory and have that be flushed every 30 seconds to survive reloads. The tradeoff is that is was a bit more code to have it done that way, but I wanted the fact too survive reloads so I thought it was worth it.

**Auth strategy**: 
I decided to use Auth.js with a Prisma Adapter instead of a client side cookie strategy. The tradeoff is that most of the complex logic is handled by Auth.js and Prisma. However, there is a bit of database overhead that could lead to a high level of read/write volume if there were a lot of users signing in and out, and making new accounts. This could potentially slow down the database, but for this small use case, I thought it was a worthwhile tradeoff. 

## What I would improve with 2 more hours
1. I would like to add a list of facts utilizing the previous facts that have been stored for each user.
2. I would like to make the LLM see the fact history so that new facts are completely new and different from the previous ones.
3. I would like to format the text in the fact box better.
4. I would like to add a better font family for the whole website.
5. I would like to add more styling and design to the website.
6. I would like to allow the user to save mulitple moves. 
7. I would like to display a picture of the movie's cover with the Title.
8. I would like to add a synosis of the movie with the title.

## Note on AI usage
I don't have all Next.js/React.js syntax memorized, so I used GitHub Copilot to help with the implementation details. I would provide it the ideas and the direction that I wanted it to take. I would also start off by discussing the architechture with it in planning mode before any implementations took place. Then, once I thought the plan looked good, I had it follow the implementation. Then, I reviewed the code and followed the flows to make sure they made since. I also tested it manually and made it create tests to verify that everything worked.