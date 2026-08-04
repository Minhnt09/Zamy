# Zamy Full Technical Audit

**Audit date:** 2026-07-29
**Scope:** `/home/vt-admin/Documents/Visual/Zamy` — Angular 19 frontend and Express backend.
**Audit mode:** Read-only source review. No source/config/dependency file was changed by this audit; this report is the only audit artifact.

## 1. Executive Summary

**Demo deployment:** **Conditional Go.** The Angular frontend can be deployed as a visual/demo storefront after the local/production API configuration is verified. Render cold-start handling is being changed in the pre-existing working tree and must be reviewed and tested before release.

**Production commerce/payment:** **No-Go.** The backend stores users, orders, and products in process memory; orders and stock are lost at restart. VNPay return handling does not verify the VNPay signature or update payment state. Secrets/tokens are handled in localStorage and essential production protections are absent.

### Top five risks

1. **Critical — VNPay result is trusted from query parameters.** `GET /orders/vnpay-return` redirects to the frontend without signature verification or payment-status update.
2. **Critical — no durable persistence.** Products, users and orders are arrays in source memory; a Render restart clears runtime changes and orders.
3. **High — shipping fee is accepted from client.** Server recalculates product prices but accepts `shippingFee` from request body into `grandTotal`.
4. **High — no idempotency/transaction around order creation.** Repeated requests can create multiple orders and decrement in-memory stock repeatedly.
5. **High — lack of backend hardening.** No request rate limit, security headers, body limit, centralized active error handling, or production-grade logging was found.

## 2. Initial Working Tree

Before the audit, `git status --short` reported the following pre-existing changes. They are **not attributed to this audit**:

```text
M backend/.env.example
M backend/src/app.js
M src/app/app.component.ts
M src/app/core/http/backend-startup.interceptor.ts
M src/app/features/services/product.service.ts
M src/app/shared/components/global-loading-overlay/global-loading-overlay.component.html
M src/app/shared/components/global-loading-overlay/global-loading-overlay.component.ts
M src/app/shared/components/highlight-products/highlight-products.component.html
M src/app/shared/components/highlight-products/highlight-products.component.ts
?? src/app/features/services/product.service.spec.ts
```

Branch: `main`; HEAD: `a1cc59c fix alert-popup`.

## 3. Architecture Map

### Frontend

- Angular 19 standalone application at `src/app`.
- Routes are eagerly imported in `src/app/app.routes.ts`; no route-level lazy loading was found.
- Main pages: `/home`, `/sale`, `/dress`, `/shirt`, `/trousers`, `/skirt`, `/products/:id`, `/cart`, `/checkout`, `/favorites`, `/search`, content pages, and admin pages.
- HTTP config: `src/app/app.config.ts` installs `backendStartupInterceptor`.
- Environment replacement is correctly configured in `angular.json:40-45`: production replaces `environment.ts` with `environment.prod.ts`.
- Local API is configured in `src/app/environments/environment.ts`; production API URL is configured in `environment.prod.ts`. Values are intentionally not repeated here.
- Frontend stores user/admin bearer tokens and cart/favorites in `localStorage` (`auth.service.ts`, `admin-*`, `cartservices.service.ts`).

### Backend

- Express entry: `backend/src/server.js`; app setup: `backend/src/app.js`.
- Public routes: health, products, register/login, product detail, VNPay return.
- Authenticated routes: create order, retrieve own order.
- Admin routes: product mutations, list orders, change order status.
- Data layer is in-memory JavaScript fixtures: `backend/src/data/product.data.js`, `order.data.js`, `user.data.js`. No database driver, ORM, migration, or connection configuration was found.

### Deployment

- `vercel.json` rewrites all paths to `index.html`, supporting SPA deep links.
- No `render.yaml` or Dockerfile was found; Render build/start/environment settings cannot be verified from source.
- Environment variable names seen in source/example include `PORT`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`, `FRONTEND_URL`, and `CORS_ORIGINS`.

### Current product request flow

`page/shared component → ProductService → Angular HTTP interceptor → /products Express route → product controller → in-memory product fixture`.

`HighlightProductsComponent`, Dress, Shirt, Skirt, Trousers, Sale, Search Results, and Search Popup all call `ProductService.getAllProducts()`; source contains repeated per-component loading/error subscriptions.

## 4. Risk Register

| ID | Severity | Area | Finding | Evidence | Real impact | Remediation | Effort | Blocks production |
|---|---|---|---|---|---|---|---|---|
| P0-01 | Critical | Payment | VNPay return simply redirects with query parameters; no signature validation, IPN, amount validation, or state transition. | `backend/src/controllers/order.controller.js:59-61` | A success URL can be forged; payment state remains unreliable. | Implement verified VNPay callback/IPN, validate HMAC/amount/order, idempotently update order payment status. | L | Yes |
| P0-02 | Critical | Data integrity | Users/orders/products are process arrays. | `backend/src/data/*.data.js`; services mutate arrays | Render restarts discard orders/users and stock changes. | Add database schema, migrations, transactions, backups, and durable order/payment records. | L | Yes |
| P0-03 | High | Checkout | `shippingFee` comes from client body and is included in `grandTotal`. | `backend/src/services/order.service.js:14,82-84` | Client can lower shipping cost via DevTools. | Resolve shipping server-side and use validated address/method/rule data. | M | Yes |
| P0-04 | High | Orders | No idempotency key; stock is decremented before order persistence and without transaction. | `order.service.js:59-90` | Double submit/retry can duplicate orders and stock decrements. | Idempotency key + transaction/atomic stock reservation. | L | Yes |
| P0-05 | High | Security | No active centralized error handler/not-found handler; both are commented out. | `backend/src/app.js:7-8,31-32` | Unhandled errors can expose defaults or fail inconsistently. | Enable hardened error/not-found middleware; never return stack traces in production. | S | Yes |
| P0-06 | High | API hardening | No rate limiting, Helmet/CSP headers, request-size limit, compression, or explicit `trust proxy` found. | `backend/src/app.js:1-33` | Brute-force/abuse and weaker production hardening on Render. | Add appropriate middleware/configuration, especially auth rate limiting and `trust proxy` review. | M | Yes |
| P1-01 | High | Auth | Password comparison/storage is not demonstrably hashed; user data is in memory. | `auth.controller.js`; `data/user.data.js`; `services/user.service.js` requires follow-up verification | Password security/persistence is not production-ready. | Use bcrypt/Argon2, validation, persistence, password policy, rate limits. | M | Yes |
| P1-02 | High | Token storage | User/admin JWTs are in localStorage. | `src/app/features/services/auth.service.ts:23,79-80`; admin files | XSS can steal bearer tokens. | Prefer HttpOnly secure cookies or add strict XSS/CSP controls and short token lifecycle. | M | Yes |
| P1-03 | High | Cold start UX | Category pages have duplicated product subscriptions; only Highlight Products has the newly introduced local error UI in the existing working tree. | Dress/Shirt/Skirt/Trousers/Sale component TS and templates | Inconsistent offline/loading/retry behavior; duplicate request risk. | Consolidate a typed product resource/view-model and common loading/error component. | M | No (demo) |
| P1-04 | Medium | Auth | `/auth/me` reimplements token parsing instead of `requireAuth`; admin tokens are intentionally rejected but implementation duplicates logic. | `auth.controller.js:77-111` | Drift/maintenance risk; inconsistent auth responses. | Reuse `requireAuth`; use role-aware `me` contract. | S | No |
| P1-05 | Medium | API | Product list returns all products with no pagination/filter/search server-side. | `product.controller.js:3-6`; `product.service.js:3-5` | Poor scalability and large payloads. | Add paginated/query-validated list API. | M | No |
| P1-06 | Medium | Routing | No wildcard/404 route found; all routes are eager. | `src/app/app.routes.ts` | Unknown URLs may render poorly; initial bundle is larger. | Add 404 route; lazy-load feature routes. | M | No |
| P2-01 | Medium | SSR | Browser console previously showed Angular NG0505 hydration warning. | Runtime screenshot supplied during audit; `provideClientHydration` in `app.config.ts` | SSR hydration is not being used as expected. | Verify server provider/config or remove SSR/hydration until correctly configured. | M | No |
| P2-02 | Low | Code quality | Extensive `any`, direct `console.log/error`, and repeated product-load logic. | `rg` findings across cart/product/admin/category files | Weaker type safety and noisy production console. | Introduce DTOs/models and centralized typed error handling. | M | No |

## 5. Endpoint Authorization Matrix

| Method | Path | Authentication | Role | Backend middleware observed | Notes |
|---|---|---:|---|---|---|
| GET | `/health` | No | — | None | Public readiness endpoint. |
| GET | `/products` | No | — | None | Returns in-memory list. |
| GET | `/products/:id` | No | — | None | Returns 404 for missing product. |
| POST | `/products` | Yes | Admin | `verifyAdmin` | Input validation is service-based and incomplete audit required. |
| PUT | `/products/:id` | Yes | Admin | `verifyAdmin` | Same. |
| DELETE | `/products/:id` | Yes | Admin | `verifyAdmin` | Same. |
| POST | `/auth/register` | No | — | None | User service must be reviewed before production. |
| POST | `/auth/login` | No | — | None | No rate limiting found. |
| POST | `/auth/admin/login` | No | — | None | No rate limiting found. |
| GET | `/auth/me` | Yes | User only | Inline verification | Rejects admin role; duplicates auth parsing. |
| POST | `/orders` | Yes | User | `requireAuth` | Backend calculates product subtotal but accepts shipping fee. |
| GET | `/orders/:code` | Yes | Owner/Admin | `requireAuth` + controller ownership check | Ownership check exists. |
| GET | `/orders` | Yes | Admin | `verifyAdmin` | Returns all in-memory orders. |
| PATCH | `/orders/:code/status` | Yes | Admin | `verifyAdmin` | Validates a small status allowlist. |
| GET | `/orders/vnpay-return` | No | — | None | **Critical: no signature verification.** |

## 6. UI/UX and Accessibility Audit

### Verified from source

- Highlight Products has skeleton markup (`shared/components/highlight-products/*.html`); the current working-tree version adds a local retry/error state.
- Dress/Shirt/Skirt/Trousers/Sale use product arrays but source review found no uniform loading/offline/error/retry state in their feature templates.
- Multiple product images have empty `alt` attributes in Highlight Products (`highlight-products.component.html` image card), reducing accessibility when images convey product identity.
- Navigation and modal accessibility requires runtime verification. Navbar uses Angular routing, but keyboard/focus behavior cannot be confirmed from this source pass.
- Several icon/button and form controls need a dedicated runtime keyboard/contrast audit.

### Unverified runtime

**Chưa kiểm chứng runtime:** Browser visual testing at 320/375/390/768/1024/1280/1440, overflow, focus order, modal focus trap, and responsive layout were not run in this audit because the audit rule permits only creation of this report and prohibits file-changing runtime commands. Source-only observations are not presented as confirmed layout defects.

## 7. Frontend Audit

- TypeScript config enables `strict`; source nevertheless uses broad `any` in core commerce paths, including cart, checkout, product detail, and admin.
- Product caching/cold-start changes listed in the initial working tree are not attributed to this audit. They require dedicated automated tests before release.
- Current `ProductService` is the correct central integration point for request sharing; category components still duplicate subscribe/error patterns.
- `adminGuard` reads `adminToken` from localStorage and logs it (`src/app/guards/admin.guard.ts:6-8`). Do not log bearer tokens; frontend guards are not authorization.
- Product API calls are retried by an interceptor in the working tree. Runtime verification is required to prove exact retry count/timing and absence of duplicate requests.
- Production source maps are enabled in `angular.json:64`; assess whether maps should be externally uploaded rather than publicly served in production.
- SPA deep-link rewrite is configured in `vercel.json`; there is no Angular wildcard 404 route.

## 8. Backend, Auth, Cart, Checkout and Payment Audit

### Confirmed positive controls

- Product order subtotals are recalculated from backend product prices (`order.service.js:45-57`), so request item price is not trusted.
- Product existence, positive integer ID/quantity, selected size and stock are validated in `order.service.js:20-58`.
- `GET /orders/:code` checks owner versus authenticated user/admin (`order.controller.js:37-40`).
- Product and order admin mutations use `verifyAdmin` middleware.
- JWT expiry is configured for issued tokens (`auth.controller.js:27-35,55-63,81-89`).

### Confirmed gaps

- Payment return URL is not a verified payment callback; it redirects query parameters unchanged.
- No order payment confirmation implementation, IPN/webhook verification, or payment-status transition was found.
- Client-supplied shipping fee is trusted.
- Order codes use array length/date, which is unsuitable for concurrent durable order creation.
- The app obtains client IP from forwarded headers but does not explicitly configure `trust proxy`; proxy/IP behavior on Render needs verification.
- `app.use(cors())` was previously broad. The uncommitted CORS allowlist change must be reviewed and runtime-tested with the actual Vercel origin.
- The backend has no database and no transactions, so stock/order consistency cannot survive restart/concurrency.

## 9. Performance, SEO and Deployment

- All Angular routes are eager, increasing the initial application bundle relative to lazy-loaded feature routes.
- `GET /products` returns the entire fixture and page components then slice/filter client-side.
- Product request duplication is likely without correctly validated shared cache behavior.
- Google Font inlining previously failed in a sandbox due DNS resolution; this is not evidence of an application production failure.
- No source evidence of route-specific metadata, canonical URLs, sitemap, robots, structured data, or OG policy was reviewed in this pass; verify these before SEO release.
- Render Free cold start is a known UX constraint. The preferred design is direct API request + safe retry + local skeleton/error state, never a global blocking readiness gate.

## 10. Test, Build and Audit Results

| Command | Result | Notes |
|---|---|---|
| `git status --short` | Completed | Initial state recorded above. |
| Source/route inspection | Completed | Read-only. |
| `npx tsc --noEmit -p tsconfig.app.json` | Chưa chạy trong this audit | Runtime command intentionally not run under the rule that only this report may be written; prior session evidence is not reused as audit proof. |
| `npm test -- --watch=false --browsers=ChromeHeadless` | Chưa kiểm chứng runtime | Existing prior run showed many baseline test-infrastructure failures due missing `HttpClient`/`ActivatedRoute` providers; must be rerun after test setup is repaired. |
| `npm run build` | Chưa kiểm chứng runtime | Build writes `dist`; not run under this audit's no-project-change rule. |
| `cd backend && npm test` | Chưa kiểm chứng runtime | `backend/package.json` currently defines a placeholder test script that exits non-zero. |
| `npm audit` frontend/backend | Not run | No dependency audit performed in this report. |

## 11. Quick Wins (under one day)

1. Remove token logging from `src/app/guards/admin.guard.ts`.
2. Add Angular wildcard 404 route and route-level lazy loading plan.
3. Enable active not-found/error middleware and configure JSON body limit.
4. Add auth login rate limiting and security headers.
5. Replace broad `any` first in Product, Cart, Checkout and Order DTOs.
6. Add local loading/offline/error/retry component used by every category page.
7. Add accessible alt text and labels for product images/icon buttons.
8. Repair test providers globally and add tests for products, auth, order ownership, and VNPay verification.

## 12. Remediation Plan

### P0 — Mandatory before real production

1. **Durable data layer:** replace arrays in `backend/src/data` with database models/migrations; make orders, stock and users persistent. Verify restart and concurrent checkout.
2. **Secure payments:** replace `vnpayReturn` with verified callback/IPN signature flow in `order.controller.js`/`vnpay.service.js`; verify amount/order/state and idempotency. Verify forged query cannot mark order paid.
3. **Server-owned checkout totals:** compute shipping/discount/totals from server-side rules. Verify DevTools payload changes cannot reduce total.
4. **Order idempotency and stock transaction:** add idempotency key, atomic reservation/decrement, and retry-safe order creation. Verify double-click/concurrent requests create one order.
5. **Backend hardening:** CORS allowlist, Helmet, rate limits, body limits, proxy configuration, centralized error middleware, secret rotation review. Verify actual Vercel origin and rejected foreign origins.

### P1 — Soon after

1. Consolidate product load state/cache in `ProductService` and a reusable component; update category pages. Verify one shared `/products` request and correct offline/retry UI.
2. Introduce typed frontend models/DTOs and remove unsafe casts in cart/checkout/admin. Verify strict compilation.
3. Harden auth: password hashing, persistent users, brute-force protection, refresh/revocation policy, no token logging. Verify backend authorization by direct API tests.
4. Fix test infrastructure providers; create tests for retry/cache, authorization, order ownership, and payment verification.

### P2 — Improvements

1. Lazy-load feature routes; add 404 page and route metadata.
2. Add pagination/search/filter endpoints and client query-state persistence.
3. Complete responsive/keyboard/screen-reader audit through browser automation or manual matrix.
4. Add observability: structured logs without secrets, uptime/health monitoring, deployment rollback/runbook.

## 13. Missing Information / Questions

1. What Render build/start command, region, health-check path, and environment variables are configured in the Render dashboard?
2. What exact Vercel production/preview origins should `CORS_ORIGINS` permit?
3. Is a database planned, and which provider/schema/migration strategy is approved?
4. Is VNPay intended for real payments now, or only sandbox/demo?
5. What is the required order lifecycle, shipping calculation, cancellation/refund process, and admin workflow?
6. Is SSR intentionally enabled? If yes, where is the server-side Angular provider configuration for hydration?

## 14. Final Conclusion

- **Local demo:** Yes, when Express is running locally; frontend local environment correctly targets local API.
- **Vercel + Render demo:** Conditional Yes, after confirming the uncommitted cold-start changes and CORS settings; Render Free wake-up remains a user-experience limitation.
- **Real orders/payments:** No. Payment verification, durable persistence, transactional stock/order handling, server-owned totals and security hardening are mandatory first.
- **Minimum production condition:** Complete all P0 items, repair and run the test suite, and perform an authenticated staging test of checkout/payment callback behavior.
