import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Text, Linking, Platform, StyleSheet } from 'react-native';
import './src/i18n/i18n';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { HomeIcon, TrendingIcon, WalletIcon, BookIcon, UserIcon, HeadsetIcon, CompassIcon, TargetIcon } from './src/components/Icons';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { LanguageScreen } from './src/screens/LanguageScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { KycScreen } from './src/screens/KycScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ArthaVerseScreen } from './src/screens/ArthaVerseScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { FundsScreen } from './src/screens/FundsScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { LearnScreen } from './src/screens/LearnScreen';
import { AssistantScreen } from './src/screens/AssistantScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { RiskAssessmentScreen } from './src/screens/RiskAssessmentScreen';
import { RiskResultScreen } from './src/screens/RiskResultScreen';
import { GoalSelectionScreen } from './src/screens/GoalSelectionScreen';
import { GoalDetailsScreen } from './src/screens/GoalDetailsScreen';
import { EditGoalScreen } from './src/screens/EditGoalScreen';
import { InvestmentBucketsScreen } from './src/screens/InvestmentBucketsScreen';
import { CustomBucketScreen } from './src/screens/CustomBucketScreen';
import { PlanSummaryScreen } from './src/screens/PlanSummaryScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { InvestScreen } from './src/screens/InvestScreen';
import { RedeemScreen } from './src/screens/RedeemScreen';
import { FundDetailScreen } from './src/screens/FundDetailScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { FamilyPortfolioScreen } from './src/screens/FamilyPortfolioScreen';
import { ArticleScreen } from './src/screens/ArticleScreen';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { ParentalApprovalScreen } from './src/screens/ParentalApprovalScreen';
import { BankAccountsScreen } from './src/screens/BankAccountsScreen';
import { NomineeDetailsScreen } from './src/screens/NomineeDetailsScreen';
import { ActiveMandatesScreen } from './src/screens/ActiveMandatesScreen';
import { MandateScreen } from './src/screens/MandateScreen';
import { MandateSuccessScreen } from './src/screens/MandateSuccessScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { PaymentSuccessScreen } from './src/screens/PaymentSuccessScreen';
import { TwoFactorSettingsScreen } from './src/screens/TwoFactorSettingsScreen';
import { PrivacyPolicyScreen } from './src/screens/PrivacyPolicyScreen';
import { TermsScreen } from './src/screens/TermsScreen';
import { RiskDisclosuresScreen } from './src/screens/RiskDisclosuresScreen';
import { PermissionsScreen } from './src/screens/PermissionsScreen';
import { NotificationPreferencesScreen } from './src/screens/NotificationPreferencesScreen';
import { SecuritySettingsScreen } from './src/screens/SecuritySettingsScreen';
import { LanguageSettingsScreen } from './src/screens/LanguageSettingsScreen';
import { ThemeSettingsScreen } from './src/screens/ThemeSettingsScreen';
import { StorageCacheScreen } from './src/screens/StorageCacheScreen';
import { HelpSupportScreen } from './src/screens/HelpSupportScreen';
import { FaqScreen } from './src/screens/FaqScreen';
import { LegalScreen } from './src/screens/LegalScreen';
import { MinorGuardianScreen } from './src/screens/minor/MinorGuardianScreen';
import { MinorVerifyScreen } from './src/screens/minor/MinorVerifyScreen';
import { MinorConsentScreen } from './src/screens/minor/MinorConsentScreen';
import { MinorReviewScreen } from './src/screens/minor/MinorReviewScreen';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { AppLockGate } from './src/components/AppLockGate';
import {
  navigationRef,
  recordTabVisit,
  initHardwareBackHandler,
  resetNavigationHistory,
} from './src/navigation/navigationService';
export { navigationRef };
import { API_URL } from './src/services/api/client';
import { Header } from './src/components/Header';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: ['techartha://', 'https://techartha.com', 'https://app.techartha.com'],
  config: {
    screens: {
      Language: 'language',
      Welcome: 'welcome',
      Signup: 'signup',
      Login: 'login',
      KYC: 'kyc',
      EditProfile: 'profile/edit',
      RiskAssessment: 'risk',
      RiskProfileResult: 'risk/result',
      GoalSelection: 'goals',
      MainTabs: 'dashboard',
      Mandates: 'mandates',
      ActiveMandates: 'mandates/active',
      MandateSuccess: 'mandate-complete',
      Payment: 'payment',
      PaymentSuccess: 'payment-complete',
      TwoFactorSettings: 'settings/2fa',
      PrivacyPolicy: 'privacy',
      Terms: 'terms',
      RiskDisclosures: 'risk-disclosures',
    },
  },
};

function MainTabs({ route }: any) {
  const { name } = route?.params || {};
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Responsive safe-area bottom padding for both Android (3-button / gesture) and iOS
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 12);
  const tabHeight = 56 + bottomInset;

  return (
    <Tab.Navigator
      backBehavior="history"
      screenListeners={({ route: tabRoute }) => ({
        focus: () => {
          recordTabVisit(tabRoute.name);
        },
      })}
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textPlaceholder,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: tabHeight,
          paddingHorizontal: 4,
          paddingTop: 6,
          paddingBottom: bottomInset,
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarIcon: ({ focused }) => {
          let IconComponent;
          const label = tabRoute.name;
          if (tabRoute.name === 'Home') IconComponent = HomeIcon;
          else if (tabRoute.name === 'Explore') IconComponent = CompassIcon;
          else if (tabRoute.name === 'Goals') IconComponent = TargetIcon;
          else if (tabRoute.name === 'Portfolio') IconComponent = TrendingIcon;
          else if (tabRoute.name === 'Profile') IconComponent = UserIcon;
          else IconComponent = HomeIcon;

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 48, paddingHorizontal: 2 }}>
              <IconComponent color={focused ? colors.primary : colors.textPlaceholder} size={22} />
              <Text 
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ 
                  marginTop: 3, 
                  fontSize: 10, 
                  fontWeight: focused ? '800' : '600', 
                  color: focused ? colors.primary : colors.textPlaceholder,
                  textAlign: 'center',
                }}
              >
                {label}
              </Text>
              {focused && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#F7941D',
                    marginTop: 3,
                  }}
                />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} name={name} />}
      </Tab.Screen>
      <Tab.Screen name="Explore" component={ArthaVerseScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const previousStatus = useRef(status);

  useEffect(() => {
    const cleanupHardwareBack = initHardwareBackHandler();
    return cleanupHardwareBack;
  }, []);

  useEffect(() => {
    if (previousStatus.current === 'authenticated' && status === 'anonymous' && navigationRef.isReady()) {
      resetNavigationHistory();
      navigationRef.reset({ index: 0, routes: [{ name: 'Welcome' as never }] });
    } else if (status === 'authenticated') {
      resetNavigationHistory();
    }
    previousStatus.current = status;
  }, [status]);

  // Handle WhatsApp resume deep links (e.g. techartha://resume?target=EditProfile&ref=...)
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        const url = event?.url;
        if (!url || typeof url !== 'string') return;
        const isKnownLink = url.includes('resume') || url.includes('mandate-complete') || url.includes('payment-complete');
        if (!isKnownLink) return;

        // Safe parameter extraction avoiding dependency on WHATWG URL constructor
        const getParam = (src: string, key: string) => {
          const match = src.match(new RegExp('[?&]' + key + '=([^&#]*)'));
          return match ? decodeURIComponent(match[1]) : null;
        };

        let target = getParam(url, 'target');
        if (!target) {
          if (url.includes('mandate-complete')) target = 'MandateSuccess';
          else if (url.includes('payment-complete')) target = 'PaymentSuccess';
          else target = 'EditProfile';
        }
        const refToken = getParam(url, 'ref');

        const doNavigate = () => {
          if (navigationRef.isReady()) {
            if (status === 'authenticated') {
              (navigationRef as any).navigate(target);
            } else {
              // Forward through Login screen first so credentials remain secure
              (navigationRef as any).navigate('Login', { returnTo: target, resumeRef: refToken });
            }
          }
        };

        if (navigationRef.isReady()) {
          doNavigate();
        } else {
          // If navigation container is still mounting, defer briefly
          const timer = setTimeout(doNavigate, 600);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        // Gracefully ignore malformed links
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl && (initialUrl.includes('resume') || initialUrl.includes('mandate-complete') || initialUrl.includes('payment-complete'))) {
        handleDeepLink({ url: initialUrl });
      }
    }).catch(() => {});

    return () => sub.remove();
  }, [status]);

  // Nothing renders until the keychain has been read, so initialRouteName is decided once
  // with the real answer: a returning user lands in the app, not on the language picker.
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#36358D" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={status === 'authenticated' ? 'MainTabs' : 'Welcome'}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Signup">
        {(props) => <SignupScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="ParentalApproval" component={ParentalApprovalScreen} />
      <Stack.Screen name="KYC">
        {(props) => <KycScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
      <Stack.Screen name="RiskResult" component={RiskResultScreen} />
      <Stack.Screen name="RiskProfileResult" component={RiskResultScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="GoalConfiguration" component={GoalSelectionScreen} />
      <Stack.Screen name="GoalDetails" component={GoalDetailsScreen} />
      <Stack.Screen name="EditGoal" component={EditGoalScreen} />
      <Stack.Screen name="InvestmentBuckets" component={InvestmentBucketsScreen} />
      <Stack.Screen name="CustomBucket" component={CustomBucketScreen} />
      <Stack.Screen name="PlanSummary" component={PlanSummaryScreen} />
      <Stack.Screen name="Plan" component={PlanScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Explore" component={ArthaVerseScreen} />
      <Stack.Screen name="ArthaVerse" component={ArthaVerseScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="GoalConfiguration" component={GoalSelectionScreen} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} />
      <Stack.Screen name="Funds">
        {(props) => <FundsScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      <Stack.Screen name="Invest" component={InvestScreen} />
      <Stack.Screen name="Redeem" component={RedeemScreen} />
      <Stack.Screen name="FundDetail" component={FundDetailScreen} />
      <Stack.Screen name="FundDetails" component={FundDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="FamilyPortfolio" component={FamilyPortfolioScreen} />
      <Stack.Screen name="Article" component={ArticleScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="Assistant" component={AssistantScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="BankAccounts" component={BankAccountsScreen} />
      <Stack.Screen name="NomineeDetails" component={NomineeDetailsScreen} />
      <Stack.Screen name="ActiveMandates" component={ActiveMandatesScreen} />
      <Stack.Screen name="Mandates" component={MandateScreen} />
      <Stack.Screen name="MandateSuccess" component={MandateSuccessScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <Stack.Screen name="TwoFactorSettings" component={TwoFactorSettingsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="RiskDisclosures" component={RiskDisclosuresScreen} />
      <Stack.Screen name="PhonePermissions" component={PermissionsScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
      <Stack.Screen name="StorageCache" component={StorageCacheScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="Faqs" component={FaqScreen} />
      <Stack.Screen name="LegalSettings" component={LegalScreen} />
      <Stack.Screen name="MinorGuardian" component={MinorGuardianScreen} />
      <Stack.Screen name="MinorVerify" component={MinorVerifyScreen} />
      <Stack.Screen name="MinorGuardianVerification" component={MinorVerifyScreen} />
      <Stack.Screen name="MinorConsent" component={MinorConsentScreen} />
      <Stack.Screen name="MinorReview" component={MinorReviewScreen} />
    </Stack.Navigator>
  );
}

function ThemedApp() {
  const { isDark, colors } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.canvas,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onStateChange={() => {
        const currentRoute = navigationRef.getCurrentRoute()?.name;
        if (currentRoute) {
          recordTabVisit(currentRoute);
        }
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppLockGate>
            <ThemedApp />
          </AppLockGate>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
