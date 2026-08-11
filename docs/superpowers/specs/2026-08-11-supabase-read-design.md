# Schema Supabase + nối đọc dữ liệu thật — Design

Ngày: 2026-08-11

## Bối cảnh

App hiện dùng `mockMemories` (mảng tĩnh trong `src/data/mockMemories.ts`) cho cả `MapScreen`, `TimelineScreen`, `StatsScreen`. Bước này thay bằng dữ liệu thật từ Supabase (Postgres). Đây là bước 1/2 của việc nối backend — bước 2 (sau, spec riêng) sẽ nối nút "Lưu kỷ niệm" để ghi dữ liệu + upload ảnh thật lên Storage.

App chỉ dành cho một người dùng (không có màn đăng nhập) — quyết định đã chốt khi brainstorm.

## Mục tiêu

- Có bảng `memories` thật trên Supabase, seed sẵn 4 kỷ niệm giống dữ liệu mock cũ (để so sánh trước/sau không khác gì về mặt hiển thị).
- `MapScreen`, `TimelineScreen` đọc danh sách kỷ niệm thật qua Supabase thay vì `mockMemories`.
- `StatsScreen`: chỉ số "Kỷ niệm đã lưu" tính từ dữ liệu thật (số dòng thật), các chỉ số còn lại vẫn dùng mock.
- Xử lý trạng thái đang tải / lỗi mạng khi gọi Supabase (không crash, không màn hình trắng).

## Ngoài phạm vi

- Nút "Lưu kỷ niệm" chưa nối logic ghi — thuộc bước 2 (spec riêng sau).
- Chưa upload ảnh lên Supabase Storage — cột `photos` có sẵn trong schema nhưng luôn rỗng ở bước này (chưa có đường ghi ảnh vào đó).
- Chưa có màn đăng nhập/auth, chưa phân quyền theo người dùng.
- Chưa có khái niệm "chuyến đi" (trips) hay "tỉnh/thành đã đến" trong schema — 3 chỉ số `provinces`, `trips`, `flightSpots` ở `StatsScreen` vẫn giữ mock.
- Không có cơ chế cache/offline (SQLite/WatermelonDB) — thuộc bước "offline-first" riêng trong roadmap, chưa tới lượt.
- Không thêm test runner — vẫn dùng `npx tsc --noEmit` + kiểm thử thủ công như các bước trước.

## Schema (chạy tay trên Supabase SQL Editor)

Vì máy này không cài Supabase CLI và không có tài khoản Supabase của bạn, bạn tự chạy đoạn SQL sau trên **Supabase Dashboard → SQL Editor** sau khi tạo project mới:

```sql
create table memories (
  id uuid primary key default gen_random_uuid(),
  place text not null,
  note text not null default '',
  color text not null default '#1D9E75',
  latitude double precision not null,
  longitude double precision not null,
  photos text[] not null default '{}',
  memory_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table memories enable row level security;
create policy "Ai cũng đọc được" on memories for select using (true);

insert into memories (place, note, color, latitude, longitude, memory_date) values
  ('Đèo Hải Vân', 'Bay dù lượn buổi sáng, gió nhẹ, view biển tuyệt đẹp.', '#1D9E75', 16.2136, 108.1180, '2026-08-08'),
  ('Hội An', 'Đi bộ phố cổ buổi tối, mua vé đèn lồng thả sông.', '#D85A30', 15.8801, 108.3380, '2026-07-02'),
  ('Đà Lạt', 'Ghi âm tiếng chợ đêm, se lạnh, mùi cà phê khắp phố.', '#BA7517', 11.9404, 108.4583, '2026-05-14'),
  ('Phú Quốc', 'Lặn ngắm san hô, nước trong xanh, gặp cá hề.', '#7F77DD', 10.2899, 103.9840, '2026-03-21');
```

Ghi chú thiết kế:
- `photos text[]` có sẵn để bước 2 dùng, tránh phải migrate schema lần nữa — nhưng bước này không có đường ghi vào cột đó, luôn là `'{}'`.
- RLS bật, chỉ có policy **select** (đọc) — chưa có policy insert/update/delete, nghĩa là ai cầm được anon key cũng chỉ đọc được, chưa ghi được gì (kể cả qua Supabase client trực tiếp), cho tới khi bước 2 thêm policy ghi.
- `memory_date` dùng kiểu `date` thật (không phải chuỗi `dd/mm/yyyy` như mock cũ) — app sẽ tự format lại khi hiển thị.

## Cấu hình client & biến môi trường

- Thêm `@supabase/supabase-js` vào `package.json`.
- Tạo `src/lib/supabase.ts`: khởi tạo 1 client dùng chung, đọc `process.env.EXPO_PUBLIC_SUPABASE_URL` và `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`. Expo SDK 51 tự nạp biến bắt đầu bằng `EXPO_PUBLIC_` từ file `.env` vào `process.env` lúc build — không cần sửa `app.json`/`app.config.js`.
- Thêm `.env.example` (commit vào repo, giá trị để trống) làm mẫu:
  ```
  EXPO_PUBLIC_SUPABASE_URL=
  EXPO_PUBLIC_SUPABASE_ANON_KEY=
  ```
- Thêm `.env` vào `.gitignore` (không commit key thật). Bạn tự tạo file `.env` ở máy bạn, điền URL + anon key thật lấy từ Supabase Dashboard → Project Settings → API, sau khi chạy xong SQL ở trên. Không cần gửi key cho tôi.
- Nếu thiếu `.env` (biến rỗng/undefined) lúc chạy app: `src/lib/supabase.ts` throw lỗi rõ ràng ngay lúc khởi tạo module (thay vì lỗi mơ hồ từ supabase-js lúc gọi API), để dễ nhận biết là quên tạo `.env`.

## Đọc dữ liệu — hook dùng chung

`src/hooks/useMemories.ts`: hook gọi `supabase.from('memories').select('*').order('memory_date', { ascending: false })` một lần khi mount, trả về `{ data: Memory[] | null, loading: boolean, error: string | null }`.

- `MapScreen` và `TimelineScreen` cùng dùng hook này thay cho import `mockMemories`.
- Khi `loading`: hiện dòng chữ "Đang tải..." giữa màn hình (không có spinner phức tạp, đủ dùng cho bước này).
- Khi `error`: hiện dòng chữ báo lỗi ngắn gọn ("Không tải được dữ liệu, thử lại sau.") thay vì màn trắng/crash — quan trọng vì mạng hay chập chờn.
- Khi `data` rỗng hoặc null trong lúc loading: `MapScreen` không render marker nào, không gọi `getRegionForCoordinates([])` cho tới khi có data thật (tránh phụ thuộc vào fallback rỗng đã thêm ở tính năng bản đồ trước).

### MapScreen

- `initialRegion` không còn là hằng số tính lúc import module nữa (vì `mockMemories` không còn tồn tại tĩnh) — chuyển thành `useMemo(() => getRegionForCoordinates(data ?? []), [data])`, chỉ tính khi có `data`.
- Trước khi có `data` (đang loading): render trạng thái loading, chưa render `MapView`.

### StatsScreen

- Chỉ số "Kỷ niệm đã lưu": `data?.length ?? 0` từ `useMemories()` (dùng lại hook, không gọi API riêng cho count).
- 3 chỉ số còn lại (`provinces`, `trips`, `flightSpots`) tiếp tục lấy từ `mockStats` (đổi tên file `src/data/mockMemories.ts` → `src/data/mockStats.ts`, chỉ còn export `mockStats`).

### Type dùng chung

`src/types/memory.ts`: chuyển `Memory` type sang đây (trước đây nằm trong `mockMemories.ts`), thêm field `photos: string[]`. Field `date: string` giữ nguyên tên và định dạng hiển thị (`dd/mm/yyyy`) như cũ để `TimelineScreen`/`MemoryPreviewCard` không cần sửa gì — hook `useMemories` chịu trách nhiệm format cột `memory_date` (kiểu `date` của Postgres, dạng ISO `yyyy-mm-dd` khi trả về qua supabase-js) sang chuỗi `dd/mm/yyyy` khi map kết quả query sang `Memory[]`.

## Component không đổi

- `MemoryPreviewCard`, `NewMemoryScreen` không sửa trong bước này (không phụ thuộc nguồn dữ liệu mock/thật, và nút Lưu vẫn ngoài phạm vi).

## Lỗi & giới hạn

- Không có realtime/subscription — chỉ fetch 1 lần lúc mount mỗi màn hình. **Lưu ý (phát hiện ở final review, khác với dự đoán ban đầu):** bottom tab navigator không unmount màn hình khi chuyển tab — mount lần đầu focus rồi giữ nguyên suốt vòng đời app — nên chuyển qua chuyển lại tab **không** làm fetch lại. Muốn tải lại dữ liệu mới (kể cả sau khi lỗi mạng) hiện chỉ có cách tắt hẳn app rồi mở lại. Đây cũng là lý do bước 2 (nối nút Lưu) bắt buộc phải thêm cơ chế refetch (ví dụ `useFocusEffect` hoặc một store dùng chung) — nếu không, kỷ niệm vừa lưu sẽ không hiện ra ở Bản đồ/Timeline/Thống kê cho tới khi khởi động lại app.
- Không retry tự động khi lỗi mạng — chỉ hiện thông báo lỗi, người dùng phải khởi động lại app để thử lại (mở lại tab không đủ — xem lưu ý ở trên).
- Vẫn chỉ test được qua Expo Go (không qua `expo start --web` vì `react-native-maps`).

## Kiểm thử thủ công

1. Chạy SQL ở trên trong Supabase Dashboard, tạo file `.env` với URL/anon key thật.
2. `npm install && npx expo start`, mở qua Expo Go.
3. Tab "Bản đồ": xác nhận vẫn hiện đúng 4 pin ở đúng vị trí như trước (dữ liệu giờ đến từ Supabase, không phải mock).
4. Tab "Timeline": xác nhận vẫn hiện đúng 4 dòng, đúng ngày tháng định dạng dd/mm/yyyy.
5. Tab "Thống kê": xác nhận "Kỷ niệm đã lưu" hiện đúng số lượng dòng thật trong bảng (4), 3 chỉ số còn lại vẫn là số mock cũ.
6. Tắt Wi-Fi trên điện thoại **trước khi mở app** (tab không tự fetch lại khi chuyển qua chuyển lại — xem "Lỗi & giới hạn"), rồi mở app và vào tab "Bản đồ"/"Timeline" → xác nhận hiện thông báo lỗi thay vì crash/màn trắng.
7. Thử xoá `.env` (hoặc đổi tên tạm) rồi chạy `npx expo start` → xác nhận app báo lỗi rõ ràng ngay khi khởi động thay vì lỗi khó hiểu.
