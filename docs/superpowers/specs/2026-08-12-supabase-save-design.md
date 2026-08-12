# Nối nút "Lưu kỷ niệm" (ghi dữ liệu + upload ảnh) — Design

Ngày: 2026-08-12

## Bối cảnh

Bước trước (đọc dữ liệu) đã nối `MapScreen`/`TimelineScreen`/`StatsScreen` đọc dữ liệu thật từ Supabase, nhưng nút "Lưu kỷ niệm" ở màn "Ghi mới" chưa làm gì cả. Bước này nối thật: lấy vị trí GPS, upload ảnh đã chọn, ghi 1 dòng vào bảng `memories`.

Final review của bước trước phát hiện: bottom tab navigator không unmount màn hình khi chuyển tab, nên `useMemories()` chỉ fetch đúng 1 lần lúc mount — nghĩa là nếu không sửa, kỷ niệm vừa lưu sẽ **không** hiện ra ở Bản đồ/Timeline/Thống kê cho tới khi khởi động lại app. Bước này bắt buộc phải sửa luôn (xem mục "Sửa refetch-on-focus" bên dưới) để tính năng Lưu thật sự có ý nghĩa.

## Mục tiêu

- Bấm "Lưu kỷ niệm" ghi được 1 dòng thật vào bảng `memories` trên Supabase, gồm: địa điểm, ghi chú, vị trí GPS thật, ảnh đã upload (nếu có).
- Chuyển sang tab Bản đồ/Timeline/Thống kê sau khi lưu → thấy kỷ niệm mới ngay, không cần khởi động lại app.
- Validate tối thiểu: bắt buộc nhập "Địa điểm". Vị trí GPS bắt buộc phải lấy được mới cho lưu.
- Chặn bấm đúp / lưu trùng, có phản hồi rõ ràng khi thành công hoặc lỗi.

## Ngoài phạm vi

- Chức năng xóa kỷ niệm — spec/plan riêng, làm sau (dùng chung hạ tầng bucket ảnh + policy đã tạo ở bước này, nhưng chưa thêm policy `delete`).
- Chưa có UI chọn màu cho pin — màu được chọn ngẫu nhiên từ bảng màu có sẵn.
- Chưa có UI chọn vị trí thủ công trên bản đồ — vị trí luôn là GPS hiện tại lúc bấm Lưu (kiểu check-in).
- Chưa nén/resize ảnh trước khi upload (dùng ảnh đã được `expo-image-picker` nén sẵn ở `quality: 0.8` từ bước trước).
- Chưa có `trips` (chuyến đi) — mỗi kỷ niệm vẫn là 1 dòng độc lập, không gắn với chuyến đi nào.
- Không thêm test runner — vẫn `npx tsc --noEmit` + kiểm thử thủ công.
- Ghi âm (`mic-outline`) và cảm xúc (`happy-outline`) trên UI vẫn chưa nối logic — giữ nguyên như hiện tại.

## Storage bucket & quyền ghi (chạy tay trên Supabase SQL Editor)

Nối tiếp SQL đã chạy ở bước đọc dữ liệu:

```sql
insert into storage.buckets (id, name, public) values ('memory-photos', 'memory-photos', true);

create policy "Ai cũng đọc được ảnh" on storage.objects for select using (bucket_id = 'memory-photos');
create policy "Ai cũng upload được ảnh" on storage.objects for insert with check (bucket_id = 'memory-photos');

create policy "Ai cũng ghi được kỷ niệm" on memories for insert with check (true);
```

Ghi chú: bucket `public: true` + policy đọc mở cho mọi người, giống policy đọc của bảng `memories` — chấp nhận được ở giai đoạn 1 người dùng, không có đăng nhập (rủi ro này đã ghi nhận từ bước trước, cần thêm auth trước khi phát hành Play Store thật). Chưa thêm policy `delete` cho `storage.objects`/`memories` — thuộc spec Xóa sau.

## Sửa refetch-on-focus (nền tảng dùng chung, áp dụng ngay trong bước này)

`src/hooks/useMemories.ts` đổi cơ chế fetch: thay `useEffect(() => {...}, [])` (chỉ chạy lúc mount) bằng `useFocusEffect` (từ `@react-navigation/native`, đã có sẵn trong dependencies) — fetch lại mỗi khi màn hình chứa hook này được focus. Áp dụng cho cả 3 nơi dùng hook (`MapScreen`, `TimelineScreen`, `StatsScreen`) vì logic nằm trong hook dùng chung, không cần sửa từng màn hình.

Hệ quả phụ (chấp nhận được): mỗi lần chuyển tab qua lại sẽ gọi lại Supabase 1 lần — không có cache. Đã ghi nhận là giới hạn chấp nhận được ở bước đọc dữ liệu trước, chưa cần sửa ở bước này.

## Luồng "Lưu kỷ niệm" (`NewMemoryScreen`)

Trạng thái mới: `saving: boolean` (khoá nút, chặn bấm đúp và hiện "Đang lưu...").

Khi bấm "Lưu kỷ niệm":

1. Nếu `place.trim() === ""` → `Alert` báo "Nhập địa điểm trước khi lưu.", dừng lại, không làm gì thêm.
2. Set `saving = true`.
3. Xin quyền vị trí (`Location.requestForegroundPermissionsAsync`) rồi lấy toạ độ hiện tại (`Location.getCurrentPositionAsync`) — dùng lại đúng cách `MapScreen` đã làm.
   - Nếu quyền bị từ chối, hoặc lấy vị trí lỗi/timeout → `Alert` báo "Cần quyền vị trí để lưu kỷ niệm.", set `saving = false`, dừng lại. **Không lưu khi thiếu vị trí** (khác với bản đồ — đây là hành động chủ động của người dùng nên báo lỗi rõ, không có bản đồ tự canh làm fallback).
4. Nếu có ảnh trong `photos` (mảng local URI `file://...` từ bước ghi ảnh trước): với từng ảnh, gọi `fetch(uri)` lấy `Blob` (cách chuẩn để đọc file local trong Expo/RN), rồi `supabase.storage.from('memory-photos').upload(path, blob)`, `path` là tên file ngẫu nhiên duy nhất (ví dụ `${Date.now()}-${index}.jpg`). Sau khi upload xong, lấy public URL bằng `getPublicUrl(path)`.
   - Nếu upload bất kỳ ảnh nào lỗi → `Alert` báo "Không upload được ảnh, thử lại.", set `saving = false`, dừng lại, **giữ nguyên toàn bộ dữ liệu đã nhập** (không xoá form) để bấm Lưu lại được.
5. Chọn ngẫu nhiên 1 màu từ bảng màu cố định (lấy lại đúng 4 màu đã dùng cho dữ liệu mẫu: `#1D9E75`, `#D85A30`, `#BA7517`, `#7F77DD`).
6. Insert 1 dòng vào `memories`: `place`, `note`, `color` (vừa chọn), `latitude`/`longitude` (từ bước 3), `photos` (mảng public URL từ bước 4, rỗng nếu không có ảnh), `memory_date` = ngày hôm nay (định dạng `yyyy-mm-dd`).
   - Nếu insert lỗi → `Alert` báo "Không lưu được kỷ niệm, thử lại.", set `saving = false`, dừng lại, giữ nguyên form.
7. Thành công → `Alert` báo "Đã lưu kỷ niệm!", xoá trắng `place`, `note`, `photos` về rỗng, set `saving = false`.

## Component không đổi

- `MapScreen`, `TimelineScreen`, `StatsScreen`: không sửa trực tiếp trong bước này (chỉ hưởng lợi gián tiếp từ việc sửa `useMemories.ts`).
- `MemoryPreviewCard`: không đổi.
- Icon `mic-outline`/`happy-outline`: không đổi, vẫn chưa nối logic.

## Lỗi & giới hạn

- Không có cơ chế lưu nháp (draft) — nếu thoát app giữa chừng khi đang nhập, dữ liệu mất (giống hiện tại).
- Không retry tự động khi upload/insert lỗi — người dùng tự bấm Lưu lại (dữ liệu đã nhập vẫn còn nguyên trên form).
- Không giới hạn kích thước ảnh trước khi upload ngoài `quality: 0.8` đã nén sẵn từ bước chọn ảnh.
- Vẫn chỉ test được qua Expo Go trên thiết bị thật (cần GPS + camera thật, không test được qua simulator không có GPS/camera thật hoặc `expo start --web`).

## Kiểm thử thủ công

1. Chạy SQL bucket/policy ở trên trong Supabase SQL Editor (nối tiếp SQL bảng `memories` đã chạy ở bước trước).
2. `npx expo start`, mở qua Expo Go trên điện thoại thật, có bật định vị (GPS) và mạng.
3. Tab "Ghi mới": bấm "Lưu kỷ niệm" khi chưa nhập gì → xác nhận báo lỗi "Nhập địa điểm trước khi lưu.", không lưu.
4. Nhập địa điểm + ghi chú, không chọn ảnh, bấm Lưu → cho phép quyền vị trí (nếu được hỏi) → xác nhận thấy "Đang lưu...", sau đó `Alert` "Đã lưu kỷ niệm!", form xoá trắng.
5. Chuyển sang tab "Bản đồ" → xác nhận thấy pin mới đúng vị trí hiện tại của bạn. Chuyển sang "Timeline" → xác nhận thấy dòng mới trên cùng (ngày hôm nay). Chuyển sang "Thống kê" → xác nhận "Kỷ niệm đã lưu" tăng thêm 1.
6. Lặp lại bước 4 nhưng chọn kèm 1-2 ảnh (chụp + từ thư viện) → xác nhận lưu thành công, không lỗi upload.
7. Tắt Wi-Fi, thử bấm Lưu → xác nhận `Alert` báo lỗi rõ ràng, dữ liệu đã nhập (địa điểm/ghi chú/ảnh) vẫn còn nguyên trên form, không bị mất.
8. Thu hồi quyền vị trí trong Settings điện thoại, mở lại app, thử bấm Lưu → xác nhận `Alert` báo cần quyền vị trí, không lưu, không crash. Cấp lại quyền sau khi test xong.
