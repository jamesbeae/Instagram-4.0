# Quy trình Git

## Tạo nhánh từ `dev`

Mỗi nhánh xử lý một việc. Đồng bộ `dev` bằng fast-forward rồi tạo nhánh mới khi working tree sạch.

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feature/uc-1.3.6-edit-post
```

Dùng tiền tố theo nội dung, ví dụ `feature/`, `fix/`, `docs/`, `test/`, `chore/`, `ci/` hoặc `revert/`. Viết tiêu đề commit mô tả hành vi thay đổi. Đẩy nhánh công việc và mở PR đích `dev`.

## Review và merge

- Tác giả điền [mẫu PR](.github/PULL_REQUEST_TEMPLATE.md), chạy [các lệnh QA](CONTRIBUTING.md#kiểm-thử-trước-khi-yêu-cầu-review) và xử lý phản hồi.
- Ít nhất một thành viên khác review và approve. Reviewer đối chiếu mã use case, diff thực tế và kết quả kiểm thử. Khi tác giả thêm commit hoặc `dev` đổi phần liên quan, review lại diff và QA ở trạng thái mới trước khi merge.
- Người có quyền merge kiểm tra PR có approval, các check `Frontend` và `Backend` đạt, và các trao đổi đã được xử lý. Mọi thay đổi vào `dev` đi qua PR. Không push trực tiếp, force-push hoặc xóa nhánh `dev`.
- Nếu workflow hoặc check chưa chạy, ghi kết quả kiểm thử thủ công trong PR và xử lý nguyên nhân với reviewer trước khi merge. Riêng PR khởi tạo workflow, xác nhận cả hai job đã chạy thành công trên chính PR đó.

## Conflict và hoàn tác

Đồng bộ thay đổi mới từ `origin/dev` vào nhánh công việc khi cần. Khi xử lý conflict, đối chiếu cả hai phía và chạy lại QA sau khi sửa. Với thay đổi từng bị revert rồi đưa trở lại, so sánh cây hợp nhất với `dev` để xác nhận hành vi thực sự được khôi phục.

Khi cần hoàn tác thay đổi đã merge, tạo nhánh `revert/` từ `dev` và mở PR. Ghi commit hoặc PR gốc, lý do, ảnh hưởng tới dữ liệu và kết quả QA. Với migration có thể mất dữ liệu, làm theo phương án phục hồi đã ghi trong PR.
