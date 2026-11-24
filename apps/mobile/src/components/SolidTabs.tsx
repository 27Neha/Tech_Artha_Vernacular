import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SolidTabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  badge?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface SolidTabsProps<T extends string = string> {
  tabs: readonly SolidTabItem<T>[] | SolidTabItem<T>[];
  activeTab: T;
  onSelect: (tabId: T) => void;
  scrollable?: boolean;
  containerStyle?: ViewStyle;
  tabStyle?: ViewStyle;
  activeTabStyle?: ViewStyle;
  textStyle?: TextStyle;
  activeTextStyle?: TextStyle;
  testID?: string;
}

/**
 * Standardized Solid Filled Tabs component following the TechArtha Home Screen design system.
 * Replaces outdated underline and plain text tabs with tactile, solid filled card/pill tabs.
 */
export const SolidTabs = <T extends string = string>({
  tabs,
  activeTab,
  onSelect,
  scrollable = false,
  containerStyle,
  tabStyle,
  activeTabStyle,
  textStyle,
  activeTextStyle,
  testID = 'solid-tabs',
}: SolidTabsProps<T>) => {
  const renderTab = (tab: SolidTabItem<T>) => {
    const isActive = activeTab === tab.id;
    return (
      <Pressable
        key={tab.id}
        testID={`${testID}-tab-${tab.id}`}
        onPress={() => onSelect(tab.id)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${tab.label}${tab.count != null ? ` (${tab.count})` : ''}`}
        style={({ pressed }) => [
          styles.tab,
          isActive ? [styles.tabActive, activeTabStyle] : tabStyle,
          pressed && styles.tabPressed,
        ]}
      >
        {tab.icon && (
          <Ionicons
            name={tab.icon}
            size={14}
            color={isActive ? '#FFFFFF' : '#36358D'}
            style={styles.tabIcon}
          />
        )}
        <Text
          style={[
            styles.tabText,
            isActive ? [styles.tabTextActive, activeTextStyle] : textStyle,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
        {tab.count != null && (
          <View
            style={[
              styles.countPill,
              isActive ? styles.countPillActive : styles.countPillInactive,
            ]}
          >
            <Text
              style={[
                styles.countText,
                isActive ? styles.countTextActive : styles.countTextInactive,
              ]}
            >
              {tab.count}
            </Text>
          </View>
        )}
        {tab.badge && (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{tab.badge}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (scrollable) {
    return (
      <View style={[styles.scrollOuter, containerStyle]} testID={testID}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {tabs.map(renderTab)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.fixedContainer, containerStyle]} testID={testID}>
      {tabs.map(renderTab)}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollOuter: {
    paddingVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fixedContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEEDFA',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E8F6',
    elevation: 1,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    minHeight: 38,
  },
  tabActive: {
    backgroundColor: '#36358D',
    borderColor: '#36358D',
    elevation: 3,
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  tabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  countPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 6,
  },
  countPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  countPillInactive: {
    backgroundColor: '#EEEDFA',
  },
  countText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  countTextInactive: {
    color: '#36358D',
  },
  badgePill: {
    backgroundColor: '#F7941D',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});

export default SolidTabs;
