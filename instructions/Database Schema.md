# Tổng quan Database Schema – Unicorns Edu

Sơ đồ Database: ![Database schema](./assets/Database%20Schema.svg)


Schema được định nghĩa bằng **Prisma** (ORM), chạy trên **PostgreSQL**. Khớp với `archived/UniEdu-Web-3.9/supabase/schema.sql`.

---

## 1. Công nghệ


| Thành phần | Chi tiết                                              |
| ---------- | ----------------------------------------------------- |
| ORM        | Prisma                                                |
| Database   | PostgreSQL                                            |
| Schema     | `apps/cp-api/prisma/schema/` (multi-file)             |
| DBML       | `apps/cp-api/prisma/database.dbml` (cho dbdiagram.io) |


---

## 2. Các nhóm bảng


| Nhóm          | Bảng                                                                                            | Mô tả                                                               |
| ------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Auth**      | users                                                                                           | Tài khoản, phân quyền (admin, teacher, student, assistant, visitor) |
| **People**    | teachers, students, assistants                                                                  | Giáo viên, học sinh, trợ giảng                                      |
| **Learning**  | classes, class_teachers, student_classes, sessions, attendance                                  | Lớp học, buổi học, điểm danh                                        |
| **Finance**   | payments, payroll, revenue, wallet_transactions, costs, bonuses, dashboard_cache                | Học phí, lương, doanh thu, ví, chi phí                              |
| **Content**   | home_posts, categories, documents                                                               | Tin tức, danh mục, tài liệu                                         |
| **Lesson**    | lesson_plans, lesson_resources, lesson_tasks, lesson_outputs, lesson_topics, lesson_topic_links | Giáo án, bài học                                                    |
| **Assistant** | assistant_payments, assistant_tasks                                                             | Thanh toán và công việc trợ giảng                                   |


---

## 3. Quan hệ chính

- **Class ↔ Teacher**: N–N qua `class_teachers`
- **Class ↔ Student**: N–N qua `student_classes`
- **Session** → Class, Teacher; **Attendance** → Session, Student
- **Payment** → Student, Class; **WalletTransaction** → Student
- **Payroll**, **Bonus** → Teacher
- **Revenue** → Class
- **Assistant** → LessonPlan, LessonTask, LessonOutput; **AssistantPayment**, **AssistantTask** → Assistant

---

## 4. Enums

- **UserRole**: admin, teacher, student, assistant, visitor
- **Status**: active, inactive, pending, paid, unpaid, deposit, cancelled
- **WalletTransactionType**: topup, loan, advance, repayment
- **HomePostCategory**: intro, news, docs, policy

