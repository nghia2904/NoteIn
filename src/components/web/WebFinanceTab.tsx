import { format } from 'date-fns';
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

export function WebFinanceTab({ now }: { now: Date }) {
  const { language, theme } = useScheduleStore();
  const { transactions, addTransaction, deleteTransaction } = useWebWorkspaceStore();

  const isDark = theme === 'dark';
  const isVi = language === 'vi';
  const todayStr = format(now, 'yyyy-MM-dd');

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [selectedCatId, setSelectedCatId] = useState<string>('food');
  const [amountInput, setAmountInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(todayStr);

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
      date: dateInput || todayStr,
      note: noteInput.trim(),
    });
    setAmountInput('');
    setNoteInput('');
  };

  const { totalIncome, totalExpense, balance, expenseByCategory } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catTotals: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.type === 'income') {
        inc += tx.amount;
      } else {
        exp += tx.amount;
        catTotals[tx.categoryId] = (catTotals[tx.categoryId] ?? 0) + tx.amount;
      }
    }

    const breakdown = FINANCE_CATEGORIES.filter((c) => c.type === 'expense')
      .map((cat) => {
        const val = catTotals[cat.id] ?? 0;
        const pct = exp > 0 ? Math.round((val / exp) * 100) : 0;
        return { cat, val, pct };
      })
      .filter((item) => item.val > 0)
      .sort((a, b) => b.val - a.val);

    return {
      totalIncome: inc,
      totalExpense: exp,
      balance: inc - exp,
      expenseByCategory: breakdown,
    };
  }, [transactions]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.subtitleChip, isDark && styles.subTextDark]}>
            MONEYNOTE · PERSONAL FINANCE
          </Text>
          <Text style={[styles.pageTitle, isDark && styles.textDark]}>
            {isVi ? 'Sổ Thu Chi (Finance)' : 'MoneyNote Finance'}
          </Text>
        </View>
      </View>

      {/* 3 Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {isVi ? 'TỔNG THU NHẬP' : 'TOTAL INCOME'}
          </Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>
            +{formatVnd(totalIncome)}
          </Text>
        </View>

        <View style={[styles.summaryCard, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {isVi ? 'TỔNG CHI TIÊU' : 'TOTAL EXPENSE'}
          </Text>
          <Text style={[styles.summaryValue, { color: '#f97316' }]}>
            -{formatVnd(totalExpense)}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.summaryCardBalance, isDark && styles.cardDark]}>
          <Text style={[styles.summaryLabel, isDark && styles.subTextDark]}>
            {isVi ? 'SỐ DƯ HIỆN TẠI' : 'NET BALANCE'}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: balance >= 0 ? '#059669' : '#e11d48' },
            ]}
          >
            {formatVnd(balance)}
          </Text>
        </View>
      </View>

      {/* Main Split: Left MoneyNote Input Form + Right Category Breakdown & Ledger */}
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
                {isVi ? '💸 Tiền chi (Expense)' : '💸 Expense'}
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
                {isVi ? '💰 Tiền thu (Income)' : '💰 Income'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, isDark && styles.subTextDark]}>
              {isVi ? 'NGÀY GIAO DỊCH' : 'DATE'}
            </Text>
            <TextInput
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              style={[styles.input, isDark && styles.inputDark]}
            />
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
                  ? 'Nhập khoản chi tiêu'
                  : 'Save Expense'
                : isVi
                  ? 'Nhập khoản thu nhập'
                  : 'Save Income'}
            </Text>
          </Pressable>
        </View>

        {/* RIGHT: Category Report + Transaction History */}
        <View style={styles.rightCol}>
          {/* Category Expense Breakdown */}
          <View style={[styles.reportCard, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              {isVi ? 'Phân tích chi tiêu theo danh mục' : 'Expense Breakdown by Category'}
            </Text>

            {expenseByCategory.length === 0 ? (
              <Text style={[styles.emptyHint, isDark && styles.subTextDark]}>
                {isVi ? 'Chưa có khoản chi tiêu nào.' : 'No expenses recorded yet.'}
              </Text>
            ) : (
              <View style={styles.breakdownList}>
                {expenseByCategory.map(({ cat, val, pct }) => (
                  <View key={cat.id} style={styles.breakdownRow}>
                    <View style={styles.breakdownHeader}>
                      <Text style={[styles.breakdownCatName, isDark && styles.textDark]}>
                        {cat.icon} {isVi ? cat.nameVi : cat.nameEn}
                      </Text>
                      <Text style={[styles.breakdownAmount, isDark && styles.textDark]}>
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
          </View>

          {/* Recent Transactions List */}
          <View style={[styles.reportCard, isDark && styles.cardDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              {isVi ? 'Lịch sử thu chi gần đây' : 'Recent Transactions'}
            </Text>

            <View style={styles.txList}>
              {transactions.map((tx) => {
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
    padding: 28,
    paddingBottom: 48,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitleChip: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#f97316',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
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
    gap: 14,
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
    gap: 5,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.4,
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
    marginTop: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  rightCol: {
    flex: 1,
    minWidth: 340,
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  emptyHint: {
    fontSize: 13,
    color: '#6b7280',
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
    gap: 9,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
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
    width: 38,
    height: 38,
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
    marginTop: 2,
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
