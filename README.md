# PokeBonkModifier (Bản tiếng Việt)

Công cụ chỉnh sửa (trainer) cho game [PokéBonk](https://pokebonk.com/): thay đổi vàng, kinh nghiệm, chỉ số nhân vật, kẻ địch, tỉ lệ Shiny, tốc độ game… ngay trong trận.

## Cài đặt

Chọn **một** trong hai cách:

### Cách 1: Tiện ích trình duyệt (Chrome / Edge / Cốc Cốc…)

1. Tải dự án về máy (nút **Code → Download ZIP** rồi giải nén, hoặc `git clone`).
2. Mở trang quản lý tiện ích: `chrome://extensions` (Edge: `edge://extensions`).
3. Bật **Chế độ dành cho nhà phát triển** (Developer mode) ở góc trên.
4. Bấm **Tải tiện ích đã giải nén** (Load unpacked) và chọn thư mục chứa file `manifest.json`.
5. Mở lại (F5) trang game.

### Cách 2: Tampermonkey

1. Cài tiện ích [Tampermonkey](https://www.tampermonkey.net/).
2. Tạo script mới, xóa nội dung mặc định, dán toàn bộ nội dung file `content.js` vào rồi lưu.
3. Mở lại (F5) trang game.

## Cách sử dụng

1. Vào game và **bắt đầu một trận**. Công cụ tự dò tìm trận đấu, không cần thao tác gì thêm.
2. Nhấn phím **`~`** (phím dấu huyền, cạnh số 1) hoặc **Insert** để mở/ẩn bảng điều khiển. Khi bảng mở, chuột được nhả ra để bạn bấm nút.
3. Nhấn **Esc** hoặc nút **×** để đóng bảng. Kéo thanh tiêu đề để di chuyển bảng.
4. Ô trạng thái trên tiêu đề cho biết đã kết nối chưa: `Trong trận (Lv | HP | Vàng)` nghĩa là đã sẵn sàng, `Chờ vào trận` nghĩa là chưa vào trận.
5. Nhập giá trị vào ô rồi bấm **Đặt** / **Áp dụng**. Một thông báo nhỏ ở dưới bảng sẽ xác nhận thao tác.

## Các chức năng

| Tab | Chức năng |
| --- | --- |
| **Tài nguyên** | Đặt/cộng vàng, chìa khóa, lượt đổi thẻ (reroll), lượt bỏ qua/loại thẻ; cộng XP, hệ số XP, lên cấp ngay, mở 4 ô chiêu thức, mở 8 ô vitamin |
| **Sinh tồn** | Bật/tắt bất tử, hồi đầy máu, thời gian miễn sát thương, tàng hình, số lượt hồi sinh, hồi sinh tại chỗ, nạp đầy tuyệt chiêu |
| **Chỉ số** | Tăng sát thương, phạm vi, tốc độ đánh, số đạn, tốc độ chạy, phạm vi nhặt, may mắn; gói buff nhẹ; đặt lại chỉ số |
| **Kẻ địch** | Hệ số máu / sát thương / tốc độ của địch, giới hạn số địch trên màn hình, miễn nhiễm sát thương, kích hoạt đợt quái cuối |
| **Shiny & Bắt** | Bắt chắc 100%, kéo dài thời gian bắt Boss, kích hoạt Shiny, tạo Pokémon Shiny theo số Pokédex (vd: 150 = Mewtwo) |
| **Tốc độ & Môi trường** | Tốc độ game, góc nhìn từ trên cao, tắt rung màn hình, đổi thời tiết, nhảy tới giai đoạn 4, đánh dấu qua màn |

Nút **Mặc định** (trên tiêu đề) hoặc **Đặt lại toàn bộ chức năng** (cuối bảng) đưa mọi thay đổi trong trận về trạng thái gốc.

> ⚠ **Cảnh báo:** theo tác giả gốc, **đổi tốc độ game chắc chắn bị khóa tài khoản**. Hãy dùng các chức năng một cách có trách nhiệm và tự chịu rủi ro.
