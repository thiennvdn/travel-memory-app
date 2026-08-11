# Travel Memory App

Ứng dụng React Native (Expo) ghi lại kỷ niệm du lịch: bản đồ, dòng thời gian, ghi kỷ niệm mới, thống kê hành trình. Mục tiêu cuối: phát hành lên Google Play.

Bản đồ, dòng thời gian và thống kê đã **đọc dữ liệu thật từ Supabase** (Postgres) qua `src/hooks/useMemories.ts` — không còn dùng mock data cho các màn này (riêng thống kê tổng hợp từ `src/data/mockStats.ts` vẫn là mock, xem mục "Cấu trúc"). Bản đồ đã dùng **bản đồ thật** (`react-native-maps`) với toạ độ lat/lng thật + canh theo GPS. Màn "Ghi mới" đã chụp/chọn được **ảnh thật** (`expo-image-picker`), nhưng nút "Lưu kỷ niệm" chưa nối logic lưu (chưa ghi vào Supabase, chưa upload ảnh) — kỷ niệm mới nhập sẽ không được lưu lại.

## Chạy thử trên điện thoại

1. Cài Node.js (>= 18) trên máy bạn.
2. Giải nén thư mục này, mở terminal tại đó, chạy:
   ```bash
   npm install
   ```
3. Cấu hình Supabase (bắt buộc — app sẽ crash ngay khi mở nếu bỏ qua bước này):
   1. Tạo một project mới trên [Supabase](https://supabase.com).
   2. Mở **SQL Editor** trong project đó, chạy toàn bộ đoạn SQL trong [docs/superpowers/specs/2026-08-11-supabase-read-design.md](docs/superpowers/specs/2026-08-11-supabase-read-design.md) để tạo bảng `memories` (và dữ liệu mẫu nếu có).
   3. Copy file `.env.example` thành `.env`, rồi điền `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY` lấy từ Supabase Dashboard → **Project Settings → API**.
4. Chạy:
   ```bash
   npx expo start
   ```
5. Cài app **Expo Go** trên điện thoại (App Store/CH Play), quét mã QR hiện lên trong terminal/trình duyệt.
6. Ở tab "Bản đồ", cho phép quyền vị trí khi được hỏi để bản đồ canh về vị trí hiện tại.

Lưu ý: `react-native-maps` không chạy trên `expo start --web` — chỉ test được qua Expo Go hoặc emulator/simulator có dịch vụ bản đồ.

## Cấu trúc

```
App.tsx                     # Điều hướng tab dưới (bottom tabs)
src/
  types/memory.ts           # Kiểu dữ liệu Memory dùng chung
  data/mockStats.ts         # Dữ liệu giả cho màn Thống kê — chưa thay bằng Supabase
  lib/supabase.ts           # Khởi tạo Supabase client (đọc từ biến môi trường EXPO_PUBLIC_SUPABASE_*)
  hooks/useMemories.ts      # Hook gọi Supabase bảng `memories`, trả về { data, loading, error }
  utils/mapRegion.ts        # Hàm tính vùng bản đồ vừa khung chứa hết toạ độ
  screens/
    MapScreen.tsx           # Bản đồ thật (react-native-maps) + pin theo lat/lng + canh GPS
    TimelineScreen.tsx      # Danh sách kỷ niệm theo thời gian
    NewMemoryScreen.tsx     # Form thêm kỷ niệm mới + chụp/chọn ảnh thật
    StatsScreen.tsx         # Thống kê hành trình
  components/
    MemoryPreviewCard.tsx   # Thẻ xem nhanh nổi trên bản đồ
```

Map/Timeline/Stats đều dùng `useMemories()` để lấy dữ liệu kỷ niệm thật từ Supabase (bảng `memories`); riêng số liệu tổng hợp ở màn Thống kê hiện vẫn lấy từ `mockStats.ts`.

## Tài liệu thiết kế & kế hoạch

Các tính năng lớn được viết design doc + implementation plan trước khi code, lưu tại:
- `docs/superpowers/specs/` — thiết kế đã duyệt
- `docs/superpowers/plans/` — kế hoạch triển khai từng bước

## Các bước tiếp theo (gợi ý, làm dần từng bước)

1. ~~Thay khung bản đồ giả bằng bản đồ thật~~ — **Đã xong** (`react-native-maps` + `expo-location`, xem [docs/superpowers/specs/2026-08-11-real-map-design.md](docs/superpowers/specs/2026-08-11-real-map-design.md)).
   - Còn thiếu: Android Google Maps API key (`android.config.googleMaps.apiKey` trong `app.json`) — cần trước khi build ngoài Expo Go (dev client / Play Store).
2. ~~Nối `expo-image-picker` để chọn/chụp ảnh thật ở màn hình "Ghi mới"~~ — **Đã xong** (xem [docs/superpowers/specs/2026-08-11-photo-picker-design.md](docs/superpowers/specs/2026-08-11-photo-picker-design.md)). Ảnh chỉ tồn tại local, chưa upload — nút "Lưu kỷ niệm" chưa nối logic.
3. Dựng backend Supabase (Postgres) — bảng `memories`, `trips`, Storage cho ảnh. Đã xong phần đọc dữ liệu (bảng `memories`, xem [docs/superpowers/specs/2026-08-11-supabase-read-design.md](docs/superpowers/specs/2026-08-11-supabase-read-design.md)) — còn thiếu: bảng `trips`, Storage cho ảnh.
4. Thay mock data bằng gọi API Supabase (đọc/ghi thật). Đã xong phần đọc dữ liệu (Map/Timeline/Stats dùng `src/hooks/useMemories.ts`, xem [docs/superpowers/specs/2026-08-11-supabase-read-design.md](docs/superpowers/specs/2026-08-11-supabase-read-design.md)) — còn thiếu: ghi dữ liệu thật + upload ảnh (nút "Lưu kỷ niệm" ở màn "Ghi mới", bước sau).
5. Thêm offline-first (lưu local trước, đồng bộ sau) bằng SQLite/WatermelonDB.
6. Chuẩn bị phát hành Google Play: package name, icon/splash, build production (EAS Build), Google Play Console.
