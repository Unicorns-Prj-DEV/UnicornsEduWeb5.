# API khoá học — phân quyền & phạm vi

Nguồn triển khai: `apps/api/src/class/course.controller.ts`, `course.service.ts`, `course-access.service.ts`.

> **Vé 06–08 (API):** HTTP path, DTO, Swagger và Nest module nói **Chuyên đề** (`modules`) và **Tiết học** (`lessons`). Không còn `/chapters`, `/topics`, `/lectures` hay alias tương thích ngược. Schema vật lý: vé 05; nghiệm thu typecheck/test: vé 08.

Nguồn sự thật cho guard controller. Tầng service (`CourseAccessService`) vẫn kiểm từng khoá sau khi request qua được decorator.

`UserRole.admin` (và staff có `staffInfo.roles` chứa `admin`) luôn được coi là admin đầy đủ trên các route dùng `@Roles(UserRole.admin)` + `@AllowStaffRolesOnAdminRoutes(...)`.

## CRUD khoá (`CourseController`)

| Endpoint | admin | `assistant` | `lesson_plan_head` | `lesson_plan` | `teacher` |
| --- | --- | --- | --- | --- | --- |
| `GET /courses` | ✅ (class-level `admin` + `staff`) | ✅ | ✅ chỉ khoá được gán | ✅ chỉ khoá được gán | ✅ |
| `GET /courses/:id` | ✅ | ✅ | ✅ khoá được gán | ✅ khoá được gán (`assertCanManageCourse`) | ❌ |
| `POST /courses` | ✅ | ✅ | ✅ (tự gán người tạo vào đội giáo án) | ❌ | ❌ |
| `PATCH /courses/:id` | ✅ | ✅ | ✅ khoá được gán | ❌ | ❌ |
| `DELETE /courses/:id` | ✅ | ✅ | ✅ khoá được gán | ❌ | ❌ |
| `GET/POST/PATCH/DELETE` difficulty-levels | ✅ | ✅ | ✅ khoá được gán | ✅ khoá được gán | ❌ |
| `GET /courses/:id/lesson-plan-members` | ✅ | ✅ | ✅ khoá được gán | ✅ khoá được gán | ❌ |
| `PUT /courses/:id/lesson-plan-members` | ✅ | ✅ | ✅ khoá được gán | ❌ | ❌ |
| `GET /courses/lesson-plan-staff` | ✅ | ✅ | ✅ | ❌ | ❌ |

`POST` / `PATCH` / `DELETE` khoá: controller resolve actor rồi truyền xuống `CourseService.create/update/remove(actor, …)`. `update` / `remove` gọi `assertCanManageCourse` sau check 404 — trưởng giáo án sửa/xoá khoá không được gán → `403`. `create` do người không phải manager (trưởng giáo án) gọi thì tự thêm người tạo vào `course_lesson_plan_members`, để khoá vừa tạo không biến mất khỏi danh sách của họ. Trưởng giáo án **không** còn trong `COURSE_MANAGER_STAFF_ROLES` (ticket 20); hoa hồng trưởng giáo án không phụ thuộc gán khoá. `PUT .../lesson-plan-members` không chặn trưởng giáo án tự gỡ mình khỏi đội — gỡ xong mất quyền khoá ngay, cần admin/trợ lí hoặc trưởng giáo án khác của khoá gán lại. Lịch sử quyết định: `docs/adr/2026-09-10-course-workspace.md`.

**Bán một lần (`is_one_time`):** `POST`/`PATCH /courses` nhận `is_one_time?: boolean`. Đổi giá trị (hoặc tạo với `true`) chỉ admin/trợ lí; trưởng giáo án → `403`. Bật trả `400` nếu lớp nào của khoá đã có điểm danh present/excused mang học phí > 0, hoặc còn lớp có Tổng gói null/≤ 0. Tắt luôn được. Mọi lớp của khoá đổi `pricing_mode` theo (`one_time` / `per_session`) trong cùng transaction, không tính lại buổi nào. Response khoá có `isOneTime`. Chi tiết: `docs/Database Schema.md` mục 4.4.0-cat và ADR `docs/adr/2026-10-04-one-time-course-setting.md`.

`DELETE /courses/:id` trả `400` khi còn lớp dùng khoá, message:

`Không thể xoá: còn N lớp đang dùng khoá học này. Hãy chuyển lớp sang khoá khác hoặc chỉ ẩn (is_active=false) khoá học này.`

## `GET /courses`

Danh sách khoá học cho dropdown tạo/sửa lớp và trang quản trị khoá. Cookie auth (`access_token`); `@Roles(admin, staff)` — chưa đăng nhập trả 401 như trước.

Query:

- `includeInactive` (optional): `true` thì gồm khoá `is_active=false`.

Mỗi dòng kèm `_count.classes`, `_count.lessonPlanMembers`, `_count.difficultyLevels` (chỉ mức khó đang active).

### Lọc theo người gọi (server-side)

Phạm vi **không** nhận cờ từ client. Controller resolve actor rồi gọi `CourseAccessService.resolveListableCourseIds`.

| Actor | Kết quả list |
| --- | --- |
| Đội giáo án thuần (`lesson_plan` và/hoặc `lesson_plan_head`, không kèm `admin` / `assistant`) | Chỉ khoá được gán trong `course_lesson_plan_members` |
| `admin`, `assistant`, `training`, `accountant_income`, `accountant_expense`, `teacher`, `customer_care` | Tất cả khoá (không đổi so với trước) |
| User đã auth nhưng không có staff profile, và không phải `lesson_plan` thuần | Tất cả khoá; không crash |

`resolveListableCourseIds` trả `null` = mọi khoá, trả mảng = chỉ các id đó. **Không** dùng `resolveViewableCourseIds` cho endpoint này: hàm kia là phạm vi *quản lý nội dung* và sẽ trả mảng rỗng cho training/giáo viên/kế toán (dropdown khoá trống khi tạo lớp).

## Cây nội dung khoá (Chuyên đề / Tiết học)

Controller: `apps/api/src/course-content/` — `course-module.controller.ts`, `course-lesson.controller.ts`, `lesson-quiz.controller.ts`. Module Nest: `CourseContentModule` (không đụng `apps/api/src/lesson/` — đó là giáo án nhân sự).

| Endpoint nhóm | admin | `assistant` | `lesson_plan_head` | `lesson_plan` | `teacher` (decorator) |
| --- | --- | --- | --- | --- | --- |
| Chuyên đề: `GET/POST/PATCH/DELETE /course/:courseId/modules` + `POST .../reorder` | ✅ | ✅ | ✅ khoá được gán | ✅ khoá được gán (`assertCanManageCourse`) | Có trên decorator; service 403 nếu không thuộc đội giáo án |
| Tiết học: `GET/POST/PATCH/DELETE /course/:courseId/modules/:moduleId/lessons` + `POST .../reorder` | ✅ | ✅ | ✅ khoá được gán | ✅ khoá được gán | Cùng quy tắc `teacher` |
| Quiz ôn nhẹ: `GET/POST/DELETE /lessons/:lessonId/quizzes` | ✅ | ✅ | ✅ khoá được gán | ✅ | Có trên decorator; service vẫn `assertCanManageCourse` |
| Câu hỏi tiết thực hành: `GET/POST/PATCH/DELETE /lessons/:lessonId/questions` | ✅ | ✅ | ✅ khoá được gán | ✅ khoá được gán | Cùng quy tắc `teacher` |

Tạo chuyên đề: body `POST /course/:courseId/modules` là `{ "title": "..." }`. `courseId` lấy từ path; gửi thêm trong body cũng được, controller ghi đè bằng param.

Loại tiết: `LessonKind` = `theory` (video/nội dung) hoặc `practice` (chỉ tập câu hỏi). Tạo/sửa tiết thực hành kèm `videoUrl` hoặc `content` → `400` *«Tiết thực hành không được kèm video hoặc nội dung — chỉ gồm tập câu hỏi.»*

Xoá chuyên đề hoặc tiết học khi còn lần giao **tiết thực hành** (`class_content_items`, **kể cả item đang ẩn**) → `409` *«Không thể xoá chuyên đề/tiết học: còn N lớp đang tham chiếu — {tên lớp} (X lần giao đang hiện, Y lần giao đang ẩn).»* Item tiết lý thuyết không chặn: xoá tiết lý thuyết / chuyên đề xoá luôn item lý thuyết ở mọi lớp (cùng transaction).

Tạo tiết lý thuyết trong chuyên đề → tự thêm vào mọi lớp đã thêm chuyên đề đó (item + dòng timeline). Tạo tiết với `classId` (tiết riêng lớp) → `400` *«Lớp không tạo tiết riêng nữa. Hãy thêm chuyên đề của khoá hoặc giao tiết thực hành có sẵn.»* Sửa/xoá tiết đã lưu trữ (`archivedAt`, tiết riêng lớp cũ) → `400` *«Tiết học đã lưu trữ, không sửa hay xoá được.»* ADR `docs/adr/2026-10-02-class-content-by-module.md`.

## Chuyên đề của lớp (`/class/:classId/modules`)

Controller: `class-course-module.controller.ts` (`ClassCourseModuleService`). Quyền: admin + staff `assistant`/`teacher` (cùng `validateStaffClassAccess` với nội dung lớp).

| Method | Path | Body | Kết quả |
| --- | --- | --- | --- |
| `GET` | `/class/:classId/modules` | — | `ClassModuleResponseDto[]`: mọi chuyên đề của khoá của lớp, theo `sortOrder` khoá — `{ moduleId, title, sortOrder, classSortOrder, theoryLessonCount, practiceLessonCount, added, addedAt }` (đếm tiết chưa lưu trữ; `classSortOrder` = thứ tự nhóm của lớp, `null` khi chưa thêm) |
| `POST` | `/class/:classId/modules` | `{ "moduleId": "..." }` | Thêm chuyên đề: nhóm **lên đầu** thứ tự lớp; tạo item + dòng timeline cho tiết lý thuyết còn thiếu (thứ tự theo `order` tiết); hiện lại item (lý thuyết + lần giao) ẩn với `hiddenReason = module_removed`, item gia sư tự ẩn (`manual`) giữ ẩn. Trả danh sách mới. `400` chuyên đề khác khoá; `409` *«Lớp đã có chuyên đề này.»* |
| `DELETE` | `/class/:classId/modules/:moduleId` | — | Gỡ chuyên đề = coi như chưa từng thêm: ẩn mềm (`module_removed`) item lý thuyết **và lần giao thực hành** của chuyên đề + dòng timeline; lượt xem, attempt giữ nguyên. Trả danh sách mới. `404` *«Lớp chưa thêm chuyên đề này.»* |
| `PUT` | `/class/:classId/modules/order` | `{ "moduleIds": ["..."] }` | Sắp lại thứ tự nhóm chuyên đề của lớp (`class_modules.sort_order`; học sinh thấy cùng thứ tự). `moduleIds` phải đúng **mọi** chuyên đề lớp đang có, mỗi id một lần — trùng/thiếu/thừa → `400`. Không đổi `modules.sort_order`. Trả danh sách mới. |
| `GET` | `/class/:classId/modules/:moduleId/removal-impact` | — | `ClassModuleRemovalImpactDto` `{ moduleId, ungradedEssayCount, inProgressStudentCount }`: số câu tự luận đã nộp chưa chấm + số học sinh đang làm dở lần giao của chuyên đề. Dialog xác nhận gỡ hiện cảnh báo, **không chặn** gỡ. |

ADR `docs/adr/2026-10-05-class-module-order-and-removal.md`.

Liên quan nội dung lớp (`/class/:classId/content`):

- `POST` chỉ nhận `{ lessonId, openAt?, durationMinutes }` của **tiết thực hành** có sẵn trong khoá. Thiếu `lessonId` → `400` (không tạo tiết riêng). Tiết lý thuyết → `400` *«Tiết lý thuyết vào lớp theo chuyên đề…»*. Tiết đã lưu trữ → `404`. Tiết thuộc chuyên đề lớp **chưa thêm** (hoặc khoá khác) → `400` *«Lớp chưa thêm chuyên đề chứa tiết thực hành này. Hãy thêm chuyên đề trước khi giao.»* Gỡ chuyên đề thì lần giao của nó bị ẩn cùng (`module_removed`), thêm lại chuyên đề thì hiện lại.
- `POST .../:itemId/restore` item thuộc chuyên đề (lý thuyết hoặc lần giao) khi lớp chưa thêm chuyên đề đó → `400`; tiết đã lưu trữ → `400`. Ẩn tay (`DELETE /class/:classId/content/:itemId`) ghi `hiddenReason = manual`; khôi phục xoá lý do.
- `GET /class/:classId/content/course-lessons` chỉ trả tiết thực hành chưa lưu trữ thuộc chuyên đề lớp đã thêm (`moduleId`, `alreadyAdded`).
- Tiết đã lưu trữ (`lessons.archived_at`) không hiện ở màn nào: `GET` nội dung lớp + timeline (staff, kể cả item đang ẩn; học sinh) bỏ item/dòng của tiết đó. Học sinh mở tiết/lần giao đó (`/users/me/student-classes/:classId/lessons/:lessonId`, `/view`, attempt) và staff xem tiến độ lý thuyết, hàng đợi chấm tự luận, thống kê lần giao → `404`. `POST /class/:classId/content/reorder` không cần (và không nhận, `400`) id của tiết đã lưu trữ. Dữ liệu giữ nguyên trong DB.
- `GET /class/:classId/content/groups` (admin + staff `assistant`/`teacher`, #153): `ClassContentModuleGroupDto[]` — `{ moduleId, title, added, theoryItems, practiceItems }`. Một nhóm cho mỗi chuyên đề lớp **đang có** (kể cả rỗng; chuyên đề đã gỡ không có nhóm), theo thứ tự nhóm của lớp (`class_modules.sort_order`); trong nhóm lý thuyết theo `order` tiết, thực hành theo `sortOrder` item. Item không thuộc chuyên đề → nhóm cuối `moduleId: null`, `title: "Ngoài chuyên đề"`. Cùng bộ lọc với `GET` nội dung lớp (gồm item đang ẩn, bỏ tiết đã lưu trữ). Item có thêm `moduleId`.
- `GET /class/:classId/content/student/groups` (học sinh, #156): cùng shape và cách gom như `/content/groups`, nhưng chỉ item học sinh thấy (bỏ item `hiddenAt`, tiết đã lưu trữ — cùng lọc `GET /content/student`), cùng thứ tự nhóm của lớp. Tiết thực hành chưa tới `openAt` vẫn trả về với `isOpen=false`. `403` khi không học lớp hoặc lớp hết hạn xem nội dung; `404` khi tài khoản không có hồ sơ học sinh.
- `GET` danh sách nội dung (staff + học sinh) sắp theo `sortOrder` chuyên đề → trong chuyên đề: lý thuyết theo `order`, rồi thực hành theo `sortOrder` item; item không có chuyên đề ở cuối.

`lesson_plan` thuần soạn cây nội dung trên khoá được gán. GET list chuyên đề kèm `lessonCount`; GET list tiết kèm `quizCount` / `questionCount`.

Học sinh: `GET/POST /users/me/student-classes/:classId/lessons/:lessonId` (+ `/view`, `/quizzes`). Không còn path lồng `topics`/`lectures`.

## Không đổi trong ticket 02

- `question.controller.ts`
- `exam-library.controller.ts`
- các endpoint `difficulty-levels` trên `CourseController`

## Hồ sơ môn IT (`LMS_PROFILE=it`) — câu hỏi Tin học (#178–#191)

ADR `docs/adr/2026-10-07-instance-subject-profile.md`, `docs/adr/2026-10-07-it-absolute-scoring-and-answer-key-regrade.md`.

| Method | Path | Ghi chú |
| --- | --- | --- |
| `GET` | `/public/app-config` | Không cần đăng nhập. `{ profile, questionTypes, optionCount: { min, max, default }, scoring, electiveGroups }`. IT: `questionTypes = ["single_choice","true_false_group"]`, `scoring = "absolute_it"`, `electiveGroups = true`. Web cache vô hạn (`useAppConfig`). |
| `POST/PATCH` | `/questions`, `POST /questions/bulk` | `type` phải thuộc `questionTypes` của hồ sơ (IT gửi `essay` → `400`). `true_false_group`: `options` đúng 4 chuỗi (nhận định a–d) + `tfAnswerKey: boolean[4]`, không có `correctIndex`. Loại khác gửi `tfAnswerKey` → `400`. Sửa `correctIndex`/`tfAnswerKey` → chấm lại im lặng các bài đã nộp có câu này. |
| `PATCH` | tiết học (khoá học / lớp / thư viện đề) | Nhận thêm `elective1Name`, `elective2Name` (`string \| null`, ≤ 120 ký tự). |
| `POST/PATCH` | `/lessons/:lessonId/questions` | Nhận thêm `slot`: `required` \| `elective_1` \| `elective_2`. Chỉ câu `true_false_group` được vào nhóm tự chọn; hồ sơ không có `electiveGroups` → chỉ nhận `required`. Summary trả `formWarning` (`null` khi hợp lệ; cảnh báo khi nhóm tự chọn chứa câu không phải Đúng/Sai, chỉ có một nhóm, hoặc hai nhóm lệch số câu). Đề sai form → học sinh bắt đầu làm bài bị `400` và câu kèm `tfAnswerKey`. |
| `PATCH` | `.../attempts/:attemptId/answers`, `POST .../submit` | Mỗi câu nhận thêm `tfChoices: (boolean \| null)[4]` (null = bỏ trống nhận định). |
| `GET` | chi tiết attempt (học sinh) | Thêm `scoring`, `electiveVoided`, `electiveGroupNames: { elective_1, elective_2 }`; mỗi câu thêm `slot`, `tfChoices`, `tfAnswerKey` (chỉ sau khi nộp). Điểm `absolute_it` là 1/100 điểm: 1000 = 10,00đ. |
| `POST` | ôn nhẹ `/users/me/student-classes/:classId/lessons/:lessonId/quizzes` | Câu Đúng/Sai gửi `tfChoices`; review trả `tfAnswerKey`. |

Chấm `absolute_it`: trắc nghiệm đúng = 25; Đúng/Sai theo số ý đúng 1 → 10, 2 → 25, 3 → 50, 4 → 100. Có nhận định được chọn ở cả hai nhóm tự chọn → `electiveVoided = true`, mọi câu tự chọn 0 điểm.

## Hồ sơ môn JP (`LMS_PROFILE=jp`) — câu hỏi tiếng Nhật (#193–#203)

Thuật ngữ: `CONTEXT.md` (Kỹ năng, Câu Đúng/Sai, Câu điền vào ô trống, Câu sắp xếp, Tư liệu dùng chung, Giới hạn nghe…).

| Method | Path | Ghi chú |
| --- | --- | --- |
| `GET` | `/public/app-config` | Thêm `questionSkills`, `questionWeights`, `essayInputSizes`, `sharedMaterials`, `questionAudio: boolean` (JP `true`). JP `questionTypes = ["single_choice","essay","true_false","fill_blank","ordering"]`. |
| `POST/PATCH` | `/questions`, `POST /questions/bulk` | `skills: QuestionSkill[]` (`kanji` \| `vocabulary` \| `grammar` \| `reading` \| `listening` \| `conversation` \| `writing`). JP: tạo/sửa phải có ≥1 kỹ năng, không trùng (sửa câu cũ chưa có kỹ năng mà không gửi `skills` → `400`); bulk kiểm tra từng câu như tạo (nhập AI chọn kỹ năng chung cho cả lô). IT/ENG gửi `skills` khác rỗng → `400`. |
| `POST/PATCH` | `/questions` | `type: 'true_false'` (Câu Đúng/Sai, chỉ JP; IT/ENG → `400`): nhận định ở `content`, `tfAnswerKey: [boolean]` (đúng 1 phần tử), không `options`/`correctIndex`; `tfLabelStyle: 'maru_batsu' \| 'dung_sai' \| 'true_false' \| null` (`null` = ○/×; loại khác gửi → `400` *Chỉ Câu Đúng/Sai có kiểu nhãn.*). Bài làm: học sinh gửi `tfChoices: [boolean]`; câu trả về `tfChoices` 1 phần tử và `tfLabelStyle` (snapshot); không xáo; chấm cả câu; xem lại có `tfAnswerKey`. Sửa đáp án → chấm lại như câu khác. Ôn nhẹ: chọn một lựa chọn là đã trả lời. |
| `POST/PATCH` | `/questions` | `type: 'fill_blank'` (Câu điền vào ô trống, chỉ JP): ô là dấu `[[___]]` trong `content`; `blankAnswerKey: string[][]` — đáp án hợp lệ từng ô theo thứ tự, số phần tử = số dấu (1–10 ô, mỗi ô 1–10 đáp án ≤ 200 ký tự); không `options`/`correctIndex`/`tfAnswerKey`. Loại khác gửi `blankAnswerKey` → `400` *Chỉ câu điền vào ô trống có đáp án ô trống.* Response câu hỏi và `QuestionLink.question` có `blankAnswerKey`. Bài làm: học sinh gửi `blankAnswers: (string\|null)[]` (≤ 10 phần tử, mỗi chuỗi ≤ 200); câu trả về `blankCount` + `blankAnswers` (loại khác `null`); xem lại có `blankAnswerKey`. Chấm từng ô (bỏ khoảng trắng đầu/cuối, toàn góc = nửa góc cho số/Latin, không phân biệt hoa/thường), điểm = `round(pointsPossible × ô đúng / số ô)`, `isCorrect` khi đúng mọi ô; đã làm = mọi ô có chữ. Sửa đáp án ô → chấm lại lượt có cùng số ô. Ôn nhẹ: `GET …/lesson-quizzes` của học sinh trả `blankCount`, `blankAnswerKey: null`; `POST` nhận `blankAnswers`; câu trả lời ôn nhẹ trả `blankAnswers` + `question.blankAnswerKey`. |
| `POST/PATCH` | `/questions` | `type: 'ordering'` (Câu sắp xếp, chỉ JP): `options` = 2–12 thẻ không rỗng theo **đúng thứ tự** (thẻ trùng chữ hợp lệ); không `correctIndex`/`tfAnswerKey`. Lỗi `400`: *Câu sắp xếp phải có 2–12 thẻ.* / *Thẻ N không được để trống.* Bài làm: `options` của câu là thẻ đã xáo (luôn xáo lúc start); học sinh gửi `orderAnswer: string[]` (chữ thẻ theo thứ tự xếp, ≤ 12 phần tử, mỗi chuỗi ≤ 200); câu trả về `orderAnswer` (loại khác `null`); xem lại có `orderingKey: string[]` (thứ tự đúng). Chấm cả chuỗi (khớp toàn bộ mới có điểm); đã làm = dùng hết thẻ. Sửa thẻ → chấm lại lượt có cùng bộ thẻ. Ôn nhẹ: `GET …/lesson-quizzes` của học sinh trả `options` đã xáo cố định theo học sinh + câu; `POST` nhận `orderAnswer`; câu trả lời ôn nhẹ trả `orderAnswer` + `question.options` (thứ tự đúng). |
| `POST/PATCH` | `/questions` | `essayInputSize: 'short' \| 'long' \| null` — kiểu ô câu tự luận (JP). Câu không phải tự luận gửi → `400` *Chỉ câu tự luận có kiểu ô nhập.*; IT/ENG gửi → `400`. `null` = ô dài (câu cũ). Trả về trên câu hỏi, câu của tiết, quiz ôn nhẹ và câu trong bài làm (`AttemptQuestionDto.essayInputSize`, snapshot lúc start). Màn chấm tự luận không đổi. |
| `GET` | `/questions` | Lọc thêm `skill=<QuestionSkill>` (câu có kỹ năng đó), kết hợp với bộ lọc sẵn có. |
| `GET/POST/PATCH/DELETE` | `/shared-materials[?courseId=]`, `/shared-materials/:id` | Tư liệu dùng chung (JP; hồ sơ khác → `400`). List theo `courseId` trả `{ id, courseId, moduleId, title, content, questionCount, createdAt, updatedAt }`. Tạo bắt buộc `moduleId` (chuyên đề của bộ, cùng khoá → khác `400`) + `title` (1–200) + `content` HTML (rỗng được); phần đầu bộ phải có ít nhất một trong văn bản / ảnh (`<img>`) / `audioId`, thiếu cả ba (tạo hoặc sau khi sửa) → `400` "Phần đầu bộ cần có văn bản, ảnh hoặc audio."; sửa `moduleId` → mọi câu trong bộ chuyển chuyên đề theo. `POST/PATCH /questions` với `sharedMaterialId`: bộ phải cùng chuyên đề với câu (`400` "Câu phải cùng chuyên đề với bộ."); câu mới vào bộ xếp cuối bộ (`setPosition`). `DELETE` = xoá mềm bộ cùng mọi câu, gỡ khỏi mọi tiết thực hành / bài ôn (lượt đã bắt đầu / đã nộp giữ snapshot); bộ đã xoá → `404`, không còn trong list, không gắn câu / thêm vào tiết được. Ghi lịch sử thao tác (`shared_material`). |
| `PUT` | `/shared-materials/:id/question-order` | Sắp lại thứ tự câu trong Bộ câu hỏi. Body `{ questionIds: string[] }` — đủ mọi câu chưa xoá của bộ, mỗi câu một lần (thiếu / thừa / trùng → `400`); vị trí `setPosition` = thứ tự trong danh sách. |
| `POST/PATCH/GET` | `/questions` | `sharedMaterialId: string \| null` — gắn câu vào tư liệu cùng khoá (khác khoá / không tồn tại → `400`); lọc `GET /questions?sharedMaterialId=` (kết quả xếp theo thứ tự bộ); `GET /questions?standalone=true` = chỉ câu lẻ (ngân hàng JP hiện bộ dạng thẻ riêng). `QuestionLink.question` có `sharedMaterialId` + `sharedMaterial { id, title }`. |
| `POST` | `/audio-assets` | Tải audio tư liệu (JP; hồ sơ khác → `400`). `multipart/form-data`: `file` (MP3, M4A/AAC, WAV; > 20MB → `413`) + `courseId`. Quyền như ghi câu hỏi của khoá. Trả `{ id, originalName, url, maxPlays, allowSeek }` (signed URL 6 giờ; giới hạn mặc định không giới hạn, cho tua). Asset bất biến — thay audio = tải bản mới. |
| `POST/PATCH/GET` | `/questions`, `/shared-materials` | `audioId: string \| null` — gắn audio cùng khoá (khác khoá / hồ sơ không bật → `400`; `null` = gỡ). Response có `audio { id, originalName, url } \| null`. `QuestionLink.question` có `audioId` + `audio { id, originalName }` (không URL). |
| `PATCH` | `/audio-assets/:id/limits` | Giới hạn nghe (JP). Body `{ maxPlays: 1 \| 2 \| null, allowSeek: boolean }`. Quyền như ghi câu hỏi của khoá. Trả `AudioRef` (`{ id, originalName, url, maxPlays, allowSeek }`). Áp ngay cả cho lượt đang làm. |
| `GET` | Bài làm (`/users/me/student-classes/:classId/attempts/:attemptId` và các response `AttemptDetail` khác) | Câu có `audio` và `sharedMaterial.audio`: `{ id, url, maxPlays, allowSeek, playsUsed } \| null` theo snapshot lúc start. Lượt **đang làm** + audio có giới hạn: `url = null`, phải xin qua endpoint phát. Đã nộp/hết giờ: `url` thẳng, `maxPlays = null`, `allowSeek = true`. |
| `POST` | `/users/me/student-classes/:classId/attempts/:attemptId/audio/:audioId/play` | Học sinh bấm phát audio trong lượt đang làm. Trả `{ url, maxPlays, playsUsed }`; audio giới hạn trừ một lượt (nguyên tử). `404` audio không thuộc snapshot lượt làm; `409` hết lượt nghe hoặc lượt đã kết thúc/hết giờ. |
| `GET` | Ôn nhẹ (`/lessons/:id/quizzes...`) | Câu có `audioUrl` và `sharedMaterial.audioUrl` (signed URL ngắn hạn, ký mới mỗi lần tải; `null` = không có). Không áp Giới hạn nghe. |
| `GET` | bài làm, `…/lesson-quizzes` | Câu trả `sharedMaterial: { id, content } \| null` (bài làm: snapshot lúc start). Câu cùng tư liệu đứng liền nhau tại vị trí câu đầu khối; Đảo câu xáo cả khối, giữ thứ tự trong khối. Ôn nhẹ gom khối theo thứ tự tiết — cả danh sách câu lẫn câu trả lời khi xem lại (câu đã gỡ khỏi tiết xuống cuối). Vị trí trống `[[#<questionId>]]` trong `content` không đổi ở API; web thay bằng số câu trong lượt làm (sau Đảo câu), câu vắng → ô không số. |
| `POST/PATCH` | `/lessons/:lessonId/questions[/:linkId]` (liên kết câu vào tiết) | JP: `points` là **trọng số** câu-trong-tiết (null = 1); `points: 0` → `400` *Trọng số câu phải ≥ 1.* Lúc bắt đầu làm bài, `pointsPossible` = chia 100 theo trọng số (Hamilton). Sửa trọng số không chấm lại bài đã bắt đầu. ADR `2026-10-09-jp-weighted-scoring`. |
| `GET` | `/lessons/:lessonId/questions/summary` | Thêm `totalWeight` (tổng trọng số, null tính 1). |
| `POST` | `/lessons/:lessonId/questions/sets` | Thêm nguyên một Bộ câu hỏi vào tiết. Body `{ sharedMaterialId }`. Mọi câu chưa xoá của bộ được link theo thứ tự bộ, nối cuối tiết, `points` null (trọng số 1). Bộ không tồn tại → `404`; khác khoá → `400`; bộ chưa có câu / đã có trong tiết → `400`. ADR `2026-10-09-question-set`. |
| `DELETE` | `/lessons/:lessonId/questions/sets/:sharedMaterialId` | Gỡ mọi link câu của bộ khỏi tiết. Bộ không có trong tiết → `404`. |
| `POST/DELETE` | `/lessons/:lessonId/questions[/:linkId]` (câu thuộc bộ) | Link lẻ / gỡ lẻ câu thuộc bộ → `400` ("Câu thuộc bộ — thêm cả bộ vào tiết." / "… gỡ cả bộ khỏi tiết."). Sửa trọng số từng câu của bộ vẫn được. |
| `PUT` | `/lessons/:lessonId/questions/reorder` | Phải gửi đủ mọi link của tiết, mỗi link một lần (thiếu / thừa / trùng → `400`). Câu của một bộ phải liền nhau → khác `400` "Bộ câu hỏi phải là một mục liền trong tiết." |
| `POST` | `/lessons/:lessonId/quizzes/sets` | Thêm nguyên Bộ câu hỏi vào bài ôn nhẹ của tiết lý thuyết. Body `{ sharedMaterialId }`. Mọi câu chưa xoá của bộ theo thứ tự bộ, nối cuối. Bộ không tồn tại → `404`; khác khoá / chưa có câu / đã có trong bài ôn → `400`. |
| `DELETE` | `/lessons/:lessonId/quizzes/sets/:sharedMaterialId` | Gỡ mọi câu của bộ khỏi bài ôn. Bộ không có trong bài ôn → `404`. |
| `POST/DELETE` | `/lessons/:lessonId/quizzes[/:questionId]` (câu thuộc bộ) | Gắn / gỡ lẻ câu thuộc bộ → `400` ("Câu thuộc bộ — thêm cả bộ vào bài ôn." / "… gỡ cả bộ khỏi bài ôn."). Bài ôn đi theo bộ như tiết thực hành: câu mới của bộ tự vào bài ôn ngay sau câu cuối của bộ; xoá câu bộ gỡ khỏi bài ôn (câu trả lời cũ vẫn xem lại được, xếp cuối). |
| `GET` | `/shared-materials/:id/usage` | `{ lessonCount, assignedLessonCount, quizLessonCount }` — số tiết thực hành đang dùng bộ, số tiết trong đó đã giao cho lớp, số tiết lý thuyết có bài ôn nhẹ chứa bộ (cảnh báo trước khi thêm / xoá câu). |
| `GET` | `/shared-materials/questions/:questionId/usage` | Cùng shape, đếm theo một câu — cảnh báo trước khi chuyển câu vào / ra bộ. |
| `POST` | `/shared-materials/:id/questions/:questionId` | Chuyển câu lẻ vào bộ: gỡ mọi link lẻ của câu trong tiết thực hành / bài ôn, câu nhận chuyên đề của bộ, đứng cuối bộ và vào mọi tiết / bài ôn đang dùng bộ (sau câu cuối của bộ). Câu khác khoá / đã ở bộ này / thuộc bộ khác → `400`; câu không tồn tại hoặc đã xoá → `404`. Ghi lịch sử (`question`). |
| `DELETE` | `/shared-materials/:id/questions/:questionId` | Đưa câu ra khỏi bộ: câu biến mất khỏi mọi tiết / bài ôn, thành câu lẻ (`sharedMaterialId`, `setPosition` = null). Câu không thuộc bộ → `404`. Lượt đã bắt đầu giữ snapshot. |
| — | Tiết đi theo bộ | `POST /questions` vào bộ → câu mới được link vào mọi tiết đang dùng bộ, ngay sau câu cuối của bộ, `points` null. `DELETE /questions/:id` câu thuộc bộ → gỡ khỏi mọi tiết (không còn `409`). Lượt làm đã bắt đầu giữ snapshot cũ. |
