# Google Calendar Integration – Unicorns Edu (apps/api)

Tài liệu này mô tả cách service Google Calendar hoạt động trong hệ thống Unicorns Edu.

---

## 1) Tổng quan

Google Calendar Module (`apps/api/src/google-calendar/`) cung cấp khả năng tự động tạo, cập nhật, và xóa sự kiện lịch Google Calendar cho các buổi học (sessions), kèm theo liên kết Google Meet.

**Tính năng:**
- Tạo sự kiện lịch với Google Meet link tự động
- Gán teacher làm `CO_HOST` của sự kiện
- Đồng bộ thời gian từ session (`date`, `startTime`, `endTime`)
- Mô tả sự kiện tự động với thông tin class và session
- Cập nhật và xóa sự kiện khi session thay đổi
- Retry logic và xử lý lỗi chi tiết

---

## 2) Cài đặt & Configuration

### 2.1 Dependencies

```bash
cd apps/api
pnpm add googleapis google-auth-library uuid
```

### 2.2 Google Cloud Setup

1. **Tạo Service Account** trong Google Cloud Console:
   - Vào IAM & Admin > Service Accounts
   - Tạo service account mới (ví dụ: `unicorns-edu-calendar`)
   - Gán role `Editor` hoặc cụ thể `Calendar` permissions

2. **Tạo JSON Key**:
   - Vào service account vừa tạo
   - Add Key > Create new key > JSON
   - Lưu file an toàn

3. **Cấu hình Calendar** (nếu dùng calendar riêng):
   - Tạo calendar mới trong Google Calendar hoặc dùng calendar của service account
   - Share calendar với teacher email (nếu cần)
   - Copy Calendar ID (Settings > Calendar ID)

### 2.3 Environment Variables

Thêm vào `.env` và `.env.example`:

```env
# Option 1: Base64 encoded service account JSON (preferred for deployment)
GOOGLE_SERVICE_ACCOUNT_KEY="base64-encoded-json-content"

# Option 2: Direct file path (for local dev)
# GOOGLE_SERVICE_ACCOUNT_JSON_PATH="/path/to/key.json"

# Calendar ID (optional, defaults to service account's primary calendar)
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"

# Time zone (defaults to Asia/Ho_Chi_Minh)
GOOGLE_TIME_ZONE="Asia/Ho_Chi_Minh"
```

**Lưu ý:** Dùng Option 1 (base64) cho deployment vì an toàn hơn.

### 2.4 Module Registration

`GoogleCalendarModule` import `ConfigModule` và `PrismaModule` để Nest inject `ConfigService` và `PrismaService` vào `GoogleCalendarService`. Module đã được đăng ký trong `AppModule`; nơi khác chỉ cần import `GoogleCalendarModule` nếu muốn inject `GoogleCalendarService` (module đó vẫn cần `PrismaModule` riêng nếu service của module cũng dùng Prisma).

```typescript
import { GoogleCalendarService } from './google-calendar/google-calendar.service';

@Injectable()
export class SomeService {
  constructor(private googleCalendarService: GoogleCalendarService) {}
}
```

---

## 3) API & Usage

> Route note: Nest controllers trong `apps/api` hiện không dùng global `/api` prefix cho business routes. Swagger UI vẫn ở `/api`, nhưng các route runtime của calendar là `/admin/calendar/...` và `/calendar/...` trên backend host được cấu hình trong `NEXT_PUBLIC_BACKEND_URL`.

### 3.1 Service Interface

```typescript
export interface GoogleCalendarService {
  // Tạo sự kiện mới
  createCalendarEvent(
    sessionId: string,
    teacherEmail: string,
    className: string,
  ): Promise<CreateCalendarEventResult>;

  // Cập nhật sự kiện khi session thay đổi
  updateCalendarEvent(
    eventId: string,
    sessionId: string,
  ): Promise<CreateCalendarEventResult>;

  // Xóa sự kiện
  deleteCalendarEvent(eventId: string): Promise<void>;

  // Lấy thông tin sự kiện
  getEvent(eventId: string): Promise<GoogleCalendarEvent>;

  // Test kết nối
  testConnection(): Promise<boolean>;
}
```

### 3.2 Create Calendar Event

```typescript
const result = await googleCalendarService.createCalendarEvent(
  'session-uuid-123',
  'teacher@email.com',
  'Lớp Toán Lớp 10',
);
// result = { eventId: 'abc123...', meetLink: 'https://meet.google.com/xxx-yyy-zzz' }
```

**Event được tạo với:**
- **Summary:** `[Class] Lớp Toán Lớp 10 - Session abc12345`
- **Description:** Gồm Class name, Session ID, Teacher email, Notes (nếu có)
- **Start/End:** Từ session.date + session.startTime/endTime (default 14:00-16:00 nếu không có)
- **Attendees:** Teacher với role `CO_HOST`
- **Conference:** Google Meet link tự động tạo

### 3.3 Update & Delete

```typescript
// Cập nhật khi session thay đổi (reschedule)
await googleCalendarService.updateCalendarEvent(eventId, sessionId);

// Xóa khi session bị hủy
await googleCalendarService.deleteCalendarEvent(eventId);
```

### 3.4 Class Schedule Pattern APIs

Calendar admin hiện có thêm nhóm endpoint để quản lý lịch học định kỳ theo `Class.schedule`:

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/admin/calendar/class-schedule` | Expand weekly pattern thành danh sách occurrence trong khoảng `startDate` → `endDate`; hỗ trợ filter `classId`, `teacherId` |
| `GET` | `/admin/calendar/classes/:classId/schedule` | Lấy raw weekly pattern của lớp |
| `PUT` | `/admin/calendar/classes/:classId/schedule` | Cập nhật weekly pattern; body: `{ schedule: [{ id?, dayOfWeek, from, end, teacherId? }] }` |
| `GET` | `/calendar/staff/events` | Staff calendar: lấy lịch dạy của chính staff (teacher role) trong khoảng ngày; tự động filter theo staff ID, optional filter `classId` |

Trang FE `/admin/calendar` hiện dùng trực tiếp `GET /admin/calendar/class-schedule` làm source of truth từ `Class.schedule`:

- Chỉ hiển thị **tuần hiện tại** theo local date của trình duyệt, cố định từ **Chủ Nhật đến Thứ Bảy**.
- FE surfacing cả filter `classId` và `teacherId`; filter lớp dùng **combobox tìm theo tên lớp**, còn filter gia sư dùng single-select. Không cho chọn khoảng ngày thủ công.
- UI là **week-view kiểu Google Calendar**, không dùng pagination, month view, hay list view.
- Mỗi slot lịch của lớp chỉ render **một event theo class schedule occurrence**, không nhân bản theo từng giáo viên; khi entry đã có `teacherId`, payload occurrence trả `teacherIds[]`/`teacherNames[]` tương ứng với đúng tutor của slot đó. FE không hiển thị tên gia sư trên event card nhưng hiển thị trong popup chi tiết.
- Mỗi lớp được gán **màu hiển thị ổn định theo `classId`** để dễ phân biệt nhanh trên week-view.
- Trên mobile, calendar giữ nguyên week-view nhưng dùng **horizontal scroll có chủ đích** để xem đủ 7 ngày; popup event hiển thị dạng **bottom-sheet** với vùng cuộn nội bộ.

### 3.5 Staff Calendar (`/staff/calendar`)

Staff có role `teacher` có thể xem lịch dạy cá nhân tại `/staff/calendar`:

- **Backend:** `GET /calendar/staff/events` — tự động resolve staff ID từ JWT, filter chỉ các class mà staff này phụ trách, expand schedule pattern ra các occurrence trong khoảng ngày.
- **Frontend:** Read-only calendar view, reuse `CalendarView` và `EventPopup` từ admin calendar. Filter duy nhất là `classId` (không có filter `teacherId` vì đã auto-filter theo staff).
- **Access:** Yêu cầu `roleType=staff` và có role `teacher` trong `staffInfo.roles`. Staff không có role teacher sẽ bị từ chối.

---

## 4) Error Handling

Service throws các custom error:

| Error Class                      | HTTP Status | Mô tả                           |
|----------------------------------|-------------|---------------------------------|
| `GoogleCalendarAuthError`        | 401         | Lỗi xác thực service account   |
| `GoogleCalendarInvalidConfigError` | 500       | Thiếu cấu hình environment     |
| `GoogleCalendarEventNotFoundError` | 404       | Event ID không tồn tại         |
| `GoogleCalendarApiError`         | 502         | Lỗi từ Google Calendar API     |

**Retry:** Service có retry logic tự động cho API calls. Nếu lỗi persistent, sẽ throw sau vài lần thử.

---

## 5) Integration with Session Module

Để tích hợp với session的生命cycle:

```typescript
// Trong session-create.service.ts sau khi tạo session thành công:
const eventResult = await this.googleCalendarService.createCalendarEvent(
  session.id,
  teacherEmail,
  className,
);
// Lưu eventId vào session (có thể thêm trường calendarEventId)

// Trong session-update.service.ts:
if (existingSession.calendarEventId) {
  await this.googleCalendarService.updateCalendarEvent(
    existingSession.calendarEventId,
    session.id,
  );
}

// Trong session-delete.service.ts:
if (session.calendarEventId) {
  await this.googleCalendarService.deleteCalendarEvent(session.calendarEventId);
}
```

---

## 6) Testing

### Unit Test

```typescript
describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        GoogleCalendarService,
        ConfigService,
        PrismaService,
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build event data correctly', () => {
    const mockSession = {
      id: 'session-123',
      teacherId: 'teacher-123',
      classId: 'class-123',
      date: new Date('2025-04-15'),
      startTime: new Date('2025-04-15T14:00:00'),
      endTime: new Date('2025-04-15T16:00:00'),
      teacher: {
        user: { email: 'teacher@test.com' },
      },
      class: { name: 'Test Class' },
    };

    const eventData = (service as any).buildEventData(
      mockSession,
      'teacher@test.com',
      'Test Class',
    );

    expect(eventData.summary).toContain('Test Class');
  });
});
```

### Integration Test

Mock Google Calendar API:

```typescript
const mockCalendar = {
  events: {
    insert: jest.fn().mockResolvedValue({
      data: {
        id: 'event-123',
        conferenceData: {
          entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/xxx' }],
        },
      },
    }),
  },
};
```

---

## 7) Troubleshooting

| Issue | Solution |
|-------|----------|
| `Google Calendar not configured` | Check env vars `GOOGLE_SERVICE_ACCOUNT_KEY` or `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` |
| `invalid_grant` | Service account key may be expired. Regenerate key in Google Cloud Console |
| `403 Forbidden` | Ensure service account has Calendar API enabled and proper permissions |
| Teacher không nhận email | Calendar phải được share với teacher email, hoặc dùng `primary` calendar của service account |
| Event không tạo Meet link | Đảm bảo `conferenceDataVersion: 1` trong API call |

---

## 8) Security Considerations

- **Service Account Key** phải được bảo mật tuyệt đối (base64 encoding chỉ che giấu, không phải encryption)
- Dùng secret management (ví dụ: Supabase Secrets, Railway Variables) cho production
- Không commit `GOOGLE_SERVICE_ACCOUNT_KEY` vào git
- Limit permissions của service account: chỉ cần `https://www.googleapis.com/auth/calendar`

---

## 9) Performance Notes

- API calls đến Google Calendar là synchronous, có thể gây latency
- Nên xử lý async với background job nếu cần (ví dụ: Bull queue)
- Retry logic: 3 lần với exponential backoff
- Cache `googleCalendarService.testConnection()` result để tránh reconnect trên mỗi request

---

## 10) Module Structure

```
apps/api/src/google-calendar/
├── google-calendar.module.ts       # NestJS module
├── google-calendar.service.ts      # Main service
├── interfaces/
│   └── google-calendar.interface.ts  # TypeScript interfaces
├── errors/
│   └── google-calendar.errors.ts    # Custom error classes
└── README.md                         # Tài liệu (file này)
```

---

## 11) Future Enhancements

- [ ] Webhook để sync thay đổi từ Google Calendar về hệ thống
- [ ] Chia sẻ calendar theo class với nhiều teachers
- [ ] Gửi email notification với Meet link to teacher/students
- [ ] Time zone handling thông minh hơn (dùng student timezone)
- [ ] Bulk create events cho many sessions
- [ ] Dashboard hiển thị lịch tuần/tuần tới
