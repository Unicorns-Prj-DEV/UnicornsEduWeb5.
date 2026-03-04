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
