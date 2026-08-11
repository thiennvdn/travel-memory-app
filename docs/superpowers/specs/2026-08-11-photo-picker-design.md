# Chọn/chụp ảnh thật cho "Ghi mới" — Design

Ngày: 2026-08-11

## Bối cảnh

`NewMemoryScreen` hiện có một ô ảnh tĩnh (khung nét đứt + icon camera) không làm gì khi bấm vào — chỉ là placeholder. Bước này thay bằng chọn/chụp ảnh thật, hỗ trợ nhiều ảnh cho một kỷ niệm.

## Mục tiêu

- Bấm vào khu vực ảnh cho phép chụp ảnh mới bằng camera, hoặc chọn nhiều ảnh cùng lúc từ thư viện.
- Ảnh đã chọn hiện thành thumbnail, có thể xoá riêng từng ảnh.
- Có thể thêm ảnh nhiều lần (chụp lần nữa, hoặc chọn thêm từ thư viện) — ảnh mới nối thêm vào danh sách, không thay thế.

## Ngoài phạm vi

- Nút "Lưu kỷ niệm" chưa nối logic lưu — cần lat/lng thật + backend, thuộc các bước sau (Supabase, xem README).
- Chưa upload ảnh lên đâu cả — ảnh chỉ tồn tại dưới dạng local URI (`file://...`) trong state của màn hình, mất khi rời màn hình hoặc đóng app.
- Không giới hạn cứng số lượng ảnh.
- Không nén/resize ảnh trước khi hiện thumbnail (dùng ảnh gốc từ picker).
- Ghi âm (`mic-outline` icon đã có sẵn trên UI) và cảm xúc (`happy-outline`) không thuộc phạm vi này — giữ nguyên như hiện tại (chưa nối logic).

## Thư viện

`expo-image-picker`: `launchCameraAsync` (chụp ảnh) và `launchImageLibraryAsync` với `allowsMultipleSelection: true` (chọn nhiều ảnh từ thư viện).

## Thay đổi cấu hình (`app.json`)

- iOS: thêm `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` vào `infoPlist` — mô tả lý do xin quyền (chụp/chọn ảnh cho kỷ niệm).
- Thêm plugin `expo-image-picker` với `cameraPermission` và `photosPermission` (text tiếng Việt), theo đúng cách đã làm với `expo-location` ở tính năng bản đồ trước.
- Android không cần khai permission thủ công — plugin tự thêm.

## NewMemoryScreen — thay đổi

**State:** thêm `photos: string[]` (mảng local URI), thay cho việc không có state ảnh nào hiện tại.

**UI khu vực ảnh:** thay ô vuông tĩnh (`photoBox`) bằng `ScrollView horizontal`:
- Mỗi ảnh trong `photos` hiện thành 1 thumbnail vuông bo góc (giữ kích thước/style gần với `photoBox` cũ), có nút "x" nhỏ góc trên-phải để xoá riêng ảnh đó khỏi mảng.
- Cuối hàng luôn có 1 ô "+" — style giống `photoBox` hiện tại (khung nét đứt + icon), bấm vào để thêm ảnh.
- Khi `photos` rỗng: chỉ hiện ô "+".

**Luồng chọn ảnh khi bấm ô "+":**
1. Hiện action sheet 2 lựa chọn: "Chụp ảnh" / "Chọn từ thư viện" / "Huỷ". Dùng `ActionSheetIOS.showActionSheetWithOptions` trên iOS, `Alert.alert` với 3 nút (2 lựa chọn + Huỷ) trên Android — không cần thêm thư viện UI ngoài.
2. Nếu chọn "Chụp ảnh":
   - Xin quyền camera qua `ImagePicker.requestCameraPermissionsAsync()`.
   - Nếu bị từ chối: `Alert.alert` báo ngắn gọn ("Cần quyền camera để chụp ảnh"), dừng lại.
   - Nếu được cấp: gọi `ImagePicker.launchCameraAsync({ quality: 0.8 })`. Nếu người dùng không huỷ (`result.canceled === false`), nối `result.assets[0].uri` vào cuối mảng `photos`.
3. Nếu chọn "Chọn từ thư viện":
   - Xin quyền thư viện ảnh qua `ImagePicker.requestMediaLibraryPermissionsAsync()`.
   - Nếu bị từ chối: `Alert.alert` báo ngắn gọn ("Cần quyền thư viện ảnh để chọn ảnh"), dừng lại.
   - Nếu được cấp: gọi `ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 })`. Nếu không huỷ, nối toàn bộ `result.assets[].uri` vào cuối mảng `photos`.

**Xoá ảnh:** bấm nút "x" trên thumbnail → lọc ảnh đó ra khỏi mảng `photos` bằng URI (không cần id riêng vì URI đã là duy nhất trong phiên làm việc).

Khác với luồng GPS ở bản đồ (fallback âm thầm vì là hành động nền tự động khi mở màn hình), việc chọn ảnh ở đây là hành động người dùng chủ động bấm — nên khi quyền bị từ chối, cần báo bằng `Alert` thay vì im lặng.

## Component không đổi

- `place`/`note` `TextInput`, icon `mic-outline`/`happy-outline`, nút "Lưu kỷ niệm" — giữ nguyên như hiện tại, không nối logic mới.
- Các màn hình khác (`MapScreen`, `TimelineScreen`, `StatsScreen`) không bị ảnh hưởng.

## Lỗi & giới hạn

- Chỉ test được qua Expo Go trên điện thoại thật hoặc emulator/simulator có camera — camera giả lập trên một số simulator/emulator chỉ trả ảnh test, không phải ảnh thật.
- Không xử lý trường hợp thiết bị hết dung lượng hoặc ảnh quá lớn — dùng giá trị `quality: 0.8` mặc định của picker để giảm dung lượng, không xử lý gì thêm.

## Kiểm thử thủ công

1. Chạy `npx expo start`, mở qua Expo Go trên điện thoại thật, vào tab "Ghi mới".
2. Bấm ô "+": xác nhận hiện action sheet "Chụp ảnh" / "Chọn từ thư viện" / "Huỷ".
3. Chọn "Chụp ảnh", cho phép quyền camera, chụp 1 ảnh → xác nhận ảnh hiện thành thumbnail, ô "+" vẫn còn ở cuối hàng.
4. Bấm ô "+" lần nữa, chọn "Chọn từ thư viện", cho phép quyền, chọn nhiều ảnh cùng lúc → xác nhận tất cả ảnh đã chọn được nối thêm vào hàng (không mất ảnh đã chụp trước đó).
5. Bấm nút "x" trên 1 thumbnail bất kỳ → xác nhận ảnh đó biến mất, các ảnh khác không đổi thứ tự.
6. Thu hồi quyền camera trong Settings điện thoại, mở lại app, bấm ô "+" → "Chụp ảnh" → xác nhận hiện `Alert` báo cần quyền, không crash.
