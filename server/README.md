# Backend structure

This server follows a layered structure: routes → controllers → services → repositories.

- `app.ts`: configures Express, mounts routers, and registers error middleware.
- `index.ts`: starts the local/Node server and serves the built frontend.
- `../api/index.ts`: Vercel Function entry point using the same Express app.
- `routes/`: HTTP methods and URL paths mapped to named controllers.
- `controllers/`: validate HTTP inputs, read cookies, call services, and send responses.
- `services/`: application operations and response mapping; Supabase Auth remains the identity provider.
- `repositories/`: SQL queries and Supabase Auth/REST transport; no Express request or response objects.
- `database/config.ts`: shared PostgreSQL pool and TLS configuration.
- `middleware/`: session handling, same-origin checks, and centralized error responses.
- `errors/ApiError.ts`: application error with HTTP status, code, and public message.
- `utils/asyncHandler.ts`: forwards controller failures to error middleware.

For example, `POST /api/auth/recover` flows through:

1. `app.ts` mounts `authRouter` at `/api/auth`.
2. `routes/auth.ts` maps `POST /recover` to `recoverController`.
3. `controllers/auth.ts` validates the email and selects the reset-page URL.
4. `services/supabaseAuth.ts` requests password recovery.
5. `repositories/supabaseAuth.ts` sends the request to Supabase Auth.

HTTP URLs, JSON responses, session cookies, and Vercel rewrites remain compatible with the frontend.
Repositories preserve parameterized SQL and review transactions with the authenticated/anonymous role for RLS.
