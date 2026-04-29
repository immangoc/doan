# HT Port Logistics — Warehouse Management System

Hệ thống quản lý kho bãi cảng biển tích hợp Machine Learning.

## Yêu cầu hệ thống

| Phần mềm      | Phiên bản    |
|---------------|-------------|
| Java (JDK)    | 21+         |
| Python        | 3.9+        |
| Docker        | 24+         |
| Node.js       | 18+         |

## Khởi chạy nhanh

### 1. Khởi động Infrastructure (PostgreSQL, Redis, Kafka, MailHog)

```bash
cd warehouse-service
docker compose up -d
```

Đợi khoảng 10 giây để tất cả services sẵn sàng.

### 2. Khởi động Spring Boot Backend (port 8080)

```bash
cd warehouse-service
./mvnw spring-boot:run
```

Backend sẽ tự động chạy Flyway migration để tạo schema + seed data.

- **API Base URL:** `http://localhost:8080/api/v1`
- **Swagger UI:** `http://localhost:8080/api/v1/swagger-ui.html`

### 3. Khởi động ML Service (port 8000)

```bash
cd warehouse-service
pip install -r requirements.txt
python -m uvicorn ml_service_app:app --reload --host 0.0.0.0 --port 8000
```

- **ML API Docs:** `http://localhost:8000/docs`

### 4. Khởi động Frontend (port 5173)

```bash
cd full-project
npm install
npm run dev
```

- **Frontend:** `http://localhost:5173`

## Cấu trúc thư mục

```
wms/
├── warehouse-service/          # Spring Boot Backend + ML Service
│   ├── src/main/java/          # Java source code
│   ├── src/main/resources/
│   │   ├── application.yml     # Cấu hình Spring Boot
│   │   └── db/migration/       # Flyway migration scripts
│   ├── ml_service_app.py       # FastAPI ML Service
│   ├── ml_db_repository.py     # ML ↔ PostgreSQL connector
│   ├── train_warehouse_ranker.py  # Script huấn luyện model
│   ├── warehouse_ranker_lgbm.txt  # Model LightGBM đã train
│   ├── warehouse_ranker_meta.joblib # Metadata model
│   ├── requirements.txt        # Python dependencies
│   ├── docker-compose.yml      # Infrastructure services
│   └── pom.xml                 # Maven dependencies
│
└── full-project/               # React Frontend (Vite)
    ├── src/
    │   ├── pages/              # Trang quản lý
    │   └── yard3d/             # Sơ đồ 3D kho bãi
    └── package.json
```

## Tính năng chính

- **Quản lý Container**: CRUD, theo dõi trạng thái, lịch sử
- **Gate-In / Gate-Out**: Quy trình nhập/xuất kho với biên lai
- **ML Placement**: Gợi ý vị trí tối ưu bằng LightGBM Ranker
- **Sơ đồ 3D**: Trực quan hóa kho bãi real-time
- **Quản lý đơn hàng**: Đặt hàng, duyệt, hủy
- **Ví điện tử**: Nạp tiền, rút tiền, lịch sử giao dịch
- **Báo cáo**: Thống kê hoạt động, xuất báo cáo
- **Chat**: Hệ thống tin nhắn nội bộ
- **RBAC**: Phân quyền Admin / Operator / Customer / Yard Staff

## Swagger UI

Sau khi backend khởi động, truy cập:

- **Tất cả API:** `http://localhost:8080/api/v1/swagger-ui/index.html`
  - Chọn dropdown "Tất cả API" ở góc phải để xem toàn bộ 140+ endpoints
- **ML API:** `http://localhost:8000/docs`

Để test API cần xác thực:
1. Gọi `POST /auth/login` để lấy JWT token
2. Nhấn nút **Authorize** trên Swagger UI
3. Nhập `Bearer <token>`
