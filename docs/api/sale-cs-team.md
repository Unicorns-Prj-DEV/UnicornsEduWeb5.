# Sale & CSKH team API (Trưởng phòng quản lý đội, #271)

Module: `apps/api/src/sale-cs-team/`. Controller `@Controller('sale-cs-team')`, `@Roles(UserRole.staff)` — route **staff-side**, không phải route admin, nên không đụng allowlist `admin-deny-by-default.spec.ts`. Nguồn nghiệp vụ: biên bản họp 12/11/2026 mục 9 (`docs/meetings/2026-11-12-bien-ban.md`).

## Quyền

`SaleCsTeamService.resolveHead`: người gọi phải có `staffInfo` `active` mang role `sale_customer_care_head` (`hasSaleCsHeadAccess`); ngược lại `403` «Chỉ Trưởng phòng Sale & CSKH được dùng chức năng này.». Admin không có role Trưởng phòng cũng `403` (Admin dùng màn quản trị nhân sự riêng). Có thể có nhiều Trưởng phòng; mọi Trưởng phòng thấy cùng một đội.

Luật trên từng nhân sự đích nằm ở `apps/api/src/staff/sale-cs-head-role-policy.ts` (test `sale-cs-head-role-policy.spec.ts`):

| Thao tác | Được phép khi | Bị chặn (`403`) |
|---|---|---|
| Bật/tắt role | Đích không phải chính mình, không phải tài khoản `roleType=admin`, không mang role trưởng/Admin (`PRIVILEGED_STAFF_ROLES`: `admin`, `sale_customer_care_head`, `training_head`, `lesson_plan_head`); payload chỉ đổi `sale`/`customer_care` | Tự sửa, Admin, người có role trưởng, payload thêm/bớt role khác |
| Khoá / mở khoá tài khoản | Như trên **và** đích chỉ mang `sale` và/hoặc `customer_care` | Đích kiêm bất kỳ role nào khác (gia sư, kế toán…) |
| Sửa hồ sơ chuyên môn | Như bật/tắt role **và** đích là thành viên đội (có `sale` hoặc `customer_care`) | Ngoài đội, role trưởng, Admin |

Mỗi dòng trả về kèm `permissions { canEditRoles, canLockAccount, canEditProfile }` tính bằng cùng hàm policy, web chỉ hiện nút theo cờ này; backend vẫn chặn lại khi gọi.

## Field allowlist

`MEMBER_SELECT` tường minh, không `include`. Trả về: `id`, `fullName`, `lastName`, `firstName`, `avatarUrl` (signed), `roles`, `status`, `accountLocked` (`users.status = inactive`; `null` nếu chưa có tài khoản), `university`, `highSchool`, `customerCareDefaultProfitPercent` (chỉ đọc), `managedBy`, `customerCareStudentCount`, `permissions`.

**Không bao giờ trả:** email, SĐT, CCCD, ngày sinh, giới tính, dân tộc, địa chỉ, ngân hàng/QR, lương/trợ cấp riêng, số tiền hoa hồng.

## Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET | `/sale-cs-team/members` | Danh sách. Query: `page`, `limit`, `search` (tên), `role` (`sale`\|`customer_care`), `status` (`active`\|`inactive`), `scope` (`members` mặc định \| `candidates`). `candidates` = nhân sự **chưa** thuộc đội, loại người mang role trưởng/Admin và tài khoản admin, **chỉ nhân sự đang hoạt động** (bỏ qua `status`) — dùng để bật role Sale/CSKH cho người mới. |
| GET | `/sale-cs-team/members/:staffId` | Chi tiết thành viên đội; `404` nếu không thuộc đội. |
| GET | `/sale-cs-team/members/:staffId/sale-allowances` | Trợ cấp sale (`extra_allowances.role_type = sale`): `id`, `month`, `note`, `createdAt`, `student { id, fullName }`. **Không** có `amount` / `status` / thuế. Query `month` (`YYYY-MM`, bỏ trống = mọi tháng; sai định dạng `400`). |
| GET | `/sale-cs-team/members/:staffId/bonuses` | Thưởng có **số tiền**: `id`, `workType`, `amount`, `status`, `note`, `month`, `date`. Chỉ đọc — không có endpoint tạo/sửa. Query `month` như trên. |
| PATCH | `/sale-cs-team/members/:staffId/roles` | Body `{ roles: ("sale"\|"customer_care")[] }` = trạng thái đích của 2 role; role khác giữ nguyên. `400` nếu không còn role nào. Tắt `customer_care` → **gỡ gán mọi học sinh** người đó đang chăm sóc (xoá `customer_care_service`) trong cùng transaction với lệnh ghi role (follow-up 13/11 mục 2.1; trước đây `400` «còn học sinh»); bật lại không khôi phục; `attendance` đã ghi (CSKH, hệ số, hoa hồng trưởng phòng) giữ nguyên, buổi mới của học sinh chưa gán không sinh hoa hồng CSKH / trưởng phòng. Tắt role → xoá mức đè lương cứng của role đó (`syncStaffRoleOverridesInTx`). Ghi `action_history` (before/after kèm `customerCareStudentCount`), xoá cache auth của đích. Trả `{ id, roles, releasedCustomerCareStudentCount }`. |
| PATCH | `/sale-cs-team/members/:staffId/account-status` | Body `{ locked: boolean }` → `users.status` `inactive`/`active`. Ghi `action_history`, xoá cache auth (phiên đang mở bị chặn ngay). `400` nếu nhân sự chưa có tài khoản. |
| PATCH | `/sale-cs-team/members/:staffId/professional-profile` | Body `{ lastName?, firstName?, university?, highSchool? }`. Field khác bị `ValidationPipe` loại. Tên trống `400`. Trả lại chi tiết thành viên. |

## Quyền liên quan ngoài module

- **% CSKH mặc định** (`staff_info.customer_care_default_profit_percent`): chỉ Admin sửa (route admin quản lý nhân sự). Trưởng phòng chỉ xem.
- **Giao / chuyển CSKH và % của từng học sinh** (`PATCH /student/:id` với `customer_care_staff_id`, `customer_care_profit_percent`): Admin hoặc Trưởng phòng. Trưởng phòng **không** được đặt % khi CSKH đích là chính mình (luật không tự sửa thu nhập #265). CSKH/Sale thường `403`.
- **Trạng thái thanh toán hoa hồng trưởng phòng** (`PATCH /assistant-commission/payment-status*`): từ #271 chỉ Admin hoặc Kế toán chi; Trưởng phòng `403`, kể cả với hoa hồng của chính mình.
- **Hoa hồng trưởng phòng**: khi tạo/sửa buổi học, `attendance.sale_cs_head_staff_id` (cột `assistant_manager_staff_id`) chỉ snapshot người quản lý CSKH (`customer_care_managed_by_staff_id`) nếu người đó **còn** role Trưởng phòng (`resolveSaleCsHeadManagerId`). Mỗi Trưởng phòng chỉ ăn nhóm CSKH mình quản lý. Buổi đã ghi trước đó không bị tính lại.
