---
date: 2026-04-29T18:02:28+0700
researcher: sunny
git_commit: 28c8b4b
branch: main
repository: UnicornsEduWeb5
topic: "Rerender vô ích và data-fetching lặp trong codebase hiện tại"
tags: [research, codebase, react, nextjs, tanstack-query, performance]
status: complete
last_updated: 2026-04-29
last_updated_by: sunny
---

# Research: Rerender vô ích và data-fetching lặp trong codebase hiện tại

**Date**: 2026-04-29T18:02:28+0700  
**Researcher**: sunny  
**Git Commit**: 28c8b4b  
**Branch**: main  
**Repository**: UnicornsEduWeb5

## Research Question

Hiện tại các trang đang re-render vô ích và data-fetching xảy ra liên tục; cần xác định các điểm gây lỗi/rerender/fetch thừa theo React best practices và Next.js best practices, dựa trên trạng thái code hiện tại.

## Summary

Codebase frontend (`apps/web`) đang dùng TanStack Query làm trục chính cho server state, nhưng có nhiều điểm kích hoạt refetch đồng thời: invalidation theo event toàn cục, invalidation không query key khi logout, refetch khi focus cửa sổ ở các trang lịch, và một số luồng chủ động `refetch()` trong UI. Các layout client-side lớn (admin/staff/student shell) chứa state và query dùng chung, nên mỗi thay đổi shell hoặc auth context làm subtree tương ứng rerender. Ngoài ra, bootstrap session phía server dùng `fetch(..., { cache: "no-store" })`, khiến session check luôn bypass cache.

## Detailed Findings

### 1) Invalidations gây refetch diện rộng

- `apps/web/components/admin/AdminSidebar.tsx`, `apps/web/components/staff/StaffSidebar.tsx`, `apps/web/components/student/StudentSidebar.tsx`, `apps/web/components/Navbar.tsx` đều gọi `queryClient.invalidateQueries()` không truyền `queryKey` trong `onSuccess` của logout mutation.
- Pattern này invalidate toàn bộ cache query đang active, kéo theo nhiều query refetch ngay sau logout flow.
- `apps/web/lib/client.ts` phát `ACTION_HISTORY_INVALIDATION_EVENT` cho mọi response thành công của `post|put|patch|delete` (trừ `/auth/refresh`), và `apps/web/app/providers.tsx` nghe event này để invalidate `["action-history"]`.
- `apps/web/app/providers.tsx` cũng mở socket `/notifications` và invalidate `["notifications"]` + `NOTIFICATION_FEED_QUERY_KEY` mỗi khi nhận `notification.pushed`.

### 2) Refetch theo window focus + event bus ở các trang lịch

- `apps/web/app/admin/calendar/page.tsx` và `apps/web/app/staff/calendar/page.tsx` đều bật `refetchOnWindowFocus: true` cho query lịch.
- Hai trang này đồng thời đăng ký listener cho `ACTION_HISTORY_INVALIDATION_EVENT` và `calendar:refetch` rồi gọi `invalidateQueries(...)` tương ứng.
- Kết quả thực tế theo code: query lịch có thể refetch từ nhiều nguồn đồng thời (focus, custom event, mutation-triggered event).

### 3) Query key theo input tìm kiếm (debounced) tạo nhiều query instances

- `apps/web/app/admin/calendar/components/FilterBar.tsx` dùng query key có `debouncedSearch` và `debouncedStudentSearch`.
- `apps/web/app/staff/calendar/components/StaffCalendarFilterBar.tsx` dùng query key có `debouncedSearch`.
- Mỗi giá trị debounce là một key riêng, nên cache có nhiều entry và refetch theo từng trạng thái từ khóa.

### 4) Luồng notification có refetch chủ động trong interaction

- `apps/web/components/shell/SidebarNotificationTray.tsx` gọi `feedQuery.refetch()` trong handler mở detail từ toast nếu item chưa có trong cache hiện tại.
- Cùng component này còn invalidate `NOTIFICATION_FEED_QUERY_KEY` ở `onSettled` của mutation mark-read.
- `apps/web/app/providers.tsx` (NotificationSocketBridge) tiếp tục invalidate notification queries khi có push event mới.

### 5) Client layout boundaries và nguồn rerender

- Root layout server (`apps/web/app/layout.tsx`) render `Providers` (client), tạo cây client-wide gồm `QueryClientProvider`, `ThemeProvider`, `AuthProvider`.
- Admin/Staff/Student layout đều là client components (`apps/web/app/admin/layout.tsx`, `apps/web/app/staff/layout.tsx`, `apps/web/app/student/layout.tsx`) và bọc sidebar + access gate.
- Sidebars chứa state UI shell (`collapsed`, `mobileOpen`, media-query state) và query profile (`["auth","full-profile"]`), nên thay đổi ở shell sẽ rerender vùng layout tương ứng.

### 6) Session bootstrap server-side luôn no-store

- `apps/web/lib/auth-server.ts` gọi `/auth/session` với `cache: "no-store"`.
- Theo implementation hiện tại, lần render server dùng `getUser()` sẽ không tận dụng fetch cache cho endpoint này.

### 7) Một số điểm object/context value recreation

- `apps/web/components/ui/chart.tsx` truyền `value={{ config }}` trực tiếp vào `ChartContext.Provider`.
- Cùng file có nhiều inline style object cho chart fragments; sidebars/layout cũng có `style={{...}}` inline theo state.
- Các object literal này được tạo mới theo mỗi lần render component cha.

## Điểm gây re-render/data-fetching thừa (theo hiện trạng code)

1. **Global invalidation không key khi logout** tại `AdminSidebar`/`StaffSidebar`/`StudentSidebar`/`Navbar`.
2. **Nhiều trigger refetch chồng nhau** ở calendar pages: `refetchOnWindowFocus` + custom event invalidation.
3. **Invalidation từ interceptor cho toàn bộ mutate request** qua event bridge (`client.ts` + `providers.tsx`).
4. **Notification flow vừa invalidate vừa refetch thủ công** trong tray + realtime bridge.
5. **Client shell/state ở layout level** khiến nhiều subtree rerender khi state UI/access/auth đổi.
6. **Session fetch no-store** ở server bootstrap làm endpoint session luôn fetch mới.

## Code References

- `apps/web/lib/client.ts` - Axios interceptor + action-history invalidation event dispatch.
- `apps/web/app/providers.tsx` - Query bridges (action-history, notifications), socket push invalidation, QueryClient root.
- `apps/web/app/admin/calendar/page.tsx` - query lịch với `refetchOnWindowFocus`, event listener invalidation.
- `apps/web/app/staff/calendar/page.tsx` - query lịch staff với cùng pattern refetch.
- `apps/web/app/admin/calendar/components/FilterBar.tsx` - query key gắn debounced search/student search.
- `apps/web/app/staff/calendar/components/StaffCalendarFilterBar.tsx` - query key gắn debounced search.
- `apps/web/components/shell/SidebarNotificationTray.tsx` - `feedQuery.refetch()` + invalidate in mutation settle.
- `apps/web/components/admin/AdminSidebar.tsx` - logout invalidates all queries.
- `apps/web/components/staff/StaffSidebar.tsx` - logout invalidates all queries.
- `apps/web/components/student/StudentSidebar.tsx` - logout invalidates all queries.
- `apps/web/components/Navbar.tsx` - logout invalidates all queries.
- `apps/web/lib/auth-server.ts` - `/auth/session` fetch with `cache: "no-store"`.
- `apps/web/components/ui/chart.tsx` - context provider value object recreation.

## Architecture Documentation

- Frontend data layer dùng TanStack Query là chính, thông qua axios client dùng chung (`apps/web/lib/client.ts`).
- Query invalidation đang được điều phối bởi cả mutation callbacks, interceptor event, custom browser event và websocket push.
- App Router dùng server root layout + nhiều route-segment layout client-side cho admin/staff/student shells.
- State auth/theme/query được đặt ở provider root, còn state điều hướng và responsive shell đặt trong sidebar components.

## Historical Context (from thoughts/)

- `thoughts/shared/plans/2026-04-29-be-authoritative-uuid-generation.md` có mục performance liên quan backend UUID flow; không có nội dung trực tiếp về React rerender hoặc React Query refetch loop ở frontend.

## Related Research

- Chưa có tài liệu research khác trong `thoughts/shared/research/` tại thời điểm này.

## Open Questions

- Trong thực tế runtime hiện tại, tần suất trigger của từng nguồn invalidation (logout event bus, websocket push, calendar custom event) đang đóng góp bao nhiêu phần trăm vào tổng request rate theo route?
- Mức độ trùng lặp request giữa `refetchOnWindowFocus` và event-driven invalidation trên hai trang calendar là bao nhiêu theo session người dùng thực tế?
