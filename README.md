# NoteIn

NoteIn là ứng dụng quản lý lịch trình cá nhân, được xây bằng Expo và React Native. Người dùng có thể theo dõi các khung giờ lặp lại hằng ngày, lên lịch sự kiện theo ngày, xem tiến độ trong ngày và đồng bộ một Live Activity lên màn hình khóa iOS.

Tài liệu này mô tả **hành vi đang có trong mã nguồn hiện tại**. Một số chuỗi dịch và cấu hình có thể nói đến thông báo hay màn hình khóa rộng hơn những gì ứng dụng đang thực hiện; hãy kiểm tra code trước khi dựa vào các chuỗi đó.

## Chức năng hiện tại

- **Lịch ngày:** thêm, sửa, xóa khung giờ; xem mục hiện tại/sắp tới, tiến độ, thời gian còn lại và các khung giờ bị trùng.
- **Đánh dấu hoàn thành:** trạng thái hoàn thành của một mục lịch ngày được lưu theo cặp `dailyId + ngày`.
- **Lịch bàn:** xem lịch theo tháng, chọn ngày, thêm và xóa sự kiện; ngày có sự kiện được đánh dấu trên lưới lịch.
- **Cài đặt và thống kê:** chuyển tiếng Việt/tiếng Anh, đổi giao diện sáng/tối, khôi phục dữ liệu mẫu và xem thống kê đơn giản.
- **Gợi ý giờ trống trên Android:** với khung Daily bị trùng, tìm tối đa ba giờ thay thế theo bước 15 phút trong khoảng 05:00–22:00. Gợi ý tính mọi Daily đang hoạt động và sự kiện của ngày đang xem; sự kiện ở ngày khác chưa được kiểm tra. Người dùng xác nhận trước khi mở form chỉnh sửa; đổi giờ Daily sẽ tác động mọi ngày lặp.
- **Thông báo lịch hiện tại trên Android:** người dùng bật/tắt trong mục Other. Notification được làm mới khi app đang mở; trước khi xác nhận notification đã hiển thị, app thử đăng lại nếu hệ thống chưa trả về notification. Sau khi đã xác nhận hiển thị, nếu notification biến mất thì app coi đó là người dùng đã gỡ và không đăng lại.
- **iOS Live Activity:** gửi lịch trong ngày từ JavaScript sang native iOS để hiển thị trên màn hình khóa và Dynamic Island. Live Activity có chế độ Daily và Calendar.
- **Web:** giao diện React Native Web có thể chạy bằng Expo. Phần native iOS Live Activity không có trên web.

### Những gì chưa được triển khai

- Chưa có backend/API mạng. [schedule.api.ts](./src/api/schedule.api.ts) là lớp giao tiếp nội bộ hiện tại; các hàm đọc/ghi đều dùng Zustand trong bộ nhớ.
- Chưa có lưu dữ liệu bền vững. Lịch, sự kiện và trạng thái hoàn thành khởi tạo từ dữ liệu mẫu và có thể mất khi app khởi động lại.
- Notification Android không được cập nhật bởi service/alarm nền; nội dung có thể cũ khi app đóng và được cập nhật lại khi mở app.
- Chưa có luồng gửi push notification hay receiver/alarm Android để tự cập nhật notification khi app đóng, reboot hoặc đổi giờ.
- Không có đảm bảo notification luôn nằm trên màn hình khóa: người dùng/hệ điều hành có thể gỡ hoặc chặn notification.
- `ToggleNoteInDailyIntent` và `SelectNoteInDateIntent` được định nghĩa trong plugin nhưng hiện chưa gắn vào giao diện widget. Chưa có luồng tương tác Live Activity ghi ngược dữ liệu vào Zustand.

## Công nghệ và module

### Runtime chính

| Module | Vai trò trong dự án |
| --- | --- |
| Expo SDK `~58.0.24` | Nền tảng phát triển và chạy app native/web. |
| React `^19.3.1`, React Native `0.88.1` | Component và giao diện đa nền tảng. |
| Expo Router `~58.0.31` | Điều hướng dựa trên file trong `src/app/`. Entry được khai báo qua `expo-router/entry`. |
| Zustand `^5.1.0` | State dùng chung của lịch, sự kiện, theme, ngôn ngữ và trạng thái hoàn thành. |
| date-fns `^4.4.0` | Tính toán ngày/giờ, định dạng ngày và locale `vi`/`en`. |
| `expo-blur` | Hiệu ứng kính mờ cho thanh tab dưới. |
| `expo-status-bar`, `react-native-safe-area-context` | Status bar và safe area trên thiết bị. |
| `expo-notifications` | Tạo notification ongoing Android theo yêu cầu người dùng; không có gửi push hoặc cập nhật nền. |
| React Native Web | Chạy giao diện JavaScript trên trình duyệt. |

### iOS native

[withNoteInLockScreen.js](./plugins/withNoteInLockScreen.js) là Expo config plugin tùy chỉnh. Khi tạo native iOS project, plugin:

1. Bật các khóa Live Activity trong `Info.plist`.
2. Tạo Swift module và Objective-C bridge để JavaScript gọi `NoteInLockScreen.startOrUpdateLiveActivity(...)`.
3. Tạo target `NoteInWidgetExtension` với SwiftUI/WidgetKit để hiển thị Live Activity và Dynamic Island.
4. Định nghĩa các `AppIntent` cho chuyển tab, chọn ngày và tương tác với mục Daily. Hiện widget chỉ gắn intent chuyển giữa tab Daily và Calendar.

Native code được nhúng thành các template trong file plugin; không có thư mục `ios/` được quản lý trực tiếp trong repo. Khi thay đổi schema dữ liệu Live Activity, cần giữ đồng bộ `LockScreenPayload` trong [lockScreenSync.ts](./src/services/lockScreenSync.ts) với `NoteInPayload`/`ContentState` trong Swift của plugin.

Live Activity cần native module này nên **không chạy được trong Expo Go**. Cần build app iOS có native module; tạo/chạy iOS build cục bộ cần macOS và Xcode. Plugin đặt deployment target của widget extension là iOS 17.

### Dependency đã khai báo nhưng chưa thấy được dùng trực tiếp trong `src/`

`@react-native-community/datetimepicker`, `expo-constants`, `expo-linear-gradient` và `expo-linking` có trong [package.json](./package.json), nhưng các màn hình hiện tại chưa import chúng. Phần nhập giờ hiện dùng `TextInput`. Kiểm tra toàn bộ nơi sử dụng trước khi quyết định gỡ dependency.

## Kiến trúc

```text
src/app/index.tsx (HomeScreen / điều phối màn hình)
  ├─ DailyTab ─────────┐
  ├─ CalendarTab ──────┼─> src/api/schedule.api.ts ─> Zustand store
  ├─ OtherTab ─────────┘                              │
  └─ BottomTabBar                                      v
                                              src/engine/schedule.ts
                                              timeline / trạng thái /
                                              phát hiện trùng giờ

HomeScreen + Zustand data
  └─ src/services/lockScreenSync.ts
       └─ NativeModules.NoteInLockScreen
            └─ Swift bridge + ActivityKit + WidgetKit (iOS)

Android HomeScreen + Zustand data
  └─ src/services/androidScheduleNotification.ts
       └─ expo-notifications
            └─ Android notification channel + ongoing notification
```

[`src/app/index.tsx`](./src/app/index.tsx) là màn hình chính, tự quản lý tab đang chọn và yêu cầu dữ liệu timeline. [`src/app/manage.tsx`](./src/app/manage.tsx) hiện chỉ redirect về `/`. [`App.tsx`](./App.tsx) ở root là template Expo cũ; entry thực tế lấy từ `expo-router/entry`.

### Cấu trúc thư mục

```text
src/
  app/          Routes và điều phối màn hình
  api/          Lớp thao tác dữ liệu; hiện đọc/ghi Zustand, chưa gọi server
  components/   Các tab và thành phần giao diện
  data/         Dữ liệu mẫu khởi tạo
  engine/       Logic thuần để tạo timeline, xác định trạng thái, xung đột và giờ trống
  hooks/        Hook thời gian hiện tại
  i18n/         Chuỗi tiếng Việt/Anh và bản dịch dữ liệu mẫu
  services/     Tích hợp nền tảng: iOS Live Activity và Android notification
  store/        Zustand store dùng chung
  types/        Kiểu dữ liệu lịch và sự kiện

plugins/
  withNoteInLockScreen.js  Expo config plugin tạo bridge và widget iOS
```

## Dữ liệu và logic nghiệp vụ

Kiểu dữ liệu chính nằm trong [schedule.ts](./src/types/schedule.ts):

- `DailyTemplate`: mẫu khung giờ có `startMin`, `durationMin`, `repeat` và `isActive`. Thời gian được biểu diễn bằng số phút tính từ 00:00.
- `EventItem`: sự kiện có ngày `yyyy-MM-dd`, thời gian bắt đầu và thời lượng.
- `TimelineItem`: bản ghi đã chuẩn hóa để UI dùng, gồm nguồn (`daily`/`event`), thời gian bắt đầu-kết thúc, trạng thái hoàn thành và danh sách mục bị trùng.
- `CurrentState`: trạng thái hiện tại (`current`, `upcoming`, `finished`, `empty`).

[`src/engine/schedule.ts`](./src/engine/schedule.ts) là lớp nghiệp vụ thuần, không phụ thuộc giao diện:

- `buildTimeline(...)` lọc lịch Daily theo ngày lặp, thêm sự kiện đúng ngày, đánh dấu hoàn thành và sắp xếp theo giờ.
- `detectConflicts(...)` kiểm tra hai khoảng thời gian có giao nhau; hai khoảng chỉ chạm biên thì không bị tính là trùng.
- `getCurrentState(...)` xác định mục đang diễn ra hoặc kế tiếp và tính tiến độ/thời gian còn lại.

`Repeat` đã hỗ trợ `daily` và `weekdays`; tuy nhiên form tạo/sửa trong [DailyTab.tsx](./src/components/DailyTab.tsx) hiện luôn lưu kiểu `daily`.

### State và cập nhật dữ liệu

[`scheduleStore.ts`](./src/store/scheduleStore.ts) chứa:

- `dailies`, `events`, `completions`
- `selectedDate`, `language`, `theme`
- Một số trường tùy chỉnh màn hình khóa (`lockScreenLayout`, `lockScreenTransparency`, `wallpaperIndex`)

Store được tạo bằng Zustand `create(...)`, chưa dùng persistence middleware. [mock.ts](./src/data/mock.ts) cung cấp dữ liệu mặc định. Đổi ngôn ngữ sẽ đổi bản dịch của các mục mẫu đã biết; nội dung người dùng tự đặt không bị dịch.

[`src/api/schedule.api.ts`](./src/api/schedule.api.ts) là facade để component không thao tác trực tiếp với cấu trúc store. Các hàm được khai báo `async` để cung cấp interface dễ thay bằng backend sau này, nhưng hiện tại không thực hiện I/O mạng.

## Luồng đồng bộ iOS Live Activity

1. `HomeScreen` đọc `dailies`, `events`, `completions` và `language` từ Zustand.
2. `useNow` trong [useNow.ts](./src/hooks/useNow.ts) cập nhật thời gian mỗi phút; `HomeScreen` gọi `syncLiveActivityToOSLockScreen` khi dữ liệu, ngôn ngữ hoặc thời gian đổi, và khi `AppState` thay đổi.
3. [lockScreenSync.ts](./src/services/lockScreenSync.ts) tạo `LockScreenPayload`: mục Daily hiện tại/sắp tới, tối đa bốn mục Daily bổ sung (loại mục đang diễn ra nếu đã dùng làm mục chính), các dấu ngày có sự kiện trong khoảng 28 ngày và tối đa ba sự kiện hôm nay.
4. Nếu chạy trên iOS và native module tồn tại, payload JSON được chuyển qua bridge đến ActivityKit. Native module cập nhật Activity đang có hoặc tạo Activity mới.
5. Widget SwiftUI hiển thị nội dung Live Activity; tab Calendar hiện tối đa hai sự kiện của hôm nay. Dynamic Island hiển thị giờ, phần trăm tiến độ và tên mục hiện tại.

Việc đồng bộ diễn ra từ app khi app đang chạy/được mở lại; đây không phải dịch vụ push từ server. Khi sửa payload hoặc UI native, kiểm tra cả phần TypeScript trong [lockScreenSync.ts](./src/services/lockScreenSync.ts) và các template Swift trong [withNoteInLockScreen.js](./plugins/withNoteInLockScreen.js).

## Chạy và kiểm tra

Dự án dùng npm ([package-lock.json](./package-lock.json) có trong repo):

```bash
npm install
npm run start       # Expo dev server
npm run web         # chạy giao diện web
npm run android     # build/chạy native Android
npm run ios         # build/chạy native iOS; cần macOS và Xcode
npm run typecheck   # TypeScript
npm test            # Jest
```

Các test hiện có trong [schedule.test.ts](./src/engine/schedule.test.ts) bao phủ logic timeline, trạng thái hiện tại và xung đột.

## Khi phát triển tiếp

- Đặt route mới trong [src/app/](./src/app/); component, store, service và logic nghiệp vụ để ngoài thư mục route.
- Đặt logic tính lịch độc lập UI trong [src/engine/](./src/engine/) và thêm test tại chỗ.
- Đi qua [src/api/schedule.api.ts](./src/api/schedule.api.ts) khi đọc/ghi dữ liệu để sau này có thể thay store adapter bằng backend.
- Nếu thêm lưu bền hoặc backend, xác định rõ cách đồng bộ completion và migration dữ liệu mẫu.
- Với tính năng iOS Live Activity, cập nhật đồng bộ kiểu payload TypeScript, Swift model và widget UI trong [lockScreenSync.ts](./src/services/lockScreenSync.ts) và [withNoteInLockScreen.js](./plugins/withNoteInLockScreen.js); sau đó kiểm tra bằng native iOS build, không chỉ Expo Go hoặc web.
- Không sửa tay native project được generate; thay đổi cấu hình native nên đi qua Expo config plugin và được kiểm tra bằng prebuild/build.
