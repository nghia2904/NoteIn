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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useScheduleStore } from '../../store/scheduleStore';
import {
  FINANCE_CATEGORIES,
  type TransactionType,
  useWebWorkspaceStore,
} from '../../store/webWorkspaceStore';

function formatVnd(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫';
}

function formatCompactVnd(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}tr`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}k`;
  }
  return String(amount);
}

export function WebFinanceTab({ now }: { now: Date }) {
  const { language, theme } = useScheduleStore();
  const { transactions, addTransaction, deleteTransaction } = useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';
  const locale = isVi ? vi : enUS;
  const todayStr = format(now, 'yyyy-MM-dd');

  // MoneyNote sub-views: 'overview' (Input + Calendar + Report) or filter by month
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(now));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [rightSubTab, setRightSubTab] = useState<'calendar' | 'report'>('calendar');

  // Input form state
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [selectedCatId, setSelectedCatId] = useState<string>('food');
  const [amountInput, setAmountInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');

  const visibleCategories = useMemo(
    () => FINANCE_CATEGORIES.filter((c) => c.type === txType),
    [txType],
  );

  const handleSwitchType = (nextType: TransactionType) => {
    setTxType(nextType);
    const firstCat = FINANCE_CATEGORIES.find((c) => c.type === nextType);
    if (firstCat) setSelectedCatId(firstCat.id);
  };

  const handleAddTx = () => {
    const cleanNum = Number(amountInput.replace(/[^0-9]/g, ''));
    if (!cleanNum || cleanNum <= 0) return;
    addTransaction({
      type: txType,
      amount: cleanNum,
      categoryId: selectedCatId,
      date: selectedDate || todayStr,
      note: noteInput.trim(),
    });
    setAmountInput('');
    setNoteInput('');
  };

  // Monthly & daily aggregations
  const monthKeyPrefix = format(currentMonth, 'yyyy-MM');

  const {
    monthIncome,
    monthExpense,
    monthBalance,
    dailyTotalsMap,
    expenseByCategory,
    incomeByCategory,
    selectedDateTxs,
    monthTxs,
  } = useMemo(() => {
    let mInc = 0;
    let mExp = 0;
    const dMap: Record<string, { income: number; expense: number }> = {};
    const expCatTotals: Record<string, number> = {};
    const incCatTotals: Record<string, number> = {};

    for (const tx of transactions) {
      if (!dMap[tx.date]) {
        dMap[tx.date] = { income: 0, expense: 0 };
      }
      if (tx.type === 'income') {
        dMap[tx.date].income += tx.amount;
      } else {
        dMap[tx.date].expense += tx.amount;
      }

      if (tx.date.startsWith(monthKeyPrefix)) {
        if (tx.type === 'income') {
          mInc += tx.amount;
          incCatTotals[tx.categoryId] = (incCatTotals[tx.categoryId] ?? 0) + tx.amount;
        } else {
          mExp += tx.amount;
          expCatTotals[tx.categoryId] = (expCatTotals[tx.categoryId] ?? 0) + tx.amount;
        }
      }
    }

    const expBreakdown = FINANCE_CATEGORIES.filter((c) => c.type === 'expense')
      .map((cat) => {
        const val = expCatTotals[cat.id] ?? 0;
        const pct = mExp > 0 ? Math.round((val / mExp) * 100) : 0;
        return { cat, val, pct };
      })
      .filter((item) => item.val > 0)
      .sort((a, b) => b.val - a.val);

    const incBreakdown = FINANCE_CATEGORIES.filter((c) => c.type === 'income')
      .map((cat) => {
        const val = incCatTotals[cat.id] ?? 0;
        const pct = mInc > 0 ? Math.round((val / mInc) * 100) : 0;
        return { cat, val, pct };
      })
      .filter((item) => item.val > 0)
      .sort((a, b) => b.val - a.val);

    const dayList = transactions.filter((tx) => tx.date === selectedDate);
    const mList = transactions
      .filter((tx) => tx.date.startsWith(monthKeyPrefix))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      monthIncome: mInc,
      monthExpense: mExp,
      monthBalance: mInc - mExp,
      dailyTotalsMap: dMap,
      expenseByCategory: expBreakdown,
      incomeByCategory: incBreakdown,
      selectedDateTxs: dayList,
      monthTxs: mList,
    };
  }, [transactions, monthKeyPrefix, selectedDate]);

  // Build calendar grid for currentMonth
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
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header with Month Selector & MoneyNote View Toggle */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.subtitleChip}>MONEYNOTE · PERSONAL FINANCE</Text>
          <Text style={[styles.pageTitle, isDark && styles.textDark]}>
            {isVi ? 'Sổ Thu Chi (MoneyNote)' : 'MoneyNote Finance'}
          </Text>
        </View>

        <View style={styles.headerControls}>
          {/* Month Switcher */}
          <View style={styles.monthNavGroup}>
            <Pressable
              onPress={() => setCurrentMonth((m) => subMonths(m, 1))}
              style={[styles.navIconBtn, isDark && styles.cardDark]}
            >
              <Text style={[styles.navIconText, isDark && styles.textDark]}>‹</Text>
            </Pressable>
            <View style={[styles.monthBadge, isDark && styles.cardDark]}>
              <Text style={[styles.monthBadgeText, isDark && styles.textDark]}>
                {format(currentMonth, isVi ? "'Tháng' MM, yyyy" : 'MMMM yyyy', {
                  locale,
                })}
              </Text>
            </View>
            <Pressable
              onPress={() => setCurrentMonth((m) => addMonths(m, 1))}
              style={[styles.navIconBtn, isDark && styles.cardDark]}
            >
              <Text style={[styles.navIconText, isDark && styles.textDark]}>›</Text>
            </Pressable>
          </View>

          {/* Sub-view Toggle: Lịch thu chi (Calendar) | Báo cáo (Report) */}
          <View style={[styles.subTabGroup, isDark && styles.cardDark]}>
            <Pressable
              onPress={() => setRightSubTab('calendar')}
              style={[
                styles.subTabBtn,
                rightSubTab === 'calendar' && styles.subTabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.subTabText,
                  rightSubTab === 'calendar' && styles.subTabTextActive,
                ]}
              >
                📅 {isVi ? 'Lịch thu chi' : 'Calendar'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRightSubTab('report')}
              style={[
                styles.subTabBtn,
                rightSubTab === 'report' && styles.subTabBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.subTabText,
                  rightSubTab === 'report' && styles.subTabTextActive,
                ]}
              >
                📊 {isVi ? 'Báo cáo danh mục' : 'Report'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 3 Monthly Summary Cards (Thu nhập | Chi tiêu | Tổng cộng) */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {isVi ? 'THU NHẬP TRONG THÁNG' : 'MONTHLY INCOME'}
          </Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>
            +{formatVnd(monthIncome)}
          </Text>
        </View>

        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {isVi ? 'CHI TIÊU TRONG THÁNG' : 'MONTHLY EXPENSE'}
          </Text>
          <Text style={[styles.summaryValue, { color: '#f97316' }]}>
            -{formatVnd(monthExpense)}
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            styles.summaryCardBalance,
            isDark && styles.cardDark,
          ]}
        >
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {isVi ? 'CÂN ĐỐI THÁNG (THU - CHI)' : 'MONTHLY NET TOTAL'}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: monthBalance >= 0 ? '#059669' : '#e11d48' },
            ]}
          >
            {monthBalance >= 0 ? '+' : ''}
            {formatVnd(monthBalance)}
          </Text>
        </View>
      </View>

      {/* Main Split: Left MoneyNote Input Form + Right Calendar / Report & Ledger */}
      <View style={styles.mainRow}>
        {/* LEFT: MoneyNote Input Panel */}
        <View style={[styles.inputPanel, isDark && styles.cardDark]}>
          <View style={[styles.typeSwitchBar, isDark && styles.typeSwitchBarDark]}>
            <Pressable
              onPress={() => handleSwitchType('expense')}
              style={[
                styles.typeSwitchBtn,
                txType === 'expense' && styles.typeSwitchExpenseActive,
              ]}
            >
              <Text
                style={[
                  styles.typeSwitchText,
                  txType === 'expense' && styles.typeSwitchTextActive,
                ]}
              >
                {isVi ? '💸 Tiền chi' : '💸 Expense'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleSwitchType('income')}
              style={[
                styles.typeSwitchBtn,
                txType === 'income' && styles.typeSwitchIncomeActive,
              ]}
            >
              <Text
                style={[
                  styles.typeSwitchText,
                  txType === 'income' && styles.typeSwitchTextActive,
                ]}
              >
                {isVi ? '💰 Tiền thu' : '💰 Income'}
              </Text>
            </Pressable>
          </View>

          {/* Date Selector Row (< yyyy-MM-dd >) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
              {isVi ? 'NGÀY GHI SỔ' : 'DATE'}
            </Text>
            <View style={styles.dateStepperRow}>
              <Pressable
                onPress={() => {
                  try {
                    const prev = addDays(parseISO(selectedDate), -1);
                    setSelectedDate(format(prev, 'yyyy-MM-dd'));
                  } catch {
                    setSelectedDate(todayStr);
                  }
                }}
                style={[styles.dateStepBtn, isDark && styles.rowDark]}
              >
                <Text style={[styles.dateStepText, isDark && styles.textDark]}>‹</Text>
              </Pressable>
              <TextInput
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                style={[styles.input, styles.dateInputCenter, isDark && styles.inputDark]}
              />
              <Pressable
                onPress={() => {
                  try {
                    const next = addDays(parseISO(selectedDate), 1);
                    setSelectedDate(format(next, 'yyyy-MM-dd'));
                  } catch {
                    setSelectedDate(todayStr);
                  }
                }}
                style={[styles.dateStepBtn, isDark && styles.rowDark]}
              >
                <Text style={[styles.dateStepText, isDark && styles.textDark]}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
              {isVi ? 'SỐ TIỀN (VNĐ)' : 'AMOUNT (VND)'}
            </Text>
            <TextInput
              value={amountInput}
              onChangeText={setAmountInput}
              placeholder={isVi ? 'VD: 85000' : 'e.g. 85000'}
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              style={[styles.input, styles.amountInput, isDark && styles.inputDark]}
            />
            {/* Quick Amount Chips */}
            <View style={styles.quickAmountRow}>
              {[35000, 50000, 100000, 200000, 500000].map((amt) => (
                <Pressable
                  key={amt}
                  onPress={() => setAmountInput(String(amt))}
                  style={[styles.quickAmtChip, isDark && styles.rowDark]}
                >
                  <Text style={[styles.quickAmtText, isDark && styles.textDark]}>
                    {formatCompactVnd(amt)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
              {isVi ? 'GHI CHÚ' : 'NOTE'}
            </Text>
            <TextInput
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder={
                isVi ? 'VD: Cà phê sáng, Tiền ăn trưa...' : 'e.g. Morning coffee...'
              }
              placeholderTextColor="#9ca3af"
              style={[styles.input, isDark && styles.inputDark]}
            />
          </View>

          <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
            {isVi ? 'DANH MỤC (CATEGORY)' : 'CATEGORY'}
          </Text>
          <View style={styles.catGrid}>
            {visibleCategories.map((cat) => {
              const active = cat.id === selectedCatId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCatId(cat.id)}
                  style={[
                    styles.catTile,
                    isDark && styles.rowDark,
                    active && {
                      borderColor: cat.color,
                      backgroundColor: isDark ? '#1e293b' : '#fff7ed',
                    },
                  ]}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.catName,
                      isDark && styles.textDark,
                      active && { color: cat.color, fontWeight: '800' },
                    ]}
                    numberOfLines={1}
                  >
                    {isVi ? cat.nameVi : cat.nameEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleAddTx}
            style={[
              styles.submitBtn,
              { backgroundColor: txType === 'expense' ? '#f97316' : '#10b981' },
            ]}
          >
            <Text style={styles.submitBtnText}>
              +{' '}
              {txType === 'expense'
                ? isVi
                  ? 'Nhập khoản Tiền chi'
                  : 'Save Expense'
                : isVi
                  ? 'Nhập khoản Tiền thu'
                  : 'Save Income'}
            </Text>
          </Pressable>
        </View>

        {/* RIGHT: MoneyNote Monthly Calendar OR Category Report + Ledger */}
        <View style={styles.rightCol}>
          {rightSubTab === 'calendar' ? (
            <View style={[styles.reportCard, isDark && styles.cardDark]}>
              <View style={styles.calTopRow}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                  {isVi
                    ? `Lịch Thu Chi · ${format(currentMonth, "'Tháng' MM/yyyy", { locale })}`
                    : `Finance Calendar · ${format(currentMonth, 'MMM yyyy', { locale })}`}
                </Text>
                <Text style={styles.calHint}>
                  {isVi
                    ? 'Bấm vào ngày bất kỳ để xem hoặc ghi thu chi ngày đó'
                    : 'Click any date to view or add transactions'}
                </Text>
              </View>

              {/* Weekday header */}
              <View style={styles.weekdayRow}>
                {weekdays.map((wd, idx) => (
                  <View key={wd} style={styles.weekdayCell}>
                    <Text
                      style={[
                        styles.weekdayText,
                        idx === 6 && { color: '#ef4444' },
                        isDark && idx !== 6 && styles.subTextDark,
                      ]}
                    >
                      {wd}
                    </Text>
                  </View>
                ))}
              </View>

              {/* 7-column MoneyNote Calendar Grid */}
              <View style={styles.calGrid}>
                {calendarDays.map((dayObj) => {
                  const dStr = format(dayObj, 'yyyy-MM-dd');
                  const inMonth = isSameMonth(dayObj, currentMonth);
                  const isSelected = dStr === selectedDate;
                  const isToday = dStr === todayStr;
                  const dayStat = dailyTotalsMap[dStr];

                  return (
                    <Pressable
                      key={dStr}
                      onPress={() => setSelectedDate(dStr)}
                      style={[
                        styles.calCell,
                        !inMonth && styles.calCellOutside,
                        isDark && styles.rowDark,
                        isSelected && styles.calCellSelected,
                      ]}
                    >
                      <View style={styles.calCellHeader}>
                        <View
                          style={[
                            styles.calDayBadge,
                            isToday && styles.calDayBadgeToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calDayNum,
                              !inMonth && { color: '#9ca3af' },
                              isDark && inMonth && styles.textDark,
                              isToday && { color: '#ffffff' },
                            ]}
                          >
                            {dayObj.getDate()}
                          </Text>
                        </View>
                      </View>

                      {dayStat?.income ? (
                        <Text style={styles.calIncText} numberOfLines={1}>
                          +{formatCompactVnd(dayStat.income)}
                        </Text>
                      ) : null}
                      {dayStat?.expense ? (
                        <Text style={styles.calExpText} numberOfLines={1}>
                          -{formatCompactVnd(dayStat.expense)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Selected Date Transactions right below Calendar */}
              <View style={styles.selectedDaySection}>
                <Text style={[styles.selectedDayHeader, isDark && styles.textDark]}>
                  {isVi
                    ? `Chi tiết thu chi ngày ${selectedDate} (${selectedDateTxs.length} giao dịch)`
                    : `Transactions on ${selectedDate} (${selectedDateTxs.length})`}
                </Text>
                {selectedDateTxs.length === 0 ? (
                  <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                    {isVi
                      ? 'Ngày này chưa có khoản thu/chi nào.'
                      : 'No transactions on this date.'}
                  </Text>
                ) : (
                  <View style={styles.txList}>
                    {selectedDateTxs.map((tx) => {
                      const cat =
                        FINANCE_CATEGORIES.find((c) => c.id === tx.categoryId) ??
                        FINANCE_CATEGORIES[0];
                      const isExp = tx.type === 'expense';
                      return (
                        <View
                          key={tx.id}
                          style={[styles.txRow, isDark && styles.rowDark]}
                        >
                          <View style={styles.txIconBox}>
                            <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.txTitle, isDark && styles.textDark]}>
                              {tx.note || (isVi ? cat.nameVi : cat.nameEn)}
                            </Text>
                            <Text style={styles.txSub}>
                              {isVi ? cat.nameVi : cat.nameEn}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.txAmount,
                              { color: isExp ? '#f97316' : '#10b981' },
                            ]}
                          >
                            {isExp ? '-' : '+'}
                            {formatVnd(tx.amount)}
                          </Text>
                          <Pressable
                            onPress={() => deleteTransaction(tx.id)}
                            style={styles.txDeleteBtn}
                          >
                            <Text style={styles.txDeleteText}>✕</Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* REPORT TAB: Category Breakdown for Expense & Income */
            <View style={[styles.reportCard, isDark && styles.cardDark]}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                {isVi
                  ? 'Báo cáo Chi tiêu theo danh mục'
                  : 'Expense Breakdown by Category'}
              </Text>

              {expenseByCategory.length === 0 ? (
                <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                  {isVi
                    ? 'Tháng này chưa có khoản chi tiêu nào.'
                    : 'No expenses recorded this month.'}
                </Text>
              ) : (
                <View style={styles.breakdownList}>
                  {expenseByCategory.map(({ cat, val, pct }) => (
                    <View key={cat.id} style={styles.breakdownRow}>
                      <View style={styles.breakdownHeader}>
                        <Text
                          style={[styles.breakdownCatName, isDark && styles.textDark]}
                        >
                          {cat.icon} {isVi ? cat.nameVi : cat.nameEn}
                        </Text>
                        <Text
                          style={[styles.breakdownAmount, isDark && styles.textDark]}
                        >
                          {formatVnd(val)} ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct}%`, backgroundColor: cat.color },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.divider} />

              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                {isVi
                  ? 'Báo cáo Thu nhập theo danh mục'
                  : 'Income Breakdown by Category'}
              </Text>
              {incomeByCategory.length === 0 ? (
                <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                  {isVi
                    ? 'Tháng này chưa có khoản thu nhập nào.'
                    : 'No income recorded this month.'}
                </Text>
              ) : (
                <View style={styles.breakdownList}>
                  {incomeByCategory.map(({ cat, val, pct }) => (
                    <View key={cat.id} style={styles.breakdownRow}>
                      <View style={styles.breakdownHeader}>
                        <Text
                          style={[styles.breakdownCatName, isDark && styles.textDark]}
                        >
                          {cat.icon} {isVi ? cat.nameVi : cat.nameEn}
                        </Text>
                        <Text
                          style={[styles.breakdownAmount, isDark && styles.textDark]}
                        >
                          +{formatVnd(val)} ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct}%`, backgroundColor: cat.color },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Monthly All Transactions List */}
          <View style={[styles.reportCard, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              {isVi
                ? `Toàn bộ giao dịch trong tháng (${monthTxs.length})`
                : `All Monthly Transactions (${monthTxs.length})`}
            </Text>

            <View style={styles.txList}>
              {monthTxs.map((tx) => {
                const cat =
                  FINANCE_CATEGORIES.find((c) => c.id === tx.categoryId) ??
                  FINANCE_CATEGORIES[0];
                const isExp = tx.type === 'expense';
                return (
                  <View key={tx.id} style={[styles.txRow, isDark && styles.rowDark]}>
                    <View style={styles.txIconBox}>
                      <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txTitle, isDark && styles.textDark]}>
                        {tx.note || (isVi ? cat.nameVi : cat.nameEn)}
                      </Text>
                      <Text style={styles.txSub}>
                        {isVi ? cat.nameVi : cat.nameEn} · {tx.date}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isExp ? '#f97316' : '#10b981' },
                      ]}
                    >
                      {isExp ? '-' : '+'}
                      {formatVnd(tx.amount)}
                    </Text>
                    <Pressable
                      onPress={() => deleteTransaction(tx.id)}
                      style={styles.txDeleteBtn}
                    >
                      <Text style={styles.txDeleteText}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
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
    padding: 26,
    paddingBottom: 48,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  subtitleChip: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#f97316',
    marginBottom: 3,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  monthNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  navIconText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  monthBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  monthBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'capitalize',
  },
  subTabGroup: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 99,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
  },
  subTabBtnActive: {
    backgroundColor: '#f97316',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  subTabTextActive: {
    color: '#ffffff',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: 210,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  summaryCardBalance: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  mainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'flex-start',
  },
  inputPanel: {
    width: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 13,
  },
  cardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  typeSwitchBar: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  typeSwitchBarDark: {
    backgroundColor: '#0f172a',
  },
  typeSwitchBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  typeSwitchExpenseActive: {
    backgroundColor: '#f97316',
  },
  typeSwitchIncomeActive: {
    backgroundColor: '#10b981',
  },
  typeSwitchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  typeSwitchTextActive: {
    color: '#ffffff',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.4,
  },
  dateStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateStepBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateStepText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  dateInputCenter: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '800',
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickAmtChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickAmtText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  inputDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catTile: {
    width: '30.5%',
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 4,
  },
  catIcon: {
    fontSize: 20,
  },
  catName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  submitBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  rightCol: {
    flex: 1,
    minWidth: 360,
    gap: 18,
  },
  reportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 14,
  },
  calTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  calHint: {
    fontSize: 11,
    color: '#6b7280',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.2857%',
    minHeight: 68,
    backgroundColor: '#fbfaf7',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    padding: 5,
    gap: 2,
  },
  calCellOutside: {
    backgroundColor: '#f3f4f6',
    opacity: 0.55,
  },
  calCellSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
    borderWidth: 1.5,
  },
  calCellHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  calDayBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  calDayBadgeToday: {
    backgroundColor: '#18181b',
  },
  calDayNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },
  calIncText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  calExpText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f97316',
  },
  selectedDaySection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 14,
    gap: 10,
  },
  selectedDayHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  emptyHint: {
    fontSize: 13,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 6,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownRow: {
    gap: 5,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownCatName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  barTrack: {
    height: 7,
    backgroundColor: '#f3f4f6',
    borderRadius: 99,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 99,
  },
  txList: {
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    backgroundColor: '#f9fafb',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  rowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  txSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txDeleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  txDeleteText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '700',
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
