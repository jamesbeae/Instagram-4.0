# Hướng dẫn cho công cụ hỗ trợ phát triển

- Đọc [CONTRIBUTING.md](CONTRIBUTING.md) và [GIT-FLOW.md](GIT-FLOW.md) trước khi sửa repo. Dùng [mẫu PR](.github/PULL_REQUEST_TEMPLATE.md) khi chuẩn bị bàn giao.
- Frontend React/TypeScript nằm ở `Source_Code/frontend`. Chạy `npm run build` và `npx vitest run`. Backend Express/Sequelize/Socket.IO nằm ở `Source_Code/backend`. Chạy `npm test` với PostgreSQL 16 tạm và khóa JWT riêng cho QA.
- Cài dependency của cả hai thư mục trước khi chạy backend test vì suite dùng Socket.IO client từ frontend.
- Giữ các thay đổi đang làm của thành viên. Nếu checkout đã có thay đổi ngoài phạm vi, dùng checkout riêng từ `origin/dev` cho phần việc được giao.
- Dùng [bảng đối chiếu use case](Source_Code/backend/docs/DESIGN_ALIGNMENT_2026-10-28.md) để xác định hành vi, quyền truy cập và phần tài liệu cần cập nhật.
- Ghi lệnh và kết quả thực sự đã chạy, các trường hợp chưa kiểm tra và ảnh hưởng tới API/DB khi bàn giao. Chỉ merge khi được giao và PR đáp ứng quy trình review.
