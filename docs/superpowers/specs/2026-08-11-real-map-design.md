# Bản đồ thật cho màn "Bản đồ" — Design

Ngày: 2026-08-11

## Bối cảnh

`MapScreen` hiện là bản đồ giả lập: pin được đặt theo toạ độ tương đối `x`/`y` (0-1) trên một khung phẳng màu xanh nhạt, không phải bản đồ thật. Bước này thay bằng bản đồ địa lý thật, dùng toạ độ lat/lng thật cho các kỷ niệm và vị trí GPS của người dùng.

## Mục tiêu

- Hiện bản đồ địa lý thật với pin kỷ niệm ở đúng vị trí lat/lng.
- Bấm pin vẫn mở `MemoryPreviewCard` như hiện tại.
- Khi mở màn hình, canh bản đồ về vị trí hiện tại của người dùng (nếu được cấp quyền GPS).
- Nếu quyền bị từ chối hoặc lấy vị trí lỗi, canh bản đồ vừa khung chứa hết các pin kỷ niệm (fallback âm thầm, không báo lỗi).

## Ngoài phạm vi

- Nút "+" (FAB) trên bản đồ chưa nối logic điều hướng sang "Ghi mới".
- Chưa nối dữ liệu thật (Supabase) — vẫn dùng `mockMemories`, chỉ đổi từ toạ độ tương đối sang lat/lng thật.
- Chưa tối ưu cho web (`expo start --web`) — `react-native-maps` không chạy trên web.
- Chuẩn bị phát hành CH Play (package name, icon, build production) — sẽ làm ở bước riêng sau khi các tính năng chính hoàn thiện.
- API key Google Maps cho Android (`android.config.googleMaps.apiKey` trong `app.json`) chưa được cấu hình — cần bổ sung trước khi build dev client hoặc bản Play Store (không cần cho test qua Expo Go).

## Thư viện

- `react-native-maps`: `MapView` + `Marker`. Provider mặc định (Google Maps trên Android, Apple Maps trên iOS). Được hỗ trợ sẵn trong Expo Go SDK 51, không cần custom dev client.
- `expo-location`: xin quyền vị trí foreground, lấy toạ độ hiện tại.

## Thay đổi dữ liệu

`src/data/mockMemories.ts`: thay trường `x`, `y` (0-1) bằng `latitude`, `longitude` thật:

| Địa điểm | latitude | longitude |
|---|---|---|
| Đèo Hải Vân | 16.2136 | 108.1180 |
| Hội An | 15.8801 | 108.3380 |
| Đà Lạt | 11.9404 | 108.4583 |
| Phú Quốc | 10.2899 | 103.9840 |

## Thay đổi cấu hình (`app.json`)

- iOS: `NSLocationWhenInUseUsageDescription` — mô tả lý do xin quyền (hiện vị trí bạn trên bản đồ kỷ niệm).
- Android: quyền `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` qua plugin `expo-location`.
- Thêm `plugins: ["expo-location"]` với message quyền tương ứng.

## MapScreen — luồng xử lý

1. Mount: gọi `Location.requestForegroundPermissionsAsync()`.
2. Nếu `granted`:
   - Lấy vị trí hiện tại (`Location.getCurrentPositionAsync`).
   - Set region ban đầu của `MapView` về toạ độ đó (zoom mức thành phố).
   - Bật `showsUserLocation` để hiện chấm xanh "bạn ở đây".
3. Nếu `denied` hoặc lấy vị trí lỗi (throw/timeout):
   - Tính bounding box từ toạ độ tất cả `mockMemories`.
   - Dùng `mapRef.current.fitToCoordinates(...)` với padding để bản đồ tự canh vừa khung chứa hết các pin.
   - Không hiện alert/toast lỗi — fallback âm thầm.
4. Render `Marker` cho mỗi kỷ niệm tại `{latitude, longitude}` thật, dùng custom `children` (view chấm tròn màu + đuôi nhọn) để giữ đúng phong cách pin hiện tại thay vì marker mặc định.
5. Bấm marker → `setSelected(memory)` như code hiện tại → hiện `MemoryPreviewCard` đè phía dưới bản đồ.
6. FAB "+" giữ nguyên vị trí, chưa nối `onPress`.

## Component không đổi

- `MemoryPreviewCard`: không cần sửa, chỉ nhận `memory` như cũ (không phụ thuộc `x`/`y`).
- `TimelineScreen`, `StatsScreen`, `NewMemoryScreen`: không bị ảnh hưởng bởi thay đổi này (không dùng `x`/`y`).

## Lỗi & giới hạn

- Chỉ test được qua Expo Go trên điện thoại thật hoặc emulator/simulator có dịch vụ bản đồ (Google Play Services / Apple Maps) — không test được qua `expo start --web`.
- Không xử lý trường hợp người dùng bật quyền vị trí "chỉ dùng 1 lần" (SDK sẽ trả `granted` cho lần đó, không cần xử lý riêng).

## Kiểm thử thủ công

1. Chạy `npx expo start`, quét QR bằng Expo Go trên điện thoại thật.
2. Mở tab "Bản đồ": xác nhận có bản đồ thật, 4 pin đúng vị trí (Hải Vân, Hội An, Đà Lạt, Phú Quốc).
3. Bấm "Allow" khi được hỏi quyền vị trí → xác nhận bản đồ canh về vị trí hiện tại + hiện chấm xanh.
4. Bấm pin → xác nhận `MemoryPreviewCard` hiện đúng thông tin.
5. Test lại với quyền vị trí bị từ chối (thu hồi quyền trong Settings điện thoại, mở lại app) → xác nhận bản đồ tự canh vừa khung chứa 4 pin, không có lỗi/crash.
