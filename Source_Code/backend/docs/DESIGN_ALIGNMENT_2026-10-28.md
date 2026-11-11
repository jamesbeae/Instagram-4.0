# Đối chiếu phân tích, thiết kế và ứng dụng — 28/10/2026

Ứng dụng: `D:\codes\Instagram-4.0`. PostgreSQL Docker: `127.0.0.1:5432/Instagram`; frontend/backend chạy trên Windows tại cổng 5173/8000. Báo cáo này ghi trạng thái triển khai thực tế; các mục “còn thiếu” chưa được coi là đã hoàn thành.

## Tài liệu đã đọc

- Chat **Tìm báo cáo đồ án CNTT tương tự**: đọc các lượt liên quan đến phân tích, kiến trúc, module, database và tài liệu hợp nhất; không sửa hoặc gửi tin vào chat đó.
- [Pha phân tích](https://docs.google.com/document/d/1ozqJqrowIdn1c88deoTmJPLpXHqoMXft5v8AnMlAyVU/edit): đọc trực tiếp qua Google Drive, phiên bản sửa ngày **28/10/2026**, gồm 24 đặc tả Use Case, biểu đồ lớp, hoạt động và tuần tự.
- [Thiết kế hệ thống](https://docs.google.com/document/d/1Fw5QULxo4um-22x03x2v83jL5FTquBPRgf4Pl0mGWkI/edit): đọc trực tiếp qua Google Drive, phiên bản sửa ngày **22/10/2026**; 3.1 kiến trúc, 3.2 module/class/component, 3.3 PostgreSQL.
- File SQL `C:\Users\ADMIN\Downloads\01_schema_postgresql.sql` và `Database_Design/schema_verified.json`: schema `mxh`, 18 bảng nghiệp vụ, 105 cột, 35 chỉ mục bổ sung, ràng buộc/trigger và lịch sử bất biến.
- `Architecture_Design/content.json`, `Activity_Visual_Paradigm/activity_model.json`, `Database_Design/Bieu_do_thuc_the_theo_mau_UML/entity_model.json`: các bản nguồn đã lưu của nhóm.
- `API_Design/content_complete_concise.json` ngày 22/10: hợp đồng hiện hành dùng UUID, khác với bigint trong thiết kế database. Phải thống nhất hợp đồng khi chuyển schema.
- `article-recommender/README.md`: thí nghiệm Implicit ALS độc lập; tài liệu ghi rõ chưa tích hợp API và chưa vượt baseline phổ biến. Không coi thí nghiệm này là thuật toán đang phục vụ ứng dụng.

Bản Google Docs database riêng `1IRuxP2dYkJMAtoZG7fVu9buTt4ciCf1te1qftWzlVU4` trả NOT_FOUND với kết nối hiện tại. Phần database đã được đọc trong bản thiết kế hợp nhất và SQL gốc, nên việc đối chiếu vẫn thực hiện được.

## Cập nhật thực hiện trong lượt này

### Tìm kiếm — UC 1.3.12

- Thêm `GET /v1/api/search?q=...&scope=users|posts&page=1&limit=10`.
- Cho phép khách qua optional JWT: khách chỉ nhận nội dung công khai; token đã gửi nhưng không hợp lệ vẫn bị từ chối. Người đã đăng nhập được tìm thêm nội dung mình đang có quyền xem.
- Tìm tài khoản theo username/họ tên và bài viết theo nội dung; loại tài khoản bị khóa và bài của tác giả bị khóa khỏi kết quả tìm kiếm.
- Lọc bài bị ẩn, Story, nội dung hết hạn và quyền nhóm/followers trước khi phân trang; thêm khóa ID để thứ tự ổn định khi thời gian đăng trùng nhau.
- Từ khóa bắt buộc, tối đa 120 ký tự; mỗi trang tối đa 20. Các ký tự `%`, `_` và chuỗi giống SQL được xử lý như văn bản, không phải ký tự mở rộng hay câu SQL.
- Sidebar có hai tab Accounts/Posts, phân trang, trạng thái đang tải/rỗng/lỗi, chờ 250 ms khi nhập và bỏ phản hồi cũ khi đổi từ khóa. Chọn bài dẫn đến trang chi tiết để backend kiểm tra lại quyền.
- Giới hạn còn lại: giao diện tìm kiếm vẫn nằm sau đăng nhập; khách mới có API tìm kiếm công khai. Chưa có full-text GIN/relevance; hiện dùng so khớp chuỗi không phân biệt hoa/thường. Lượt VIEW từ trang chi tiết sau tìm kiếm cần nối thêm vào quy trình ghi hành vi.

### Lịch sử hủy tương tác — UC 1.3.8, 1.3.10, 1.3.13

- Bổ sung sự kiện `UNLIKE`, `UNSAVE`, `UNFOLLOW` trong bảng `interactions`, tương ứng BỎ_THÍCH/BỎ_LƯU/BỎ_THEO_DÕI trong mô hình nghiệp vụ.
- Xóa trạng thái tương tác và ghi sự kiện trong cùng giao dịch. Chỉ ghi khi một bản ghi trạng thái thực sự bị xóa; lặp cùng thao tác khi đã hủy không sinh thêm sự kiện.
- Giữ sự kiện LIKE/SAVE/FOLLOW cũ. Không giả tạo hành vi quá khứ cho các thao tác trước ngày cập nhật.
- Giới hạn còn lại: chưa có mã yêu cầu UUID và nguồn phát sinh; lịch sử hiện vẫn có FK xóa dây chuyền; ranker chưa dùng các sự kiện hủy để điều chỉnh điểm đã cộng. Đây chưa phải cơ chế lịch sử bất biến/idempotency đầy đủ trong SQL thiết kế.

Không đổi cấu trúc DB trong lượt này; không chạy script khởi tạo `mxh` vào DB ứng dụng.

## Ma trận Use Case và triển khai

| Use Case | Đã có | Chênh lệch cần xử lý |
| --- | --- | --- |
| 1.3.1 Đăng ký | Tài khoản user, validation, băm mật khẩu | Rà unique không phân biệt hoa/thường và quy tắc gửi lại theo định danh |
| 1.3.2 Đăng nhập | JWT/refresh, kiểm tra khóa tài khoản | Tách trải nghiệm đăng nhập/quản trị theo vai trò nếu bám đúng tài liệu |
| 1.3.3 Đăng xuất | Xóa refresh token, dọn frontend | Access token đã cấp chưa bị thu hồi ngay bởi logout; cần thống nhất phiên và socket |
| 1.3.4 Hồ sơ | Sửa tên, bio, URL avatar | Chưa có quy trình upload avatar như media bài viết; kiểm tra hồ sơ tài khoản bị khóa |
| 1.3.5 Đăng nội dung | Nhiều tệp, quyền xem, Story | Hiện bắt buộc media, chưa có bài chỉ văn bản; chưa chống trùng bằng mã yêu cầu |
| 1.3.6 Sửa bài | Sửa caption của chủ bài | Chưa sửa quyền xem; đường PATCH cần sửa cách tải bài riêng tư của chính chủ |
| 1.3.7 Xóa bài | Chủ bài xóa và dọn media | Đang xóa vật lý/cascade; thiết kế yêu cầu DA_XOA và giữ lịch sử |
| 1.3.8 Thích/bỏ thích | Trạng thái duy nhất, sự kiện LIKE và UNLIKE | Chưa có request ID và quy tắc giới hạn BAI_VIET đúng thiết kế loại nội dung |
| 1.3.9 Bình luận | Lưu SQL, kiểm tra quyền, ghi hành vi | Gửi lại cùng yêu cầu có thể tạo bình luận mới; thiếu request ID liên kết sự kiện |
| 1.3.10 Lưu/bỏ lưu | Lưu riêng tư của chủ tài khoản, SAVE và UNSAVE | Thiếu request ID, lịch sử bất biến và điều chỉnh gợi ý theo hủy |
| 1.3.11 Chia sẻ | Sao chép permalink, ghi SHARE | Thiết kế tập hành vi không có SHARE; cần thống nhất danh mục và xử lý link khi thu hồi quyền |
| 1.3.12 Tìm kiếm | API khách/người dùng, Accounts/Posts, phân trang | Còn UI khách, full-text index và VIEW khi mở chi tiết |
| 1.3.13 Theo dõi | Follow/unfollow, FOLLOW và UNFOLLOW | Rà tài khoản đích bị khóa; bổ sung mã yêu cầu, nguồn hành vi |
| 1.3.14 Nhóm quan hệ | Nhóm riêng của chủ, thêm/xóa thành viên, chặn xóa nhóm còn bài | Chưa đổi tên nhóm và kiểm tra thành viên phải thuộc quan hệ của chủ theo đặc tả |
| 1.3.15 Quyền xem | Public/followers/group khi đăng, quyền nhóm xét hiện tại | Chưa cập nhật quyền bài đã đăng; schema mới chỉ có CONG_KHAI/NHOM, phải ánh xạ followers |
| 1.3.16 Nhắn tin | Lưu SQL, JWT socket, ACK, lịch sử trực tiếp | Chưa có hội thoại/thành viên, request ID, trạng thái giao tin, thông báo tin nhắn |
| 1.3.17 Thông báo | Lưu SQL, realtime, API đánh dấu read | UI chưa mở đối tượng/đánh dấu đọc; thiếu read timestamp, phân trang, khóa chống trùng |
| 1.3.18 Bảng tin | Feed mới nhất/gợi ý, phân trang, ACL, ghi VIEW trên feed | Cold start/failure fallback chưa đúng thiết kế; cần snapshot/cursor tránh trùng khi xếp hạng đổi và kiểm tra ACL lần cuối |
| 1.3.19 Gợi ý tài khoản | Loại chính mình/đã theo dõi/tài khoản bị khóa | Chủ yếu danh sách gần đây; rà lại trạng thái khi mở hồ sơ |
| 1.3.20 Thống kê creator | Phạm vi tác giả, lượt xem/tương tác | Chưa có bộ lọc ngày/nội dung; cần phân biệt lịch sử sự kiện với trạng thái hiện tại |
| 1.3.21 Báo cáo | Báo nội dung hoặc tài khoản, kiểm tra đối tượng | Chưa chống báo cáo chờ trùng, mô tả bổ sung và request ID |
| 1.3.22 Xử lý báo cáo | Admin dismiss/hide/disable | Chưa lưu quyết định, lý do, người xử lý riêng; chưa khóa xử lý lại/cạnh tranh |
| 1.3.23 Kiểm duyệt | Ẩn bài từ báo cáo | Chưa có kiểm duyệt độc lập kèm lý do và nhật ký; cần kiểm soát mọi API/media nhất quán |
| 1.3.24 Tài khoản/phân quyền | Admin khóa/đổi role, thu hồi token/socket | Chưa có lý do/audit và ràng buộc quản trị viên cuối cùng ở DB |

Hoạt động 3.14 (thống kê hệ thống) và 3.19 (Story/Reels) cũng phải theo dõi: hiện chưa có dashboard thống kê admin đầy đủ; Reels là bài POST có video, không phải loại REELS độc lập như schema mới. Story có expires_at nhưng schema đề xuất lại chưa thể hiện thời điểm hết hạn trong bảng noi_dung. Cần thống nhất hai phía trước migration.

## Ánh xạ database: 18 bảng thiết kế và mô hình hiện hành

DB hiện có 15 bảng trong public, gồm 13 bảng nghiệp vụ cộng `SequelizeMeta` và `password_resets`. Vì vậy so 15 với 18 trực tiếp không phản ánh đủ phạm vi chuyển đổi.

| Thiết kế mxh | Hiện hành | Công việc chuyển đổi |
| --- | --- | --- |
| vai_tro | roles | UUID sang smallint; ánh xạ tên role |
| tai_khoan | users | UUID sang bigint; giữ hash/refresh/tokenVersion/khôi phục mật khẩu |
| nhom_quan_he | groups | Ánh xạ chủ sở hữu và ID |
| thanh_vien_nhom | group_members | Chuyển khóa ghép, ràng buộc quan hệ |
| noi_dung | posts | Loại POST/STORY/video sang BAI_VIET/STORY/REELS; trạng thái mềm; phạm vi/expiry |
| tep_dinh_kem | posts.media JSONB | Tách bảng, giữ thứ tự, định danh Cloudinary và dữ liệu ACL/media local |
| binh_luan | comments | Mã yêu cầu và ánh xạ tác giả/nội dung |
| luot_thich | likes | Khóa ghép, chuyển FK |
| luot_luu | saves | Khóa ghép, chuyển FK |
| theo_doi | follows | Khóa ghép, cấm tự theo dõi |
| hoi_thoai | Chưa có | Tạo một hội thoại cho mỗi cặp người gửi/nhận từ dữ liệu cũ |
| tham_gia_hoi_thoai | Chưa có | Đúng hai thành viên và kiểm tra cùng giao dịch |
| tin_nhan | messages | Thêm hội thoại, mã yêu cầu và trạng thái giao |
| thong_bao | notifications | Đọc theo timestamp, tham chiếu đối tượng, dedup; giữ trạng thái cũ |
| su_kien_hanh_vi | interactions | Mã yêu cầu/nguồn, loại hủy, giữ lịch sử, không cascade xóa |
| bao_cao_vi_pham | reports | Chờ/đã xử lý, request ID, chống trùng |
| ket_qua_xu_ly_bao_cao | Chưa có | Quyết định/lý do/người xử lý/thời điểm; tối đa một kết quả |
| thao_tac_quan_tri | Chưa có | Nhật ký bất biến, trước/sau, lý do và tác nhân |

Không đổi UUID sang bigint bằng cast. Cần bảng ánh xạ ID, chuyển mọi FK, cập nhật REST/Socket/types/frontend, đối chiếu số lượng/nội dung và thử rollback trên bản sao. Schema mxh khởi tạo là CREATE, không phải script nâng cấp schema public. Chưa coi SQL thiết kế đã chạy trong ứng dụng.

## Thứ tự cập nhật tiếp theo

1. **P1 — Quy tắc truy cập và phiên:** logout thu hồi đúng phiên; sửa PATCH bài riêng tư; đổi quyền xem sau đăng; thống nhất trạng thái khóa/ẩn/xóa ở feed/profile/media/search. Kiểm thử thu hồi quyền đồng thời.
2. **P1 — Dữ liệu/lịch sử:** chốt hợp đồng ID, loại nội dung và phạm vi; thiết kế migration có ánh xạ/backup/rollback; soft delete, request ID và nguồn sự kiện; nhật ký quản trị/kết quả báo cáo không sửa/xóa.
3. **P1 — Nhắn tin/quản trị:** hội thoại hai thành viên, gửi lại không trùng, giao tin/notification; xử lý báo cáo một lần trong transaction; bảo vệ admin cuối cùng.
4. **P2 — Hoàn thiện luồng người dùng:** đọc/mở/phân trang thông báo, UI tìm kiếm cho khách, ghi VIEW từ chi tiết, chỉnh nhóm, bộ lọc creator và dashboard admin.
5. **P2 — Gợi ý:** fallback công khai mới nhất, cursor/snapshot; dùng cả trạng thái hiện tại và sự kiện hủy. Giữ mô hình Bluesky/ALS độc lập với dữ liệu live cho đến khi có ánh xạ, đánh giá và kế hoạch tích hợp rõ ràng.
6. **P2 — Vận hành:** cấu hình và kiểm thử Cloudinary/email thật, profile Docker cả ứng dụng, tách bundle frontend. Hiện chỉ DB chạy container; backend/frontend chạy trên host.

## Kiểm chứng lượt cập nhật

- Backend: test tích hợp dùng database tạm riêng trong Docker, không reset dữ liệu demo. Kiểm tra quyền nhóm trước/sau thêm/xóa thành viên, bài bị ẩn, khách chỉ thấy public, token sai, ký tự đặc biệt và lịch sử hủy không trùng.
- Frontend: strict TypeScript, Vitest và production build. Kiểm tra tab Posts, điều hướng kết quả, lỗi API không bị trình bày thành rỗng và bỏ phản hồi truy vấn cũ.
- Không thay quyền hay cấp admin cho tài khoản demo. Các file nguồn sửa trong lượt này có backup ở thư mục runtime `D:\codes\Instagram-4.0-local\design-update-backup-20261028-*`.
- Chưa xác minh trực quan trên browser: điều khiển browser local đang bị tắt trong Work settings. Không thay cài đặt này; dùng test frontend và HTTP để xác nhận phần khả dụng.
