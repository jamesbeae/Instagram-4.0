# Huấn luyện thuật toán gợi ý bài viết cho đồ án mạng xã hội

Bản mở rộng: [hướng dẫn chạy 11 feed và thuật toán follow](RUN_EXPANDED.md). Các phần bên dưới giữ lại thí nghiệm Science ban đầu để đối chiếu.

Thư mục này chứa bộ mã **đã chạy huấn luyện trên lượt thích thật của Bluesky**, cùng hướng dẫn để nhóm tự chạy lại, đọc kết quả và hiểu thuật toán. Mục tiêu ban đầu là học sở thích từ lịch sử người dùng thích bài viết, sau đó xếp hạng các bài chưa thích.

Phiên bản này dùng **Implicit ALS**, triển khai bằng NumPy để có thể đọc trực tiếp công thức cập nhật trong mã và chạy trên CPU Windows. Đây là mô hình học từ dữ liệu, không phải danh sách gợi ý được viết sẵn. Mô hình hiện tại là một thí nghiệm khởi đầu: kết quả đánh giá còn thấp và chưa vượt phương pháp bài phổ biến. Phần 12 ghi kết quả thực tế và giới hạn của thí nghiệm.

Nếu nhóm muốn dùng toàn bộ Bluesky và làm cả hai chức năng, xem [kế hoạch mở rộng](BLUESKY_FULL.md). Các lệnh dưới đây vẫn chỉ tái lập thí nghiệm ALS theo từng feed; chúng chưa tải hoặc xử lý toàn bộ bộ dữ liệu.

## 1. Nhóm sẽ làm được gì?

Sau khi chạy hướng dẫn, nhóm có thể:

- Tải đúng hai tệp dữ liệu trong nguồn được giao.
- Đọc bài viết và lượt thích, kiểm tra và loại bản ghi không hợp lệ.
- Chia dữ liệu theo thời gian để hạn chế sử dụng thông tin tương lai.
- Huấn luyện các vector người dùng và bài viết bằng ALS.
- Lưu mô hình để dùng lại mà không cần train lại mỗi lần gợi ý.
- Đánh giá Recall@10, NDCG@10 và so sánh với bài phổ biến.
- Sinh danh sách bài viết gợi ý cho một người dùng.

Chưa triển khai trong bộ mã này: API HTTP, giao diện React, nội dung đa phương tiện, theo dõi, comment/save/view, mô hình nội dung, cập nhật online, lọc quyền xem bài viết. Những phần đó sẽ được tích hợp sau khi nhóm hiểu và kiểm chứng được mô hình cơ sở.

## 2. Cấu trúc thư mục

```text
article-recommender/
├── README.md
├── requirements.txt
├── .gitignore
├── src/
│   └── recommender.py        # Download, chuẩn bị, train, đánh giá, gợi ý
├── tests/
│   └── test_recommender.py   # Kiểm chứng toán học và quy tắc đánh giá
├── data/
│   ├── raw/                 # Hai tệp tải từ Zenodo
│   └── processed/
│       └── science-small/
│           ├── train.csv
│           ├── validation.csv
│           ├── test.csv
│           ├── posts.json
│           └── prepare_report.json
└── artifacts/
    ├── als-16/
    ├── als-32/
    └── als-16-a1-r1/         # Cấu hình ALS được chọn theo validation
        ├── model.npz
        ├── id_mapping.json
        ├── train.csv
        ├── posts.json
        ├── train_report.json
        ├── validation_metrics.json
        ├── test_metrics.json
        └── recommendations.json
```

`data`, `artifacts`, `.venv` được bỏ qua bởi Git. Nếu chuyển sang máy khác, cần tải và train lại hoặc sao chép các thư mục đó riêng. Để chia sẻ một mô hình, gửi nguyên thư mục run, không chỉ gửi `model.npz`.

## 3. Chuẩn bị môi trường trên Windows

Mã đã được kiểm tra bằng Python 3.12, NumPy 1.26.4 và threadpoolctl 3.5.0. Nên dùng Python 3.12 bản 64 bit để chạy theo cùng môi trường. Không cần GPU cho cấu hình nhỏ này.

Mở PowerShell trong thư mục `article-recommender`. Nếu terminal đang ở thư mục đồ án, chạy:

```powershell
cd article-recommender
```

Trên máy mới, tạo môi trường riêng và cài thư viện:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Nếu `.venv` đã có trên máy hiện tại, có thể sử dụng luôn. Không cần activate môi trường: tất cả lệnh bên dưới gọi đúng Python trong `.venv`. Tùy chọn `-X utf8` hỗ trợ đường dẫn và nội dung tiếng Việt.

Kiểm tra:

```powershell
.\.venv\Scripts\python.exe -X utf8 -c "import numpy; print(numpy.__version__)"
.\.venv\Scripts\python.exe -X utf8 src/recommender.py --help
```

Các đường dẫn dữ liệu được tính từ vị trí mã nguồn, nhưng lệnh trong README giả định terminal đang ở `article-recommender`.

## 4. Xem kết quả đã train trên máy hiện tại

Không cần tải lại hoặc train lại nếu các thư mục trong phần 2 vẫn còn. Chạy:

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py recommend --run als-16-a1-r1 --k 10
```

Không truyền `--user` thì chương trình chọn người dùng đầu tiên trong ánh xạ của mô hình. Muốn chọn người cụ thể, đọc `artifacts/als-16-a1-r1/id_mapping.json`, lấy một ID trong `user_ids`, rồi chạy:

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py recommend --run als-16-a1-r1 --user 100035 --k 10
```

Đầu ra gồm ID bài viết, điểm xếp hạng, nội dung và thời gian đăng. Đồng thời được lưu ở `recommendations.json`. Tệp này được cập nhật sau mỗi lần gọi gợi ý.

Thử người dùng chưa có trong mô hình:

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py recommend --run als-16-a1-r1 --user new-user --k 10
```

Trường `method` sẽ là `popularity_fallback`: trả các bài có nhiều lượt thích trong tập train. Đây là cơ chế dự phòng, chưa phải gợi ý cá nhân hóa cho người mới.

## 5. Tự chạy toàn bộ quy trình lần đầu

Các lệnh này dùng tên mới `science-practice` và `practice-16`, để không ghi đè kết quả đã có. Nếu đã dùng tên này trước đó, đổi tên trong tất cả lệnh tương ứng.

### Bước 1: Tải dữ liệu

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py download
```

Chương trình tải hai tệp từ [Bluesky Social Dataset trên Zenodo](https://zenodo.org/records/14669616):

| Tệp | Dung lượng nén theo Zenodo | Vai trò |
|---|---:|---|
| `feed_posts.tar.gz` | 16,4 MB | Bài viết trong các feed |
| `feed_posts_likes.tar.gz` | 35,4 MB | Lượt thích bài viết |

Các tệp hợp lệ đã có sẽ được dùng lại sau khi kiểm tra MD5. Tệp tải dở dùng đuôi `.part`; chạy lại sẽ tải lại tệp đó. Không cần giải nén bằng tay vì mã đọc trực tiếp các tệp gzip bên trong archive.

### Bước 2: Chuẩn bị dữ liệu

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py prepare --feed Science --name science-practice --max-users 2000 --min-user-likes 3 --min-post-likes 2 --seed 42
```

Lệnh này chọn feed `Science`, lấy tối đa 2.000 người dùng đủ điều kiện từ train theo thứ tự hash cố định, rồi lọc lặp cho đến khi mỗi người còn ít nhất 3 bài đã thích và mỗi bài còn ít nhất 2 người thích. Số người sau lọc có thể nhỏ hơn 2.000.

Đầu ra nằm trong `data/processed/science-practice/`. Đọc `prepare_report.json` để biết số bản ghi, số người, số bài, các mốc chia thời gian và số dòng bị loại.

### Bước 3: Train

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py train --data science-practice --run practice-16 --factors 16 --iterations 10 --alpha 20 --regularization 0.1 --seed 42
```

Mỗi vòng lặp sẽ in `objective`. Sau khi hoàn thành, mô hình và báo cáo được lưu trong `artifacts/practice-16/`.

### Bước 4: Đánh giá validation

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py evaluate --run practice-16 --split validation --k 10 --max-eval-users 0
```

`--max-eval-users 0` nghĩa là đánh giá toàn bộ người đủ điều kiện. Nếu không truyền, giới hạn mặc định là 1.000 người; báo cáo ghi rõ số thực sự được đánh giá.

### Bước 5: Thử cấu hình khác trên cùng dữ liệu

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py train --data science-practice --run practice-16-a1-r1 --factors 16 --iterations 10 --alpha 1 --regularization 1 --seed 42
.\.venv\Scripts\python.exe -X utf8 src/recommender.py evaluate --run practice-16-a1-r1 --split validation --k 10 --max-eval-users 0
```

So sánh các `validation_metrics.json`. Có thể chọn cấu hình theo NDCG@10, kiểm tra thêm Recall@10. Luôn so sánh cả baseline phổ biến; nếu baseline tốt hơn, phải ghi đúng kết quả đó.

### Bước 6: Đánh giá test sau khi chốt cấu hình

Ví dụ nếu chọn `practice-16-a1-r1`:

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py evaluate --run practice-16-a1-r1 --split test --k 10 --max-eval-users 0
```

Không dùng kết quả test để liên tục đổi cấu hình rồi vẫn gọi đó là đánh giá độc lập. Nếu sửa phương pháp sau khi xem test, cần thiết kế thí nghiệm mới và công bố rõ.

### Bước 7: Sinh gợi ý

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py recommend --run practice-16-a1-r1 --k 10
```

## 6. Dữ liệu thật được đọc như thế nào?

Trong hai archive, feed Science tương ứng với:

```text
feed_posts/Science.jsonl.gz
feed_posts_likes/Science.csv.gz
```

Một dòng bài viết là một JSON. Các trường được mã sử dụng: `post_id`, `user_id` của tác giả, `date`, `text`.

Một dòng like có 4 cột, không có header:

```text
liker_id,author_id,post_id,date
```

Ví dụ thực tế đã đọc:

```text
718650,10507,134430,202402191512
```

Nghĩa là người `718650` thích bài `134430` của tác giả `10507`, với mốc lịch 19/02/2024 lúc 15:12 theo biểu diễn nguồn. **Không gán múi giờ cho nguồn khi chưa có xác nhận.** Mã chỉ dùng thứ tự mốc thời gian đó.

Chuỗi `202402191512` có dạng `YYYYMMDDHHMM`; nó không phải Unix timestamp. Vì định dạng này có độ dài cố định và xếp từ năm đến phút, so sánh số nguyên bảo toàn thứ tự thời gian trong dữ liệu đã kiểm tra.

Sau chuẩn hóa, CSV có header:

```csv
user_id,post_id,timestamp
718650,134430,202402191512
```

Mã thực hiện:

1. Đối chiếu ID bài với metadata.
2. Kiểm tra tác giả và loại lượt like xảy ra trước ngày đăng.
3. Loại trùng cặp người–bài; giữ thời điểm like sớm nhất.
4. Chia theo thời gian.
5. Chọn người và lọc độ hoạt động chỉ trên train.

Không dùng trường tổng `like_count` trong metadata để train hoặc tính baseline, vì tổng đó có thể chứa lượt thích phát sinh sau mốc train.

## 7. Train đang học cái gì?

Giả sử có 3 người dùng và 4 bài:

| | P1 | P2 | P3 | P4 |
|---|---:|---:|---:|---:|
| U1 | 1 | 1 | 0 | 0 |
| U2 | 1 | 0 | 1 | 0 |
| U3 | 0 | 0 | 1 | 1 |

`1` là có lượt thích, `0` là chưa quan sát thấy lượt thích. Nhóm không có bằng chứng người dùng ghét tất cả các bài ở ô `0`.

Mô hình học hai bảng vector:

- `X`: mỗi hàng biểu diễn một người dùng.
- `Y`: mỗi hàng biểu diễn một bài viết.

Điểm gợi ý được tính bằng tích vô hướng:

```text
score(user, post) = X[user] · Y[post]
```

Điểm lớn hơn thì bài được xếp cao hơn. Điểm này **không phải xác suất thích bài**. ALS ở đây không đọc nội dung văn bản, không hiểu hình ảnh và không sinh bài viết; nó học các mẫu đồng tương tác giữa người và bài.

Các vector là đặc trưng ẩn. Không mặc định diễn giải từng chiều thành một chủ đề cụ thể như bóng đá hoặc âm nhạc.

## 8. Công thức và quá trình huấn luyện ALS

Triển khai theo mô hình phản hồi ngầm trong [Hu, Koren và Volinsky, Collaborative Filtering for Implicit Feedback Datasets](https://yifanhu.net/PUB/cf.pdf).

Với binary like trong bộ mã:

```text
r_ui = 1 nếu có like, ngược lại 0
p_ui = r_ui
c_ui = 1 + alpha * r_ui

L = Σ_u Σ_i c_ui * (p_ui - x_uᵀ y_i)²
    + lambda * (Σ_u ||x_u||² + Σ_i ||y_i||²)
```

`p` là mục tiêu, `c` là trọng số tin cậy, `lambda` là regularization. Ô chưa tương tác vẫn tham gia mục tiêu với trọng số thấp hơn ô đã like.

ALS cập nhật luân phiên: giữ `Y` để giải `X`, rồi giữ `X` mới để giải `Y`. Mã giải hệ tuyến tính cho từng vector; không dùng gradient descent.

Đọc `als_update()` trong `src/recommender.py`. Với các bài người dùng đã thích, mã tính:

```text
A = YᵀY + alpha * Y_likedᵀY_liked + lambda * I
b = (1 + alpha) * tổng các vector bài đã thích
giải A * x_u = b
```

Không tạo ma trận đầy đủ người–bài. Mã lưu danh sách chỉ số các lượt like, rồi dùng ma trận tích `YᵀY` để tính phần của tất cả ô chưa tương tác. `objective()` cũng tính mục tiêu mà không cấp phát bảng điểm đầy đủ.

### Tham số cần hiểu

| Tham số | Ý nghĩa | Cấu hình khởi đầu |
|---|---|---:|
| `factors` | Số chiều mỗi vector | 16 |
| `iterations` | Số lượt cập nhật cả X và Y | 10 |
| `alpha` | Tăng trọng số tin cậy cho like | 20 |
| `regularization` | Hạn chế vector quá lớn, giảm khớp quá mức | 0,1 |
| `seed` | Cố định khởi tạo ngẫu nhiên | 42 |

Tăng số chiều hoặc số vòng không bảo đảm tăng chất lượng gợi ý. `objective` giảm chỉ cho thấy mô hình tối ưu tập train; quyết định chọn mô hình phải dựa trên validation.

Đây là bản ALS giải chính xác dành cho học và thí nghiệm nhỏ. Khi dữ liệu lớn hơn, thời gian tăng theo số người, số bài, số lượt thích và kích thước hệ tuyến tính. Có thể chuyển sang [thư viện implicit](https://benfred.github.io/implicit/) để dùng triển khai tối ưu; cần kiểm tra quy ước confidence của thư viện, không sao chép `alpha` một cách máy móc.

## 9. Chia train, validation, test để tránh rò rỉ

Mã tìm các mốc xấp xỉ phân vị 80% và 90% của thời gian tương tác đã đối chiếu. Các tương tác cùng phút được giữ trong cùng một phần:

```text
train:      timestamp < validation_start
validation: validation_start <= timestamp < test_start
test:       timestamp >= test_start
```

Tỷ lệ sau lọc train sẽ không còn là 80/10/10, vì chỉ train được thu nhỏ và lọc. Validation/test giữ nguyên để có thể báo cáo các trường hợp mô hình không hỗ trợ.

**Giao thức hiện tại là snapshot cố định**: mô hình chỉ học train và gợi ý từ những bài đã có tương tác trong train. Validation và test đều đánh giá mô hình đó, không cập nhật theo lượt like mới ở validation.

Do bài trong catalog phải có lượt like trước mốc train kết thúc, chúng đã tồn tại trước giai đoạn đánh giá. Không thêm bài tương lai vào danh sách ứng viên. Tuy nhiên, cách train này không mô phỏng việc học cập nhật hàng ngày trên một mạng xã hội.

Nếu sau này muốn train lại trên train + validation, nhóm phải tạo snapshot, ánh xạ, lịch sử và báo cáo mới nhất quán; mã hiện tại chưa tự thực hiện bước đó.

## 10. Đánh giá bằng Recall@10 và NDCG@10

Với mỗi người đủ điều kiện:

1. Lấy những bài họ thực sự like trong giai đoạn đánh giá.
2. Chỉ giữ mục tiêu thuộc catalog train và chưa like trong train.
3. Xếp hạng **toàn bộ catalog train**, loại bài đã like trong train.
4. Lấy top 10 rồi đối chiếu với các mục tiêu.

Không chỉ lấy vài bài âm ngẫu nhiên để làm ứng viên. Cả ALS và baseline dùng cùng catalog, cùng người, cùng lịch sử và cùng quy tắc loại bài.

### Recall@10

```text
Recall@10 = số bài mục tiêu xuất hiện trong top 10 / tổng số bài mục tiêu hợp lệ
```

Ví dụ người dùng có 4 bài mục tiêu hợp lệ, top 10 trúng 1 bài thì Recall@10 = 0,25.

### NDCG@10

Điểm này còn xét vị trí: trúng ở đầu danh sách được tính cao hơn trúng gần cuối.

```text
DCG@10 = Σ_rank hit(rank) / log2(rank + 1)   [rank bắt đầu từ 1]
NDCG@10 = DCG@10 / DCG tốt nhất có thể với các mục tiêu của người đó
```

Mã lấy trung bình theo người dùng, tức macro average. Người dùng không còn mục tiêu hợp lệ không được đưa vào trung bình này. Do đó phải đọc **cả coverage**, không chỉ đọc điểm ranking.

### Baseline bài phổ biến

Baseline đếm số người thích từng bài trong **train đã lọc**, sau đó xếp giảm dần. Đây là phương pháp so sánh bắt buộc trong thí nghiệm này; nó không sử dụng lượt thích của validation/test.

### Các trường coverage

| Trường báo cáo | Ý nghĩa |
|---|---|
| `cold_user_rows` | Tương tác của người chưa có trong mô hình |
| `cold_post_rows_known_user` | Người đã có nhưng bài chưa có trong mô hình |
| `already_seen_rows` | Mục tiêu đã nằm trong lịch sử train |
| `warm_target_rows` | Tương tác còn lại có thể đánh giá ranking |
| `warm_target_coverage` | Tỷ lệ mục tiêu warm trên toàn bộ tương tác của split |
| `eligible_users` | Người có ít nhất một mục tiêu hợp lệ |
| `evaluated_users` | Người thực sự được đánh giá sau giới hạn lấy mẫu |

Các nhóm loại trừ được đếm theo thứ tự: cold user trước, rồi cold post, rồi đã xem. Một dòng không được tính đồng thời vào nhiều nhóm. “Warm” nghĩa là cả người và bài đã có trong train.

## 11. Mô hình lưu gì và dùng lại ra sao?

| Tệp | Nội dung |
|---|---|
| `model.npz` | Hai bảng vector đã học X và Y |
| `id_mapping.json` | Ánh xạ chỉ số vector về ID người và ID bài |
| `train.csv` | Lịch sử dùng để loại bài đã like và tính baseline |
| `posts.json` | Metadata của catalog train |
| `train_report.json` | Tham số, thời gian, lịch sử objective, checksum train |
| `validation_metrics.json`, `test_metrics.json` | Điểm và phạm vi đánh giá |
| `recommendations.json` | Lần gợi ý gần nhất |

Ví dụ ID người dùng là `718650`, nhưng vector có thể ở hàng 123. Phải dùng đúng ánh xạ; ID nguồn không phải chỉ số của mảng NumPy.

`load_run()` đọc các tệp này. `recommend()` tính điểm, loại lịch sử và lấy top K. Với người mới, mã dùng baseline; với bài mới, mã chưa có vector nên bài đó chưa thể xuất hiện trong kết quả.

## 12. Kết quả thực tế đã chạy ngày 11/10/2026

Các số đo gốc, tham số, lịch sử objective và checksum train được lưu trong [experiment_results.json](experiment_results.json). Tệp này nằm ngoài thư mục bị Git bỏ qua để nhóm giữ lại bằng chứng thí nghiệm khi chia sẻ mã.

Nguồn là dữ liệu thật của feed Science; thí nghiệm dùng tối đa 2.000 người trước khi lọc train, seed 42.

| Đại lượng | Kết quả |
|---|---:|
| Lượt like duy nhất sau đối chiếu | 730.255 |
| Train trước lọc | 584.204 |
| Train sau lấy mẫu và lọc | 26.688 |
| Người trong train | 1.783 |
| Bài trong train | 6.644 |
| Validation | 73.025 tương tác |
| Test | 73.026 tương tác |

Mốc bắt đầu validation: `202401292101`. Mốc bắt đầu test: `202402220501`.

Đã kiểm tra 3 cấu hình, đều train 10 vòng, seed 42 và dùng cùng dữ liệu:

| Run | factors | alpha | regularization | Validation Recall@10 | Validation NDCG@10 |
|---|---:|---:|---:|---:|---:|
| `als-16` | 16 | 20 | 0,1 | 0,000650 | 0,001874 |
| `als-32` | 32 | 20 | 0,1 | 0,025666 | 0,017459 |
| `als-16-a1-r1` | 16 | 1 | 1 | 0,030864 | 0,022323 |
| Baseline phổ biến | — | — | — | **0,055556** | **0,056952** |

Trong 3 cấu hình ALS, chọn `als-16-a1-r1` theo validation NDCG@10. Baseline vẫn tốt hơn cả ba. Test chỉ được chạy cho cấu hình ALS đã chọn, đồng thời tính baseline:

| Phương pháp | Test Recall@10 | Test NDCG@10 |
|---|---:|---:|
| ALS đã chọn | 0,018519 | 0,005977 |
| Baseline phổ biến | **0,027778** | **0,015707** |

Phạm vi của các điểm trên:

- Validation: 152 mục tiêu warm, 81 người được đánh giá; coverage khoảng **0,208%**.
- Test: 179 mục tiêu warm, 72 người được đánh giá; coverage khoảng **0,245%**.
- Đã đánh giá toàn bộ người đủ điều kiện, không giới hạn 1.000 người trong thí nghiệm này.

**Chưa thể kết luận mô hình phù hợp triển khai hoặc tốt hơn baseline.** Catalog cố định bỏ qua bài xuất hiện sau train, và lấy mẫu 2.000 người loại nhiều người khỏi mô hình. Các điểm trên chỉ phản ánh một nhóm warm nhỏ; không phải Recall của toàn bộ người dùng mạng xã hội. Dữ liệu lượt like cũng chưa cho biết chính xác những bài người dùng đã được hiển thị nhưng không thích.

Objective của `als-16` giảm từ khoảng 344.594 xuống 247.907. Điều này cùng kiểm thử công thức xác nhận quá trình học chạy được; không chứng minh ranking tốt.

## 13. Cải thiện tiếp theo như thế nào?

Ưu tiên tăng phạm vi mô hình và đo coverage trước khi thử nhiều cấu hình hơn. Ví dụ lấy tối đa 10.000 người trong cùng feed:

```powershell
.\.venv\Scripts\python.exe -X utf8 src/recommender.py prepare --feed Science --name science-10k --max-users 10000
.\.venv\Scripts\python.exe -X utf8 src/recommender.py train --data science-10k --run science-10k-als --factors 16 --alpha 1 --regularization 1
.\.venv\Scripts\python.exe -X utf8 src/recommender.py evaluate --run science-10k-als --split validation --max-eval-users 0
```

Các lệnh mở rộng này là hướng dẫn, **chưa được chạy trong kết quả phần 12**. Chúng dùng nhiều RAM và thời gian hơn. `--max-users 0` bỏ giới hạn, nhưng nên tăng từng bước trên máy cá nhân.

Các hướng tiếp theo cần làm thí nghiệm riêng:

1. Thêm mô hình theo nội dung để gợi ý bài mới chưa có tương tác.
2. Kết hợp điểm nội dung, ALS, độ mới và quan hệ follow; chọn trọng số bằng validation.
3. Đánh giá theo cửa sổ thời gian, cập nhật mô hình định kỳ để phù hợp dòng bài mới.
4. Thử feed khác bằng `--feed "Game Dev"` hoặc `--feed AcademicSky`; dùng tên dataset/run mới.
5. Thu thập tương tác thật trên website và đánh giá riêng trên dữ liệu đó.

Không tạo các lượt like giả rồi dùng kết quả ấy để chứng minh chất lượng trên người dùng thật. Dữ liệu giả chỉ phù hợp kiểm tra chương trình có hoạt động.

## 14. Tích hợp với Node.js và PostgreSQL

Train bằng Python là một phần riêng của hệ thống. Backend Node.js không bắt buộc phải train mô hình.

Luồng dự kiến:

```text
React → Node.js ghi sự kiện → PostgreSQL
PostgreSQL → xuất dữ liệu hành vi → Python train định kỳ
Python → danh sách gợi ý/điểm → Node.js → React
```

Giai đoạn đầu có thể tính sẵn danh sách rồi lưu bảng `UserRecommendation(user_id, post_id, score, model_version, generated_at)`. Khi cần phục vụ theo yêu cầu, xây API Python nạp mô hình một lần và để Node.js gọi API đó. Mã CLI hiện tại chưa cung cấp API.

**ID Bluesky không tương ứng với ID người và bài trên website của nhóm.** Mô hình hiện có chỉ gợi ý các bài trong catalog Bluesky. Muốn cá nhân hóa bài trên website, phải train/cập nhật từ tương tác của website hoặc xây mô hình nội dung hỗ trợ chuyển sang bài mới.

Trước khi trả danh sách thật, backend cần lọc quyền xem, bài bị xóa/ẩn, người bị chặn, phạm vi nhóm và kiểm duyệt. Không đưa các hạn chế quyền truy cập vào một danh sách chỉ lọc bằng điểm ALS.

Để thu thập dữ liệu về sau, có thể thiết kế bảng sự kiện:

```text
InteractionEvent(
  event_id, user_id, post_id, event_type, occurred_at, dwell_ms
)
```

`follow` liên quan đến tác giả, cần biểu diễn riêng; không tự coi là like mọi bài của tác giả. Với view/comment/save, cần xác định ý nghĩa, khử sự kiện trùng và chọn trọng số bằng validation. Bộ mã hiện tại chỉ hỗ trợ binary like và chưa nhận trực tiếp bản xuất PostgreSQL.

## 15. Kiểm thử và lỗi thường gặp

Chạy kiểm thử:

```powershell
.\.venv\Scripts\python.exe -X utf8 -m unittest discover -s tests -v
```

Đã có 5 kiểm thử: cập nhật ALS khớp hệ tuyến tính đầy đủ; objective khớp phép tính đầy đủ và giảm sau cập nhật; không tách các thời điểm bằng nhau qua ranh giới; ranking loại bài đã thấy và tính metric đúng; lọc core lặp đúng.

| Lỗi / hiện tượng | Cách xử lý |
|---|---|
| `py` không được nhận diện | Cài Python 3.12 và Python Launcher; hoặc dùng đường dẫn tuyệt đối đến Python |
| `No module named numpy` | Cài requirements bằng chính Python trong `.venv` |
| `Output exists` / `Run exists` | Đổi `--name` / `--run`; mã không ghi đè dataset hay mô hình |
| Thiếu tệp `.tar.gz` | Chạy `download` trước `prepare` |
| Checksum không khớp | Chạy `download` lại; không sử dụng tệp tải dở |
| `KeyError` tên feed | Kiểm tra đúng tên feed; có khoảng trắng phải đặt trong dấu nháy |
| Train rỗng sau lọc | Giảm ngưỡng số like tối thiểu hoặc tăng số người |
| Không có mục tiêu warm | Thử feed nhiều dữ liệu hơn/tăng train; không báo metric 0 như thể đã đánh giá được |
| Chạy lâu khi tăng factors | Giảm số chiều, số người hoặc dùng thư viện tối ưu sau khi kiểm chứng |
| Objective giảm nhưng Recall thấp | Kiểm tra validation, coverage, độ mới của bài; không dựa vào loss để tuyên bố chất lượng |

Nếu máy không có mạng, tải thủ công hai tệp từ Zenodo rồi đặt vào `data/raw/` với đúng tên. Script vẫn kiểm tra checksum trước khi đọc.

## 16. Nội dung nhóm có thể đưa vào báo cáo đồ án

Nhóm nên trình bày:

1. Bài toán: xếp hạng bài viết chưa tương tác cho từng người dùng.
2. Dữ liệu, feed đã chọn, bản ghi bị loại và cách chọn mẫu.
3. Biểu diễn binary like và mục tiêu implicit ALS.
4. Quy trình chia theo thời gian, phạm vi catalog và cách xử lý cold start.
5. Các cấu hình, tiêu chí chọn bằng validation.
6. Bảng test so sánh baseline, kèm coverage và số người đánh giá.
7. Kiến trúc tích hợp và giới hạn ID giữa Bluesky với website.
8. Hướng cải thiện: nội dung, cập nhật theo thời gian, đánh giá trên website.

Phân biệt rõ: **train thành công**, **ranking tốt trên người đã có lịch sử**, và **phục vụ tốt toàn hệ thống** là ba mức kiểm chứng khác nhau. Thí nghiệm hiện tại đạt bước đầu, có đo lường bước hai và chưa chứng minh bước ba.

## 17. Tài liệu tham khảo

- [Bluesky Social Dataset, record 14669616](https://zenodo.org/records/14669616): dữ liệu và mô tả schema.
- [Bài báo mô tả dữ liệu Bluesky](https://doi.org/10.1371/journal.pone.0310330): ghi nhận nguồn dữ liệu khi viết báo cáo.
- [Hu, Koren, Volinsky: Collaborative Filtering for Implicit Feedback Datasets](https://yifanhu.net/PUB/cf.pdf): nền tảng thuật toán.
- [Implicit documentation](https://benfred.github.io/implicit/): lựa chọn thư viện tối ưu khi mở rộng; bộ mã hiện tại không phụ thuộc thư viện này.
