import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
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

const COLOR_INCOME = '#16a34a'; // Xanh lá cho Thu nhập (+)
const COLOR_EXPENSE = '#ef4444'; // Đỏ cho Chi tiêu (-)

function formatVnd(amount: number): string {
  return Math.abs(amount).toLocaleString('vi-VN') + ' ₫';
}

function formatSignedVnd(amount: number): string {
  if (amount > 0) return `+${formatVnd(amount)}`;
  if (amount < 0) return `-${formatVnd(amount)}`;
  return '0 ₫';
}

function formatCompactVnd(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}tr`;
  }
  if (abs >= 1_000) {
    return `${Math.round(abs / 1_000)}k`;
  }
  return String(abs);
}

export function WebFinanceTab({ now }: { now: Date }) {
  const { language, theme } = useScheduleStore();
  const { transactions, addTransaction, deleteTransaction } = useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';
  const locale = isVi ? vi : enUS;
  const todayStr = format(now, 'yyyy-MM-dd');

  const [currentPeriodDate, setCurrentPeriodDate] = useState<Date>(() =>
    startOfMonth(now),
  );
  const [periodMode, setPeriodMode] = useState<'month' | 'year'>('month');
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

  const handlePrevPeriod = () => {
    setCurrentPeriodDate((d) =>
      periodMode === 'month' ? subMonths(d, 1) : subYears(d, 1),
    );
  };

  const handleNextPeriod = () => {
    setCurrentPeriodDate((d) =>
      periodMode === 'month' ? addMonths(d, 1) : addYears(d, 1),
    );
  };

  // Period prefix: 'yyyy-MM' when viewing by month, or 'yyyy' when viewing by year
  const periodPrefix =
    periodMode === 'month'
      ? format(currentPeriodDate, 'yyyy-MM')
      : format(currentPeriodDate, 'yyyy');

  const periodDisplayLabel =
    periodMode === 'month'
      ? format(
          currentPeriodDate,
          isVi ? "'Tháng' MM, yyyy" : 'MMMM yyyy',
          { locale },
        )
      : format(currentPeriodDate, isVi ? "'Năm' yyyy" : 'yyyy', { locale });

  const {
    periodIncome,
    periodExpense,
    periodBalance,
    dailyTotalsMap,
    expenseByCategory,
    incomeByCategory,
    selectedDateTxs,
    periodTxs,
    txGroupsByDate,
  } = useMemo(() => {
    let pInc = 0;
    let pExp = 0;
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

      if (tx.date.startsWith(periodPrefix)) {
        if (tx.type === 'income') {
          pInc += tx.amount;
          incCatTotals[tx.categoryId] =
            (incCatTotals[tx.categoryId] ?? 0) + tx.amount;
        } else {
          pExp += tx.amount;
          expCatTotals[tx.categoryId] =
            (expCatTotals[tx.categoryId] ?? 0) + tx.amount;
        }
      }
    }

    const expBreakdown = FINANCE_CATEGORIES.filter((c) => c.type === 'expense')
      .map((cat) => {
        const val = expCatTotals[cat.id] ?? 0;
        const pct = pExp > 0 ? Math.round((val / pExp) * 100) : 0;
        return { cat, val, pct };
      })
      .filter((item) => item.val > 0)
      .sort((a, b) => b.val - a.val);

    const incBreakdown = FINANCE_CATEGORIES.filter((c) => c.type === 'income')
      .map((cat) => {
        const val = incCatTotals[cat.id] ?? 0;
        const pct = pInc > 0 ? Math.round((val / pInc) * 100) : 0;
        return { cat, val, pct };
      })
      .filter((item) => item.val > 0)
      .sort((a, b) => b.val - a.val);

    const dayList = transactions.filter((tx) => tx.date === selectedDate);
    const pList = transactions
      .filter((tx) => tx.date.startsWith(periodPrefix))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Group transactions by date (newest date first) for daily partitioned sections
    const dateGroupsMap = new Map<
      string,
      {
        date: string;
        income: number;
        expense: number;
        items: typeof pList;
      }
    >();
    for (const tx of pList) {
      let grp = dateGroupsMap.get(tx.date);
      if (!grp) {
        grp = { date: tx.date, income: 0, expense: 0, items: [] };
        dateGroupsMap.set(tx.date, grp);
      }
      if (tx.type === 'income') {
        grp.income += tx.amount;
      } else {
        grp.expense += tx.amount;
      }
      grp.items.push(tx);
    }
    const txGroupsByDate = Array.from(dateGroupsMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    return {
      periodIncome: pInc,
      periodExpense: pExp,
      periodBalance: pInc - pExp,
      dailyTotalsMap: dMap,
      expenseByCategory: expBreakdown,
      incomeByCategory: incBreakdown,
      selectedDateTxs: dayList,
      periodTxs: pList,
      txGroupsByDate,
    };
  }, [transactions, periodPrefix, selectedDate]);

  // Build calendar grid for currentPeriodDate's month
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentPeriodDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentPeriodDate), { weekStartsOn: 1 });
    const days: Date[] = [];
    let cursor = start;
    while (cursor <= end || days.length < 35) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
      if (days.length >= 42) break;
    }
    return days;
  }, [currentPeriodDate]);

  const weekdays = isVi
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Pie chart percentages (Green = Income, Red = Expense)
  const totalVolume = periodIncome + periodExpense;
  const incomePct =
    totalVolume > 0 ? Math.round((periodIncome / totalVolume) * 100) : 0;
  const expensePct = totalVolume > 0 ? 100 - incomePct : 0;
  const incomeDeg =
    totalVolume > 0 ? Math.round((periodIncome / totalVolume) * 360) : 180;

  const pieGradientStyle =
    totalVolume > 0
      ? ({
          backgroundImage: `conic-gradient(${COLOR_INCOME} 0deg ${incomeDeg}deg, ${COLOR_EXPENSE} ${incomeDeg}deg 360deg)`,
        } as unknown as object)
      : ({
          backgroundColor: '#e5e7eb',
        } as object);

  const isPositiveBalance = periodBalance >= 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header with Month/Year Mode Switcher, Period Nav & View Toggle */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.subtitleChip}>MONEYNOTE · PERSONAL FINANCE</Text>
          <Text style={[styles.pageTitle, isDark && styles.textDark]}>
            {isVi ? 'Sổ Thu Chi (MoneyNote)' : 'MoneyNote Finance'}
          </Text>
        </View>

        <View style={styles.headerControls}>
          {/* Period Mode Toggle: Theo tháng | Theo năm */}
          <View style={[styles.subTabGroup, isDark && styles.cardDark]}>
            <Pressable
              onPress={() => setPeriodMode('month')}
              style={[
                styles.subTabBtn,
                periodMode === 'month' && styles.periodModeBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.subTabText,
                  periodMode === 'month' && styles.subTabTextActive,
                ]}
              >
                {isVi ? 'Theo tháng' : 'Monthly'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPeriodMode('year')}
              style={[
                styles.subTabBtn,
                periodMode === 'year' && styles.periodModeBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.subTabText,
                  periodMode === 'year' && styles.subTabTextActive,
                ]}
              >
                {isVi ? 'Theo năm' : 'Yearly'}
              </Text>
            </Pressable>
          </View>

          {/* Period Stepper (< Tháng 11, 2026 / Năm 2026 >) */}
          <View style={styles.monthNavGroup}>
            <Pressable
              onPress={handlePrevPeriod}
              style={[styles.navIconBtn, isDark && styles.cardDark]}
            >
              <Text style={[styles.navIconText, isDark && styles.textDark]}>‹</Text>
            </Pressable>
            <View style={[styles.monthBadge, isDark && styles.cardDark]}>
              <Text style={[styles.monthBadgeText, isDark && styles.textDark]}>
                {periodDisplayLabel}
              </Text>
            </View>
            <Pressable
              onPress={handleNextPeriod}
              style={[styles.navIconBtn, isDark && styles.cardDark]}
            >
              <Text style={[styles.navIconText, isDark && styles.textDark]}>›</Text>
            </Pressable>
          </View>

          {/* Sub-view Toggle: Lịch thu chi (Calendar) | Báo cáo danh mục (Report) */}
          <View style={[styles.subTabGroup, isDark && styles.cardDark]}>
            <Pressable
              onPress={() => setRightSubTab('calendar')}
              style={[
                styles.subTabBtn,
                rightSubTab === 'calendar' && styles.periodModeBtnActive,
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
                rightSubTab === 'report' && styles.periodModeBtnActive,
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

      {/* 3 Summary Cards: Thu nhập (+) Xanh | Chi tiêu (-) Đỏ | Tổng thu chi (Xanh nếu +, Đỏ nếu -) */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {periodMode === 'month'
              ? isVi
                ? 'THU NHẬP TRONG THÁNG (+)'
                : 'MONTHLY INCOME (+)'
              : isVi
                ? 'THU NHẬP TRONG NĂM (+)'
                : 'YEARLY INCOME (+)'}
          </Text>
          <Text style={[styles.summaryValue, { color: COLOR_INCOME }]}>
            +{formatVnd(periodIncome)}
          </Text>
        </View>

        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {periodMode === 'month'
              ? isVi
                ? 'CHI TIÊU TRONG THÁNG (-)'
                : 'MONTHLY EXPENSE (-)'
              : isVi
                ? 'CHI TIÊU TRONG NĂM (-)'
                : 'YEARLY EXPENSE (-)'}
          </Text>
          <Text style={[styles.summaryValue, { color: COLOR_EXPENSE }]}>
            -{formatVnd(periodExpense)}
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            isPositiveBalance
              ? styles.summaryCardPositive
              : styles.summaryCardNegative,
            isDark && styles.cardDark,
          ]}
        >
          <Text
            style={[
              styles.summaryLabel,
              { color: isPositiveBalance ? COLOR_INCOME : COLOR_EXPENSE },
            ]}
          >
            {isVi ? 'TỔNG THU CHI (THU - CHI)' : 'NET BALANCE'}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: isPositiveBalance ? COLOR_INCOME : COLOR_EXPENSE },
            ]}
          >
            {formatSignedVnd(periodBalance)}
          </Text>
        </View>
      </View>

      {/* Main Split: Left MoneyNote Input Form + Right Calendar / Pie Chart Report */}
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
                {isVi ? '− Tiền chi' : '− Expense'}
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
                {isVi ? '+ Tiền thu' : '+ Income'}
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
              style={[
                styles.input,
                styles.amountInput,
                { color: txType === 'expense' ? COLOR_EXPENSE : COLOR_INCOME },
                isDark && styles.inputDark,
              ]}
            />
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
              const accentColor =
                txType === 'expense' ? COLOR_EXPENSE : COLOR_INCOME;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCatId(cat.id)}
                  style={[
                    styles.catTile,
                    isDark && styles.rowDark,
                    active && {
                      borderColor: accentColor,
                      backgroundColor: isDark
                        ? '#1e293b'
                        : txType === 'expense'
                          ? '#fef2f2'
                          : '#f0fdf4',
                    },
                  ]}
                >
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.catName,
                      isDark && styles.textDark,
                      active && { color: accentColor, fontWeight: '800' },
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
              {
                backgroundColor:
                  txType === 'expense' ? COLOR_EXPENSE : COLOR_INCOME,
              },
            ]}
          >
            <Text style={styles.submitBtnText}>
              {txType === 'expense'
                ? isVi
                  ? '− Lưu khoản Tiền chi'
                  : '− Save Expense'
                : isVi
                  ? '+ Lưu khoản Tiền thu'
                  : '+ Save Income'}
            </Text>
          </Pressable>
        </View>

        {/* RIGHT: MoneyNote Monthly Calendar OR Pie Chart Report + Ledger */}
        <View style={styles.rightCol}>
          {rightSubTab === 'calendar' ? (
            <View style={[styles.reportCard, isDark && styles.cardDark]}>
              <View style={styles.calTopRow}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                  {isVi
                    ? `Lịch Thu Chi · ${format(currentPeriodDate, "'Tháng' MM/yyyy", { locale })}`
                    : `Finance Calendar · ${format(currentPeriodDate, 'MMM yyyy', { locale })}`}
                </Text>
                <Text style={styles.calHint}>
                  {isVi
                    ? 'Thu nhập (+) màu xanh · Chi tiêu (-) màu đỏ'
                    : 'Income (+) in green · Expense (-) in red'}
                </Text>
              </View>

              {/* Weekday header */}
              <View style={styles.weekdayRow}>
                {weekdays.map((wd, idx) => (
                  <View key={wd} style={styles.weekdayCell}>
                    <Text
                      style={[
                        styles.weekdayText,
                        idx === 6 && { color: COLOR_EXPENSE },
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
                  const inMonth = isSameMonth(dayObj, currentPeriodDate);
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
                              { color: isExp ? COLOR_EXPENSE : COLOR_INCOME },
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
            /* REPORT TAB: 2-Color Pie Chart (Green = Income, Red = Expense) + Monthly/Yearly Category Breakdown */
            <View style={[styles.reportCard, isDark && styles.cardDark]}>
              <View style={styles.reportHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                    {isVi
                      ? `Biểu đồ Thu Chi · ${periodDisplayLabel}`
                      : `Income vs Expense Pie Chart · ${periodDisplayLabel}`}
                  </Text>
                  <Text style={styles.calHint}>
                    {isVi
                      ? 'Màu xanh (+): Thu nhập · Màu đỏ (−): Chi tiêu'
                      : 'Green (+): Income · Red (−): Expense'}
                  </Text>
                </View>
              </View>

              {/* 2-Color Pie / Donut Chart Area */}
              <View style={styles.pieSectionRow}>
                {/* Circular Pie Chart using conic-gradient (Green Income vs Red Expense) */}
                <View style={[styles.pieOuterCircle, pieGradientStyle]}>
                  <View
                    style={[
                      styles.pieInnerHole,
                      isDark && { backgroundColor: '#1e293b' },
                    ]}
                  >
                    <Text style={styles.pieCenterLabel}>
                      {isVi ? 'CÂN ĐỐI' : 'NET'}
                    </Text>
                    <Text
                      style={[
                        styles.pieCenterValue,
                        {
                          color: isPositiveBalance
                            ? COLOR_INCOME
                            : COLOR_EXPENSE,
                        },
                      ]}
                    >
                      {isPositiveBalance ? '+' : '-'}
                      {formatCompactVnd(periodBalance)}
                    </Text>
                  </View>
                </View>

                {/* Pie Chart Legend (Green = Thu nhập +, Red = Chi tiêu -) */}
                <View style={styles.pieLegendCol}>
                  <View style={[styles.legendCard, styles.legendCardIncome, isDark && styles.rowDark]}>
                    <View style={styles.legendTitleRow}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: COLOR_INCOME },
                        ]}
                      />
                      <Text style={[styles.legendLabel, isDark && styles.textDark]}>
                        {isVi ? 'Thu nhập (+)' : 'Income (+)'}
                      </Text>
                      <Text style={[styles.legendPct, { color: COLOR_INCOME }]}>
                        {incomePct}%
                      </Text>
                    </View>
                    <Text style={[styles.legendAmount, { color: COLOR_INCOME }]}>
                      +{formatVnd(periodIncome)}
                    </Text>
                  </View>

                  <View style={[styles.legendCard, styles.legendCardExpense, isDark && styles.rowDark]}>
                    <View style={styles.legendTitleRow}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: COLOR_EXPENSE },
                        ]}
                      />
                      <Text style={[styles.legendLabel, isDark && styles.textDark]}>
                        {isVi ? 'Chi tiêu (−)' : 'Expense (−)'}
                      </Text>
                      <Text style={[styles.legendPct, { color: COLOR_EXPENSE }]}>
                        {expensePct}%
                      </Text>
                    </View>
                    <Text style={[styles.legendAmount, { color: COLOR_EXPENSE }]}>
                      -{formatVnd(periodExpense)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Category Details: Expense Categories (Red) & Income Categories (Green) */}
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                {isVi
                  ? 'Chi tiết Chi tiêu theo danh mục (−)'
                  : 'Expense Breakdown by Category (−)'}
              </Text>

              {expenseByCategory.length === 0 ? (
                <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                  {isVi
                    ? 'Chưa có khoản chi tiêu nào trong kỳ này.'
                    : 'No expenses recorded in this period.'}
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
                          style={[styles.breakdownAmount, { color: COLOR_EXPENSE }]}
                        >
                          -{formatVnd(val)} ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct}%`, backgroundColor: COLOR_EXPENSE },
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
                  ? 'Chi tiết Thu nhập theo danh mục (+)'
                  : 'Income Breakdown by Category (+)'}
              </Text>
              {incomeByCategory.length === 0 ? (
                <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                  {isVi
                    ? 'Chưa có khoản thu nhập nào trong kỳ này.'
                    : 'No income recorded in this period.'}
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
                          style={[styles.breakdownAmount, { color: COLOR_INCOME }]}
                        >
                          +{formatVnd(val)} ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${pct}%`, backgroundColor: COLOR_INCOME },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Period Transactions Partitioned by Date (Phân khu theo từng ngày) */}
          <View style={[styles.reportCard, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              {isVi
                ? `Danh sách giao dịch theo ngày · ${periodDisplayLabel} (${periodTxs.length})`
                : `Daily Grouped Transactions · ${periodDisplayLabel} (${periodTxs.length})`}
            </Text>

            {txGroupsByDate.length === 0 ? (
              <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                {isVi
                  ? 'Chưa có giao dịch nào trong kỳ này.'
                  : 'No transactions in this period.'}
              </Text>
            ) : (
              <View style={styles.dateGroupsList}>
                {txGroupsByDate.map((group) => {
                  const dayNet = group.income - group.expense;
                  let dateHeaderLabel = group.date;
                  try {
                    dateHeaderLabel = format(
                      parseISO(group.date),
                      isVi ? 'EEEE, dd/MM/yyyy' : 'EEEE, MMM dd, yyyy',
                      { locale },
                    );
                  } catch {
                    dateHeaderLabel = group.date;
                  }

                  return (
                    <View
                      key={group.date}
                      style={[
                        styles.datePartitionCard,
                        isDark && styles.datePartitionCardDark,
                      ]}
                    >
                      {/* Date Section Header Bar */}
                      <Pressable
                        onPress={() => setSelectedDate(group.date)}
                        style={[
                          styles.datePartitionHeader,
                          isDark && styles.datePartitionHeaderDark,
                        ]}
                      >
                        <Text
                          style={[
                            styles.datePartitionTitle,
                            isDark && styles.textDark,
                          ]}
                        >
                          📅 {dateHeaderLabel}
                        </Text>

                        <View style={styles.datePartitionTotalsRow}>
                          {group.income > 0 && (
                            <Text
                              style={[
                                styles.datePartitionSubAmount,
                                { color: COLOR_INCOME },
                              ]}
                            >
                              +{formatVnd(group.income)}
                            </Text>
                          )}
                          {group.expense > 0 && (
                            <Text
                              style={[
                                styles.datePartitionSubAmount,
                                { color: COLOR_EXPENSE },
                              ]}
                            >
                              -{formatVnd(group.expense)}
                            </Text>
                          )}
                          <View
                            style={[
                              styles.dateNetBadge,
                              dayNet >= 0
                                ? styles.dateNetBadgePos
                                : styles.dateNetBadgeNeg,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dateNetBadgeText,
                                {
                                  color:
                                    dayNet >= 0 ? COLOR_INCOME : COLOR_EXPENSE,
                                },
                              ]}
                            >
                              {formatSignedVnd(dayNet)}
                            </Text>
                          </View>
                        </View>
                      </Pressable>

                      {/* Transactions inside this Date Section */}
                      <View style={styles.datePartitionBody}>
                        {group.items.map((tx) => {
                          const cat =
                            FINANCE_CATEGORIES.find(
                              (c) => c.id === tx.categoryId,
                            ) ?? FINANCE_CATEGORIES[0];
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
                                <Text
                                  style={[
                                    styles.txTitle,
                                    isDark && styles.textDark,
                                  ]}
                                >
                                  {tx.note || (isVi ? cat.nameVi : cat.nameEn)}
                                </Text>
                                <Text style={styles.txSub}>
                                  {isVi ? cat.nameVi : cat.nameEn}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.txAmount,
                                  {
                                    color: isExp
                                      ? COLOR_EXPENSE
                                      : COLOR_INCOME,
                                  },
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
                  );
                })}
              </View>
            )}
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
    color: '#16a34a',
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
    gap: 10,
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
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 99,
  },
  periodModeBtnActive: {
    backgroundColor: '#18181b',
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
  summaryCardPositive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  summaryCardNegative: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
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
    backgroundColor: COLOR_EXPENSE,
  },
  typeSwitchIncomeActive: {
    backgroundColor: COLOR_INCOME,
  },
  typeSwitchText: {
    fontSize: 12,
    fontWeight: '800',
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
    fontWeight: '900',
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
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#fef2f2',
    borderColor: COLOR_EXPENSE,
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
    color: COLOR_INCOME,
  },
  calExpText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLOR_EXPENSE,
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
  // Pie Chart Styles
  pieSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 28,
    paddingVertical: 10,
  },
  pieOuterCircle: {
    width: 190,
    height: 190,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieInnerHole: {
    width: 116,
    height: 116,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pieCenterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.6,
  },
  pieCenterValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  pieLegendCol: {
    flex: 1,
    minWidth: 220,
    gap: 12,
  },
  legendCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  legendCardIncome: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  legendCardExpense: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  legendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 99,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  legendPct: {
    fontSize: 14,
    fontWeight: '900',
  },
  legendAmount: {
    fontSize: 18,
    fontWeight: '900',
    paddingLeft: 20,
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
  dateGroupsList: {
    gap: 14,
  },
  datePartitionCard: {
    backgroundColor: '#fbfaf7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e4de',
    overflow: 'hidden',
  },
  datePartitionCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  datePartitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#f3f2ed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e4de',
  },
  datePartitionHeaderDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  datePartitionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    textTransform: 'capitalize',
  },
  datePartitionTotalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePartitionSubAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  dateNetBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  dateNetBadgePos: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  dateNetBadgeNeg: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  dateNetBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  datePartitionBody: {
    padding: 10,
    gap: 8,
  },
  textDark: {
    color: '#f8fafc',
  },
  subTextDark: {
    color: '#94a3b8',
  },
});
