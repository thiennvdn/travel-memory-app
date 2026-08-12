# Chức năng Xóa kỷ niệm — Design

Ngày: 2026-08-12

## Bối cảnh

`memories` giờ đã đọc được (Bản đồ/Timeline/Thống kê) và ghi được (nút "Lưu kỷ niệm"), nhưng chưa có cách xóa. Bước này thêm xóa từ 2 nơi: thẻ xem nhanh trên bản đồ (`MemoryPreviewCard`) và bấm giữ 1 dòng trong Timeline.

## Mục tiêu

- Xóa được 1 kỷ niệm (cả dòng trong `memories` lẫn ảnh đính kèm trong Storage) từ `MemoryPreviewCard` (trên bản đồ) và từ Timeline (bấm giữ).
- Có xác nhận trước khi xóa (hành động không thể hoàn tác).
- Sau khi xóa, pin/dòng biến mất khỏi màn hình đang đứng ngay lập tức, không cần chuyển tab hay khởi động lại app.
- Lỗi khi xóa (mất mạng, RLS chưa cấu hình...) → báo rõ, giữ nguyên item trên danh sách.

## Ngoài phạm vi

- Xóa hàng loạt (chọn nhiều kỷ niệm cùng lúc xóa).
- Hoàn tác (undo) sau khi xóa.
- Xóa từ `StatsScreen` — màn này chỉ hiện số tổng hợp, không hiện từng kỷ niệm.
- Không thêm test runner — vẫn `npx tsc --noEmit` + kiểm thử thủ công.

## RLS xóa (chạy tay trên Supabase SQL Editor, nối tiếp SQL đã chạy trước)

```sql
create policy "Ai cũng xoá được kỷ niệm" on memories for delete using (true);
create policy "Ai cũng xoá được ảnh" on storage.objects for delete using (bucket_id = 'memory-photos');
```

Ghi chú: cùng mức rủi ro đã chấp nhận từ các bước trước (không có đăng nhập, ai cầm anon key cũng xóa được) — cần auth trước khi phát hành Play Store thật.

## `deleteMemory` — hàm dùng chung, thêm vào `useMemories()`

`useMemories()` trả thêm `deleteMemory(memory: Memory): Promise<boolean>`. Luồng xử lý:

1. `supabase.from('memories').delete().eq('id', memory.id)`. Đây là bước bắt buộc thành công.
   - Lỗi → `Alert` báo "Không xóa được kỷ niệm, thử lại.", trả về `false`, **không đụng vào state `data` hiện tại**.
2. Thành công → nếu `memory.photos` không rỗng: tách storage path từ từng public URL (phần sau `/memory-photos/` trong URL), gọi `supabase.storage.from('memory-photos').remove(paths)`.
   - Lỗi ở bước dọn ảnh này chỉ log ra console (`console.error`), **không** báo lỗi cho người dùng — kỷ niệm đã xóa thành công là điều quan trọng, ảnh rác sót lại trong Storage là vấn đề phụ (giống cách đã chấp nhận ở luồng upload trước đó khi 1 ảnh trong nhiều ảnh lỗi).
3. Xóa item đó khỏi state `data` cục bộ ngay (lọc theo `id`), không đợi refetch.
4. Trả về `true`.

Vì `MapScreen` và `TimelineScreen` mỗi màn giữ 1 instance `useMemories()` riêng (kiến trúc đã có từ bước đọc dữ liệu), xóa ở màn nào chỉ cập nhật ngay UI màn đó; màn còn lại tự đúng khi người dùng chuyển sang, nhờ cơ chế refetch-on-focus đã sửa ở bước Lưu.

## UI xác nhận xóa (dùng chung logic, khác nơi gọi)

Khi người dùng bấm nút xóa (trong `MemoryPreviewCard`) hoặc bấm giữ 1 dòng (trong Timeline):

```
Alert.alert(
  "Xóa kỷ niệm?",
  "Kỷ niệm và ảnh đính kèm sẽ bị xóa vĩnh viễn, không thể hoàn tác.",
  [
    { text: "Huỷ", style: "cancel" },
    { text: "Xóa", style: "destructive", onPress: () => gọi deleteMemory(memory) },
  ]
)
```

Xóa thành công → **không** hiện thêm `Alert` báo "Đã xóa" — pin/dòng biến mất khỏi màn hình là phản hồi đủ rõ ràng (khác với Lưu, nơi không có gì biến mất trên UI để người dùng tự nhận biết nên mới cần `Alert` xác nhận riêng).

Chặn bấm đúp: dùng `useRef` guard bên trong hàm xử lý xóa của mỗi component gọi (giống `isSavingRef`/`isPickingRef` đã dùng ở `NewMemoryScreen`) — dù cửa sổ race ở đây hẹp hơn nhiều (Alert xác nhận là modal, chặn thao tác khác trước khi người dùng thật sự bấm "Xóa"), vẫn giữ nhất quán với pattern đã có trong codebase.

## `MemoryPreviewCard` — thay đổi

Thêm icon thùng rác cạnh nút "x" đóng hiện có (góc trên bên phải card). Bấm vào → hiện `Alert` xác nhận ở trên → xác nhận → gọi `onDelete(memory)` (prop mới, do `MapScreen` truyền xuống vì card không tự giữ hook `useMemories()`). Xóa thành công → tự gọi `onClose()` để đóng card (pin đã biến mất khỏi bản đồ nên card hiển thị thông tin của 1 pin không còn tồn tại không có ý nghĩa).

## `MapScreen` — thay đổi

Truyền `onDelete={(memory) => deleteMemory(memory)}` xuống `MemoryPreviewCard`, sau khi xóa thành công (return `true`) thì `setSelected(null)` để đóng card.

## `TimelineScreen` — thay đổi

Bọc mỗi dòng (`TimelineRow`) trong `Pressable` với `onLongPress` (thay vì `View` tĩnh như hiện tại) → hiện `Alert` xác nhận → xác nhận → gọi `deleteMemory(item)`.

## Component không đổi

- `StatsScreen`: không sửa (ngoài phạm vi).
- `NewMemoryScreen`: không sửa (không liên quan xóa).
- `src/utils/mapRegion.ts`: không sửa.

## Lỗi & giới hạn

- Không có undo — xác nhận qua `Alert` là lớp bảo vệ duy nhất.
- Ảnh sót lại trong Storage nếu bước dọn ảnh lỗi (mạng chập chờn giữa lúc xóa dòng và xóa ảnh) — chấp nhận được, không có cơ chế dọn định kỳ ở bước này.
- Vẫn chỉ test được qua Expo Go trên thiết bị thật.

## Kiểm thử thủ công

1. Chạy SQL policy `delete` ở trên trong Supabase SQL Editor.
2. `npx expo start`, mở qua Expo Go.
3. Lưu 1 kỷ niệm mới có kèm ảnh (dùng lại luồng Lưu đã có). Chuyển sang "Bản đồ", bấm pin vừa lưu → bấm icon thùng rác trên `MemoryPreviewCard` → xác nhận "Xóa" → pin biến mất khỏi bản đồ, card tự đóng.
4. Vào Supabase Dashboard → Table Editor kiểm tra dòng đã xóa khỏi `memories`; vào Storage kiểm tra ảnh đã xóa khỏi bucket `memory-photos`.
5. Lưu 1 kỷ niệm khác, chuyển sang "Timeline", bấm giữ dòng đó → xác nhận "Xóa" → dòng biến mất khỏi danh sách.
6. Bấm "Huỷ" ở hộp thoại xác nhận (thử cả 2 nơi) → xác nhận không có gì bị xóa.
7. Tắt Wi-Fi, thử xóa → xác nhận `Alert` báo lỗi, item vẫn còn nguyên trên danh sách, không crash.
