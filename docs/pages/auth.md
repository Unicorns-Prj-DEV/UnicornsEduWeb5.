# Auth pages (Login / Logout)

## Route and role

- **Paths:** Login (e.g. `/login`), Logout (action or redirect).
- **Audience:** All users before/after authenticated session.
- **Guard:** Unauthenticated users see login; authenticated users redirect by role (per Workplan route registry).

## Features

- Login form: identifier (email/phone), password, submit.
- Session handling: token/session storage, refresh if applicable.
- Logout: clear session and redirect to login or landing.
- Post-login redirect by `UserRole`: admin → `/admin`, teacher → `/mentor`, student → `/student`, assistant → `/assistant`, visitor as per product rule.
- No mock for login/me: use real Auth API from Tuần 1 (Workplan DoD).

## UI-Schema tokens and components

- **Layout:** Centered card on `bg-primary`; card uses `bg-surface`, `border-default`, `text-primary`.
- **Inputs:** `bg-surface`, `text-primary`, `border-default`; focus ring `border-focus`.
- **Primary button:** `primary` background, `text-inverse`; hover `primary-hover`, active `primary-active`.
- **Secondary / link:** `text-secondary` or `primary`; hover per component mapping.
- **Error message:** `danger` or `error` with icon/label (not color alone; WCAG).

## Data and API

- **API (real only):** login, logout, me (profile + role).
- **Contract:** Auth DTO and role enum aligned with backend; contract frozen for safe de-mock in Tuần 7.
- **Mock:** Not used for auth; mock layer only for post-login dashboard/landing content in Tuần 1.

## DoD and week

- **Tuần 1:** Login/logout and session work with real API; role-based redirect; route guard blocks unauthorized access; no plaintext password support.

## Accessibility

- Labels and errors associated with inputs; focus order and visible focus (`border-focus`).
- Error state not conveyed by color only (icon + text).
- Minimum contrast per UI-Schema (e.g. AA).

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Login:** `archived/.../pages/Home.tsx` (route `/login` → Home with `initialAuthMode="login"`) and `components/AuthModal.tsx` — email + password, rememberMe; authService.login; role-based redirect (admin → dashboard, teacher → home, student → dashboard, etc.); login lock after failed attempts (loginLock in localStorage).
- **Register:** `pages/Register.tsx` — fullName, email, phone, password, role (student/teacher), classId/specialization; authService.register; setAuth then redirect by role; link to /login.
- **Session:** `store/authStore.ts` — token key `unicorns.token`, user `unicorns.currentUser`; optional refreshToken; rememberMe → localStorage vs sessionStorage; sessionExpiresAt; initFromStorage on load; logout clears both storages.
- **Guards:** `components/ProtectedRoute.tsx` — redirect to `/login` if !isAuthenticated; wrap all authenticated routes.
