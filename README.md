# Travel Memory App

Ứng dụng React Native (Expo) ghi lại kỷ niệm du lịch: bản đồ, dòng thời gian, ghi kỷ niệm mới, thống kê hành trình. Mục tiêu cuối: phát hành lên Google Play.

Hiện đang dùng **mock data** (`src/data/mockMemories.ts`) — chưa nối backend. Bản đồ đã dùng **bản đồ thật** (`react-native-maps`) với toạ độ lat/lng thật + canh theo GPS.

## Chạy thử trên điện thoại

1. Cài Node.js (>= 18) trên máy bạn.
2. Giải nén thư mục này, mở terminal tại đó, chạy:
   ```bash
   npm install
   npx expo start
   ```
3. Cài app **Expo Go** trên điện thoại (App Store/CH Play), quét mã QR hiện lên trong terminal/trình duyệt.
4. Ở tab "Bản đồ", cho phép quyền vị trí khi được hỏi để bản đồ canh về vị trí hiện tại.

Lưu ý: `react-native-maps` không chạy trên `expo start --web` — chỉ test được qua Expo Go hoặc emulator/simulator có dịch vụ bản đồ.

## Cấu trúc

```
App.tsx                     # Điều hướng tab dưới (bottom tabs)
src/
  data/mockMemories.ts      # Dữ liệu giả (lat/lng thật) — sẽ thay bằng Supabase sau
  utils/mapRegion.ts        # Hàm tính vùng bản đồ vừa khung chứa hết toạ độ
  screens/
    MapScreen.tsx           # Bản đồ thật (react-native-maps) + pin theo lat/lng + canh GPS
    TimelineScreen.tsx      # Danh sách kỷ niệm theo thời gian
    NewMemoryScreen.tsx     # Form thêm kỷ niệm mới
    StatsScreen.tsx         # Thống kê hành trình
  components/
    MemoryPreviewCard.tsx   # Thẻ xem nhanh nổi trên bản đồ
```

## Tài liệu thiết kế & kế hoạch

Các tính năng lớn được viết design doc + implementation plan trước khi code, lưu tại:
- `docs/superpowers/specs/` — thiết kế đã duyệt
- `docs/superpowers/plans/` — kế hoạch triển khai từng bước

## Các bước tiếp theo (gợi ý, làm dần từng bước)

1. ~~Thay khung bản đồ giả bằng bản đồ thật~~ — **Đã xong** (`react-native-maps` + `expo-location`, xem [docs/superpowers/specs/2026-08-11-real-map-design.md](docs/superpowers/specs/2026-08-11-real-map-design.md)).
   - Còn thiếu: Android Google Maps API key (`android.config.googleMaps.apiKey` trong `app.json`) — cần trước khi build ngoài Expo Go (dev client / Play Store).
2. Nối `expo-image-picker` để chọn/chụp ảnh thật ở màn hình "Ghi mới".
3. Dựng backend Supabase (Postgres) — bảng `memories`, `trips`, Storage cho ảnh.
4. Thay mock data bằng gọi API Supabase (đọc/ghi thật).
5. Thêm offline-first (lưu local trước, đồng bộ sau) bằng SQLite/WatermelonDB.
6. Chuẩn bị phát hành Google Play: package name, icon/splash, build production (EAS Build), Google Play Console.
