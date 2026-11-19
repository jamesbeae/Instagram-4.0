# Chạy gợi ý bài viết từ 11 feed và gợi ý follow

## Mã nguồn nằm ở đâu

- `src/recommender.py`: implicit ALS, đọc một feed hoặc gộp tất cả feed, train, đánh giá và sinh bài viết gợi ý.
- `src/follow_recommender.py`: đồ thị follow có hướng trong SQLite, gợi ý qua hai bước và baseline phổ biến, đánh giá cạnh giữ lại.
- `tests/test_expansion.py`: kiểm tra gộp feed, giữ thời điểm like sớm nhất, chiều follow, loại chính mình/người đã follow và không dùng cạnh test để tính điểm.

Mở terminal trong thư mục `article-recommender`. Dùng Python 3.12 và cài `requirements.txt` như README chính nếu máy chưa có `.venv`.

## Xem mô hình bài viết đã chạy

Data và artifacts không nằm trong Git. Nếu vừa clone repo, thực hiện phần “Tái lập bài viết với tên mới” trước; các lệnh xem kết quả sẵn chỉ dùng cho máy đã train.

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py recommend --run all-feeds-als16-v1 --k 10
```

Thêm `--user 100003` để chọn một người đã có trong mô hình. Người chưa có sẽ nhận baseline phổ biến. Đầu ra JSON ở `artifacts/all-feeds-als16-v1/recommendations.json`; đây là kết quả dùng ID Bluesky, chưa phải API website.

## Tái lập bài viết với tên mới

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py download
.\.venv\Scripts\python.exe -X utf8 src/recommender.py prepare --feed all --name all-feeds-practice --max-users 10000
.\.venv\Scripts\python.exe -X utf8 src/recommender.py train --data all-feeds-practice --run all-feeds-practice --factors 16 --alpha 1 --regularization 1 --iterations 10
.\.venv\Scripts\python.exe -X utf8 src/recommender.py evaluate --run all-feeds-practice --split validation --max-eval-users 0
.\.venv\Scripts\python.exe -X utf8 src/recommender.py evaluate --run all-feeds-practice --split test --max-eval-users 0
.\.venv\Scripts\python.exe -X utf8 src/recommender.py recommend --run all-feeds-practice --k 10
```

`--feed all` tự liệt kê feed trong archive. Cặp người–bài trùng giữa các feed chỉ giữ một lần, với thời gian sớm nhất. Lựa chọn người và lọc ngưỡng chỉ dựa trên train. `--max-users 0` bỏ giới hạn người trong tập feed; chưa đọc archive bài viết 19,5 GB. Mã gộp feed hiện vẫn giữ bài và các cặp tương tác trong RAM; không dùng nó để nạp toàn bộ 235 triệu bài.

Đã chạy với tên `all-feeds-v1`/`all-feeds-als16-v1`: 11 feed, 3.102.957 cặp hợp lệ, 1.749.136 dòng hợp lệ trùng bị gộp. Sau giới hạn 10.000 người và lọc core, train còn 9.427 người, 32.721 bài, 209.050 lượt thích.

| Split | Người đánh giá warm | Coverage tương tác warm | ALS Recall@10 | Phổ biến Recall@10 | ALS NDCG@10 | Phổ biến NDCG@10 |
|---|---:|---:|---:|---:|---:|---:|
| Validation | 739 | 0,397% | 0,025498 | 0,023951 | 0,018800 | 0,022021 |
| Test | 553 | 0,322% | 0,071384 | 0,053195 | 0,051890 | 0,052051 |

Không kết luận ALS tốt hơn tổng thể: Recall tăng trong nhóm warm nhưng NDCG chưa vượt baseline và coverage thấp. Dữ liệu nguồn thí nghiệm lớn hơn bản Science, nên không so điểm trực tiếp giữa hai bản như thể chỉ có thuật toán thay đổi. Cấu hình kế thừa thí nghiệm trước, không điều chỉnh theo test. Số liệu gốc lưu trong `all_feeds_results.json` để giữ cùng source khi Git bỏ qua artifacts.

## Dựng đồ thị follow

```powershell
.\.venv\Scripts\python.exe -X utf8 src/follow_recommender.py build --run follow-full-v1
```

Lệnh tải và kiểm tra checksum `data/raw/followers.csv.gz` (~491 MB nén), đọc lần lượt và ghi đồ thị đầy đủ vào `artifacts/follow-full-v1/graph.sqlite`. Đồ thị, index và các tệp tạm sẽ lớn hơn tệp nén và có thể mất nhiều thời gian tạo. Chỉ `build` mới tải dữ liệu; các lệnh khác dùng dữ liệu đã dựng. Lệnh không chạy nền sau khi terminal bị đóng.

Để thử đường chạy trước, vẫn tải toàn bộ archive nhưng chỉ nhập tối đa 200.000 cạnh đầu:

```powershell
.\.venv\Scripts\python.exe -X utf8 src/follow_recommender.py build --run follow-smoke-v1 --max-edges 200000
.\.venv\Scripts\python.exe -X utf8 src/follow_recommender.py evaluate --run follow-smoke-v1 --split validation --max-users 100 --k 10
```

Mẫu đầu tệp là kiểm tra chức năng, không đại diện toàn đồ thị; báo cáo ghi rõ `max_edges`. Không so điểm của mẫu với đồ thị đầy đủ như hai mô hình trên cùng dữ liệu.

Sau khi build full hoàn tất:

```powershell
.\.venv\Scripts\python.exe -X utf8 src/follow_recommender.py recommend --run follow-full-v1 --user 100003 --k 10
.\.venv\Scripts\python.exe -X utf8 src/follow_recommender.py evaluate --run follow-full-v1 --split validation --max-users 100 --k 10
```

Gợi ý follow đếm đường `A → B → C`, loại A và người A đã follow trong train, ưu tiên nhiều đường kết nối; nếu chưa đủ K thì bổ sung từ popularity tính trên train. Với tài khoản bậc lớn, việc duyệt hai bước có thể chậm. Đây là thuật toán đồ thị, không có file vector đã train như ALS.

Chia cạnh bằng hash cố định: khoảng 80% train, 10% validation, 10% test. Cạnh trùng luôn cùng split. Đồ thị và popularity chỉ dùng train; không dùng cạnh giữ lại làm đặc trưng. Vì nguồn không có timestamp follow, đây là đánh giá khôi phục liên kết. Tài khoản cold vẫn nằm trong đánh giá; chỉ số `cold_source_users` giúp hiểu phạm vi. Lấy mẫu người đánh giá theo hash ổn định, mặc định 100 người; báo cáo ghi số thực tế. Chỉ chạy test sau khi chốt phương pháp.

Trong demo đánh giá, lịch sử loại trừ là cạnh train. Khi phục vụ website thật, phải loại thêm toàn bộ follow hiện tại, người bị chặn và tài khoản không đủ điều kiện. Mã CLI chưa nhận các bộ lọc quyền truy cập của website.

Nếu tải lỗi mạng, tải thủ công từ `https://zenodo.org/records/14669616` vào đúng đường dẫn, rồi chạy lại. Nếu build bị dừng, thư mục run chưa có `follow_report.json` được xem là chưa hoàn tất; chọn run mới để chạy lại, không dùng đồ thị dở. Mã hiện chưa hỗ trợ resume import hoặc resume download.

## Kiểm thử

```powershell
.\.venv\Scripts\python.exe -X utf8 -m unittest discover -s tests -v
```

Việc dựng graph thật phụ thuộc tải dữ liệu và cần phân biệt với kiểm thử đồ thị nhỏ. Xem `IMPLEMENTATION_STATUS.json` để biết đường chạy nào thực sự đã hoàn tất trong phiên triển khai.
