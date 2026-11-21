import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { deleteEvent, saveEvent } from '../../api/schedule.api';
import { useScheduleStore } from '../../store/scheduleStore';
import {
  getTaskColorHex,
  getTaskColorWeight,
  TASK_IMPORTANCE_COLORS,
  type TaskBadgeColor,
  type TaskStatus,
  useWebWorkspaceStore,
  type WorkTask,
} from '../../store/webWorkspaceStore';

interface WebTasksTabProps {
  now: Date;
  onDataChange: () => void;
}

function sortTasksByImportanceDesc(list: WorkTask[]): WorkTask[] {
  return [...list].sort(
    (a, b) => getTaskColorWeight(b.badgeColor) - getTaskColorWeight(a.badgeColor),
  );
}

export function WebTasksTab({ now, onDataChange }: WebTasksTabProps) {
  const { language, theme, events } = useScheduleStore();
  const {
    tasks,
    addTask,
    updateTask,
    toggleTaskStatus,
    deleteTask,
  } = useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';
  const locale = isVi ? vi : enUS;
  const todayStr = format(now, 'yyyy-MM-dd');

  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(now));
  const [leftMode, setLeftMode] = useState<'tasks' | 'events'>('tasks');
  const [calendarFilter, setCalendarFilter] = useState<'tasks' | 'deadlines' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modal state for adding tasks on a date
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDate, setNewDate] = useState(todayStr);
  const [newColor, setNewColor] = useState<TaskBadgeColor>('burgundy');
  const [newStatus, setNewStatus] = useState<TaskStatus>('pending');

  const pendingTasks = useMemo(
    () => sortTasksByImportanceDesc(tasks.filter((t) => t.status === 'pending')),
    [tasks],
  );
  const inProgressTasks = useMemo(
    () => sortTasksByImportanceDesc(tasks.filter((t) => t.status === 'in_progress')),
    [tasks],
  );
  const doneTasks = useMemo(
    () => sortTasksByImportanceDesc(tasks.filter((t) => t.status === 'done')),
    [tasks],
  );

  // Build calendar grid starting Monday
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let cursor = start;
    while (cursor <= end || days.length < 35) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
      if (days.length >= 42) break;
    }
    return days;
  }, [currentMonth]);

  const weekdays = isVi
    ? ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const openAddModalForDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setNewDate(dateStr);
    setNewTitle('');
    setNewSubtitle('');
    setNewColor('burgundy');
    setNewStatus('pending');
    setModalVisible(true);
  };

  const handleCreateTask = async () => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || (isVi ? 'Cá nhân' : 'Personal'),
      dueDate: newDate,
      status: newStatus,
      badgeColor: newColor,
      isDeadline: newColor === 'burgundy' || newColor === 'red',
    });
    await saveEvent({
      title: newTitle.trim(),
      note: newSubtitle.trim(),
      date: newDate,
      startMin: 9 * 60,
      durationMin: 60,
    });
    onDataChange();
    setNewTitle('');
    setNewSubtitle('');
    setModalVisible(false);
  };

  const getItemsForDate = (dateStr: string) => {
    const filtered = tasks.filter((t) => {
      if (t.dueDate !== dateStr) return false;
      if (calendarFilter === 'tasks') return getTaskColorWeight(t.badgeColor) <= 3;
      if (calendarFilter === 'deadlines') return getTaskColorWeight(t.badgeColor) >= 4;
      return true;
    });
    const dayTasks = sortTasksByImportanceDesc(filtered);

    const dayEvents =
      calendarFilter === 'deadlines'
        ? []
        : events.filter(
            (e) =>
              e.date === dateStr &&
              !dayTasks.some((dt) => dt.title === e.title),
          );

    return { dayTasks, dayEvents };
  };

  const renderCalendarPill = (task: WorkTask) => {
    const hex = getTaskColorHex(task.badgeColor);
    const isDarkText = task.badgeColor === 'yellow';

    return (
      <View
        key={task.id}
        style={[styles.pillBase, { backgroundColor: hex }]}
      >
        <Text
          style={[
            styles.pillText,
            isDarkText && { color: '#111827' },
            task.status === 'done' && styles.pillTextDone,
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
      </View>
    );
  };

  const selectedDateItems = getItemsForDate(selectedDate);

  let formattedSelectedDate = selectedDate;
  try {
    formattedSelectedDate = format(
      parseISO(selectedDate),
      isVi ? "EEEE, dd 'Tháng' MM, yyyy" : 'EEEE, MMMM dd, yyyy',
      { locale },
    );
  } catch {
    formattedSelectedDate = selectedDate;
  }

  return (
    <View style={styles.root}>
      {/* Page Title */}
      <View style={styles.topTitleRow}>
        <Text style={[styles.pageTitle, isDark && styles.textDark]}>
          {isVi ? 'Công việc' : 'Tasks & Calendar'}
        </Text>
        <Pressable
          onPress={() => openAddModalForDate(selectedDate)}
          style={[styles.addTopBtn, isDark && styles.addTopBtnDark]}
        >
          <Text style={[styles.addTopBtnText, isDark && styles.addTopBtnTextDark]}>
            + {isVi ? 'Thêm công việc' : 'Add Task'}
          </Text>
        </Pressable>
      </View>

      {/* Main Split View: Left Kanban Backlog Column + Right Full Month Calendar & Bottom Date Details */}
      <View style={styles.splitRow}>
        {/* LEFT PANEL: Kho công việc / Status Groups */}
        <View style={[styles.leftPanel, isDark && styles.panelDark]}>
          <View style={[styles.segmentBar, isDark && styles.segmentBarDark]}>
            <Pressable
              onPress={() => setLeftMode('tasks')}
              style={[
                styles.segmentBtn,
                leftMode === 'tasks' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  leftMode === 'tasks' && styles.segmentTextActive,
                ]}
              >
                {isVi ? 'Kho công việc' : 'Task Backlog'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLeftMode('events')}
              style={[
                styles.segmentBtn,
                leftMode === 'events' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  leftMode === 'events' && styles.segmentTextActive,
                ]}
              >
                {isVi ? 'Lịch bàn' : 'Events'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.leftScroll}
            contentContainerStyle={styles.leftScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {leftMode === 'tasks' ? (
              <>
                {/* Group 1: Chờ thực hiện (Sorted darkest -> lightest) */}
                <View style={styles.groupHeaderRow}>
                  <View style={[styles.groupDot, { backgroundColor: '#18181b' }]} />
                  <Text style={[styles.groupTitle, isDark && styles.textDark]}>
                    {isVi ? 'Chờ thực hiện' : 'Pending'}
                  </Text>
                  <Text style={styles.groupCount}>· {pendingTasks.length}</Text>
                </View>
                {pendingTasks.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      setSelectedDate(t.dueDate);
                      toggleTaskStatus(t.id);
                    }}
                    style={[styles.backlogCard, isDark && styles.backlogCardDark]}
                  >
                    <View style={styles.backlogTopLine}>
                      <View
                        style={[
                          styles.importanceDotSmall,
                          { backgroundColor: getTaskColorHex(t.badgeColor) },
                        ]}
                      />
                      <Text
                        style={[styles.backlogTitle, isDark && styles.textDark]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                    </View>
                    <View style={styles.backlogMetaRow}>
                      <Text style={styles.backlogSub} numberOfLines={1}>
                        {t.subtitle}
                      </Text>
                      <Text
                        style={[
                          styles.backlogDate,
                          t.dueDate < todayStr && styles.backlogDateOverdue,
                        ]}
                      >
                        {format(parseISO(t.dueDate), 'dd/MM')}
                      </Text>
                    </View>
                  </Pressable>
                ))}

                {/* Group 2: Đang thực hiện */}
                <View style={[styles.groupHeaderRow, { marginTop: 14 }]}>
                  <View style={[styles.groupDot, { backgroundColor: '#881337' }]} />
                  <Text style={[styles.groupTitle, isDark && styles.textDark]}>
                    {isVi ? 'Đang thực hiện' : 'In Progress'}
                  </Text>
                  <Text style={styles.groupCount}>· {inProgressTasks.length}</Text>
                </View>
                {inProgressTasks.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      setSelectedDate(t.dueDate);
                      toggleTaskStatus(t.id);
                    }}
                    style={[styles.backlogCard, isDark && styles.backlogCardDark]}
                  >
                    <View style={styles.backlogTopLine}>
                      <View
                        style={[
                          styles.importanceDotSmall,
                          { backgroundColor: getTaskColorHex(t.badgeColor) },
                        ]}
                      />
                      <Text
                        style={[styles.backlogTitle, isDark && styles.textDark]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                    </View>
                    <View style={styles.backlogMetaRow}>
                      <Text style={styles.backlogSub} numberOfLines={1}>
                        {t.subtitle}
                      </Text>
                      <Text style={styles.backlogDate}>
                        {format(parseISO(t.dueDate), 'dd/MM')}
                      </Text>
                    </View>
                  </Pressable>
                ))}

                {/* Group 3: Đã hoàn thành */}
                <View style={[styles.groupHeaderRow, { marginTop: 14 }]}>
                  <View style={[styles.groupDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.groupTitle, isDark && styles.textDark]}>
                    {isVi ? 'Đã hoàn thành' : 'Completed'}
                  </Text>
                  <Text style={styles.groupCount}>· {doneTasks.length}</Text>
                </View>
                {doneTasks.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleTaskStatus(t.id)}
                    style={[
                      styles.backlogCard,
                      styles.backlogCardDone,
                      isDark && styles.backlogCardDark,
                    ]}
                  >
                    <View style={styles.backlogTopLine}>
                      <View
                        style={[
                          styles.importanceDotSmall,
                          { backgroundColor: getTaskColorHex(t.badgeColor) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.backlogTitle,
                          styles.pillTextDone,
                          isDark && styles.textDark,
                        ]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                    </View>
                    <Text style={styles.backlogSub} numberOfLines={1}>
                      {t.subtitle}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : (
              <>
                <View style={styles.groupHeaderRow}>
                  <View style={[styles.groupDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={[styles.groupTitle, isDark && styles.textDark]}>
                    {isVi ? 'Sự kiện Lịch bàn' : 'Desk Calendar Events'}
                  </Text>
                  <Text style={styles.groupCount}>· {events.length}</Text>
                </View>
                {events.map((ev) => (
                  <Pressable
                    key={ev.id}
                    onPress={() => setSelectedDate(ev.date)}
                    style={[styles.backlogCard, isDark && styles.backlogCardDark]}
                  >
                    <Text style={[styles.backlogTitle, isDark && styles.textDark]} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <View style={styles.backlogMetaRow}>
                      <Text style={styles.backlogSub} numberOfLines={1}>
                        {ev.note || 'NoteIn'}
                      </Text>
                      <Text style={styles.backlogDate}>{ev.date}</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        </View>

        {/* RIGHT PANEL: Full Monthly Calendar Board + Selected Date Bottom Panel */}
        <View style={[styles.rightPanel, isDark && styles.panelDark]}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Calendar Top Control Bar */}
            <View style={styles.calHeaderBar}>
              <Text style={[styles.calMonthTitle, isDark && styles.textDark]}>
                {format(currentMonth, isVi ? "'Tháng' MM, yyyy" : 'MMMM yyyy', {
                  locale,
                })}
              </Text>

              <View style={styles.calControlsRow}>
                {/* Filter Pills */}
                <View style={[styles.filterPillGroup, isDark && styles.segmentBarDark]}>
                  {(
                    [
                      { id: 'tasks', label: isVi ? 'Thường' : 'Normal' },
                      { id: 'deadlines', label: isVi ? 'Quan trọng' : 'Urgent' },
                      { id: 'all', label: isVi ? 'Tất cả' : 'All' },
                    ] as const
                  ).map((f) => (
                    <Pressable
                      key={f.id}
                      onPress={() => setCalendarFilter(f.id)}
                      style={[
                        styles.filterPill,
                        calendarFilter === f.id && styles.filterPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          calendarFilter === f.id && styles.filterPillTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Month Nav */}
                <View style={styles.monthNavGroup}>
                  <Pressable
                    onPress={() => setCurrentMonth((m) => subMonths(m, 1))}
                    style={[styles.navIconBtn, isDark && styles.backlogCardDark]}
                  >
                    <Text style={[styles.navIconText, isDark && styles.textDark]}>‹</Text>
                  </Pressable>
                  <View style={[styles.monthBadge, isDark && styles.backlogCardDark]}>
                    <Text style={[styles.monthBadgeText, isDark && styles.textDark]}>
                      {format(currentMonth, isVi ? "'Tháng' MM" : 'MMM', { locale })}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setCurrentMonth((m) => addMonths(m, 1))}
                    style={[styles.navIconBtn, isDark && styles.backlogCardDark]}
                  >
                    <Text style={[styles.navIconText, isDark && styles.textDark]}>›</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setCurrentMonth(startOfMonth(now));
                      setSelectedDate(todayStr);
                    }}
                    style={[styles.todayBtn, isDark && styles.backlogCardDark]}
                  >
                    <Text style={[styles.todayBtnText, isDark && styles.textDark]}>
                      {isVi ? 'Hôm nay' : 'Today'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Weekday Headers */}
            <View style={styles.weekdayRow}>
              {weekdays.map((wd) => (
                <View key={wd} style={styles.weekdayCell}>
                  <Text style={[styles.weekdayText, isDark && styles.subTextDark]}>
                    {wd}
                  </Text>
                </View>
              ))}
            </View>

            {/* 7-Column Calendar Grid */}
            <View style={styles.gridWrap}>
              {calendarDays.map((dayObj) => {
                const dateStr = format(dayObj, 'yyyy-MM-dd');
                const inMonth = isSameMonth(dayObj, currentMonth);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const { dayTasks, dayEvents } = getItemsForDate(dateStr);

                const allCount = dayTasks.length + dayEvents.length;
                const visibleTasks = dayTasks.slice(0, 3);
                const remainingSlots = Math.max(0, 3 - visibleTasks.length);
                const visibleEvents = dayEvents.slice(0, remainingSlots);
                const hiddenCount =
                  allCount - (visibleTasks.length + visibleEvents.length);

                return (
                  <Pressable
                    key={dateStr}
                    onPress={() => setSelectedDate(dateStr)}
                    style={[
                      styles.dayCell,
                      !inMonth && styles.dayCellOutside,
                      isDark && styles.dayCellDark,
                      isSelected && styles.dayCellSelected,
                    ]}
                  >
                    <View style={styles.dayCellTop}>
                      <View
                        style={[
                          styles.dayNumCircle,
                          isToday && styles.dayNumCircleToday,
                          isSelected && !isToday && styles.dayNumCircleSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumText,
                            !inMonth && styles.dayNumOutside,
                            isDark && styles.textDark,
                            (isToday || isSelected) && styles.dayNumTextToday,
                          ]}
                        >
                          {dayObj.getDate()}
                        </Text>
                      </View>

                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openAddModalForDate(dateStr);
                        }}
                        style={styles.cellQuickAddBtn}
                      >
                        <Text style={styles.cellQuickAddText}>+</Text>
                      </Pressable>
                    </View>

                    <View style={styles.dayPillsList}>
                      {visibleTasks.map((t) => renderCalendarPill(t))}
                      {visibleEvents.map((ev) => (
                        <View
                          key={ev.id}
                          style={[styles.pillBase, { backgroundColor: '#22c55e' }]}
                        >
                          <Text style={styles.pillText} numberOfLines={1}>
                            {ev.title}
                          </Text>
                        </View>
                      ))}
                      {hiddenCount > 0 && (
                        <Text style={styles.moreCountText}>
                          +{hiddenCount} {isVi ? 'mục khác' : 'more'}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* BOTTOM SELECTED DATE AGENDA SECTION (Sorted darkest color -> lightest color) */}
            <View style={[styles.bottomDateSection, isDark && styles.backlogCardDark]}>
              <View style={styles.bottomDateHeader}>
                <View>
                  <Text style={styles.bottomDateLabel}>
                    {isVi
                      ? 'CHI TIẾT NGÀY ĐANG CHỌN (SẮP XẾP TỪ MÀU ĐẬM → NHẠT)'
                      : 'SELECTED DATE TASKS (SORTED HIGHEST → LOWEST IMPORTANCE)'}
                  </Text>
                  <Text style={[styles.bottomDateTitle, isDark && styles.textDark]}>
                    {formattedSelectedDate}
                  </Text>
                </View>

                <Pressable
                  onPress={() => openAddModalForDate(selectedDate)}
                  style={[styles.addTopBtn, isDark && styles.addTopBtnDark]}
                >
                  <Text style={[styles.addTopBtnText, isDark && styles.addTopBtnTextDark]}>
                    + {isVi ? 'Thêm vào ngày này' : 'Add to this date'}
                  </Text>
                </Pressable>
              </View>

              {selectedDateItems.dayTasks.length === 0 &&
              selectedDateItems.dayEvents.length === 0 ? (
                <Text style={styles.emptyBottomText}>
                  {isVi
                    ? 'Ngày này chưa có công việc nào. Bấm "+ Thêm vào ngày này" để tạo mới.'
                    : 'No tasks for this date yet. Click "+ Add to this date" to create one.'}
                </Text>
              ) : (
                <View style={styles.bottomTaskList}>
                  {selectedDateItems.dayTasks.map((t) => {
                    const hex = getTaskColorHex(t.badgeColor);
                    const isDone = t.status === 'done';
                    return (
                      <View
                        key={t.id}
                        style={[styles.bottomTaskCard, isDark && styles.dayCellDark]}
                      >
                        {/* Left color bar + status toggle */}
                        <View
                          style={[styles.bottomTaskColorStrip, { backgroundColor: hex }]}
                        />

                        <Pressable
                          onPress={() => toggleTaskStatus(t.id)}
                          style={styles.bottomTaskMain}
                        >
                          <View
                            style={[
                              styles.importanceCircleIndicator,
                              { backgroundColor: hex },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.bottomTaskTitle,
                                isDark && styles.textDark,
                                isDone && styles.pillTextDone,
                              ]}
                            >
                              {t.title}
                            </Text>
                            <Text style={styles.bottomTaskSub}>{t.subtitle}</Text>
                          </View>
                        </Pressable>

                        {/* Quick 5 Color Dots Selector inline (No color names!) */}
                        <View style={styles.inlineDotsRow}>
                          {TASK_IMPORTANCE_COLORS.map((c) => {
                            const active = getTaskColorHex(t.badgeColor) === c.hex;
                            return (
                              <Pressable
                                key={c.id}
                                onPress={() =>
                                  updateTask(t.id, {
                                    badgeColor: c.id,
                                    isDeadline: c.weight >= 4,
                                  })
                                }
                                style={[
                                  styles.inlineDotTouch,
                                  active && styles.inlineDotTouchActive,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.inlineDotCircle,
                                    { backgroundColor: c.hex },
                                  ]}
                                />
                              </Pressable>
                            );
                          })}
                        </View>

                        <Pressable
                          onPress={() => deleteTask(t.id)}
                          style={styles.deleteMiniBtn}
                        >
                          <Text style={styles.deleteMiniText}>
                            {isVi ? 'Xóa' : 'Delete'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}

                  {selectedDateItems.dayEvents.map((ev) => (
                    <View
                      key={ev.id}
                      style={[styles.bottomTaskCard, isDark && styles.dayCellDark]}
                    >
                      <View
                        style={[
                          styles.bottomTaskColorStrip,
                          { backgroundColor: '#22c55e' },
                        ]}
                      />
                      <View style={styles.bottomTaskMain}>
                        <View
                          style={[
                            styles.importanceCircleIndicator,
                            { backgroundColor: '#22c55e' },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.bottomTaskTitle, isDark && styles.textDark]}>
                            {ev.title}
                          </Text>
                          {ev.note ? (
                            <Text style={styles.bottomTaskSub}>{ev.note}</Text>
                          ) : null}
                        </View>
                      </View>
                      <Pressable
                        onPress={async () => {
                          await deleteEvent(ev.id);
                          onDataChange();
                        }}
                        style={styles.deleteMiniBtn}
                      >
                        <Text style={styles.deleteMiniText}>
                          {isVi ? 'Xóa' : 'Delete'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Add Task Modal with pure circular color dots (NO color text labels) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.panelDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                {isVi ? `Thêm công việc · ${selectedDate}` : `Add Task · ${selectedDate}`}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeBtn, isDark && styles.textDark]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formSection}>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder={isVi ? 'Tên công việc...' : 'Task title...'}
                placeholderTextColor="#9ca3af"
                style={[styles.input, isDark && styles.inputDark]}
              />
              <TextInput
                value={newSubtitle}
                onChangeText={setNewSubtitle}
                placeholder={
                  isVi ? 'Dự án / Nhãn phụ (VD: UI/UX, Khách hàng)...' : 'Project / Subtitle...'
                }
                placeholderTextColor="#9ca3af"
                style={[styles.input, isDark && styles.inputDark]}
              />

              {/* 5 Circular Importance Color Dots ONLY (Green -> Yellow -> Orange -> Red -> Dark Burgundy) */}
              <View style={styles.colorDotsBar}>
                {TASK_IMPORTANCE_COLORS.map((c) => {
                  const selected = newColor === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setNewColor(c.id)}
                      style={[
                        styles.colorDotOuter,
                        selected && {
                          borderColor: c.hex,
                          transform: [{ scale: 1.15 }],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.colorDotInner,
                          { backgroundColor: c.hex },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={handleCreateTask} style={styles.saveModalBtn}>
                <Text style={styles.saveModalBtnText}>
                  + {isVi ? 'Lưu vào lịch' : 'Save to Calendar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 14,
  },
  topTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.6,
  },
  addTopBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
  },
  addTopBtnDark: {
    backgroundColor: '#f8fafc',
  },
  addTopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  addTopBtnTextDark: {
    color: '#0f172a',
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 18,
  },
  leftPanel: {
    width: 270,
    backgroundColor: '#f7f6f2',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e4de',
  },
  panelDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#ecebe6',
    borderRadius: 99,
    padding: 3,
    marginBottom: 14,
  },
  segmentBarDark: {
    backgroundColor: '#0f172a',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 99,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#18181b',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#52525b',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  leftScroll: {
    flex: 1,
  },
  leftScrollContent: {
    gap: 8,
    paddingBottom: 24,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  groupDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#18181b',
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  backlogCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ecebe6',
    gap: 3,
  },
  backlogCardDone: {
    opacity: 0.72,
    backgroundColor: '#f4f4f0',
  },
  backlogCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  backlogTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  importanceDotSmall: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  backlogTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#18181b',
  },
  backlogMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
  },
  backlogSub: {
    fontSize: 11,
    color: '#71717a',
  },
  backlogDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717a',
  },
  backlogDateOverdue: {
    color: '#e11d48',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#f7f6f2',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e4de',
  },
  calHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  calMonthTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#18181b',
    letterSpacing: -0.4,
  },
  calControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 99,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e5e4de',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  filterPillActive: {
    backgroundColor: '#18181b',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52525b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  monthNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e4de',
  },
  navIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#18181b',
  },
  monthBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e4de',
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#18181b',
  },
  todayBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e4de',
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#18181b',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#52525b',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    minHeight: 102,
    backgroundColor: '#fbfaf7',
    borderWidth: 0.5,
    borderColor: '#e5e4de',
    padding: 6,
    gap: 4,
  },
  dayCellOutside: {
    backgroundColor: '#f2f1ec',
    opacity: 0.7,
  },
  dayCellDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  dayCellSelected: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1.5,
  },
  dayCellTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayNumCircle: {
    minWidth: 22,
    height: 22,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dayNumCircleToday: {
    backgroundColor: '#18181b',
  },
  dayNumCircleSelected: {
    backgroundColor: '#f59e0b',
  },
  dayNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#18181b',
  },
  dayNumOutside: {
    color: '#9ca3af',
  },
  dayNumTextToday: {
    color: '#ffffff',
  },
  cellQuickAddBtn: {
    width: 18,
    height: 18,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cellQuickAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    lineHeight: 14,
  },
  dayPillsList: {
    gap: 3,
  },
  pillBase: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  pillTextDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  moreCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#52525b',
    paddingLeft: 4,
    marginTop: 1,
  },
  // Bottom Selected Date Section
  bottomDateSection: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e4de',
    gap: 14,
  },
  bottomDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  bottomDateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  bottomDateTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#18181b',
    textTransform: 'capitalize',
  },
  emptyBottomText: {
    fontSize: 13,
    color: '#71717a',
    paddingVertical: 8,
  },
  bottomTaskList: {
    gap: 8,
  },
  bottomTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbfaf7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ecebe6',
    overflow: 'hidden',
    paddingRight: 10,
    gap: 12,
  },
  bottomTaskColorStrip: {
    width: 6,
    alignSelf: 'stretch',
  },
  bottomTaskMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  importanceCircleIndicator: {
    width: 14,
    height: 14,
    borderRadius: 99,
  },
  bottomTaskTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#18181b',
  },
  bottomTaskSub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 1,
  },
  inlineDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inlineDotTouch: {
    width: 20,
    height: 20,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inlineDotTouchActive: {
    borderColor: '#18181b',
  },
  inlineDotCircle: {
    width: 12,
    height: 12,
    borderRadius: 99,
  },
  deleteMiniBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  deleteMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
  },
  formSection: {
    gap: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  colorDotsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  colorDotOuter: {
    width: 34,
    height: 34,
    borderRadius: 99,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotInner: {
    width: 24,
    height: 24,
    borderRadius: 99,
  },
  saveModalBtn: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  saveModalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
