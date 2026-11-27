import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { Screen } from '../types';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { authStore } from '../store/auth';
import { API_URL } from '../services/api/client';
import {
  navigationRef,
  canGlobalGoBack,
  handleGlobalBack,
  registerActiveModal,
  registerCustomBackHandler,
  subscribeNavigationHistory,
} from '../navigation/navigationService';

export interface HeaderProps {
  title?: string;
  back?: Screen | boolean;
  onBack?: ((screen?: any) => void) | boolean;
  showBack?: boolean;
  hideBack?: boolean;
  showSettings?: boolean;
  showNotifications?: boolean;
  showLanguage?: boolean;
  showLogo?: boolean;
  logoSize?: string;
  onSettingsPress?: () => void;
  route?: any;
  rightAction?: React.ReactNode;
}

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
];

export interface AppNotificationItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  time: string;
  status?: 'PENDING' | 'UNREAD' | 'READ' | string;
}

// Shared in-memory notification registry scoped strictly by authenticated user ID
const userNotifRegistry = new Map<string, { list: AppNotificationItem[]; unreadCount: number }>();
const notifListeners = new Set<(userId: string) => void>();

function notifyNotificationSubscribers(userId: string) {
  notifListeners.forEach((cb) => {
    try {
      cb(userId);
    } catch {}
  });
}

export const Header: React.FC<HeaderProps> = ({
  title,
  back,
  onBack,
  showBack,
  hideBack = false,
  showSettings = true,
  showNotifications = true,
  showLanguage = true,
  showLogo = true,
  onSettingsPress,
  route: routeProp,
  rightAction,
}) => {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const activeUserId = authStore.userId || 'anonymous';
  const cachedForUser = userNotifRegistry.get(activeUserId);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>(cachedForUser?.list || []);
  const [unreadCount, setUnreadCount] = useState<number>(cachedForUser?.unreadCount || 0);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isSyncingNotifs, setIsSyncingNotifs] = useState(false);

  // Safe route resolution
  let routeName = '';
  if (routeProp?.name) {
    routeName = routeProp.name;
  } else {
    try {
      const route = useRoute();
      routeName = route?.name || '';
    } catch (e) {
      routeName = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name || '' : '';
    }
  }

  // Subscribe to navigation history and back ability
  const [canBack, setCanBack] = useState(() => canGlobalGoBack());

  useEffect(() => {
    setCanBack(canGlobalGoBack());
    const unsubscribe = subscribeNavigationHistory(() => {
      setCanBack(canGlobalGoBack());
    });
    return unsubscribe;
  }, [routeName]);

  // Keep Android hardware back synchronized with custom screen-level onBack prop
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (typeof onBackRef.current === 'function' && !hideBack) {
      const handlerId = `header_onback_${routeName || 'screen'}`;
      return registerCustomBackHandler(handlerId, () => {
        if (typeof onBackRef.current === 'function') {
          onBackRef.current();
          return true;
        }
        return false;
      });
    }
  }, [routeName, hideBack, typeof onBack === 'function']);

    // Scoped notifications synchronization for the logged-in user
  const syncNotifications = useCallback(async () => {
    const token = authStore.accessToken;
    const userId = authStore.userId;
    if (!token || !userId) {
      setNotifications([]);
      setUnreadCount(0);
      userNotifRegistry.set('anonymous', { list: [], unreadCount: 0 });
      return;
    }

    // Try reading cached notifications for instant render
    const cacheKey = `techartha_user_notifs_${userId}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed?.list)) {
          setNotifications(parsed.list);
          setUnreadCount(parsed.unreadCount || 0);
          userNotifRegistry.set(userId, { list: parsed.list, unreadCount: parsed.unreadCount || 0 });
        }
      }
    } catch {}

    setIsSyncingNotifs(true);
    try {
      const res = await fetch(`${API_URL}/auth/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const apiList = Array.isArray(data?.notifications) ? data.notifications : [];
        const mapped: AppNotificationItem[] = apiList.map((n: any) => ({
          id: String(n.id),
          icon:
            n.type === 'SIP'
              ? 'calendar-outline'
              : n.type === 'SECURITY'
              ? 'shield-checkmark-outline'
              : n.type === 'KYC'
              ? 'id-card-outline'
              : 'notifications-outline',
          title: n.title || 'Account Update',
          body: n.body || '',
          time: n.createdAt
            ? new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            : 'Recent',
          status: n.status,
        }));

        const realUnread = typeof data?.unreadCount === 'number'
          ? data.unreadCount
          : mapped.filter((n) => n.status !== 'READ').length;

        setNotifications(mapped);
        setUnreadCount(realUnread);
        userNotifRegistry.set(userId, { list: mapped, unreadCount: realUnread });
        notifyNotificationSubscribers(userId);

        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ list: mapped, unreadCount: realUnread })
        ).catch(() => {});
      }
    } catch (err) {
      console.log('Error syncing user notifications:', err);
    } finally {
      setIsSyncingNotifs(false);
    }
  }, []);

  useEffect(() => {
    void syncNotifications();
    const handleRemoteChange = (uId: string) => {
      const currentId = authStore.userId || 'anonymous';
      if (uId === currentId) {
        const updated = userNotifRegistry.get(currentId);
        if (updated) {
          setNotifications(updated.list);
          setUnreadCount(updated.unreadCount);
        }
      }
    };
    notifListeners.add(handleRemoteChange);
    return () => {
      notifListeners.delete(handleRemoteChange);
    };
  }, [syncNotifications, routeName, authStore.userId]);

  // Mark all unread notifications as read via API and update state on confirmation
  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    const token = authStore.accessToken;
    const userId = authStore.userId;

    try {
      if (!token || !userId) {
        const marked = notifications.map((n) => ({ ...n, status: 'READ' }));
        setNotifications(marked);
        setUnreadCount(0);
        userNotifRegistry.set('anonymous', { list: marked, unreadCount: 0 });
        notifyNotificationSubscribers('anonymous');
        return;
      }

      const res = await fetch(`${API_URL}/auth/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [] }), // empty ids marks all unread for user
      });

      if (!res.ok) {
        throw new Error('Failed to update notifications on server');
      }

      const data = await res.json().catch(() => ({}));
      const remainingUnread = typeof data?.unreadCount === 'number' ? data.unreadCount : 0;
      const marked = notifications.map((n) => ({ ...n, status: 'READ' }));

      setNotifications(marked);
      setUnreadCount(remainingUnread);
      userNotifRegistry.set(userId, { list: marked, unreadCount: remainingUnread });
      notifyNotificationSubscribers(userId);

      await AsyncStorage.setItem(
        `techartha_user_notifs_${userId}`,
        JSON.stringify({ list: marked, unreadCount: remainingUnread })
      ).catch(() => {});
    } catch (err: any) {
      Alert.alert(
        'Unable to Mark Notifications Read',
        'Could not update notification status. Please check your connection and try again.'
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Mark a single notification item as read
  const handleMarkSingleAsRead = async (item: AppNotificationItem) => {
    if (item.status === 'READ') return;
    const token = authStore.accessToken;
    const userId = authStore.userId || 'anonymous';

    const marked = notifications.map((n) => (n.id === item.id ? { ...n, status: 'READ' } : n));
    const newCount = Math.max(0, unreadCount - 1);
    setNotifications(marked);
    setUnreadCount(newCount);
    userNotifRegistry.set(userId, { list: marked, unreadCount: newCount });
    notifyNotificationSubscribers(userId);

    if (token) {
      fetch(`${API_URL}/auth/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [item.id] }),
      }).catch(() => {});
    }
  };

  const formattedBadgeCount = unreadCount > 99 ? '99+' : String(unreadCount);

  // Register active modals so hardware or header back dismisses them first
  useEffect(() => {
    if (langModalVisible) {
      return registerActiveModal('header_lang_modal', () => setLangModalVisible(false));
    }
  }, [langModalVisible]);

  useEffect(() => {
    if (notifModalVisible) {
      return registerActiveModal('header_notif_modal', () => setNotifModalVisible(false));
    }
  }, [notifModalVisible]);

  const currentLangCode = i18n.language || 'en';
  const currentLangObj = LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];

  const handleLanguageSelect = async (code: string) => {
    setLangModalVisible(false);
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('language', code);
    } catch (e) {
      console.log('AsyncStorage error', e);
    }
  };

  // Determine back button visibility
  const shouldShowBack =
    showBack !== undefined
      ? showBack
      : !hideBack && (back !== false && (back !== undefined || onBack !== undefined || canBack));

  // On Home screen, if there is no previous history to return to, back button is visually disabled
  const isHomeRoot = routeName === 'Home';
  const isBackDisabled = isHomeRoot && !canBack;

  // Intelligent back navigation respecting actual history, modals, unsaved changes, and nested stacks
  const handleBack = () => {
    if (typeof onBack === 'function') {
      handleGlobalBack(onBack as () => void);
    } else {
      handleGlobalBack();
    }
  };

  const handleLogoPress = () => {
    const isAuthenticated = Boolean(authStore.accessToken);
    try {
      if (navigationRef.isReady()) {
        if (isAuthenticated) {
          (navigationRef as any).navigate('MainTabs', { screen: 'Home' });
        } else {
          (navigationRef as any).navigate('Welcome');
        }
      }
    } catch (e) {
      navigation.navigate(isAuthenticated ? 'Home' : 'Welcome');
    }
  };

  const handleCloseNotifModal = () => {
    setNotifModalVisible(false);
  };

  const topInset = Math.max(insets.top, 14);

  return (
    <View
      style={[
        localStyles.headerContainer,
        {
          paddingTop: topInset,
          minHeight: 54 + topInset,
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderBottomColor: isDark ? colors.border : '#EDF2F7',
        },
      ]}
    >
      <View style={localStyles.headerContent}>
        {/* Left Section: Back Button + Immediately Adjacent TechArtha Logo */}
        <View style={localStyles.leftBrandRow}>
          {shouldShowBack && (
            <Pressable
              onPress={handleBack}
              disabled={isBackDisabled}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              style={[
                localStyles.backBtn,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                },
                isBackDisabled && localStyles.backBtnDisabled,
              ]}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityState={{ disabled: isBackDisabled }}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={
                  isBackDisabled
                    ? isDark
                      ? colors.textPlaceholder
                      : '#94A3B8'
                    : isDark
                    ? colors.textPrimary
                    : '#102A54'
                }
              />
            </Pressable>
          )}

          {showLogo !== false && (
            <Pressable
              onPress={handleLogoPress}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 6 }}
              style={localStyles.logoPressable}
              accessibilityRole="button"
              accessibilityLabel="TechArtha"
            >
              <Image
                source={require('../../assets/logo.png')}
                style={localStyles.logoImage}
                resizeMode="contain"
                accessible={true}
                accessibilityLabel="TechArtha"
              />
            </Pressable>
          )}
        </View>

        {/* Right Section: Language Picker + Notifications + Settings */}
        <View style={localStyles.rightSection}>
          {rightAction}
          {showLanguage && (
            <Pressable
              onPress={() => setLangModalVisible(true)}
              hitSlop={6}
              style={[
                localStyles.langButton,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                },
              ]}
              accessibilityLabel={`Select language, current is ${currentLangObj.label}`}
              accessibilityRole="button"
            >
              <Ionicons name="globe-outline" size={14} color={isDark ? colors.textPrimary : '#3C3985'} />
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                style={[localStyles.langText, { color: isDark ? colors.textPrimary : '#3C3985' }]}
              >
                {currentLangObj.code.toUpperCase()}
              </Text>
              <Ionicons name="chevron-down" size={11} color={isDark ? colors.textPrimary : '#3C3985'} />
            </Pressable>
          )}

          {showNotifications && (
            <Pressable
              onPress={() => setNotifModalVisible(true)}
              hitSlop={6}
              style={[
                localStyles.iconButton,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                },
              ]}
              accessibilityLabel={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, no unread alerts'
              }
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={18} color={isDark ? colors.textPrimary : '#3C3985'} />
              {unreadCount > 0 && (
                <View style={localStyles.unreadBadge}>
                  <Text style={localStyles.unreadBadgeText} maxFontSizeMultiplier={1.1}>
                    {formattedBadgeCount}
                  </Text>
                </View>
              )}
            </Pressable>
          )}

          {showSettings && (
            <Pressable
              onPress={onSettingsPress || (() => navigation.navigate('Settings'))}
              hitSlop={6}
              style={[
                localStyles.iconButton,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : '#F0EFFB',
                  borderColor: isDark ? colors.border : '#E2E8F0',
                },
              ]}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={18} color={isDark ? colors.textPrimary : '#3C3985'} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <Pressable style={localStyles.overlay} onPress={() => setLangModalVisible(false)}>
          <Pressable
            style={[
              localStyles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={localStyles.modalHeader}>
              <Text style={[localStyles.modalTitle, { color: colors.textPrimary }]}>Select Language</Text>
              <Pressable onPress={() => setLangModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={isDark ? colors.textMuted : '#64748B'} />
              </Pressable>
            </View>
            <ScrollView style={localStyles.scrollView} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang) => {
                const isSelected = currentLangCode === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    style={[
                      localStyles.langRow,
                      { backgroundColor: isDark ? colors.surfaceMuted : '#F8F9FB' },
                      isSelected && [
                        localStyles.langRowSelected,
                        { backgroundColor: isDark ? colors.primaryLight : '#EBEBFA', borderColor: colors.primary },
                      ],
                    ]}
                    onPress={() => handleLanguageSelect(lang.code)}
                  >
                    <View style={localStyles.radioContainer}>
                      <View
                        style={[
                          localStyles.radio,
                          { borderColor: colors.border },
                          isSelected && [
                            localStyles.radioSelected,
                            { borderColor: colors.primary, backgroundColor: colors.primary },
                          ],
                        ]}
                      />
                    </View>
                    <View style={localStyles.langTextContainer}>
                      <Text
                        style={[
                          localStyles.nativeText,
                          { color: colors.textPrimary },
                          isSelected && { color: colors.primary },
                        ]}
                      >
                        {lang.native}
                      </Text>
                      <Text
                        style={[
                          localStyles.labelText,
                          { color: colors.textMuted },
                          isSelected && { color: colors.primary },
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Global Notifications Modal */}
      <Modal
        visible={notifModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseNotifModal}
      >
        <Pressable style={localStyles.overlay} onPress={handleCloseNotifModal}>
          <Pressable
            style={[
              localStyles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={localStyles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 8 }}>
                <Ionicons name="notifications" size={18} color={colors.primary} />
                <Text style={[localStyles.modalTitle, { color: colors.textPrimary, flexShrink: 1 }]}>
                  Notifications & Alerts
                </Text>
              </View>
              {unreadCount > 0 && (
                <Pressable
                  onPress={() => void handleMarkAllAsRead()}
                  style={localStyles.markReadBtn}
                  hitSlop={8}
                >
                  <Text style={[localStyles.markReadText, { color: colors.primary }]}>Mark all read</Text>
                </Pressable>
              )}
              <Pressable onPress={handleCloseNotifModal} hitSlop={10}>
                <Ionicons name="close" size={22} color={isDark ? colors.textMuted : '#64748B'} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={localStyles.emptyNotifBox}>
                  <Ionicons name="notifications-off-outline" size={34} color={colors.textPlaceholder} />
                  <Text style={[localStyles.emptyNotifTitle, { color: colors.textPrimary }]}>No notifications</Text>
                  <Text style={[localStyles.emptyNotifSub, { color: colors.textSecondary }]}>
                    You're all caught up! Meaningful investment updates and alerts will appear here.
                  </Text>
                </View>
              ) : (
              <View style={localStyles.notifList}>
                {notifications.map((item) => {
                  const isUnread = item.status !== 'READ';
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => void handleMarkSingleAsRead(item)}
                      style={[
                        localStyles.notifItem,
                        {
                          backgroundColor: isUnread
                            ? isDark
                              ? colors.surfaceMuted
                              : '#F0EFFB'
                            : isDark
                            ? colors.surface
                            : '#F8F9FB',
                          borderColor: isUnread ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          localStyles.notifIconCircle,
                          { backgroundColor: isDark ? colors.surface : '#EBEBFA' },
                        ]}
                      >
                        <Ionicons name={item.icon} size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={localStyles.notifTopRow}>
                          <Text style={[localStyles.notifTitle, { color: colors.textPrimary, flex: 1, paddingRight: 6 }]}>
                            {item.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isUnread && <View style={localStyles.unreadItemDot} />}
                            <Text style={[localStyles.notifTime, { color: colors.textPlaceholder }]}>{item.time}</Text>
                          </View>
                        </View>
                        <Text style={[localStyles.notifBody, { color: colors.textMuted }]}>{item.body}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              )}
            </ScrollView>

            <Pressable
              style={[localStyles.closeBtn, { backgroundColor: colors.primary }]}
              onPress={handleCloseNotifModal}
            >
              <Text style={localStyles.closeBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const localStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    elevation: 2,
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 1000,
  },
  headerContent: {
    minHeight: 54,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  leftBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnDisabled: {
    opacity: 0.35,
    backgroundColor: '#F8F9FA',
    borderColor: '#E2E8F0',
  },
  logoPressable: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoImage: {
    height: 28,
    width: 106,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  langButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  langText: {
    color: '#3C3985',
    fontWeight: '700',
    fontSize: 11.5,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0EFFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    paddingHorizontal: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    lineHeight: 11,
    textAlign: 'center',
  },
  markReadBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0EFFB',
    marginRight: 6,
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  emptyNotifBox: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotifTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyNotifSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  unreadItemDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 84, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '82%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#102A54',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#102A54',
  },
  scrollView: {
    width: '100%',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FB',
  },
  langRowSelected: {
    backgroundColor: '#EBEBFA',
    borderWidth: 1,
    borderColor: '#3C3985',
  },
  radioContainer: {
    marginRight: 14,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E0',
  },
  radioSelected: {
    borderColor: '#3C3985',
    backgroundColor: '#3C3985',
  },
  langTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  nativeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A54',
    minWidth: 96,
  },
  labelText: {
    fontSize: 13,
    color: '#718096',
  },
  notifList: {
    gap: 10,
    marginBottom: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EBEBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
    gap: 6,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#102A54',
  },
  notifTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  notifBody: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  closeBtn: {
    backgroundColor: '#3C3985',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
