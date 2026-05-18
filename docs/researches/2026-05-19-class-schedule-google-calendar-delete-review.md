# Review: xoá Google Calendar event cũ khi đổi lịch học lớp

## Phạm vi

Rà luồng tạo/xoá lịch học định kỳ của lớp, tập trung vào việc xoá event cũ trên Google Calendar khi `Class.schedule` thay đổi hoặc bị xoá.

## Google Calendar API cần dùng

- Hệ thống đang tạo event trong một calendar đã cấu hình, không tạo calendar riêng cho từng lớp.
- Để xoá lịch học cũ, API đúng là `events.delete`: `DELETE /calendars/{calendarId}/events/{eventId}`.
- `calendars.delete` chỉ dùng khi muốn xoá cả secondary calendar. `calendarList.delete` chỉ gỡ một calendar khỏi danh sách calendar của user, không xoá event trong calendar đó.
- API xoá event cần cả `calendarId` và `eventId`. Chỉ lưu `eventId` là chưa đủ nếu event từng được tạo trên calendar khác hoặc config `GOOGLE_CALENDAR_ID` thay đổi.

Nguồn docs đã đối chiếu bằng Context7:
- Google Calendar API v3 `Events.delete`
- Google Calendar API v3 `Calendars.delete`
- Google Calendar API v3 `CalendarList.delete`
- Google Calendar API v3 `Events.list` với `privateExtendedProperty`

## Hiện trạng code

### 1) Dữ liệu lịch lớp

- `Class.schedule` là JSON trong `apps/api/prisma/schema/learning.prisma`.
- Mỗi schedule entry có thể chứa:
  - `id`
  - `dayOfWeek`
  - `from`
  - `to`
  - `teacherId`
  - `googleCalendarEventId`
  - `meetLink`
- Không có bảng riêng cho recurring schedule entry, cũng không có cột/field `googleCalendarId`.

### 2) FE sửa lịch lớp

`apps/web/components/admin/class/EditClassSchedulePopup.tsx`:

- Khi load lịch cũ, FE giữ `record.id` trong `persistedId`.
- Khi submit, FE gửi lại `id`, `dayOfWeek`, `from`, `to`, `teacherId`.
- FE không gửi `googleCalendarEventId`; backend tự preserve metadata này từ schedule JSON cũ.

Đây là hướng đúng. Event id không nên do FE quản lý.

### 3) Backend update lịch lớp

`apps/api/src/class/class.service.ts`:

- `updateClassSchedule()` đọc class hiện tại trước khi update.
- `mergeScheduleEntriesWithExisting()` preserve `googleCalendarEventId` và `meetLink` theo schedule entry `id`.
- Sau khi lưu schedule mới, service gọi:

```ts
await this.calendarService.syncScheduleWithCalendar(id, oldSchedule);
```

Nhận xét:

- Comment nói đúng ý đồ: truyền `oldSchedule` để xoá event cũ trước khi tạo event mới.
- Vì `oldSchedule` được lấy từ DB trước update, việc xoá không phụ thuộc FE có giữ id mới hay không, miễn là schedule cũ đã có `googleCalendarEventId`.

### 4) Calendar sync hiện tại

`apps/api/src/calendar/calendar.service.ts`:

- `syncScheduleWithCalendar(classId, oldSchedule?)`:
  1. Fetch class hiện tại.
  2. `entriesToDelete = oldSchedule || currentSchedule`.
  3. Với mỗi old entry có `googleCalendarEventId`, gọi `googleCalendarService.deleteCalendarEvent(...)`.
  4. Clear `googleCalendarEventId`/`meetLink` trên current entries.
  5. Tạo recurring event mới cho từng current entry.
  6. Lưu event id mới ngược lại vào `Class.schedule`.

Kết luận: happy path xoá event cũ đã có, nhưng chỉ xoá bằng danh sách event id đã lưu trong schedule JSON cũ.

### 5) GoogleCalendarService

`apps/api/src/google-calendar/google-calendar.service.ts`:

- `deleteCalendarEvent(eventId)` gọi `this.calendar!.events.delete({ calendarId: this.config.calendarId || 'primary', eventId })`.
- `createOrUpdateClassScheduleRecurringEvent(...)` tạo event recurring weekly với summary/description/start/end/recurrence/attendees.
- Recurring class event hiện chỉ ghi `Class ID` và `Schedule Entry ID` vào description, chưa ghi `extendedProperties.private`.

## Lỗ hổng chính

### Finding 1: Xoá event cũ chỉ hoạt động nếu schedule JSON cũ đã có `googleCalendarEventId`

Nếu dữ liệu được tạo trước khi sync lưu event id, hoặc từng bị overwrite bởi endpoint/logic không giữ metadata, `oldSchedule` không có `googleCalendarEventId`; sync sẽ tạo event mới nhưng không biết event cũ nào để xoá.

Tác động:

- Google Calendar còn event cũ.
- DB chỉ biết event mới, không còn pointer đến event cũ.
- Sau vài lần chỉnh, calendar có thể tích tụ nhiều recurring event trùng lớp.

### Finding 2: Không lưu `calendarId` cạnh `eventId`

Google API xoá event cần `calendarId + eventId`, nhưng hệ thống chỉ lưu `googleCalendarEventId`.

Nếu event cũ từng được tạo dưới:

- `primary`
- một `GOOGLE_CALENDAR_ID` cũ
- tài khoản OAuth/service account khác
- calendar đã chuyển ownership/quyền

thì `deleteCalendarEvent()` sẽ xoá trên calendar hiện tại và có thể không tìm thấy event cũ.

### Finding 3: Class recurring events không có `extendedProperties.private`

Student exam sync đã dùng pattern tốt:

- list event bằng `privateExtendedProperty`
- map theo schedule/item id
- delete leftover events

Class recurring event chưa có private metadata như:

- `unicornsType=classSchedule`
- `unicornsClassId=<classId>`
- `unicornsScheduleEntryId=<entryId>`

Vì vậy khi mất `googleCalendarEventId`, backend không có cách reconcile đáng tin cậy. Search bằng description hoặc summary chỉ là fallback yếu.

### Finding 4: Xoá class không cleanup Google Calendar

`ClassService.deleteClass()` chỉ xoá DB record trong transaction. Không thấy call `syncScheduleWithCalendar(id, oldSchedule)` hoặc loop xoá `googleCalendarEventId` trước khi delete.

Tác động:

- Nếu xoá lớp, recurring event của `Class.schedule` có thể còn trên Google Calendar.
- `makeup_schedule_events` có `onDelete: Cascade`, nhưng cascade DB không gọi `deleteCalendarEvent()` cho Google event liên kết.

### Finding 5: Test chưa cover path xoá old recurring event

`calendar.service.spec.ts` có test tạo mới event và lưu `googleCalendarEventId`, nhưng call `syncScheduleWithCalendar('class-1', [])`.

Thiếu test:

- `oldSchedule` có `googleCalendarEventId` thì gọi `deleteCalendarEvent`.
- xoá schedule hết entry thì delete old events và không create event mới.
- delete class cleanup recurring + makeup Google events.
- delete idempotent với Google 404.

## Hướng sửa đề xuất

### P0: làm chắc xoá theo event id hiện có

1. Thêm test cho `CalendarService.syncScheduleWithCalendar()`:
   - old schedule có `googleCalendarEventId`.
   - expect `deleteCalendarEvent(oldEventId)` được gọi trước create.
   - schedule mới rỗng thì không create event.
2. Sửa `deleteCalendarEvent()` nhận optional `{ calendarId, sendUpdates }`.
3. Handle 404 theo `error.code`/`error.response.status`, không chỉ `message.includes('not found')`.
4. Thêm `sendUpdates: 'none'` hoặc quyết định rõ policy notify attendee.

### P1: lưu đủ metadata để xoá đúng calendar

Thêm metadata cho recurring schedule entry:

```ts
googleCalendarEventId?: string;
googleCalendarId?: string;
calendarSyncedAt?: string;
calendarSyncError?: string;
```

Khi tạo event mới, lưu cả `calendarId` đang dùng. Khi xoá, dùng `entry.googleCalendarId ?? config.calendarId ?? 'primary'`.

### P2: thêm `extendedProperties.private` cho class recurring event

Khi create/update class recurring event, thêm:

```ts
extendedProperties: {
  private: {
    unicornsType: 'classSchedule',
    unicornsClassId: classId,
    unicornsScheduleEntryId: entryId,
  },
}
```

Sau đó thêm helper reconcile:

- list event theo `unicornsType=classSchedule` và `unicornsClassId=<classId>`
- map theo `unicornsScheduleEntryId`
- delete event không còn trong schedule hiện tại
- update/create event còn lại

Đây là pattern nên copy từ `syncStudentExamScheduleEvents()`.

### P3: cleanup khi xoá lớp

Trước khi xoá class:

1. Read `Class.schedule` + `makeupScheduleEvents.googleCalendarEventId`.
2. Best-effort delete Google events.
3. Sau đó delete DB class.

Không nên để DB cascade makeup event trước khi lấy event ids.

## Update triển khai 2026-05-19

Đã triển khai phần bảo đảm xoá cho recurring class schedule:

- `GoogleCalendarService.createOrUpdateClassScheduleRecurringEvent()` gắn `extendedProperties.private` cho recurring event mới.
- `GoogleCalendarService.listClassScheduleRecurringEvents()` list event theo private metadata và fallback các event legacy có `Class ID: <classId>` trong description.
- `CalendarService.syncScheduleWithCalendar()` xoá cả event id lưu trong schedule cũ và event tìm lại được trên Google trước khi tạo recurring event mới.
- `GoogleCalendarService.deleteCalendarEvent()` gọi delete với `sendUpdates=none` và xem 404/not found là idempotent success.
- `ClassService.updateClassSchedule()` không còn nuốt lỗi sync Calendar; lỗi xoá/sync sẽ làm API trả lỗi để người dùng không thấy trạng thái lưu thành công giả.

Giới hạn còn lại: Google API chỉ xoá được event mà backend có thể định danh qua `eventId`, private metadata, hoặc legacy description có `Class ID`. Event đã bị sửa tay xoá mất mọi marker này thì không thể chứng minh thuộc class schedule nào bằng API.

## Kết luận

Code ban đầu không phải hoàn toàn chưa có xoá. Nó có xoá trong happy path, nhưng phụ thuộc vào pointer `googleCalendarEventId` trong JSON schedule cũ. Patch 2026-05-19 đã thêm metadata + reconcile để tìm/xoá cả event legacy tìm được theo `Class ID`. Việc lưu riêng `calendarId` cạnh từng schedule entry và cleanup khi xoá cả class vẫn là hardening tiếp theo.
