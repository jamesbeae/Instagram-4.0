# Instagram 4.0 · Đồ án tốt nghiệp

Dự án ở `D:\codes\Instagram-4.0`. React/TypeScript, Express, PostgreSQL, Sequelize, Socket.IO và Cloudinary.

## Chạy ứng dụng

Đã cấu hình và xác minh ngày 20/10/2026: Docker Engine hoạt động với WSL 2. PostgreSQL chạy trong container `instagram-40-postgres-1`, cổng **127.0.0.1:5432**, database **Instagram**. Frontend và backend hiện chạy bằng Node trên Windows.

1. Mở Docker Desktop, đợi Engine running.
2. Trong thư mục dự án, chạy `& .\Run-Local.ps1` (mặc định Docker).
3. Kiểm tra bằng `& .\Run-Local.ps1 -Status`; dừng bằng `& .\Run-Local.ps1 -Stop`.

Dữ liệu đã chuyển từ portable sang Docker và đối chiếu nội dung khớp toàn bộ **15 bảng**. Bản SQL backup giữ tại `D:\codes\Instagram-4.0-local\backup-20261020-221125.sql`. DB portable cũ ở `D:\codes\Instagram-4.0-local\data`, đã dừng và được giữ làm bản dự phòng; không chạy chuyển lại vào DB Docker đang có dữ liệu.

Trên máy mới cần chuẩn bị WSL/Virtual Machine Platform bằng `Setup-Docker.ps1` với quyền Administrator, restart khi Windows yêu cầu. `Move-Database-To-Docker.ps1` chỉ dùng để chuyển từ portable vào DB Docker trống.
Frontend: http://localhost:5173/ · Backend: http://localhost:8000/health.

`Run-Local.ps1 -Status` báo provider/cổng DB từ phiên đã khởi chạy. Tạm chạy khi Docker chưa sẵn sàng: `Run-Local.ps1 -Database Portable`. Script không tự đổi sang portable khi Docker lỗi.

Hai tài khoản **chỉ có trong DB demo đã seed**: `owner / 12345678`, `viewer / 12345678`. DB Docker hoàn toàn mới có role mặc định nhưng chưa có tài khoản demo; có thể đăng ký tài khoản mới. Không chạy lại seeder bài mẫu trên dữ liệu thật vì seeder cũ xóa/tạo lại dữ liệu demo.

Đóng gói cả ba dịch vụ: `docker compose --profile app up -d --build` sau khi dừng frontend/backend đang chạy trên máy. Backend container tự chạy migrations. Volume DB `instagram_postgres_data` được Docker quản lý, không nằm trong source; volume media `instagram_uploads`. Cổng chỉ bind 127.0.0.1 cho môi trường local. Đây là cấu hình local; triển khai công khai cần domain/HTTPS, secrets riêng, backup và cấu hình cookie/origin.

## Các chức năng đã triển khai

| Nhóm | Chức năng |
| --- | --- |
| Tài khoản | Đăng ký/đăng nhập, JWT/refresh, chỉnh hồ sơ, đổi mật khẩu, luồng khôi phục qua email |
| Quan hệ | Theo dõi/bỏ theo dõi, tìm kiếm, gợi ý người dùng, danh sách bạn bè/đồng nghiệp/gia đình tùy tên |
| Bài viết | Nhiều ảnh/video, tạo/sửa/xóa, feed phân trang, permalink và sao chép link |
| Tương tác | Like/unlike, comment, save/unsave, tab bài đã lưu chỉ hiện với chủ tài khoản |
| Nội dung | Story hết hạn sau 24 giờ, Explore và Reels từ bài video |
| Riêng tư | Chia sẻ public/followers/relation list; kiểm tra quyền trên feed, chi tiết, profile, tương tác và media local |
| Realtime | Socket xác thực JWT, tin nhắn có lưu DB, online nhiều phiên, thông báo từ hành vi đã lưu trên server |
| Phân quyền | User/creator/admin; creator xem thống kê; admin xem báo cáo, ẩn nội dung, khóa tài khoản, đổi role |
| Gợi ý | Ghi VIEW/LIKE/COMMENT/FOLLOW/SAVE/SHARE; xếp hạng theo tác giả, nội dung, theo dõi, phổ biến và thời gian |

## Cấu hình cần bổ sung

- **Cloudinary**: các biến CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong backend/.env. Khi chưa cấu hình, môi trường development/test lưu media trong backend/uploads. Production yêu cầu Cloudinary. Assets mới dùng authenticated delivery và được proxy qua backend sau khi kiểm tra quyền; chưa kiểm thử kết nối thật vì thiếu tài khoản Cloudinary.
- **Email khôi phục**: RESEND_API_KEY, MAIL_FROM đã xác minh, PASSWORD_RESET_URL. Khi thiếu, API trả thông báo chưa cấu hình. Token ngẫu nhiên chỉ lưu hash, hết hạn một giờ, dùng một lần và thu hồi phiên cũ. Test dùng nhà cung cấp email giả tại localhost, không gửi email thật. [Resend REST API](https://resend.com/vercel).
- **Admin đầu tiên**: chưa nâng quyền tài khoản demo. Người vận hành cần cấp role admin cho tài khoản được chỉ định bằng công cụ quản trị DB; tránh cho người dùng tự đăng ký role admin.
- **Facebook login**: đang ẩn mặc định; backend cũ vẫn chưa triển khai OAuth Facebook. Không bật VITE_ENABLE_FACEBOOK_LOGIN trước khi hoàn thiện xác minh token/app và cấu hình tài khoản Meta.
- **Docker/triển khai thật**: PostgreSQL container đã chạy healthy, đăng nhập và 8 kiểm thử backend đạt trên Docker. Profile app để đóng gói cả frontend/backend chưa được build/chạy trên máy này. Xem [hướng dẫn Docker Windows](https://docs.docker.com/desktop/setup/install/windows-install/).

## Kiểm thử

Frontend: `npm run build`, `npx vitest run`. Backend: đặt TEST_DATABASE_URL tới PostgreSQL test có quyền tạo DB, chạy `npm test`. Mỗi lần test API tạo và xóa một database tạm riêng; không reset DB ứng dụng. Kiểm tra quyền sửa/xóa, danh sách riêng tư và file media, Story hết hạn, upload sai định dạng, phân quyền quản trị, giả mạo socket, lịch sử chat, khôi phục mật khẩu một lần và thu hồi phiên. Không chạy bộ tích hợp trên tài khoản DB production.

## Thí nghiệm gợi ý

Nguồn theo phiếu giao đề tài: [Bluesky Social Dataset, Zenodo 14669616](https://zenodo.org/records/14669616). Chỉ tải feed_posts_likes.tar.gz (35.4 MB), kiểm tra MD5 công bố. Không tải toàn bộ 22 GB và không nhập danh tính/dữ liệu ngoài vào DB ứng dụng.

Pipeline `Source_Code/backend/scripts/train-recommendation.py` đọc trực tiếp gzip trong tar, không giải nén file tùy ý. Feed Science: **730.862** dòng duy nhất, chia thời gian 70/15/15, cùng timestamp giữ trong cùng tập. Trọng số quan tâm tác giả được chọn trên validation, giữ test riêng.

| Test với 995 người dùng đủ điều kiện | Popularity | Thêm quan tâm tác giả |
| --- | ---: | ---: |
| Sampled Hit/Recall@10 | 0.6633 | 0.6744 |
| Sampled Precision@10 | 0.06633 | 0.06744 |
| Sampled NDCG@10 | 0.4672 | 0.4859 |

Mỗi người được đánh giá với một positive tương lai và 99 negative lấy mẫu từ catalog train; loại bài đã like và yêu cầu ít nhất 5 bài train. Kết quả **không phải** metric toàn catalog và không đánh giá cold start. Thí nghiệm chỉ đánh giá thành phần quan tâm tác giả từ like, chưa chứng minh chất lượng toàn bộ thuật toán lai trên người dùng thật. Trọng số tác giả 0.25 đã tích hợp trong config/recommendation-weights.json; kết quả chi tiết trong scripts/recommendation-evaluation.json. Live ranker xét tối đa 1.000 bài còn quyền xem gần nhất, lịch sử 90 ngày, tối đa 5.000 sự kiện.

Để chạy lại, dùng Python 3: `python scripts/train-recommendation.py --archive PATH_TO_ARCHIVE --output OUTPUT_DIR`. Dữ liệu tải và artifact đầy đủ hiện ở `D:\codes\Instagram-4.0-local`. Phần tiếp theo cho báo cáo khoa học: full-catalog evaluation, cold start, ablation, dữ liệu view/comment/save thực tế và benchmark hiệu năng.

Frontend build hiện còn cảnh báo bundle khoảng 1 MB; cần tách tải các trang và emoji picker trước khi tối ưu cho mạng chậm.

## Đối chiếu thiết kế mới — 28/10/2026

Đã bổ sung tìm kiếm tài khoản/nội dung có phân quyền và lịch sử UNLIKE/UNSAVE/UNFOLLOW. API tìm kiếm cho khách chỉ trả nội dung công khai; giao diện tìm kiếm hiện yêu cầu đăng nhập. Xem [bảng đối chiếu 24 use case, schema và công việc còn thiếu](Source_Code/backend/docs/DESIGN_ALIGNMENT_2026-10-28.md). Đây là đợt cập nhật đầu tiên; chưa chuyển schema public sang mxh/bigint.
