#!/usr/bin/env bash
# Dispatch một ticket của đợt tái cấu trúc khoá học sang một worktree Orca riêng,
# chạy opencode với model MiMo V2.5 Free.
#
#   ./scripts/orca-dispatch.sh <issue-number> <slug>
#
# Ví dụ:
#   ./scripts/orca-dispatch.sh 48 05-course-settings
#
# <slug> nên là <NN>-<mô-tả-ngắn> khớp số ticket trong bản chia slice, vì nhánh
# sẽ được đặt tên feat/<slug> theo quy ước trong AGENTS.md.

set -euo pipefail

ISSUE="${1:?cần số issue GitHub}"
SLUG="${2:?cần slug dạng NN-mo-ta}"

REPO_ID="180a6e30-b4e0-46d3-aa70-a92b6cfd9d36"
MODEL="opencode/mimo-v2.5-free"
NAME="t${SLUG}"
BRANCH="feat/${SLUG}"

# 1. Worktree mới cắt từ dev — một bản checkout độc lập, không đụng cây làm việc chính.
WT_PATH=$(orca worktree create \
  --repo "id:${REPO_ID}" \
  --name "$NAME" \
  --base-branch dev \
  --issue "$ISSUE" \
  --no-parent \
  --setup skip \
  --json | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['worktree']['path'])")

# Orca đặt tên nhánh theo user; đổi về quy ước feat/<NN>-<slug> của repo.
git -C "$WT_PATH" branch -m "$BRANCH"

# 2. Terminal chạy opencode với model MiMo.
HANDLE=$(orca terminal create \
  --worktree "id:${REPO_ID}::${WT_PATH}" \
  --title "$NAME" \
  --command "opencode -m ${MODEL}" \
  --json | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['terminal']['handle'])")

# 3. Chờ TUI sẵn sàng rồi mới gửi, nếu không input bị nuốt.
orca terminal wait --terminal "$HANDLE" --for tui-idle --timeout-ms 90000 --json >/dev/null

BRIEF="Bạn nhận ticket GitHub số ${ISSUE} của repo Unicorns-Prj-DEV/UnicornsEduWeb5. Chạy \`gh issue view ${ISSUE}\` để đọc toàn bộ What to build, Acceptance criteria và mục Context cho agent, rồi làm đúng theo đó. Nhánh ${BRANCH} đã cắt sẵn từ dev và bạn đang đứng đúng chỗ. Việc đầu tiên: chạy \`pnpm install\` vì worktree này chưa có node_modules. Đọc CONTEXT.md, AGENTS.md và các ADR liên quan trong docs/adr/ trước khi sửa schema hay code. Khi xong, cập nhật docs theo quy tắc Documentation sync, commit, rồi mở PR với base là dev, TUYỆT ĐỐI không phải main."

orca terminal send --terminal "$HANDLE" --text "$BRIEF" --enter --json >/dev/null

echo "issue   #${ISSUE}"
echo "branch  ${BRANCH}"
echo "path    ${WT_PATH}"
echo "handle  ${HANDLE}"
echo
echo "Theo dõi:  orca terminal read --terminal ${HANDLE}"
echo "Tổng quan: orca worktree ps"
