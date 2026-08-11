# Travel Memory App (khung ban đầu)

Khung code React Native (Expo) cho 4 màn hình đã duyệt: Bản đồ, Timeline, Ghi mới, Thống kê.
Hiện đang dùng **mock data** (`src/data/mockMemories.ts`) — chưa nối backend.

## Chạy thử trên điện thoại

1. Cài Node.js (>= 18) trên máy bạn.
2. Giải nén thư mục này, mở terminal tại đó, chạy:
   ```bash
   npm install
   npx expo start
   ```
3. Cài app **Expo Go** trên điện thoại (App Store/CH Play), quét mã QR hiện lên trong terminal/trình duyệt.

## Cấu trúc

```
App.tsx                     # Điều hướng tab dưới (bottom tabs)
src/
  data/mockMemories.ts      # Dữ liệu giả — sẽ thay bằng Supabase sau
  screens/
    MapScreen.tsx           # Bản đồ giả lập + pin ảnh + preview khi bấm
    TimelineScreen.tsx      # Danh sách kỷ niệm theo thời gian
    NewMemoryScreen.tsx     # Form thêm kỷ niệm mới
    StatsScreen.tsx         # Thống kê hành trình
  components/
    MemoryPreviewCard.tsx   # Thẻ xem nhanh nổi trên bản đồ
```

## Các bước tiếp theo (gợi ý, làm dần từng bước)

1. Thay khung bản đồ giả bằng bản đồ thật (`react-native-maps` hoặc Mapbox) + toạ độ lat/lng thật.
2. Nối `expo-image-picker` để chọn/chụp ảnh thật ở màn hình "Ghi mới".
3. Dựng backend Supabase (Postgres) — bảng `memories`, `trips`, Storage cho ảnh.
4. Thay mock data bằng gọi API Supabase (đọc/ghi thật).
5. Thêm offline-first (lưu local trước, đồng bộ sau) bằng SQLite/WatermelonDB.
