// deploy/test-env/seed/seed-mock.mjs
//
// Mock data cho test env IT, tạo HOÀN TOÀN qua HTTP API bằng tài khoản admin — để
// đi đúng business logic (ID ngắn UNIST-/UNICL-/UNISTAFF-, ví học sinh, snapshot học
// phí, action_history) thay vì insert thẳng DB.
//
// Chạy trong container api (Node 24, có fetch), gọi qua nginx như trình duyệt:
//   docker compose ... run --rm --no-deps -T \
//     -e SEED_BASE_URL=http://nginx/api -e TEST_ADMIN_HANDLE -e TEST_ADMIN_PASSWORD \
//     -e MOCK_PASSWORD api node /app/test-seed/seed-mock.mjs
//
// Idempotent ở mức thô: thấy lớp mock đầu tiên đã tồn tại thì dừng (seed lại: remote.sh reset).
// Dữ liệu tất định (PRNG có seed cố định) → mỗi lần reset ra cùng một bộ.

const BASE = (process.env.SEED_BASE_URL || 'http://nginx/api').replace(/\/$/, '');
const ADMIN_HANDLE = mustEnv('TEST_ADMIN_HANDLE');
const ADMIN_PASSWORD = mustEnv('TEST_ADMIN_PASSWORD');
const MOCK_PASSWORD = mustEnv('MOCK_PASSWORD');
const MOCK_EMAIL_DOMAIN = 'mock.uniedu.test'; // .test (RFC 2606): không bao giờ route được
const SESSION_WEEKS_BACK = 4;

function mustEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`Thiếu biến môi trường ${name}`);
    process.exit(2);
  }
  return v;
}

// ── PRNG tất định (mulberry32) ───────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261125);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ── HTTP client: cookie auth + chờ khi bị throttle ───────────────────────────
const cookies = new Map();

async function api(method, path, body) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(cookies.size
          ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const raw of res.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    if (res.status === 429 && attempt < 6) {
      const waitSec = Number(res.headers.get('retry-after')) || 15;
      console.log(`  … 429 ở ${method} ${path}, chờ ${waitSec}s`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
      throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
    }
    return data;
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Response list của API có nhiều dạng: mảng, {data}, {items}, … */
function asList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'items', 'results', 'students', 'courses']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

// ── Dữ liệu mẫu ──────────────────────────────────────────────────────────────
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ'];
const DEM = ['Văn', 'Thị', 'Minh', 'Gia', 'Ngọc', 'Quốc', 'Thanh', 'Bảo', 'Hoài', 'Đức'];
const TEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Khoa', 'Linh', 'My', 'Nam', 'Phúc', 'Quân', 'Tâm', 'Uyên', 'Vy', 'Long', 'Hiếu', 'Trang'];
const SCHOOLS = ['THPT chuyên Lê Hồng Phong', 'THPT Nguyễn Thượng Hiền', 'THCS Trần Văn Ơn', 'THPT Gia Định', 'THCS Nguyễn Du', 'THPT chuyên Trần Đại Nghĩa'];
const GOALS = ['Thi HSG cấp thành phố', 'Vào đội tuyển Tin', 'Ôn thi chuyên Tin lớp 10', 'Nắm vững C++ cơ bản', 'Luyện Codeforces lên Specialist'];

function vnName(i) {
  const ho = HO[i % HO.length];
  const dem = DEM[(i * 7) % DEM.length];
  const ten = TEN[(i * 5) % TEN.length];
  return { first_name: `${dem} ${ten}`, last_name: ho, full_name: `${ho} ${dem} ${ten}` };
}

const pad2 = (n) => String(n).padStart(2, '0');
const phone = (seed) => `09${String(10000000 + ((seed * 7919) % 89999999)).padStart(8, '0')}`;

const COURSES = [
  { name: 'Basic', sort_order: 1 },
  { name: 'Advance', sort_order: 2 },
  { name: 'VIP', sort_order: 3 },
  { name: 'Hardcore', sort_order: 4 },
];

const STAFF = [
  { handle: 'gv01', roles: ['teacher'] },
  { handle: 'gv02', roles: ['teacher'] },
  { handle: 'gv03', roles: ['teacher'] },
  { handle: 'gv04', roles: ['teacher', 'lesson_plan'] },
  { handle: 'cskh01', roles: ['customer_care'] },
  { handle: 'ketoan01', roles: ['accountant_income', 'accountant_expense'] },
  { handle: 'daotao01', roles: ['training_head'] },
  { handle: 'giaoan01', roles: ['lesson_plan_head'] },
];

// dayOfWeek: 0 = Chủ nhật … 6 = Thứ bảy (ScheduleSlotDto)
const CLASSES = [
  { name: 'Basic K1 · T2/T5 19:00', course: 'Basic', teacher: 'gv01', tuition: 150_000, allowance: 40_000, max: 12,
    slots: [[1, '19:00:00', '20:30:00'], [4, '19:00:00', '20:30:00']], students: range(1, 8) },
  { name: 'Basic K2 · T3/T6 19:00', course: 'Basic', teacher: 'gv02', tuition: 150_000, allowance: 40_000, max: 12,
    slots: [[2, '19:00:00', '20:30:00'], [5, '19:00:00', '20:30:00']], students: range(9, 16) },
  { name: 'Advance A1 · T7 09:00', course: 'Advance', teacher: 'gv03', tuition: 200_000, allowance: 50_000, max: 10,
    slots: [[6, '09:00:00', '11:00:00']], students: [1, 2, ...range(17, 22)] },
  { name: 'VIP V1 · CN 14:00', course: 'VIP', teacher: 'gv01', tuition: 300_000, allowance: 80_000, max: 6,
    slots: [[0, '14:00:00', '16:00:00']], students: range(23, 26) },
  { name: 'Hardcore H1 · T4 19:30', course: 'Hardcore', teacher: 'gv04', tuition: 250_000, allowance: 60_000, max: 8,
    slots: [[3, '19:30:00', '21:30:00']], students: [17, ...range(27, 30)] },
];
const STUDENT_COUNT = 30;

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * Trạng thái điểm danh của một học sinh ở một buổi.
 *
 * Quyết định này định hình bộ dữ liệu test: tỉ lệ có mặt / vắng có phép / vắng không
 * phép ảnh hưởng trực tiếp tới học phí bị trừ ví, công giáo viên và các báo cáo
 * chuyên cần — tức là những màn hình bạn sẽ test nhiều nhất.
 *
 * @param {number} studentNo   số thứ tự học sinh (1..30, hs01..hs30)
 * @param {number} sessionIdx  thứ tự buổi trong lớp, 0 = buổi cũ nhất
 * @param {() => number} rnd   PRNG tất định trả [0, 1) — dùng thay Math.random
 * @returns {'present' | 'excused' | 'absent'}
 */
function pickAttendanceStatus(studentNo, sessionIdx, rnd) {
  // TODO(bạn): phân bố điểm danh cho mock data (5–10 dòng).
  void studentNo;
  void sessionIdx;
  void rnd;
  return 'present';
}

/** Số dư nạp ban đầu: phần lớn đủ học, vài em 0đ để test nợ học phí / nhắc nạp ví. */
function initialTopUp(studentNo) {
  if (studentNo % 7 === 0) return 0;
  return studentNo % 3 === 0 ? 1_000_000 : 3_000_000;
}

// ── Lịch buổi học quá khứ theo slot ──────────────────────────────────────────
// Giờ VN (UTC+7) — tránh lệch ngày khi container chạy UTC.
function vnToday() {
  const nowVn = new Date(Date.now() + 7 * 3600 * 1000);
  return new Date(Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate()));
}

function vnDateDaysAgo(days) {
  return new Date(vnToday().getTime() - days * 86400 * 1000).toISOString().slice(0, 10);
}

function pastDatesForSlot(dayOfWeek, weeksBack) {
  const today = vnToday();
  const out = [];
  for (let d = 1; d <= weeksBack * 7; d++) {
    const day = new Date(today.getTime() - d * 86400 * 1000);
    if (day.getUTCDay() === dayOfWeek) out.push(day.toISOString().slice(0, 10));
  }
  return out.reverse();
}

const LESSONS = [
  'Ôn tập vòng lặp và mảng', 'Sắp xếp và tìm kiếm nhị phân', 'Đệ quy và quay lui',
  'Quy hoạch động cơ bản', 'Đồ thị: BFS/DFS', 'Cấu trúc dữ liệu: stack, queue, deque',
  'Prefix sum và two pointers', 'Tham lam', 'Cây khoảng (segment tree)',
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Seed mock → ${BASE}`);
  await api('POST', '/auth/login', { accountHandle: ADMIN_HANDLE, password: ADMIN_PASSWORD });
  console.log(`✓ Đăng nhập admin "${ADMIN_HANDLE}"`);

  // Dấu hiệu đã seed: lớp mock đầu tiên tồn tại. (Không dùng khoá học làm dấu hiệu —
  // migration 20260818090000_add_class_category tự chèn sẵn VIP/Basic/Advance/Hardcore.)
  const marker = CLASSES[0].name;
  const existingClasses = asList(await api('GET', `/class?search=${encodeURIComponent(marker)}&limit=10`));
  if (existingClasses.some((c) => c.name === marker)) {
    console.log(`Đã có mock data (lớp "${marker}" tồn tại) — bỏ qua. Seed lại: remote.sh reset --yes`);
    return;
  }

  // 1. Khoá học: dùng lại khoá migration đã tạo (khớp tên), chỉ tạo khoá còn thiếu.
  const courseIds = {};
  const existingCourses = asList(await api('GET', '/courses?limit=100'));
  let createdCourses = 0;
  for (const c of COURSES) {
    const found = existingCourses.find((e) => e.name?.trim().toLowerCase() === c.name.toLowerCase());
    if (found) {
      courseIds[c.name] = found.id;
      continue;
    }
    const created = await api('POST', '/courses', { name: c.name, sort_order: c.sort_order });
    courseIds[c.name] = created.id;
    createdCourses++;
  }
  console.log(`✓ ${COURSES.length} khoá học (${COURSES.length - createdCourses} có sẵn từ migration, ${createdCourses} tạo mới)`);

  // 2. Nhân sự
  const staffIds = {};
  for (const [i, s] of STAFF.entries()) {
    const name = vnName(100 + i * 3);
    const res = await api('POST', '/users/staff', {
      email: `${s.handle}@${MOCK_EMAIL_DOMAIN}`,
      password: MOCK_PASSWORD,
      accountHandle: s.handle,
      phone: phone(500 + i),
      full_name: name.full_name,
      roles: s.roles,
      emailVerified: true,
      cccd_number: `0790${String(90000000 + i).padStart(8, '0')}`,
      gender: i % 2 ? 'female' : 'male',
      university: pick(['ĐH Khoa học Tự nhiên', 'ĐH Bách khoa', 'ĐH Công nghệ Thông tin']),
    });
    staffIds[s.handle] = res.staffId;
  }
  console.log(`✓ ${STAFF.length} nhân sự (${STAFF.map((s) => s.handle).join(', ')})`);

  // 3. Lớp học (chưa gán học sinh — học sinh tự gán qua class_ids lúc tạo)
  const scheduleStart = vnDateDaysAgo(SESSION_WEEKS_BACK * 7 + 1);
  const classIds = [];
  for (const c of CLASSES) {
    const created = await api('POST', '/class', {
      name: c.name,
      course_id: courseIds[c.course],
      status: 'running',
      max_students: c.max,
      pricing_mode: 'per_session',
      student_tuition_per_session: c.tuition,
      allowance_per_session_per_student: c.allowance,
      // effectiveFrom mặc định = hôm nay → buổi quá khứ bị chặn "không trùng lịch cố định"
      // (session-schedule-rules.service.ts). Admin được backdate slot lúc tạo lớp.
      schedule: c.slots.map(([dayOfWeek, from, to]) => ({ dayOfWeek, from, to, effectiveFrom: scheduleStart })),
      teachers: [{ teacher_id: staffIds[c.teacher] }],
      training_manager_staff_id: staffIds.daotao01,
    });
    classIds.push(created.id);
  }
  console.log(`✓ ${CLASSES.length} lớp`);

  // 4. Học sinh
  for (let no = 1; no <= STUDENT_COUNT; no++) {
    const name = vnName(no);
    const handle = `hs${pad2(no)}`;
    await api('POST', '/users/student', {
      email: `${handle}@${MOCK_EMAIL_DOMAIN}`,
      phone: phone(no),
      password: MOCK_PASSWORD,
      accountHandle: handle,
      first_name: name.first_name,
      last_name: name.last_name,
      birth_year: 2008 + (no % 6),
      gender: no % 2 ? 'male' : 'female',
      school: pick(SCHOOLS),
      parent_name: `${name.last_name} ${pick(['Văn', 'Thị'])} ${pick(TEN)}`,
      parent_phone: phone(1000 + no),
      goal: pick(GOALS),
      status: 'active',
      emailVerified: true,
      class_ids: CLASSES.flatMap((c, idx) => (c.students.includes(no) ? [classIds[idx]] : [])),
    });
  }
  console.log(`✓ ${STUDENT_COUNT} học sinh (hs01..hs${pad2(STUDENT_COUNT)})`);

  // 5. Map học sinh ↔ id qua danh sách lớp (API tạo user không trả studentId)
  const studentIdByNo = new Map();
  const classStudents = [];
  for (const [idx, classId] of classIds.entries()) {
    const list = asList(await api('GET', `/class/${classId}/students`));
    const ids = [];
    for (const st of list) {
      // Row là StudentClass (+ include student): `id` của row KHÔNG phải studentId.
      const id = st.studentId ?? st.student?.id;
      const fullName = st.student?.fullName ?? st.student?.full_name ?? st.fullName ?? st.full_name;
      const no = matchStudentNo(fullName, CLASSES[idx].students);
      if (id && no) {
        studentIdByNo.set(no, id);
        ids.push({ no, id });
      }
    }
    if (ids.length !== CLASSES[idx].students.length) {
      throw new Error(
        `Lớp "${CLASSES[idx].name}": map được ${ids.length}/${CLASSES[idx].students.length} học sinh — kiểm tra shape GET /class/:id/students`,
      );
    }
    classStudents.push(ids);
  }

  // 6. Nạp ví ban đầu (manual top-up có lý do — đi qua wallet history như thật)
  let topUps = 0;
  for (const [no, studentId] of studentIdByNo) {
    const amount = initialTopUp(no);
    if (!amount) continue;
    await api('PATCH', '/student/update-student-account-balance', {
      student_id: studentId,
      amount,
      reason: 'Mock data: nạp ví ban đầu (test env)',
    });
    topUps++;
  }
  console.log(`✓ Nạp ví ${topUps} học sinh`);

  // 7. Buổi học quá khứ + điểm danh
  let sessionCount = 0;
  const paidBefore = new Date(Date.now() - 14 * 86400 * 1000).toISOString().slice(0, 10);
  for (const [idx, c] of CLASSES.entries()) {
    const occurrences = c.slots
      .flatMap(([dow, from, to]) => pastDatesForSlot(dow, SESSION_WEEKS_BACK).map((date) => ({ date, from, to })))
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const [sessionIdx, occ] of occurrences.entries()) {
      const lesson = LESSONS[(idx + sessionIdx) % LESSONS.length];
      await api('POST', '/sessions', {
        classId: classIds[idx],
        teacherId: staffIds[c.teacher],
        date: occ.date,
        startTime: occ.from,
        endTime: occ.to,
        lessonContent: `<p>${lesson}</p>`,
        homework: `<p>Bài tập về nhà: luyện thêm 3 bài chủ đề "${lesson}".</p>`,
        tutorial: '<p>Xem lại slide và code mẫu trên nhóm lớp.</p>',
        coefficient: 1,
        teacherPaymentStatus: occ.date < paidBefore ? 'paid' : 'unpaid',
        // Nhận xét buổi bắt buộc (session-validation.service.ts); IT không có kiểm tra trong buổi.
        progressStatus: 'completed',
        nextSessionPlan: `<p>${LESSONS[(idx + sessionIdx + 1) % LESSONS.length]}</p>`,
        attendance: classStudents[idx].map(({ no, id }) =>
          attendanceItem(id, pickAttendanceStatus(no, sessionIdx, rand)),
        ),
      });
      sessionCount++;
    }
  }
  console.log(`✓ ${sessionCount} buổi học (${SESSION_WEEKS_BACK} tuần gần nhất) kèm điểm danh`);
  console.log('Xong.');
}

/**
 * Một dòng điểm danh hợp lệ theo session-validation.service.ts:
 *   present → bắt buộc strengths, improvements, homeworkQuality, homeworkComment
 *   excused → bắt buộc notes (lý do nghỉ)
 *   absent  → không cần gì thêm
 */
function attendanceItem(studentId, status) {
  if (status === 'excused') {
    return { studentId, status, notes: pick(['Ốm, phụ huynh đã báo', 'Trùng lịch thi ở trường', 'Gia đình có việc']) };
  }
  if (status === 'absent') return { studentId, status };
  return {
    studentId,
    status,
    strengths: pick(['Nắm bài nhanh', 'Code gọn, đặt tên biến rõ ràng', 'Chủ động hỏi bài']),
    improvements: pick(['Cần test kỹ trường hợp biên', 'Tính độ phức tạp trước khi code', 'Làm BTVN đều hơn']),
    homeworkQuality: pick(['passed', 'passed', 'needs_revision', 'failed']),
    homeworkComment: pick(['Làm đủ bài', 'Thiếu 1 bài cuối', 'Sai ở bài quy hoạch động']),
  };
}

/** Tên đầy đủ do vnName sinh là duy nhất trong 1..30 → map ngược về số thứ tự. */
function matchStudentNo(fullName, candidates) {
  if (!fullName) return null;
  const normalized = String(fullName).trim();
  return candidates.find((no) => vnName(no).full_name === normalized) ?? null;
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
