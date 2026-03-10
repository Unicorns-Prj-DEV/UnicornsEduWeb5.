# Landing – `/landing-page`

## Route and role

- **Path:** `/landing-page` (or `/` if this is the public home).
- **Role:** Public (no auth required); may show different CTA for logged-in users.
- **Workplan owner:** Minh (Frontend – UX + Landing).

## Features

- **Content blocks:** Data from `home_posts` and `categories`; categories: intro, news, docs, policy (per Workplan).
- **Sections:** Hero, intro/teams, feature capabilities, workflow, news (khóa học), documents (cuộc thi), policy/contact; structure and copy per product.
- **Dynamic content:** Fetched from API (or mock Tuần 1–6); no hardcoded long copy where content is CMS-like.
- **Loading and empty states:** Skeleton or placeholder when loading; clear empty state when no posts.
- **Themes:** Full support for light, dark, pink (`data-theme`); all tokens from UI-Schema so theme switch works without component change.
- **Micro-animation:** Subtle motion for nav items, CTA buttons, KPI/feature/team cards via CSS utility classes (`motion-fade-up`, `motion-hover-lift`) to improve perceived responsiveness.
- **Reduced motion:** Must respect `prefers-reduced-motion`; disable non-essential animations/transitions in reduced mode.

## UI-Schema tokens and components

- **Page background:** `bg-primary`.
- **Sections / cards:** `bg-surface` or `bg-elevated`, `text-primary` / `text-secondary`; `border-default` where needed.
- **Headings:** `text-primary`; subtext `text-secondary` or `text-muted`.
- **Links and CTAs:** Primary button = `primary` + `text-inverse`; secondary = `secondary` + `border-default`; link = `primary` or `text-primary` with hover.
- **Tags / categories:** `bg-secondary`, `text-secondary`, `border-subtle`; hover `bg-tertiary`.
- **Modals (if any):** Surface `bg-elevated`; overlay per UI-Schema (light/pink vs dark); `border-default`.
- **Focus:** All interactive elements use `border-focus` for focus ring.

## Data and API

- **Backend domain:** `home_posts`, `categories` (Workplan route-to-domain map).
- **Mock (Tuần 1–6):** Mock contract pack for landing (intro, news, docs, policy); empty and loading scenarios.
- **De-mock (Tuần 7):** Replace with real content API; ensure payload matches contract.
- **API (real):** Content API for posts and categories.

## DoD and week

- **Tuần 6:** Landing page shows dynamic content correctly; dashboard (if linked) load acceptable; migration rehearsal done; all three themes render correctly.
- **Tuần 7:** Landing on real API; no runtime mock in production path.

## Accessibility

- Heading hierarchy (h1 → h2 → h3); link and button labels clear.
- Contrast AA; focus visible; prefer-reduced-motion respected for any motion.
- Status/info not by color only.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Landing structure:** `archived/.../pages/Home.tsx` — sections: intro, news (Khóa học), docs (Cuộc thi), policy (Liên hệ); HOME_MENU, HOME_TEAMS, HOME_FEATURES, HOME_WORKFLOW_STEPS; dynamic content via fetchHomePostByCategory, upsertHomePost (homeService).
- **Content blocks:** Data from home_posts and categories; skeleton/empty states when loading or no posts.
- **Optional auth:** AuthModal can open from CTA (e.g. “Đăng nhập” / “Đăng ký”); Home accepts `initialAuthMode` for deep link to login.
- **Themes:** useTheme (light/dark/sakura); all tokens so theme switch works; support data-theme.
