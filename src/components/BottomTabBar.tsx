import { BlurView } from 'expo-blur';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { translations } from '../i18n/translations';
import { useScheduleStore } from '../store/scheduleStore';

export type MainTab = 'daily' | 'calendar' | 'other';

interface BottomTabBarProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
}

export function BottomTabBar({ activeTab, onChangeTab }: BottomTabBarProps) {
  const { language, theme } = useScheduleStore();
  const t = translations[language];
  const isDark = theme === 'dark';

  const tabs: { key: MainTab; label: string; icon: string }[] = [
    { key: 'daily', label: t.tabDaily, icon: '◷' },
    { key: 'calendar', label: t.tabCalendar, icon: '▦' },
    { key: 'other', label: t.tabOther, icon: '•••' },
  ];

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView
        intensity={isDark ? 45 : 75}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.pillBar,
          isDark ? styles.pillBarDark : styles.pillBarLight,
        ]}
      >
        {tabs.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChangeTab(item.key)}
              style={[
                styles.tabItem,
                isActive && (isDark ? styles.tabItemActiveDark : styles.tabItemActiveLight),
              ]}
            >
              <Text
                style={[
                  styles.iconText,
                  isDark ? styles.iconDark : styles.iconLight,
                  isActive && styles.activeOrange,
                ]}
              >
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.labelText,
                  isDark ? styles.labelDark : styles.labelLight,
                  isActive && styles.activeOrange,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  pillBar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 36,
    paddingVertical: 6,
    paddingHorizontal: 8,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  pillBarLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  pillBarDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 28,
  },
  tabItemActiveLight: {
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  tabItemActiveDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
  },
  iconText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  iconLight: {
    color: '#334155',
  },
  iconDark: {
    color: '#cbd5e1',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  labelLight: {
    color: '#334155',
  },
  labelDark: {
    color: '#cbd5e1',
  },
  activeOrange: {
    color: '#f27821',
    fontWeight: '700',
  },
});
