# Sử dụng toàn bộ Bluesky để gợi ý bài viết và người dùng

[Bluesky Social Dataset v3](https://zenodo.org/records/14669616) có khoảng 22 GB tệp nén, trong đó kho lịch sử bài viết chiếm 19,5 GB. Nhóm có thể sử dụng toàn bộ kho làm nguồn dữ liệu, nhưng nên tách thành hai bài toán và xử lý theo lô. Mô hình ALS hiện tại đọc một feed vào bộ nhớ, nên việc đổi `--max-users 0` chỉ bỏ giới hạn người trong feed, không chuyển sang toàn bộ Bluesky.

| Tệp | Dùng vào việc gì |
|---|---|
| `user_posts.tar.gz` (19,5 GB) | Catalog khoảng 235 triệu bài, nội dung và lịch sử đăng bài để tạo hồ sơ chủ đề, tìm bài mới, lấy ứng viên qua tác giả |
| `feed_posts_likes.tar.gz` (35,4 MB) | Lượt thích có ID người, ID bài, thời điểm; dùng làm nhãn cho mô hình gợi ý bài trong 11 feed |
| `feed_posts.tar.gz` (16,4 MB) | Metadata bài trong 11 feed; chuẩn hóa và loại trùng khi hợp nhất nhiều feed |
| `followers.csv.gz` (491,3 MB) | Đồ thị có hướng `A → B` nghĩa là A follow B; làm dữ liệu chính cho gợi ý follow |
| `interactions.csv.gz` (1,0 GB) | Quan hệ reply/repost/quote cấp người dùng, có thời gian; dùng làm tín hiệu quan tâm tác giả, không tự gán vào ID bài |

## Gợi ý bài viết

1. Hợp nhất lượt thích từ cả 11 feed và huấn luyện mô hình cơ sở trên các cặp `(user_id, post_id)`. Loại cặp trùng giữa các feed; chia train/validation/test theo thời gian như thí nghiệm hiện tại.
2. Đọc kho bài viết lớn theo luồng và ghi dữ liệu chia lô. Tách metadata nhỏ (`post_id`, tác giả, thời gian) khỏi nội dung nếu cần. Ưu tiên lấy ứng viên từ bài mới, tác giả người dùng quan tâm và bài cùng chủ đề. Chỉ tính điểm cho danh sách ứng viên của mỗi người.
3. Gộp điểm ALS cho bài có lịch sử với điểm nội dung, độ mới hoặc mức quan tâm tác giả. Bài không có lượt thích công khai vẫn có thể lọt vào danh sách qua nhánh nội dung. Vì nhãn chỉ tập trung ở các feed, báo cáo Recall@10, NDCG@10, tỷ lệ lọt vào tập ứng viên và phạm vi nhãn; không suy rộng điểm số thành chất lượng trên toàn bộ 235 triệu bài.

Không dùng lượt thích tổng hợp ở thời điểm thu thập hoặc đồ thị follow snapshot để dự đoán trong quá khứ nếu chưa chứng minh chúng đã có ở thời điểm gợi ý. Điều kiện quyền xem, chặn và xóa bài thuộc backend khi triển khai.

## Gợi ý người dùng để follow

1. Chuẩn hóa cặp `follower_id, followee_id` thành đồ thị thưa có hướng; loại tự follow và cạnh trùng.
2. Làm baseline xếp theo số người theo dõi. Sau đó thử thuật toán hai bước: A follow B, B follow C, vậy C là ứng viên của A. Xếp hạng theo số đường đi; có thể giảm trọng số của tài khoản trung gian follow quá nhiều. Lọc chính mình, tài khoản đã follow và tài khoản bị chặn khi phục vụ thật. Dùng danh sách kề hoặc truy vấn theo lô; không nhân toàn bộ đồ thị thành một ma trận dày.
3. Nếu cần mô hình có huấn luyện, dùng cạnh train và các tín hiệu reply/repost/quote phù hợp thời điểm để xây đặc trưng cho bộ xếp hạng. Hai bước tự nó đã là một thuật toán gợi ý có thể chạy và đánh giá mà không cần train.
4. `followers.csv.gz` chỉ có hai cột, không có thời điểm follow. Đánh giá offline bằng cách giữ lại một nhóm cạnh, xây mọi đặc trưng đồ thị chỉ từ cạnh train, rồi đo Recall@10 và NDCG@10 trên cạnh giữ lại. Đây là đánh giá khôi phục liên kết, chưa phải dự báo người dùng sẽ follow ai tiếp theo. Muốn đánh giá theo thời gian, ghi `followed_at` trên website hoặc dùng dữ liệu lịch sử follow có timestamp.

## Thứ tự triển khai trên máy của nhóm

1. Hợp nhất 11 feed và làm baseline follow trên `followers.csv.gz`. Hai việc này kiểm chứng được cả hai chức năng trước khi xử lý archive 19,5 GB.
2. Thử luồng đọc kho bài viết trên một phần nhỏ. Đo dung lượng đầu ra và tốc độ theo lô, sau đó mới chạy hết; kiểm tra ổ đĩa còn chỗ cho archive, đầu ra và thư mục tạm. Có thể đọc trực tiếp từ gói nén, tránh bung hàng triệu tệp vào OneDrive.
3. Dùng toàn bộ dữ liệu cho bước lập chỉ mục và tạo ứng viên khi đủ tài nguyên; giữ riêng dữ liệu và tiêu chí đánh giá của từng chức năng. Xuất top K theo lô để Node.js/PostgreSQL phục vụ. ID Bluesky chỉ dùng cho thí nghiệm; khi triển khai website, hai hệ gợi ý cần dùng ID và hành vi trên website.

Tài liệu này mô tả hướng triển khai. Kết quả train đã có trong `experiment_results.json` vẫn chỉ là thí nghiệm trên feed Science.
