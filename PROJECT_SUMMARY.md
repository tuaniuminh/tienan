# Tóm tắt dự án & Tài liệu Bàn giao (Project Summary & Handoff Notes)

Tài liệu này lưu trữ các điểm mấu chốt về mặt kiến trúc, các lỗi logic quan trọng đã được khắc phục, và các lưu ý đặc biệt khi phát triển tiếp mã nguồn của ứng dụng **Sổ Theo Dõi Tiền Ăn**.

---

## 1. Thông tin chung về dự án
- **Công nghệ:** HTML5, CSS3 (Tailwind CSS CDN), Pure Vanilla JavaScript (Compat ES6+).
- **Đồng bộ đám mây:** Firebase Realtime Database (SDK v8.10.1 compat).
- **Môi trường vận hành chính:** iOS PWA (Safari) & PC Browser. Do ứng dụng chạy PWA trên Safari nên rất nhạy cảm với cơ chế cache. **Mỗi khi thay đổi code, bắt buộc phải nâng số phiên bản (`CACHE_NAME` trong `sw.js` và `currentVersion` / `headerVersionTag` trong `index.html`) để trình duyệt tự động xóa cache cũ và tải code mới.**

---

## 2. Các điểm logic/kiến trúc quan trọng

### A. Cơ chế làm tròn tiền tệ (VND)
- **Tình huống:** Khi chia tiền cho các thành viên ăn chung, số tiền thường bị lẻ hàng trăm đồng. Trong giao dịch thực tế tại Việt Nam, tiền lẻ dưới 1.000đ rất khó trả bằng tiền mặt.
- **Giải pháp (v2.5.14):** Tự động **làm tròn lên (Math.ceil)** đến hàng nghìn đồng (`1.000đ`) cho mỗi thành viên khi chia tiền:
  $$\text{Share Amount} = \lceil\frac{\text{Total Amount}}{\text{Divisor}} \times \frac{1}{1000}\rceil \times 1000$$
- **File cần lưu ý:** Hàm `addTransaction` và `updateSplitPreview` trong [index.html](file:///index.html).

### B. Logic xử lý thành viên "Tôi" (Chủ hộ)
- **Standard Meal (Ăn chung):** Luôn luôn ngầm hiểu có mặt "Tôi" (Chủ hộ). Số tiền chia sẽ cộng thêm 1 người.
- **Mua hộ (Proxy Mode):** Chỉ chia cho những người được chọn, "Tôi" chịu 0đ.
- **Dọn dẹp rác (v2.5.15):** Khi một thành viên trả hết nợ, nếu hóa đơn đó chỉ còn nợ của "Tôi" (Chủ hộ), hàm `cleanUpEmptyMeals` sẽ tự động lọc và xóa hóa đơn đó để tránh tồn đọng giao dịch rác.

### C. Cơ chế Giữ nguyên bộ lọc sau khi "Trả hết"
- **Yêu cầu (v2.5.16):** Khi chọn một thành viên và nhấn "Trả hết", ứng dụng sẽ đưa nợ của người đó về 0 nhưng **không tự động tắt bộ lọc** (`clearFilter()`). Trạng thái lọc người đó vẫn được giữ nguyên để người dùng kiểm tra nợ đã thực sự về 0đ mà không bị nhảy về lịch sử tổng, giúp tránh bấm nhầm.

---

## 3. Các lỗi nghiêm trọng đã được fix (Hạn chế sửa vào phần này)

### A. Lỗi tự động phục hồi giao dịch khi xóa (Vòng lặp vô hạn Firebase)
- **Nguyên nhân:** Khi xóa giao dịch cuối cùng trong hệ thống (cả mảng `transactions` và `guests` trống), Firebase Realtime Database sẽ tự động xóa sạch node đó trên đám mây (trở thành `null`). Khi nhận tín hiệu `null` đồng bộ ngược về, bản cũ v2.5.9 sẽ nhảy vào nhánh `else { pushLocalToFirebase() }` để cố đẩy dữ liệu cục bộ lên mây. Việc này tạo ra một vòng lặp đồng bộ vô hạn (Synchronous Loop) gây ra lỗi **Tràn bộ nhớ (Maximum call stack size exceeded)**, khiến lệnh ghi bị trình duyệt chặn đứng và dữ liệu cũ tự động khôi phục.
- **Giải pháp (v2.5.10):** Sử dụng cờ `firebase_synced_once` ở `localStorage` để kiểm soát:
  - Nếu đám mây trống do người dùng chủ động xóa sạch, ứng dụng sẽ thực hiện làm trống LocalStorage và bộ nhớ cục bộ chứ không đẩy đè dữ liệu cũ lên mây nữa.
- **Hàm xử lý:** Sự kiện `dbRef.on('value')` lắng nghe đồng bộ trong `initFirebase()`.

### B. Lỗi Firebase từ chối đối tượng rỗng `{}`
- **Nguyên nhân:** Firebase SDK không cho phép gọi `.set({})` với đối tượng rỗng (xảy ra khi cả `guests` và `transactions` là mảng trống `[]` và bị SDK tự lọc bỏ thuộc tính). Lệnh ghi sẽ thất bại âm thầm mà không gửi lên mây.
- **Giải pháp (v2.5.11/v2.5.12):** Trong hàm `pushLocalToFirebase()`, nếu phát hiện cả hai danh sách đều trống, ứng dụng sẽ gọi `dbRef.set(null)` thay vì gửi đối tượng rỗng. `set(null)` là cú pháp hợp lệ để xóa thư mục trên Firebase.

### C. Lỗi đồng bộ "Zombie" đa thiết bị
- **Nguyên nhân:** Khi có từ 2 thiết bị trở lên kết nối chung một Database (hoặc mở nhiều tab trình duyệt). Khi Thiết bị A xóa sạch dữ liệu mây trở thành `null`, Thiết bị B (vẫn đang chạy code cũ chưa cập nhật) nhận được sự kiện `null` sẽ lập tức đẩy dữ liệu cũ của nó lên lại, gây ra hiện tượng tự phục hồi dữ liệu xuyên thiết bị.
- **Giải pháp:** Bắt buộc tất cả các thiết bị phải được nâng lên phiên bản có cờ chặn vòng lặp (`v2.5.10` trở lên) và tắt hết các tab/PWA chạy ngầm cũ.

---

## 4. Bảo mật & Firebase Rules (Ẩn danh)
- **Cơ chế (v2.5.13):** Để khắc phục các cảnh báo bảo mật (`insecure rules`) gửi về email hàng ngày mà không cần bắt người dùng đăng ký tài khoản, dự án sử dụng **Đăng nhập ẩn danh (Anonymous Authentication)**.
- **Cấu hình bắt buộc trên Firebase Console:**
  1. Vào *Authentication* -> *Sign-in method* -> Bật **Anonymous** (Enabled).
  2. Cấu hình Rules trên Realtime Database:
     ```json
     {
       "rules": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
     ```
- **Lưu ý:** Mã nguồn trên GitHub ở chế độ công khai là an toàn, vì các thông tin nhạy cảm của Firebase (`API Key`, `Database URL`...) được nhập qua UI và chỉ lưu ở `localStorage` của trình duyệt người dùng, hoàn toàn không được hardcode trong git.

---

## 5. Tải ảnh & QR Code Ngân hàng (v2.5.15)
- **Giao diện sáng tinh tế:** Khi nhấn "Tải ảnh", ứng dụng sẽ tạm thời dựng một khung hóa đơn sáng trắng (Light Receipt Slip) ẩn (`left: -9999px`) với thiết kế phẳng tinh tế, thay vì chụp trực tiếp giao diện tối của app.
- **Tạo mã QR thông minh:** Tích hợp API của VietQR (`img.vietqr.io`). Khi người dùng cấu hình ngân hàng (trong mục **🏦 Cấu hình QR Ngân hàng** lưu ở `localStorage`), hệ thống tự động sinh QR chuyển khoản chứa sẵn thông tin tài khoản, chủ tài khoản, số tiền cần trả và nội dung chuyển khoản tự động (không dấu).
- **Văn bản chia sẻ:** Nội dung văn bản chia sẻ khi dán được rút gọn thành `Số tiền: [Tổng_Số_Tiền]đ`.
- **Hỗ trợ CORS:** Thư viện `html2canvas` được cấu hình `useCORS: true` để tải và kết xuất ảnh QR từ API VietQR một cách chính xác trên Canvas.
