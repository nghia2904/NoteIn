import { addDays, format, parseISO } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentState } from '../../engine/schedule';
import { useScheduleStore } from '../../store/scheduleStore';
import { useWebWorkspaceStore } from '../../store/webWorkspaceStore';
import type { TimelineItem } from '../../types/schedule';

export type WebTabId =
  | 'dashboard'
  | 'tasks'
  | 'reminder'
  | 'finance'
  | 'quicknote'
  | 'project'
  | 'settings';

interface WebDashboardTabProps {
  now: Date;
  timeline: TimelineItem[];
  onToggleDailyDone: (item: TimelineItem) => void;
  onNavigateTab: (tab: WebTabId, projectId?: string) => void;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatCurrency(val: number): string {
  return val.toLocaleString('vi-VN') + ' ₫';
}

export function WebDashboardTab({
  now,
  timeline,
  onToggleDailyDone,
  onNavigateTab,
}: WebDashboardTabProps) {
  const { language, theme, events } = useScheduleStore();
  const {
    tasks,
    transactions,
    projects,
    notes,
    toggleTaskStatus,
    updateTask,
  } = useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';
  const locale = isVi ? vi : enUS;
  const todayStr = format(now, 'yyyy-MM-dd');
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const dailyOnly = timeline.filter((i) => i.source === 'daily');
  const currentState = getCurrentState(dailyOnly, nowMin);

  // 1. Overdue tasks (dueDate < todayStr and status !== 'done')
  const overdueTasks = tasks
    .filter((t) => t.dueDate < todayStr && t.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // 2. Today's tasks & events
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const todayEvents = events
    .filter((e) => e.date === todayStr)
    .sort((a, b) => a.startMin - b.startMin);

  // 3. Upcoming 7 days (tomorrow .. +7 days)
  const next7Dates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(now, i + 1), 'yyyy-MM-dd'),
  );

  const upcomingByDay = next7Dates
    .map((dStr) => {
      const dayTasks = tasks.filter((t) => t.dueDate === dStr && t.status !== 'done');
      const dayEvents = events
        .filter((e) => e.date === dStr)
        .sort((a, b) => a.startMin - b.startMin);
      return {
        date: dStr,
        tasks: dayTasks,
        events: dayEvents,
        total: dayTasks.length + dayEvents.length,
      };
    })
    .filter((g) => g.total > 0);

  // Finance balance
  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((acc, tx) => acc + tx.amount, 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((acc, tx) => acc + tx.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const doneDailiesCount = dailyOnly.filter((d) => d.done).length;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Greeting Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.dateChip, isDark && styles.subTextDark]}>
            {format(now, isVi ? "EEEE, dd 'Tháng' MM, yyyy" : 'EEEE, MMMM dd, yyyy', {
              locale,
            }).toUpperCase()}
          </Text>
          <Text style={[styles.pageTitle, isDark && styles.textDark]}>
            {isVi ? 'Tổng quan hôm nay' : "Today's Workspace"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => onNavigateTab('tasks')}
            style={[styles.primaryActionBtn, isDark && styles.primaryActionBtnDark]}
          >
            <Text style={[styles.primaryActionText, isDark && styles.primaryActionTextDark]}>
              {isVi ? '+ Thêm công việc mới' : '+ New Task'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 4 KPI Summary Cards */}
      <View style={styles.kpiRow}>
        <Pressable
          onPress={() => onNavigateTab('tasks')}
          style={[styles.kpiCard, isDark && styles.cardDark]}
        >
          <Text style={[styles.kpiLabel, isDark && styles.subTextDark]}>
            {isVi ? 'VIỆC CẦN LÀM HÔM NAY' : 'DUE TODAY'}
          </Text>
          <Text style={[styles.kpiValue, isDark && styles.textDark]}>
            {todayTasks.filter((t) => t.status !== 'done').length + todayEvents.length}
          </Text>
          <Text style={styles.kpiSub}>
            {isVi
              ? `${doneDailiesCount}/${dailyOnly.length} khung giờ Reminder đã xong`
              : `${doneDailiesCount}/${dailyOnly.length} daily slots done`}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onNavigateTab('tasks')}
          style={[
            styles.kpiCard,
            overdueTasks.length > 0 && styles.kpiCardAlert,
            isDark && styles.cardDark,
          ]}
        >
          <Text style={[styles.kpiLabel, overdueTasks.length > 0 && styles.kpiLabelAlert]}>
            {isVi ? 'VIỆC QUÁ HẠN' : 'OVERDUE TASKS'}
          </Text>
          <Text
            style={[
              styles.kpiValue,
              overdueTasks.length > 0 ? styles.kpiValueAlert : isDark && styles.textDark,
            ]}
          >
            {overdueTasks.length}
          </Text>
          <Text style={[styles.kpiSub, overdueTasks.length > 0 && styles.kpiLabelAlert]}>
            {overdueTasks.length > 0
              ? isVi
                ? 'Cần xử lý hoặc dời lịch ngay'
                : 'Needs immediate attention'
              : isVi
                ? 'Tuyệt vời! Không có việc trễ hạn'
                : 'All caught up!'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onNavigateTab('tasks')}
          style={[styles.kpiCard, isDark && styles.cardDark]}
        >
          <Text style={[styles.kpiLabel, isDark && styles.subTextDark]}>
            {isVi ? 'LỊCH 7 NGÀY TỚI' : 'NEXT 7 DAYS'}
          </Text>
          <Text style={[styles.kpiValue, isDark && styles.textDark]}>
            {upcomingByDay.reduce((sum, g) => sum + g.total, 0)}
          </Text>
          <Text style={styles.kpiSub}>
            {isVi
              ? `Trên ${upcomingByDay.length} ngày có lịch sắp tới`
              : `Across ${upcomingByDay.length} upcoming days`}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onNavigateTab('finance')}
          style={[styles.kpiCard, isDark && styles.cardDark]}
        >
          <Text style={[styles.kpiLabel, isDark && styles.subTextDark]}>
            {isVi ? 'SỐ DƯ TÀI CHÍNH' : 'NET BALANCE'}
          </Text>
          <Text
            style={[
              styles.kpiValue,
              { color: netBalance >= 0 ? '#16a34a' : '#ef4444' },
            ]}
          >
            {netBalance > 0 ? '+' : ''}
            {formatCurrency(netBalance)}
          </Text>
          <Text style={styles.kpiSub}>
            {isVi
              ? `Chi hôm nay: ${formatCurrency(
                  transactions
                    .filter((t) => t.type === 'expense' && t.date === todayStr)
                    .reduce((s, t) => s + t.amount, 0),
                )}`
              : 'Tap to open MoneyNote Finance'}
          </Text>
        </Pressable>
      </View>

      {/* Main 3-Column Notion / Google Calendar Workspace Grid */}
      <View style={styles.columnsRow}>
        {/* COLUMN 1: HÔM NAY CẦN LÀM GÌ */}
        <View style={[styles.columnCard, isDark && styles.cardDark]}>
          <View style={styles.colHeader}>
            <View style={styles.colTitleRow}>
              <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.colTitle, isDark && styles.textDark]}>
                {isVi ? 'Hôm nay cần làm gì' : "Today's Tasks & Schedule"}
              </Text>
            </View>
            <Pressable onPress={() => onNavigateTab('reminder')}>
              <Text style={styles.colLink}>{isVi ? 'Mở Reminder →' : 'Reminders →'}</Text>
            </Pressable>
          </View>

          {/* Active Daily Slot Banner */}
          {currentState.kind === 'current' && (
            <View style={[styles.activeSlotBox, isDark && styles.activeSlotBoxDark]}>
              <View style={styles.activeSlotTop}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>
                    ⚡ {isVi ? 'KHUNG GIỜ HIỆN TẠI' : 'ACTIVE NOW'}
                  </Text>
                </View>
                <Text style={styles.activeSlotTime}>
                  {formatTime(currentState.item.startMin)} – {formatTime(currentState.item.endMin)}
                </Text>
              </View>
              <Text style={[styles.activeSlotTitle, isDark && styles.textDark]}>
                {currentState.item.title}
              </Text>
              {currentState.item.note ? (
                <Text style={[styles.activeSlotNote, isDark && styles.subTextDark]}>
                  {currentState.item.note}
                </Text>
              ) : null}
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${currentState.progressPct}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressPctText}>{currentState.progressPct}%</Text>
              </View>
            </View>
          )}

          {/* Today's Tasks */}
          <Text style={[styles.subSectionLabel, isDark && styles.subTextDark]}>
            {isVi ? 'CÔNG VIỆC & SỰ KIỆN HÔM NAY' : 'TASKS & EVENTS TODAY'}
          </Text>

          {todayTasks.length === 0 && todayEvents.length === 0 ? (
            <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
              {isVi
                ? 'Chưa có công việc riêng cho hôm nay.'
                : 'No specific tasks scheduled for today.'}
            </Text>
          ) : (
            <View style={styles.itemList}>
              {todayTasks.map((task) => {
                const isDone = task.status === 'done';
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => toggleTaskStatus(task.id)}
                    style={[styles.taskRow, isDark && styles.rowDark]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isDone && styles.checkboxDone,
                        task.status === 'in_progress' && styles.checkboxProgress,
                      ]}
                    >
                      {isDone && <Text style={styles.checkIcon}>✓</Text>}
                    </View>
                    <View style={styles.taskRowBody}>
                      <Text
                        style={[
                          styles.taskRowTitle,
                          isDark && styles.textDark,
                          isDone && styles.strikeText,
                        ]}
                      >
                        {task.title}
                      </Text>
                      <Text style={[styles.taskRowSub, isDark && styles.subTextDark]}>
                        {task.subtitle}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        task.status === 'done'
                          ? styles.statusDone
                          : task.status === 'in_progress'
                            ? styles.statusInProgress
                            : styles.statusPending,
                      ]}
                    >
                      <Text style={styles.statusPillText}>
                        {task.status === 'done'
                          ? isVi
                            ? 'Xong'
                            : 'Done'
                          : task.status === 'in_progress'
                            ? isVi
                              ? 'Đang làm'
                              : 'Doing'
                            : isVi
                              ? 'Chờ'
                              : 'Todo'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {todayEvents.map((ev) => (
                <View key={ev.id} style={[styles.taskRow, isDark && styles.rowDark]}>
                  <View style={styles.timeBadgeEmerald}>
                    <Text style={styles.timeBadgeEmeraldText}>
                      {formatTime(ev.startMin)}
                    </Text>
                  </View>
                  <View style={styles.taskRowBody}>
                    <Text style={[styles.taskRowTitle, isDark && styles.textDark]}>
                      {ev.title}
                    </Text>
                    {ev.note ? (
                      <Text style={[styles.taskRowSub, isDark && styles.subTextDark]}>
                        {ev.note}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Daily Routine Slots Quick Checklist */}
          <Text style={[styles.subSectionLabel, { marginTop: 16 }, isDark && styles.subTextDark]}>
            {isVi ? 'LỊCH TRÌNH HẰNG NGÀY (REMINDER)' : 'DAILY ROUTINE SLOTS'}
          </Text>
          <View style={styles.itemList}>
            {dailyOnly.slice(0, 5).map((slot) => (
              <Pressable
                key={slot.key}
                onPress={() => onToggleDailyDone(slot)}
                style={[styles.slotCompactRow, isDark && styles.rowDark]}
              >
                <Text style={styles.slotTimeText}>
                  {formatTime(slot.startMin)}–{formatTime(slot.endMin)}
                </Text>
                <Text
                  style={[
                    styles.slotTitleText,
                    isDark && styles.textDark,
                    slot.done && styles.strikeText,
                  ]}
                  numberOfLines={1}
                >
                  {slot.title}
                </Text>
                <View style={[styles.checkboxSmall, slot.done && styles.checkboxDone]}>
                  {slot.done && <Text style={styles.checkIconSmall}>✓</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* COLUMN 2: VIỆC QUÁ HẠN (OVERDUE) */}
        <View style={[styles.columnCard, isDark && styles.cardDark]}>
          <View style={styles.colHeader}>
            <View style={styles.colTitleRow}>
              <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.colTitle, isDark && styles.textDark]}>
                {isVi ? 'Việc quá hạn cần xử lý' : 'Overdue Tasks'}
              </Text>
            </View>
            <View style={styles.overdueCountBadge}>
              <Text style={styles.overdueCountText}>{overdueTasks.length}</Text>
            </View>
          </View>

          {overdueTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxEmoji}>🎉</Text>
              <Text style={[styles.emptyBoxTitle, isDark && styles.textDark]}>
                {isVi ? 'Không có công việc quá hạn!' : 'Zero overdue tasks!'}
              </Text>
              <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                {isVi
                  ? 'Mọi deadline của bạn đều đang trong tầm kiểm soát.'
                  : 'All your deadlines are on track.'}
              </Text>
            </View>
          ) : (
            <View style={styles.itemList}>
              {overdueTasks.map((task) => (
                <View key={task.id} style={[styles.overdueCard, isDark && styles.overdueCardDark]}>
                  <View style={styles.overdueTopRow}>
                    <Text style={styles.overdueBadge}>
                      ! {isVi ? 'Quá hạn' : 'Overdue'} · {format(parseISO(task.dueDate), 'dd/MM')}
                    </Text>
                    <Text style={[styles.overdueSub, isDark && styles.subTextDark]}>
                      {task.subtitle}
                    </Text>
                  </View>
                  <Text style={[styles.overdueTitle, isDark && styles.textDark]}>
                    {task.title}
                  </Text>
                  <View style={styles.overdueActions}>
                    <Pressable
                      onPress={() => updateTask(task.id, { status: 'done' })}
                      style={styles.overdueDoneBtn}
                    >
                      <Text style={styles.overdueDoneBtnText}>
                        ✓ {isVi ? 'Hoàn thành' : 'Mark Done'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateTask(task.id, { dueDate: todayStr })}
                      style={[styles.overdueMoveBtn, isDark && styles.rowDark]}
                    >
                      <Text style={[styles.overdueMoveBtnText, isDark && styles.textDark]}>
                        ↪ {isVi ? 'Dời sang hôm nay' : 'Move to Today'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Quick Notes Recent Preview inside Column 2 bottom */}
          <View style={styles.divider} />
          <View style={styles.colHeader}>
            <Text style={[styles.subSectionLabel, { marginBottom: 0 }, isDark && styles.subTextDark]}>
              {isVi ? 'GHI CHÚ NHANH ĐÃ GHIM' : 'PINNED QUICK NOTES'}
            </Text>
            <Pressable onPress={() => onNavigateTab('quicknote')}>
              <Text style={styles.colLink}>{isVi ? 'Mở Quick Note →' : 'All Notes →'}</Text>
            </Pressable>
          </View>

          <View style={styles.itemList}>
            {notes.slice(0, 2).map((n) => (
              <Pressable
                key={n.id}
                onPress={() => onNavigateTab('quicknote')}
                style={[styles.noteMiniCard, isDark && styles.rowDark]}
              >
                <Text style={[styles.noteMiniTitle, isDark && styles.textDark]} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={[styles.noteMiniBody, isDark && styles.subTextDark]} numberOfLines={2}>
                  {n.content}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* COLUMN 3: LỊCH VÀI NGÀY TỚI (UPCOMING 7 DAYS) & PROJECTS */}
        <View style={[styles.columnCard, isDark && styles.cardDark]}>
          <View style={styles.colHeader}>
            <View style={styles.colTitleRow}>
              <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
              <Text style={[styles.colTitle, isDark && styles.textDark]}>
                {isVi ? 'Lịch vài ngày tới' : 'Upcoming Next 7 Days'}
              </Text>
            </View>
            <Pressable onPress={() => onNavigateTab('tasks')}>
              <Text style={styles.colLink}>{isVi ? 'Lịch tháng →' : 'Calendar →'}</Text>
            </Pressable>
          </View>

          {upcomingByDay.length === 0 ? (
            <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
              {isVi ? '7 ngày tới chưa có lịch hẹn mới.' : 'No items scheduled for the next 7 days.'}
            </Text>
          ) : (
            <View style={styles.itemList}>
              {upcomingByDay.map((group) => (
                <View key={group.date} style={[styles.upcomingDayGroup, isDark && styles.rowDark]}>
                  <Text style={styles.upcomingDateHeader}>
                    {format(parseISO(group.date), isVi ? 'EEEE, dd/MM' : 'EEEE, MMM dd', {
                      locale,
                    })}
                  </Text>
                  {group.tasks.map((t) => (
                    <View key={t.id} style={styles.upcomingItemRow}>
                      <View
                        style={[
                          styles.upcomingBullet,
                          {
                            backgroundColor:
                              t.badgeColor === 'deadline'
                                ? '#e11d48'
                                : t.badgeColor === 'burgundy'
                                  ? '#881337'
                                  : '#2563eb',
                          },
                        ]}
                      />
                      <Text
                        style={[styles.upcomingItemTitle, isDark && styles.textDark]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      <Text style={[styles.upcomingItemSub, isDark && styles.subTextDark]}>
                        {t.subtitle}
                      </Text>
                    </View>
                  ))}
                  {group.events.map((e) => (
                    <View key={e.id} style={styles.upcomingItemRow}>
                      <View style={[styles.upcomingBullet, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.upcomingEventTime}>{formatTime(e.startMin)}</Text>
                      <Text
                        style={[styles.upcomingItemTitle, isDark && styles.textDark]}
                        numberOfLines={1}
                      >
                        {e.title}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Active Projects Orbit Quick Access */}
          <View style={styles.divider} />
          <View style={styles.colHeader}>
            <Text style={[styles.subSectionLabel, { marginBottom: 0 }, isDark && styles.subTextDark]}>
              {isVi ? 'PROJECT & MINDMAP' : 'PROJECTS & MINDMAPS'}
            </Text>
            <Pressable onPress={() => onNavigateTab('project')}>
              <Text style={styles.colLink}>{isVi ? 'Mở Quỹ đạo →' : 'Orbit View →'}</Text>
            </Pressable>
          </View>
          <View style={styles.itemList}>
            {projects.slice(0, 3).map((proj) => (
              <Pressable
                key={proj.id}
                onPress={() => onNavigateTab('project', proj.id)}
                style={[styles.projectMiniRow, isDark && styles.rowDark]}
              >
                <View style={styles.projectMiniIcon}>
                  <Text style={{ fontSize: 13 }}>🧩</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskRowTitle, isDark && styles.textDark]} numberOfLines={1}>
                    {proj.title}
                  </Text>
                  <Text style={[styles.taskRowSub, isDark && styles.subTextDark]}>
                    {proj.nodes.length - 1} {isVi ? 'nhánh trong Mindmap' : 'mindmap branches'}
                  </Text>
                </View>
                <Text style={styles.colLink}>Mindmap →</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 28,
    paddingBottom: 48,
    gap: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateChip: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#6b7280',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryActionBtnDark: {
    backgroundColor: '#f3f4f6',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  primaryActionTextDark: {
    color: '#111827',
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kpiCardAlert: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#6b7280',
  },
  kpiLabelAlert: {
    color: '#be123c',
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 6,
  },
  kpiValueAlert: {
    color: '#e11d48',
  },
  kpiValueEmerald: {
    color: '#059669',
  },
  kpiSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  columnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'flex-start',
  },
  columnCard: {
    flex: 1,
    minWidth: 310,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  colHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  colTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  colLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  activeSlotBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  activeSlotBoxDark: {
    backgroundColor: '#27272a',
    borderColor: '#f59e0b',
  },
  activeSlotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  activeSlotTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  activeSlotTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  activeSlotNote: {
    fontSize: 12,
    color: '#4b5563',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#fde68a',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 99,
  },
  progressPctText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
  },
  subSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  itemList: {
    gap: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  rowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxProgress: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  taskRowBody: {
    flex: 1,
  },
  taskRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  taskRowSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  strikeText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusPending: {
    backgroundColor: '#e5e7eb',
  },
  statusInProgress: {
    backgroundColor: '#fef3c7',
  },
  statusDone: {
    backgroundColor: '#d1fae5',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1f2937',
  },
  timeBadgeEmerald: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeEmeraldText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  slotCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
  },
  slotTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
    width: 78,
  },
  slotTitleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  checkboxSmall: {
    width: 17,
    height: 17,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconSmall: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  overdueCountBadge: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 99,
  },
  overdueCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e11d48',
  },
  overdueCard: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    gap: 6,
  },
  overdueCardDark: {
    backgroundColor: '#3f1d28',
    borderColor: '#881337',
  },
  overdueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overdueBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e11d48',
  },
  overdueSub: {
    fontSize: 11,
    color: '#6b7280',
  },
  overdueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  overdueActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  overdueDoneBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overdueDoneBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  overdueMoveBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  overdueMoveBtnText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 4,
  },
  emptyBoxEmoji: {
    fontSize: 24,
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  emptyHint: {
    fontSize: 12,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  noteMiniCard: {
    padding: 11,
    borderRadius: 11,
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    gap: 3,
  },
  noteMiniTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  noteMiniBody: {
    fontSize: 11,
    color: '#4b5563',
    lineHeight: 16,
  },
  upcomingDayGroup: {
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 6,
  },
  upcomingDateHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'capitalize',
  },
  upcomingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  upcomingBullet: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  upcomingEventTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  upcomingItemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  upcomingItemSub: {
    fontSize: 10,
    color: '#6b7280',
  },
  projectMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 11,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  projectMiniIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
