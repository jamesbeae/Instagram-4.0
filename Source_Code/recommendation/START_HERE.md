# Vị trí mô hình gợi ý trong Instagram-4.0

Bộ mã nằm tại Source_Code/recommendation.

- src/recommender.py: implicit ALS và pipeline 11 feed.
- src/follow_recommender.py: gợi ý follow bằng đồ thị hai bước trong SQLite.
- RUN_EXPANDED.md: lệnh train, evaluate, recommend.
- artifacts/all-feeds-als16-v1: mô hình đã train trên máy làm việc; không được commit. Máy clone mới phải chạy download, prepare và train bên dưới.
- IMPLEMENTATION_STATUS.json: trạng thái kiểm chứng; đồ thị follow thật chưa được dựng do tải dữ liệu không thành công.

Đây là pipeline offline độc lập. Dịch vụ live hiện tại ở Source_Code/backend/src/api/services/recommendationService.js và script Source_Code/backend/scripts/train-recommendation.py vẫn dùng cách xếp hạng hiện có. Bộ ALS/follow chưa kết nối vào API của website. Không thể dùng trực tiếp ID Bluesky làm ID tài khoản ứng dụng.

Mở PowerShell tại thư mục này và tạo môi trường Python mới (không sao chép venv từ máy/thư mục khác):

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -X utf8 src/recommender.py download
.\.venv\Scripts\python.exe -X utf8 src/recommender.py prepare --feed all --name all-feeds-v1 --max-users 10000
.\.venv\Scripts\python.exe -X utf8 src/recommender.py train --data all-feeds-v1 --run all-feeds-als16-v1 --factors 16 --alpha 1 --regularization 1
.\.venv\Scripts\python.exe -X utf8 src/recommender.py recommend --run all-feeds-als16-v1 --k 10
.\.venv\Scripts\python.exe -X utf8 -m unittest discover -s tests -v
```

Các đường dẫn dữ liệu được xác định theo vị trí mã Python nên dùng data và artifacts trong cùng thư mục này. Bản nguồn trong thư mục đồ án vẫn được giữ lại; từ nay bản trong dự án Instagram là vị trí làm việc cho phần mô hình.
