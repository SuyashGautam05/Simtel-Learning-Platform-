# Simtel Learning Platform — Foundation

Production-ready **foundation** for a multi-module engineering education platform.
Auth, RBAC, and product-key module authorization are fully wired. Module content
(theory/simulations/experiments/quizzes) is intentionally left as extension points.

Brand colors: Navy `#173681` · Gold `#e1ac3d` · White base, subtle motion (fade-in,
float, pulse-glow) via Tailwind.

## 1. Folder structure

```
simtel-learning-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema (source of truth)
│   │   └── seed.js              # seeds 15 modules + super admin
│   ├── src/
│   │   ├── config/db.js         # Prisma client singleton
│   │   ├── controllers/         # HTTP layer (req/res only)
│   │   ├── services/            # business logic, DB calls
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js         # requireAuth (JWT)
│   │   │   ├── role.middleware.js         # requireRole (RBAC)
│   │   │   └── moduleAccess.middleware.js # requireModuleAccess (product keys)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── modules.routes.js
│   │   │   ├── admin.routes.js
│   │   │   └── index.js         # mounts all route groups
│   │   ├── utils/                # jwt, password, apiResponse
│   │   ├── app.js               # express app config
│   │   └── server.js            # entrypoint
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/axiosClient.js   # axios + auto-refresh interceptor
    │   ├── context/AuthContext.jsx
    │   ├── routes/ProtectedRoute.jsx
    │   ├── components/layout/   # Sidebar, Topbar, AppLayout
    │   ├── pages/                # Login, Dashboard, ModuleLibrary
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── tailwind.config.js       # navy/gold theme + animations
    └── package.json
```

## 2. Frontend architecture

- **Vite + React 18**, `react-router-dom` v6 for routing.
- `AuthContext` holds the current user (fetched via `/api/auth/me` on load) and
  exposes `login`, `logout`, `refetch`. No tokens are ever stored in JS — they
  live in httpOnly cookies.
- `ProtectedRoute` is a layout route that redirects to `/login` if unauthenticated,
  and supports an `allowedRoles` prop for role-gated route groups (e.g. wrap
  `/admin/*` routes with `<ProtectedRoute allowedRoles={["ADMIN","SUPER_ADMIN"]} />`).
- `AppLayout` (Sidebar + Topbar) wraps all authenticated pages; Sidebar renders
  nav links conditionally based on `user.role`.
- Adding a new module page = add a route + a card in `ModuleLibrary`; no core
  routing/auth files change.
- Styling: Tailwind with a custom `navy`/`gold` palette (full 50–950 shade
  ramps for both), reusable `.btn-primary`, `.btn-accent`, `.card`,
  `.input-field` component classes, and animation utilities
  (`fade-in`, `fade-in-scale`, `float`, `pulse-glow`, `shimmer`) used sparingly
  for a polished, non-gimmicky feel.

## 3. Backend architecture

Layered Express app: **routes → controllers → services → Prisma**.

- Routes only wire up middleware + call a controller method.
- Controllers parse/validate input (Zod) and shape the HTTP response.
- Services hold all business logic and are the only layer that talks to Prisma.
- This separation means, e.g., a future GraphQL or mobile API layer can reuse
  `services/` untouched.

## 4. Database architecture (PostgreSQL + Prisma)

Core models: `College`, `User`, `RefreshToken`, `Product`, `ProductKey`, `Progress`.

- **`Product`** is a *row*, not a code module — each of the 15 domains
  (PLC, VFD, Embedded, DSP, ...) is a `Product` row with a unique `code`
  (`"PLC"`, `"VFD"`, `"EMB"`...). Adding module #16 is a DB insert, not a
  code change.
- **`ProductKey`** belongs to exactly one `Product` (`productId` FK), has a
  human-readable `keyString` like `PLC-4F2A-9K1B-77QX`, and a lifecycle:
  `UNUSED → ASSIGNED → REVOKED/EXPIRED`. Optional `expiresAt` supports
  time-boxed licenses; `null` = perpetual.
- A key can optionally belong to a `College` pool before assignment, enabling
  bulk-purchase-then-distribute workflows for college admins.
- `Progress` is a thin per-user-per-product row (`percentComplete`), ready to
  be extended per-lesson later without breaking this shape.

## 5. Authentication architecture

- Passwords hashed with **bcrypt** (cost factor 12), never stored/logged in
  plaintext.
- **Two-token JWT** scheme:
  - Short-lived **access token** (15 min) — sent as an httpOnly, `SameSite=Lax`
    cookie, verified on every request by `requireAuth`.
  - Long-lived **refresh token** (7 days) — also httpOnly-cookie only, and its
    **hash** (SHA-256) is stored in `RefreshToken` so a DB leak alone can't be
    replayed. Refresh is **rotating**: each use revokes the old token and
    issues a new pair, limiting the blast radius of a stolen token.
- Frontend never touches raw tokens — `axiosClient` auto-calls `/auth/refresh`
  on a 401 and retries the original request transparently.
- `requireAuth` re-checks the user's `status` in the DB on every request, so a
  suspended account is locked out immediately, not just at token expiry.

## 6. Authorization architecture (RBAC)

Three roles: `SUPER_ADMIN`, `ADMIN`, `USER`, enforced by two composable
middlewares:

- `requireRole(...roles)` — simple allow-list gate for a route.
- `requireSameCollegeOrSuperAdmin(getTargetCollegeId)` — for `ADMIN`-scoped
  actions (e.g. "assign a key to student X"), ensures a College Admin can only
  act within their own `collegeId`; `SUPER_ADMIN` always bypasses.

This is deliberately generic — new roles or finer-grained permissions (e.g.
"content editor") can be added without rewriting route logic, just new
allow-lists.

## 7. Product / module architecture (the core scalability requirement)

The whole "add a module without touching auth" requirement lives in
**`requireModuleAccess(productCode)`**:

```js
router.get("/plc/theory", requireAuth, requireModuleAccess("PLC"), handler);
router.get("/dsp/theory", requireAuth, requireModuleAccess("DSP"), handler);
```

It looks up the `Product` by `code`, then checks for an `ASSIGNED`,
non-expired `ProductKey` owned by `req.user`. `SUPER_ADMIN` always passes.
To ship module #16, you: (1) insert a `Product` row, (2) build its
theory/simulation routes behind `requireModuleAccess("NEWCODE")`. **Nothing
in `auth.middleware.js`, `role.middleware.js`, or the DB schema's User/Auth
tables changes.**

Key generation/assignment/revocation live in `admin.routes.js`, restricted to
`SUPER_ADMIN` (generate) and `SUPER_ADMIN`/`ADMIN` (assign/revoke, college-scoped
for Admins).

## 8. API architecture

REST, JSON, versioned implicitly under `/api`. Consistent envelope:

```json
{ "success": true, "message": "...", "data": { } }
{ "success": false, "message": "...", "details": null }
```

Current endpoints (foundation scope):

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/refresh` | Public (cookie) |
| POST | `/api/auth/logout` | Public (cookie) |
| GET | `/api/auth/me` | Authenticated |
| GET | `/api/modules` | Authenticated |
| GET | `/api/modules/:code/theory` | Authenticated + module key |
| POST | `/api/admin/product-keys/generate` | SUPER_ADMIN |
| POST | `/api/admin/product-keys/assign` | SUPER_ADMIN, ADMIN |
| POST | `/api/admin/product-keys/:id/revoke` | SUPER_ADMIN, ADMIN |
| GET | `/api/admin/stats` | SUPER_ADMIN |

Future additions (colleges CRUD, user management, quizzes, progress) mount
onto `routes/index.js` the same way — no restructuring needed.

## 9. Environment variables

See `backend/.env.example`:

```
PORT, NODE_ENV, CLIENT_URL
DATABASE_URL
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN
COOKIE_SECURE, COOKIE_DOMAIN
LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS
```

## 10. Security considerations

- `helmet()` for standard security headers; `cors()` locked to `CLIENT_URL`
  with `credentials: true`.
- Rate limiting on `/auth/login` (configurable) to blunt credential stuffing.
- All tokens in httpOnly cookies — immune to XSS token theft (no
  `localStorage` tokens).
- Refresh tokens stored hashed + rotated on every use + revocable (`logout`).
- Input validation via **Zod** at the controller boundary before anything
  touches the DB.
- Least-privilege queries: College Admin actions are always filtered by their
  own `collegeId` server-side, never trusted from client input.
- Passwords: bcrypt, cost 12, never returned in any API response
  (`sanitizeUser` strips `passwordHash`).
- Product keys are the *only* way into module content — there is no
  role-based bypass for `USER`, keeping licensing enforcement centralized in
  one middleware.

## Getting started

```bash
# Backend
cd backend
cp .env.example .env   # fill in DATABASE_URL + JWT secrets
npm install
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev             # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Seeded super admin: `superadmin@simtel.com` / `ChangeMe123!` (change immediately).

## Next steps (not yet implemented, by design)

- College/User CRUD endpoints + admin UI screens
- Theory content model + rich text delivery
- Simulation embedding pattern per module
- Quiz engine + auto-grading
- Progress tracking UI (charts)
- Email verification / password reset flow
