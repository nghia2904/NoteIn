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

function buildConicPieStyle(income: number, expense: number): object {
  const total = income + expense;
  if (total <= 0) {
    return { backgroundColor: '#e5e7eb' };
  }
  const incDeg = Math.round((income / total) * 360);
  return {
    backgroundImage: `conic-gradient(${COLOR_INCOME} 0deg ${incDeg}deg, ${COLOR_EXPENSE} ${incDeg}deg 360deg)`,
  } as unknown as object;
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
  const [rightSubTab, setRightSubTab] = useState<'calendar' | 'report'>('report');

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

  const monthPrefix = format(currentPeriodDate, 'yyyy-MM');
  const yearPrefix = format(currentPeriodDate, 'yyyy');
  const periodPrefix = periodMode === 'month' ? monthPrefix : yearPrefix;

  const monthDisplayLabel = format(
    currentPeriodDate,
    isVi ? "'Tháng' MM, yyyy" : 'MMMM yyyy',
    { locale },
  );
  const yearDisplayLabel = format(
    currentPeriodDate,
    isVi ? "'Năm' yyyy" : 'Year yyyy',
    { locale },
  );
  const periodDisplayLabel =
    periodMode === 'month' ? monthDisplayLabel : yearDisplayLabel;

  const {
    monthIncome,
    monthExpense,
    monthBalance,
    yearIncome,
    yearExpense,
    yearBalance,
    periodIncome,
    periodExpense,
    periodBalance,
    dailyTotalsMap,
    monthlyInYearStats,
    expenseByCategory,
    incomeByCategory,
    selectedDateTxs,
    periodTxs,
    txGroupsByDate,
  } = useMemo(() => {
    let mInc = 0;
    let mExp = 0;
    let yInc = 0;
    let yExp = 0;
    let pInc = 0;
    let pExp = 0;

    const dMap: Record<string, { income: number; expense: number }> = {};
    const expCatTotals: Record<string, number> = {};
    const incCatTotals: Record<string, number> = {};
    const months12 = Array.from({ length: 12 }, (_, idx) => ({
      monthNum: idx + 1,
      key: `${yearPrefix}-${String(idx + 1).padStart(2, '0')}`,
      income: 0,
      expense: 0,
    }));

    for (const tx of transactions) {
      if (!dMap[tx.date]) {
        dMap[tx.date] = { income: 0, expense: 0 };
      }
      if (tx.type === 'income') {
        dMap[tx.date].income += tx.amount;
      } else {
        dMap[tx.date].expense += tx.amount;
      }

      if (tx.date.startsWith(monthPrefix)) {
        if (tx.type === 'income') mInc += tx.amount;
        else mExp += tx.amount;
      }

      if (tx.date.startsWith(yearPrefix)) {
        if (tx.type === 'income') yInc += tx.amount;
        else yExp += tx.amount;

        const mIdx = Number(tx.date.slice(5, 7)) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          if (tx.type === 'income') months12[mIdx].income += tx.amount;
          else months12[mIdx].expense += tx.amount;
        }
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
      monthIncome: mInc,
      monthExpense: mExp,
      monthBalance: mInc - mExp,
      yearIncome: yInc,
      yearExpense: yExp,
      yearBalance: yInc - yExp,
      periodIncome: pInc,
      periodExpense: pExp,
      periodBalance: pInc - pExp,
      dailyTotalsMap: dMap,
      monthlyInYearStats: months12,
      expenseByCategory: expBreakdown,
      incomeByCategory: incBreakdown,
      selectedDateTxs: dayList,
      periodTxs: pList,
      txGroupsByDate,
    };
  }, [transactions, monthPrefix, yearPrefix, periodPrefix, selectedDate]);

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

  // Monthly Pie Chart %
  const monthTotalVol = monthIncome + monthExpense;
  const monthIncPct =
    monthTotalVol > 0 ? Math.round((monthIncome / monthTotalVol) * 100) : 0;
  const monthExpPct = monthTotalVol > 0 ? 100 - monthIncPct : 0;

  // Yearly Pie Chart %
  const yearTotalVol = yearIncome + yearExpense;
  const yearIncPct =
    yearTotalVol > 0 ? Math.round((yearIncome / yearTotalVol) * 100) : 0;
  const yearExpPct = yearTotalVol > 0 ? 100 - yearIncPct : 0;

  const isPositiveBalance = periodBalance >= 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.subtitleChip}>
            {isVi ? 'FINANCE · QUẢN LÝ TÀI CHÍNH CÁ NHÂN' : 'PERSONAL FINANCE'}
          </Text>
          <Text style={[styles.pageTitle, isDark && styles.textDark]}>
            {isVi ? 'Quản lý Thu Chi' : 'Finance Tracker'}
          </Text>
        </View>

        <View style={styles.headerControls}>
          {/* Period Mode Toggle: Theo tháng | Cả năm */}
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
              onPress={() => {
                setPeriodMode('year');
                setRightSubTab('report');
              }}
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
                {isVi ? 'Cả năm' : 'Full Year'}
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

          {/* Sub-view Toggle: Báo cáo & Biểu đồ | Lịch thu chi */}
          <View style={[styles.subTabGroup, isDark && styles.cardDark]}>
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
                📊 {isVi ? 'Biểu đồ & Báo cáo' : 'Charts & Report'}
              </Text>
            </Pressable>
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
          </View>
        </View>
      </View>

      {/* 3 Summary Cards: Thu nhập (+) Xanh | Chi tiêu (-) Đỏ | Tổng thu chi (Xanh nếu +, Đỏ nếu -) */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {periodMode === 'month'
              ? isVi
                ? `THU NHẬP · ${monthDisplayLabel.toUpperCase()} (+)`
                : 'MONTHLY INCOME (+)'
              : isVi
                ? `THU NHẬP CẢ ${yearDisplayLabel.toUpperCase()} (+)`
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
                ? `CHI TIÊU · ${monthDisplayLabel.toUpperCase()} (-)`
                : 'MONTHLY EXPENSE (-)'
              : isVi
                ? `CHI TIÊU CẢ ${yearDisplayLabel.toUpperCase()} (-)`
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
            {periodMode === 'month'
              ? isVi
                ? 'TỔNG THU CHI THÁNG (THU - CHI)'
                : 'MONTHLY NET BALANCE'
              : isVi
                ? 'TỔNG THU CHI CẢ NĂM (THU - CHI)'
                : 'YEARLY NET BALANCE'}
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

      {/* Main Split: Left Input Form + Right Dual Pie Charts (Tháng & Cả Năm), Calendar & Daily Grouped List */}
      <View style={styles.mainRow}>
        {/* LEFT: Input Panel */}
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

        {/* RIGHT: Always-visible Dual Pie Charts (Tháng & Cả Năm) + Calendar / Category Details + Daily Grouped List */}
        <View style={styles.rightCol}>
          {/* DUAL PIE CHARTS CARD: Biểu đồ tròn Tháng & Biểu đồ tròn Cả Năm */}
          <View style={[styles.reportCard, isDark && styles.cardDark]}>
            <View style={styles.calTopRow}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                {isVi
                  ? 'Biểu đồ tròn Thu nhập (+) & Chi tiêu (−) · Theo Tháng & Cả Năm'
                  : 'Monthly & Full-Year Income (+) vs Expense (−) Pie Charts'}
              </Text>
              <Text style={styles.calHint}>
                {isVi
                  ? 'Bấm vào từng biểu đồ để xem chi tiết theo Tháng hoặc Cả Năm'
                  : 'Click a chart to switch between Monthly and Full-Year view'}
              </Text>
            </View>

            <View style={styles.dualPieRow}>
              {/* PIE 1: BIỂU ĐỒ TRÒN THEO THÁNG */}
              <Pressable
                onPress={() => setPeriodMode('month')}
                style={[
                  styles.pieBoxCard,
                  isDark && styles.rowDark,
                  periodMode === 'month' && styles.pieBoxCardActive,
                ]}
              >
                <Text style={[styles.pieBoxTitle, isDark && styles.textDark]}>
                  📊 {isVi ? `Biểu đồ ${monthDisplayLabel}` : monthDisplayLabel}
                </Text>

                <View style={styles.pieWithLegendRow}>
                  <View
                    style={[
                      styles.pieOuterCircle,
                      buildConicPieStyle(monthIncome, monthExpense),
                    ]}
                  >
                    <View
                      style={[
                        styles.pieInnerHole,
                        isDark && { backgroundColor: '#0f172a' },
                      ]}
                    >
                      <Text style={styles.pieCenterLabel}>
                        {isVi ? 'THÁNG' : 'MONTH'}
                      </Text>
                      <Text
                        style={[
                          styles.pieCenterValue,
                          {
                            color:
                              monthBalance >= 0 ? COLOR_INCOME : COLOR_EXPENSE,
                          },
                        ]}
                      >
                        {monthBalance >= 0 ? '+' : '-'}
                        {formatCompactVnd(monthBalance)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.miniLegendCol}>
                    <View style={styles.miniLegendItem}>
                      <View style={styles.miniLegendHeader}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: COLOR_INCOME },
                          ]}
                        />
                        <Text style={[styles.miniLegendLabel, isDark && styles.textDark]}>
                          {isVi ? 'Thu nhập' : 'Income'} ({monthIncPct}%)
                        </Text>
                      </View>
                      <Text style={[styles.miniLegendVal, { color: COLOR_INCOME }]}>
                        +{formatVnd(monthIncome)}
                      </Text>
                    </View>

                    <View style={styles.miniLegendItem}>
                      <View style={styles.miniLegendHeader}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: COLOR_EXPENSE },
                          ]}
                        />
                        <Text style={[styles.miniLegendLabel, isDark && styles.textDark]}>
                          {isVi ? 'Chi tiêu' : 'Expense'} ({monthExpPct}%)
                        </Text>
                      </View>
                      <Text style={[styles.miniLegendVal, { color: COLOR_EXPENSE }]}>
                        -{formatVnd(monthExpense)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* PIE 2: BIỂU ĐỒ TRÒN CẢ NĂM */}
              <Pressable
                onPress={() => setPeriodMode('year')}
                style={[
                  styles.pieBoxCard,
                  isDark && styles.rowDark,
                  periodMode === 'year' && styles.pieBoxCardActive,
                ]}
              >
                <Text style={[styles.pieBoxTitle, isDark && styles.textDark]}>
                  📈 {isVi ? `Biểu đồ Cả ${yearDisplayLabel}` : `Full ${yearDisplayLabel}`}
                </Text>

                <View style={styles.pieWithLegendRow}>
                  <View
                    style={[
                      styles.pieOuterCircle,
                      buildConicPieStyle(yearIncome, yearExpense),
                    ]}
                  >
                    <View
                      style={[
                        styles.pieInnerHole,
                        isDark && { backgroundColor: '#0f172a' },
                      ]}
                    >
                      <Text style={styles.pieCenterLabel}>
                        {isVi ? 'CẢ NĂM' : 'YEAR'}
                      </Text>
                      <Text
                        style={[
                          styles.pieCenterValue,
                          {
                            color:
                              yearBalance >= 0 ? COLOR_INCOME : COLOR_EXPENSE,
                          },
                        ]}
                      >
                        {yearBalance >= 0 ? '+' : '-'}
                        {formatCompactVnd(yearBalance)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.miniLegendCol}>
                    <View style={styles.miniLegendItem}>
                      <View style={styles.miniLegendHeader}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: COLOR_INCOME },
                          ]}
                        />
                        <Text style={[styles.miniLegendLabel, isDark && styles.textDark]}>
                          {isVi ? 'Thu cả năm' : 'Year Income'} ({yearIncPct}%)
                        </Text>
                      </View>
                      <Text style={[styles.miniLegendVal, { color: COLOR_INCOME }]}>
                        +{formatVnd(yearIncome)}
                      </Text>
                    </View>

                    <View style={styles.miniLegendItem}>
                      <View style={styles.miniLegendHeader}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: COLOR_EXPENSE },
                          ]}
                        />
                        <Text style={[styles.miniLegendLabel, isDark && styles.textDark]}>
                          {isVi ? 'Chi cả năm' : 'Year Expense'} ({yearExpPct}%)
                        </Text>
                      </View>
                      <Text style={[styles.miniLegendVal, { color: COLOR_EXPENSE }]}>
                        -{formatVnd(yearExpense)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>

          {rightSubTab === 'report' ? (
            /* CATEGORY BREAKDOWN & 12-MONTH YEARLY TABLE */
            <View style={[styles.reportCard, isDark && styles.cardDark]}>
              {/* If viewing Full Year, show 12-Month Summary Grid */}
              {periodMode === 'year' && (
                <>
                  <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                    {isVi
                      ? `Thống kê 12 tháng trong ${yearDisplayLabel}`
                      : `12-Month Breakdown · ${yearDisplayLabel}`}
                  </Text>
                  <View style={styles.months12Grid}>
                    {monthlyInYearStats.map((m) => {
                      const mNet = m.income - m.expense;
                      const hasData = m.income > 0 || m.expense > 0;
                      return (
                        <Pressable
                          key={m.key}
                          onPress={() => {
                            setCurrentPeriodDate(parseISO(`${m.key}-01`));
                            setPeriodMode('month');
                          }}
                          style={[
                            styles.month12Card,
                            isDark && styles.rowDark,
                            !hasData && { opacity: 0.55 },
                          ]}
                        >
                          <Text style={[styles.month12Title, isDark && styles.textDark]}>
                            {isVi ? `Tháng ${m.monthNum}` : `M${m.monthNum}`}
                          </Text>
                          <Text style={[styles.month12Line, { color: COLOR_INCOME }]}>
                            +{formatCompactVnd(m.income)}
                          </Text>
                          <Text style={[styles.month12Line, { color: COLOR_EXPENSE }]}>
                            -{formatCompactVnd(m.expense)}
                          </Text>
                          <Text
                            style={[
                              styles.month12Net,
                              { color: mNet >= 0 ? COLOR_INCOME : COLOR_EXPENSE },
                            ]}
                          >
                            {mNet >= 0 ? '+' : '-'}
                            {formatCompactVnd(mNet)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              {/* Category Details: Expense Categories (Red) & Income Categories (Green) */}
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                {isVi
                  ? `Chi tiết Chi tiêu theo danh mục (−) · ${periodDisplayLabel}`
                  : `Expense Breakdown by Category (−) · ${periodDisplayLabel}`}
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
                  ? `Chi tiết Thu nhập theo danh mục (+) · ${periodDisplayLabel}`
                  : `Income Breakdown by Category (+) · ${periodDisplayLabel}`}
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
          ) : (
            /* CALENDAR TAB */
            <View style={[styles.reportCard, isDark && styles.cardDark]}>
              <View style={styles.calTopRow}>
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                  {isVi
                    ? `Lịch Thu Chi · ${format(currentPeriodDate, "'Tháng' MM/yyyy", { locale })}`
                    : `Finance Calendar · ${format(currentPeriodDate, 'MMM yyyy', { locale })}`}
                </Text>
                <Text style={styles.calHint}>
                  {isVi
                    ? 'Thu nhập (+) màu xanh · Chi tiêu (−) màu đỏ'
                    : 'Income (+) in green · Expense (−) in red'}
                </Text>
              </View>

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
    width: 350,
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
    minWidth: 380,
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
  // Dual Pie Chart Styles
  dualPieRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  pieBoxCard: {
    flex: 1,
    minWidth: 270,
    backgroundColor: '#fbfaf7',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e5e4de',
    gap: 12,
  },
  pieBoxCardActive: {
    borderColor: '#18181b',
    backgroundColor: '#ffffff',
  },
  pieBoxTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  pieWithLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pieOuterCircle: {
    width: 126,
    height: 126,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieInnerHole: {
    width: 78,
    height: 78,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pieCenterLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  pieCenterValue: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },
  miniLegendCol: {
    flex: 1,
    gap: 10,
  },
  miniLegendItem: {
    gap: 2,
  },
  miniLegendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  miniLegendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  miniLegendVal: {
    fontSize: 14,
    fontWeight: '900',
    paddingLeft: 16,
  },
  // 12-Month Grid inside Yearly view
  months12Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  month12Card: {
    width: '15.2%',
    minWidth: 95,
    backgroundColor: '#fbfaf7',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e4de',
    gap: 2,
  },
  month12Title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 2,
  },
  month12Line: {
    fontSize: 11,
    fontWeight: '800',
  },
  month12Net: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 2,
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
