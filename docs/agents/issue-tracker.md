# Issue tracker: GitHub

Issues và PRD của repo này sống trong GitHub Issues của `Unicorns-Prj-DEV/UnicornsEduWeb5.`. Dùng `gh` CLI cho mọi thao tác.

> **Lưu ý tên repo:** tên repo trên GitHub kết thúc bằng một **dấu chấm** — `UnicornsEduWeb5.` — nên remote là `git@github.com:Unicorns-Prj-DEV/UnicornsEduWeb5..git` (hai dấu chấm trước `git`). Đây **không phải typo**, đừng "sửa" nó; sửa xong sẽ mất kết nối remote. `gh` chạy trong clone tự suy ra repo đúng từ `git remote -v`.

## Conventions

- **Tạo issue**: `gh issue create --title "..." --body "..."`. Body nhiều dòng thì dùng heredoc.
- **Đọc issue**: `gh issue view <number> --comments`, lọc comment bằng `jq` và lấy kèm labels.
- **Liệt kê issue**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, thêm `--label` / `--state` khi cần.
- **Bình luận**: `gh issue comment <number> --body "..."`
- **Gắn / gỡ nhãn**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Đóng**: `gh issue close <number> --comment "..."`

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Đổi thành `yes` nếu repo coi PR từ ngoài là feature request; `/triage` đọc cờ này.)_

Khi bật `yes`, PR chạy cùng bộ nhãn và trạng thái như issue, dùng bản `gh pr` tương ứng:

- **Đọc PR**: `gh pr view <number> --comments`, và `gh pr diff <number>` để xem diff.
- **Liệt kê PR ngoài để triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, giữ lại `authorAssociation` là `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, hoặc `NONE` (bỏ `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub dùng chung một dải số cho issue và PR, nên `#42` trần có thể là một trong hai — thử `gh pr view 42` trước, không có thì `gh issue view 42`.

## Khi một skill nói "publish to the issue tracker"

Tạo một GitHub issue.

## Khi một skill nói "fetch the relevant ticket"

Chạy `gh issue view <number> --comments`.

## Wayfinding operations

Dùng bởi `/wayfinder`. **Map** là một issue duy nhất, các ticket là issue **con**.

- **Map**: một issue gắn nhãn `wayfinder:map`, chứa phần Notes / Decisions-so-far / Fog. `gh issue create --label wayfinder:map`.
- **Ticket con**: issue nối vào map dưới dạng GitHub sub-issue (`gh api` lên endpoint sub-issues). Nơi chưa bật sub-issues thì thêm con vào task list trong body của map và đặt `Part of #<map>` ở đầu body con. Nhãn: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Khi đã nhận, ticket được assign cho dev đang làm.
- **Blocking**: dùng **issue dependencies** native của GitHub — biểu diễn chính thức, nhìn thấy trên UI. Thêm cạnh bằng `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, trong đó `<blocker-db-id>` là **database id** dạng số của blocker (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _không phải_ `#number` hay `node_id`). GitHub trả `issue_dependencies_summary.blocked_by` (chỉ đếm blocker còn mở — đây là cổng chặn thật). Nơi chưa có dependencies thì fallback về dòng `Blocked by: #<n>, #<n>` ở đầu body con. Ticket được mở khoá khi mọi blocker đã đóng.
- **Frontier query**: liệt kê các con còn mở của map (`gh issue list --state open`, giới hạn trong sub-issues / task list của map), bỏ những cái còn blocker mở (`issue_dependencies_summary.blocked_by > 0`, hoặc còn issue mở trong dòng `Blocked by`) hoặc đã có assignee; cái đứng trước trong map thắng.
- **Claim**: `gh issue edit <n> --add-assignee @me` — thao tác ghi đầu tiên của phiên.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, rồi `gh issue close <n>`, rồi nối một context pointer (gist + link) vào phần Decisions-so-far của map.

## Quan hệ với `.scratch/`

`.scratch/` vẫn dùng cho ghi chú tạm, handoff, bản nháp PRD — **không** còn là issue tracker. Issue chính thức nằm trên GitHub.
