# Đóng góp cho Instagram 4.0

## Nhận việc và xác định phạm vi

- Ghi người phụ trách, mã use case hoặc GitHub issue và tiêu chí nghiệm thu trước khi bắt đầu. Đối chiếu với [bảng 24 use case](Source_Code/backend/docs/DESIGN_ALIGNMENT_2026-10-28.md) và đặc tả hiện hành của nhóm.
- Tạo nhánh và mở PR theo [quy trình Git](GIT-FLOW.md). Mỗi PR tập trung vào một thay đổi có thể review và hoàn tác riêng.
- Khi hành vi, hợp đồng API hoặc schema thay đổi, cập nhật tài liệu liên quan trong cùng PR. Nếu triển khai khác đặc tả, mô tả chênh lệch và lý do để nhóm xác nhận.

## Chạy dự án

Dùng Node.js 22 như CI và Dockerfile. Xem [README](README.md#chạy-ứng-dụng) để khởi động PostgreSQL dự án và chạy ứng dụng trên Windows. Mã frontend nằm trong `Source_Code/frontend`, mã backend nằm trong `Source_Code/backend`.

## Kiểm thử trước khi yêu cầu review

Cài dependency từ lockfile bằng `npm ci --legacy-peer-deps` ở frontend và `npm ci` ở backend. Frontend dùng cờ này vì `react-facebook-login` khai báo peer dependency React 16 trong khi dự án dùng React 18. Test tích hợp backend cần `socket.io-client` từ dependency frontend.

| Thư mục | Lệnh kiểm tra |
| --- | --- |
| `Source_Code/frontend` | `npm run build` để chạy TypeScript và Vite, sau đó `npx vitest run`. |
| `Source_Code/backend` | Đặt biến môi trường kiểm thử theo phần dưới và chạy `npm test`. |

Tạo container PostgreSQL 16 riêng, không gắn volume của ứng dụng. Tài khoản QA phải có quyền tạo database vì bộ test tạo và xóa database tạm cho mỗi lượt chạy. Đặt `TEST_DATABASE_URL` trỏ tới container QA và dùng khóa JWT tạm cho `ACCESS_TOKEN_CODE` và `REFRESH_TOKEN_CODE`. [Workflow QA](.github/workflows/qa.yml) liệt kê cấu hình dùng trên CI. Không dùng URL, dữ liệu hoặc volume của DB dự án hay production để chạy test, seed hoặc reset.

Chọn trường hợp kiểm thử theo phạm vi PR:

- Với hành vi nghiệp vụ, kiểm tra luồng chính và trường hợp lỗi liên quan. Thêm hoặc cập nhật test hồi quy khi sửa lỗi có thể tái hiện.
- Với bài riêng tư, media, hồ sơ, admin và Socket.IO, kiểm tra cả vai trò được phép và bị từ chối.
- Với like, save và follow, kiểm tra thao tác lặp nếu PR đổi cách ghi dữ liệu hoặc phát thông báo.
- Với schema, kèm migration và kết quả thử trên dữ liệu mẫu đã có từ trước. Ghi cách rollback hoặc phục hồi dữ liệu.
- Với UI, kèm ảnh/video hoặc các bước thao tác. Dùng tài khoản và dữ liệu mẫu.

Ghi lệnh, kết quả, bước kiểm tra tay và phần chưa kiểm tra trong [mẫu PR](.github/PULL_REQUEST_TEMPLATE.md). Giữ file `.env`, token, khóa JWT/Cloudinary và dữ liệu thật ngoài Git, log và ảnh chụp PR. Chỉ đưa tên biến và giá trị mẫu vào `.env.example`.
