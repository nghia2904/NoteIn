import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { translations } from '../i18n/translations';
import { useScheduleStore } from '../store/scheduleStore';

export type MainTab = 'daily' | 'calendar' | 'periodic' | 'other';
interface BottomTabBarProps { activeTab: MainTab; onChangeTab: (tab: MainTab) => void; }
export function BottomTabBar({ activeTab, onChangeTab }: BottomTabBarProps) {
  const { language, theme } = useScheduleStore(); const dark = theme === 'dark'; const t = translations[language];
  const tabs: { key: MainTab; label: string; icon: string }[] = [{ key: 'daily', label: t.tabDaily, icon: '◷' }, { key: 'calendar', label: t.tabCalendar, icon: '▦' }, { key: 'periodic', label: 'Định Kỳ', icon: '↻' }, { key: 'other', label: t.tabOther, icon: '•••' }];
  return <View style={styles.wrapper} pointerEvents="box-none"><BlurView intensity={dark ? 45 : 75} tint={dark ? 'dark' : 'light'} style={[styles.bar, dark ? styles.darkBar : styles.lightBar]}>{tabs.map((item) => { const active = item.key === activeTab; return <Pressable key={item.key} onPress={() => onChangeTab(item.key)} style={[styles.item, active && (dark ? styles.activeDark : styles.activeLight)]}><Text style={[styles.icon, dark && styles.darkText, active && styles.orange]}>{item.icon}</Text><Text style={[styles.label, dark && styles.darkText, active && styles.orange]}>{item.label}</Text></Pressable>; })}</BlurView></View>;
}
const styles = StyleSheet.create({ wrapper: { position: 'absolute', bottom: 18, left: 12, right: 12, alignItems: 'center' }, bar: { flexDirection: 'row', width: '100%', borderRadius: 36, paddingVertical: 6, paddingHorizontal: 5, overflow: 'hidden', borderWidth: 1, elevation: 8 }, lightBar: { backgroundColor: 'rgba(255,255,255,0.84)', borderColor: 'rgba(255,255,255,0.95)' }, darkBar: { backgroundColor: 'rgba(15,23,42,0.84)', borderColor: 'rgba(255,255,255,0.14)' }, item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 28 }, activeLight: { backgroundColor: 'rgba(15,23,42,0.06)' }, activeDark: { backgroundColor: 'rgba(249,115,22,0.16)' }, icon: { fontSize: 17, lineHeight: 21, fontWeight: '700', color: '#334155' }, label: { fontSize: 10, fontWeight: '600', marginTop: 2, color: '#334155' }, darkText: { color: '#cbd5e1' }, orange: { color: '#f27821', fontWeight: '800' } });
