import type { DailyTemplate, EventItem } from '../types/schedule';

export type Language = 'vi' | 'en';

export const translations = {
  vi: {
    // Lock Screen Top & Tabs (Matching Design Mockup 1, 2, 3)
    lockBrand: 'LOCKNOTE',
    sessionPrefix: 'BUỔI',
    sessionMorning: 'SÁNG',
    sessionNoon: 'TRƯA',
    sessionAfternoon: 'CHIỀU',
    sessionEvening: 'TỐI',
    sessionNight: 'ĐÊM',
    lsTabDaily: 'Lịch Daily',
    lsTabCalendar: 'Lịch Bàn',
    lsTabHidden: 'Ẩn Lịch',
    lsNowBannerPrefix: 'Đang tới giờ:',
    lsNextBannerPrefix: 'Kế tiếp:',
    lsAddBtn: '+ Thêm',
    lsAddNoteBtn: '+ Ghi chú',
    lsSelectedDateTitle: 'CHI TIẾT NGÀY ĐANG CHỌN',
    lsHiddenBanner: 'Đã ẩn lịch – Đang hiển thị hình nền & thông báo chuẩn',
    lsUpcomingNotificationsHeader: 'THÔNG BÁO LỊCH BÀN (TRƯỚC 1 TUẦN)',
    lsNoUpcomingEvents: 'Không có sự kiện Lịch Bàn nào trong 7 ngày tới',
    lsOpenFullAppBtn: 'Chạm để mở App Quản Lý đầy đủ',
    lsBackToLockScreenBtn: 'Trải nghiệm Màn Hình Khóa',
    inDaysLabel: 'Còn',
    daysUnit: 'ngày',
    todayLabel: 'Hôm nay',
    tomorrowLabel: 'Ngày mai',

    // Bottom Tabs in Full App
    tabDaily: 'Lịch ngày',
    tabCalendar: 'Lịch bàn',
    tabOther: 'Other',

    // Daily Tab
    dailyHeaderTitle: 'Quản Lý Lịch Ngày',
    dailyHeaderSub: 'Các khung giờ lặp lại cố định mỗi ngày',
    lockScreenBtn: 'Màn hình khóa',
    currentTaskLabel: 'ĐANG DIỄN RA',
    upcomingTaskLabel: 'SẮP TỚI',
    finishedToday: 'Hôm nay đã hoàn thành tất cả lịch trình',
    noScheduleToday: 'Chưa có lịch trình nào cho hôm nay',
    minutesLeft: 'phút còn lại',
    minutesUntil: 'phút nữa',
    progressLabel: 'Tiến độ khung giờ',
    conflictWarning: 'Trùng giờ',
    noNote: 'Không có ghi chú',
    eventBadge: 'Sự kiện',
    dailyBadge: 'Hằng ngày',
    addSlotBtn: '+ Khung giờ',
    editSlotTitle: 'Chỉnh sửa khung giờ Daily',
    newSlotTitle: 'Thêm khung giờ Daily mới',
    slotStartPlaceholder: 'Bắt đầu (VD: 06:00)',
    slotEndPlaceholder: 'Kết thúc (VD: 07:30)',
    slotTitlePlaceholder: 'Tên hoạt động hằng ngày',
    slotNotePlaceholder: 'Ghi chú chi tiết',
    saveSlotBtn: 'Lưu vào Lịch ngày',
    cancelBtn: 'Hủy',
    editBtn: 'Sửa',
    deleteBtn: 'Xóa',
    confirmDeleteTitle: 'Xác nhận xóa',
    confirmDeleteMsg: 'Bạn có chắc muốn xóa mục này khỏi lịch?',

    // Calendar (Desk Calendar) Tab
    calendarHeaderTitle: 'Cuốn Lịch Để Bàn',
    calendarHeaderSub: 'Tự động thông báo sự kiện trước 1 tuần',
    todayBtn: 'Hôm nay',
    weekdays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    eventsOnDate: 'Sự kiện ngày',
    noEventsOnDate: 'Chưa có sự kiện nào trong ngày này.',
    addEventTitle: 'Thêm sự kiện Lịch Bàn',
    eventTimePlaceholder: 'Giờ (VD: 08:30)',
    eventDurationPlaceholder: 'Thời lượng (phút, VD: 60)',
    eventTitlePlaceholder: 'Tiêu đề sự kiện',
    eventNotePlaceholder: 'Mô tả của sự kiện',
    saveEventBtn: 'Lưu sự kiện vào ngày này',
    syncEventNotifBtn: 'Cập nhật thông báo Lịch Bàn (7 ngày tới)',
    syncSuccessTitle: 'Đã cập nhật thông báo Lịch Bàn!',
    syncSuccessMsg:
      'Chỉ các sự kiện Lịch Bàn diễn ra trong vòng 7 ngày tới mới được thông báo theo định dạng:\nTiêu đề: hh:mm dd/mm/yy(tiêu đề event)\nNội dung: mô tả của event',

    // Transparency labels
    lsTransparencyUltra: 'Trong suốt cao',
    lsTransparencyGlass: 'Kính mờ vừa',
    lsTransparencyFrosted: 'Rõ nét',

    // Other Tab (Settings & Utilities)
    otherTitle: 'Other',
    helpBtn: 'Trợ giúp',
    helpModalTitle: 'Hướng dẫn sử dụng NoteIn',
    helpModalBody:
      '• Màn hình khóa: Có 3 chế độ (Lịch Daily, Lịch Bàn, Ẩn Lịch) thiết kế trong suốt để lộ hình nền khóa.\n• Thông báo thông minh: Chỉ thông báo cho sự kiện Lịch Bàn trước ngày diễn ra khoảng 1 tuần với tiêu đề "hh:mm dd/mm/yy(tiêu đề event)" và nội dung là mô tả sự kiện (không làm phiền bởi Lịch Daily).\n• App Quản Lý đầy đủ: Gồm 3 mục dưới đáy là Lịch ngày, Lịch bàn và Other.\n• Ngôn ngữ: Chuyển đổi đồng bộ giữa Tiếng Việt và Tiếng Anh trong mục Other.',
    closeBtn: 'Đóng',

    sectionGeneral: 'Cài đặt chung & Ngôn ngữ',
    settingLanguage: 'Ngôn ngữ / Language',
    langVietnamese: 'Tiếng Việt',
    langEnglish: 'English',

    sectionLockScreen: 'Tùy chỉnh Màn hình khóa & Thông báo',
    settingOpenTransparentLS: 'Mở giao diện Màn hình khóa',
    settingOpenTransparentLSSub: 'Xem 3 chế độ: Lịch Daily · Lịch Bàn · Ẩn Lịch',
    settingPushOSLockScreen: 'Làm mới thông báo Lịch Bàn (Trước 1 tuần)',
    settingPushOSLockScreenSub: 'Format: hh:mm dd/mm/yy(tiêu đề) · Nội dung: mô tả',
    settingLSTransparency: 'Độ trong suốt thẻ kính',
    settingLSWallpaper: 'Chủ đề hình nền Màn hình khóa',
    wallpaperNames: ['Cực Quang Đêm', 'Hoàng Hôn Tím', 'Đại Dương Sâu', 'Rừng Sương Mù'],

    sectionAppearance: 'Giao diện App Quản Lý & Dữ liệu',
    settingTheme: 'Chế độ màu App Quản Lý',
    themeLight: 'Sáng (Cam Trắng)',
    themeDark: 'Tối (Xanh Đêm)',
    settingManageDailies: 'Thêm khung giờ Daily mới',
    settingResetData: 'Khôi phục dữ liệu mẫu mặc định',
    resetConfirmMsg: 'Đã khôi phục dữ liệu mẫu theo ngôn ngữ hiện tại!',

    sectionReports: 'Báo cáo & Thống kê',
    reportDailyCompletion: 'Tỷ lệ hoàn thành Daily hôm nay',
    reportDailyHours: 'Tổng thời gian lịch cố định / ngày',
    reportMonthlyEvents: 'Sự kiện Lịch Bàn sắp tới (7 ngày)',
    tasksCompletedUnit: 'mục đã xong',
    hoursUnit: 'giờ',
    eventsUnit: 'sự kiện',
  },
  en: {
    // Lock Screen Top & Tabs (Matching Design Mockup 1, 2, 3)
    lockBrand: 'LOCKNOTE',
    sessionPrefix: '',
    sessionMorning: 'MORNING',
    sessionNoon: 'NOON',
    sessionAfternoon: 'AFTERNOON',
    sessionEvening: 'EVENING',
    sessionNight: 'NIGHT',
    lsTabDaily: 'Daily Schedule',
    lsTabCalendar: 'Desk Calendar',
    lsTabHidden: 'Hide Schedule',
    lsNowBannerPrefix: 'Now active:',
    lsNextBannerPrefix: 'Up next:',
    lsAddBtn: '+ Add',
    lsAddNoteBtn: '+ Note',
    lsSelectedDateTitle: 'SELECTED DATE DETAILS',
    lsHiddenBanner: 'Schedule hidden – Showing wallpaper & standard notifications',
    lsUpcomingNotificationsHeader: 'DESK CALENDAR ALERTS (WITHIN 1 WEEK)',
    lsNoUpcomingEvents: 'No Desk Calendar events within the next 7 days',
    lsOpenFullAppBtn: 'Tap to open Full Management App',
    lsBackToLockScreenBtn: 'Lock Screen Mode',
    inDaysLabel: 'In',
    daysUnit: 'days',
    todayLabel: 'Today',
    tomorrowLabel: 'Tomorrow',

    // Bottom Tabs in Full App
    tabDaily: 'Daily',
    tabCalendar: 'Calendar',
    tabOther: 'Other',

    // Daily Tab
    dailyHeaderTitle: 'Manage Daily Schedule',
    dailyHeaderSub: 'Recurring daily time slots',
    lockScreenBtn: 'Lock Screen',
    currentTaskLabel: 'IN PROGRESS',
    upcomingTaskLabel: 'UP NEXT',
    finishedToday: 'All scheduled tasks completed for today',
    noScheduleToday: 'No schedule items for today',
    minutesLeft: 'min left',
    minutesUntil: 'min until',
    progressLabel: 'Slot Progress',
    conflictWarning: 'Overlap',
    noNote: 'No notes',
    eventBadge: 'Event',
    dailyBadge: 'Daily',
    addSlotBtn: '+ Time Slot',
    editSlotTitle: 'Edit Daily Time Slot',
    newSlotTitle: 'Add New Daily Time Slot',
    slotStartPlaceholder: 'Start (e.g. 06:00)',
    slotEndPlaceholder: 'End (e.g. 07:30)',
    slotTitlePlaceholder: 'Daily activity title',
    slotNotePlaceholder: 'Activity details',
    saveSlotBtn: 'Save to Daily Schedule',
    cancelBtn: 'Cancel',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    confirmDeleteTitle: 'Confirm Delete',
    confirmDeleteMsg: 'Are you sure you want to remove this item?',

    // Calendar (Desk Calendar) Tab
    calendarHeaderTitle: 'Desk Calendar',
    calendarHeaderSub: 'Notifies events ~1 week in advance',
    todayBtn: 'Today',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    eventsOnDate: 'Events on',
    noEventsOnDate: 'No events scheduled for this date.',
    addEventTitle: 'Add Desk Calendar Event',
    eventTimePlaceholder: 'Time (e.g. 08:30)',
    eventDurationPlaceholder: 'Duration (min, e.g. 60)',
    eventTitlePlaceholder: 'Event title',
    eventNotePlaceholder: 'Event description',
    saveEventBtn: 'Save Event to This Date',
    syncEventNotifBtn: 'Refresh Event Notifications (Next 7 Days)',
    syncSuccessTitle: 'Desk Calendar Notifications Updated!',
    syncSuccessMsg:
      'Only Desk Calendar events within the next 7 days are notified using the format:\nTitle: hh:mm dd/mm/yy(event title)\nBody: event description',

    // Transparency labels
    lsTransparencyUltra: 'Ultra Clear',
    lsTransparencyGlass: 'Medium Glass',
    lsTransparencyFrosted: 'High Contrast',

    // Other Tab (Settings & Utilities)
    otherTitle: 'Other',
    helpBtn: 'Help',
    helpModalTitle: 'How to use NoteIn',
    helpModalBody:
      '• Lock Screen: Features 3 modes (Daily Schedule, Desk Calendar, Hide Schedule) with minimalist transparent glass over your wallpaper.\n• Smart Notifications: Only notifies Desk Calendar events ~1 week in advance with title "hh:mm dd/mm/yy(event title)" and body as the event description (never spams Daily tasks).\n• Full Management App: 3 bottom tabs for Daily, Calendar, and Other.\n• Language: Switch seamlessly between Vietnamese and English in Other.',
    closeBtn: 'Close',

    sectionGeneral: 'General & Language',
    settingLanguage: 'Language / Ngôn ngữ',
    langVietnamese: 'Tiếng Việt',
    langEnglish: 'English',

    sectionLockScreen: 'Lock Screen & Notification Settings',
    settingOpenTransparentLS: 'Open Lock Screen View',
    settingOpenTransparentLSSub: 'View 3 modes: Daily · Desk Calendar · Hidden',
    settingPushOSLockScreen: 'Refresh Desk Calendar Alerts (1 Week Prior)',
    settingPushOSLockScreenSub: 'Format: hh:mm dd/mm/yy(title) · Body: description',
    settingLSTransparency: 'Glass Card Transparency',
    settingLSWallpaper: 'Lock Screen Wallpaper Theme',
    wallpaperNames: ['Aurora Night', 'Purple Sunset', 'Deep Ocean', 'Misty Forest'],

    sectionAppearance: 'Management App Theme & Data',
    settingTheme: 'Management App Theme Colour',
    themeLight: 'Light (Warm Orange)',
    themeDark: 'Dark (Midnight)',
    settingManageDailies: 'Add New Daily Time Slot',
    settingResetData: 'Restore Default Demo Data',
    resetConfirmMsg: 'Default sample schedule restored in English!',

    sectionReports: 'Reports & Statistics',
    reportDailyCompletion: "Today's Daily Completion",
    reportDailyHours: 'Total Daily Routine Hours',
    reportMonthlyEvents: 'Upcoming Events (Next 7 Days)',
    tasksCompletedUnit: 'completed',
    hoursUnit: 'hrs',
    eventsUnit: 'events',
  },
} as const;

const defaultDailyTranslations: Record<
  string,
  { vi: { title: string; note: string }; en: { title: string; note: string } }
> = {
  'daily-1': {
    vi: { title: 'Học bài & Ôn ngoại ngữ', note: 'Học 30 từ vựng mới, làm đề luyện nghe' },
    en: { title: 'Study & Language Practice', note: 'Learn 30 new words, listening practice' },
  },
  'daily-2': {
    vi: { title: 'Tập thể dục & Ăn sáng', note: 'Chạy bộ 20 phút, uống đủ nước' },
    en: { title: 'Morning Workout & Breakfast', note: '20-min jog and stay hydrated' },
  },
  'daily-3': {
    vi: { title: 'Làm việc / Học tập ca sáng', note: 'Tập trung xử lý các đầu việc quan trọng' },
    en: { title: 'Morning Deep Work Session', note: 'Focus on high-priority tasks' },
  },
  'daily-4': {
    vi: { title: 'Ăn trưa & Nghỉ ngơi', note: 'Ăn trưa đúng giờ, chợp mắt 15 phút' },
    en: { title: 'Lunch & Midday Rest', note: 'Healthy lunch and 15-min power nap' },
  },
  'daily-5': {
    vi: { title: 'Chạy dự án & Họp nhóm', note: 'Hoàn thiện giao diện app & gửi báo cáo' },
    en: { title: 'Project Sprint & Team Sync', note: 'Polish app UI & send daily report' },
  },
  'daily-6': {
    vi: { title: 'Ăn tối & Thư giãn', note: 'Ăn tối đúng giờ và nghỉ ngơi' },
    en: { title: 'Dinner & Unwind', note: 'Enjoy dinner and relax with family' },
  },
  'daily-7': {
    vi: { title: 'Ôn bài & Lên lịch ngày mai', note: 'Tổng kết công việc hôm nay & chuẩn bị cho ngày mai' },
    en: { title: 'Evening Review & Plan Tomorrow', note: 'Review today and prepare for tomorrow' },
  },
  'daily-8': {
    vi: { title: 'Đọc sách & Nghỉ ngơi đêm', note: 'Đọc sách 30 phút và ngủ đúng giờ' },
    en: { title: 'Night Reading & Rest', note: 'Read for 30 mins and sleep on time' },
  },
};

const defaultEventTranslations: Record<
  string,
  { vi: { title: string; note: string }; en: { title: string; note: string } }
> = {
  'event-1': {
    vi: { title: 'Họp ra mắt ý tưởng App Lịch Khóa', note: 'Chuẩn bị bản demo UI, iOS và Web/PC' },
    en: { title: 'Lock Screen Schedule App Pitch', note: 'Prepare UI demo for iOS and Web/PC' },
  },
  'event-2': {
    vi: { title: 'Sinh nhật bạn thân tại Quận 1', note: 'Nhớ mang theo quà đã chuẩn bị' },
    en: { title: "Best Friend's Birthday Party", note: 'Remember to bring the prepared gift' },
  },
  'event-3': {
    vi: { title: 'Sự kiện demo khách hàng', note: 'Gặp khách hàng trình bày sản phẩm' },
    en: { title: 'Client Product Demo', note: 'Present prototype to client' },
  },
  'event-4': {
    vi: { title: 'Review tiến độ dự án', note: 'Đánh giá sprint cuối tuần' },
    en: { title: 'Project Sprint Review', note: 'Weekly sprint retrospective' },
  },
  'event-5': {
    vi: { title: 'Triển khai hệ thống', note: 'Kiểm tra môi trường production' },
    en: { title: 'System Deployment', note: 'Verify production environment' },
  },
  'event-6': {
    vi: { title: 'Báo cáo định kỳ', note: 'Cập nhật tiến độ tháng' },
    en: { title: 'Monthly Progress Report', note: 'Update monthly milestones' },
  },
  'event-7': {
    vi: { title: 'Tổng kết tháng', note: 'Đánh giá mục tiêu đạt được' },
    en: { title: 'Monthly Wrap-up', note: 'Evaluate completed goals' },
  },
};

export function localizeDailies(dailies: DailyTemplate[], lang: Language): DailyTemplate[] {
  return dailies.map((item) => {
    const preset = defaultDailyTranslations[item.id];
    if (!preset) return item;
    if (item.title === preset.vi.title || item.title === preset.en.title) {
      return {
        ...item,
        title: preset[lang].title,
        note: preset[lang].note,
      };
    }
    return item;
  });
}

export function localizeEvents(events: EventItem[], lang: Language): EventItem[] {
  return events.map((item) => {
    const preset = defaultEventTranslations[item.id];
    if (!preset) return item;
    if (item.title === preset.vi.title || item.title === preset.en.title) {
      return {
        ...item,
        title: preset[lang].title,
        note: preset[lang].note,
      };
    }
    return item;
  });
}
