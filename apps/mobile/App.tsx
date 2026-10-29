import React, { useEffect, useRef } from 'react';
import './src/i18n/i18n';
import { ActivityIndicator, View, Text, Linking } from 'react-native';
import { NavigationContainer, createNavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { HomeIcon, TrendingIcon, WalletIcon, BookIcon, UserIcon, HeadsetIcon } from './src/components/Icons';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { LanguageScreen } from './src/screens/LanguageScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { KycScreen } from './src/screens/KycScreen';
import { HomeScreen } from './src/screens/HomeScreen';
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
import { InvestmentBucketsScreen } from './src/screens/InvestmentBucketsScreen';
import { CustomBucketScreen } from './src/screens/CustomBucketScreen';
import { PlanSummaryScreen } from './src/screens/PlanSummaryScreen';
import { GoalDetailsScreen } from './src/screens/GoalDetailsScreen';
import { ArticleScreen } from './src/screens/ArticleScreen';
import { FamilyPortfolioScreen } from './src/screens/FamilyPortfolioScreen';
import { EditGoalScreen } from './src/screens/EditGoalScreen';
import { InvestScreen } from './src/screens/InvestScreen';
import { FundDetailScreen } from './src/screens/FundDetailScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { BankAccountsScreen } from './src/screens/BankAccountsScreen';
import { NomineeDetailsScreen } from './src/screens/NomineeDetailsScreen';
import { ActiveMandatesScreen } from './src/screens/ActiveMandatesScreen';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const navigationRef = createNavigationContainerRef();

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
    },
  },
};

function MainTabs({ route }: any) {
  const { name } = route?.params || {};
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textPlaceholder,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 85,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 24,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10
        },
        tabBarIcon: ({ focused }) => {
          let IconComponent;
          let label = route.name;
          if (route.name === 'Home') IconComponent = HomeIcon;
          else if (route.name === 'Portfolio') IconComponent = TrendingIcon;
          else if (route.name === 'Expenses') IconComponent = WalletIcon;
          else if (route.name === 'Assistant') IconComponent = HeadsetIcon;
          else if (route.name === 'Profile') IconComponent = UserIcon;
          else IconComponent = HomeIcon;

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 64 }}>
              <IconComponent color={focused ? colors.primary : colors.textPlaceholder} size={24} />
              <Text style={{ 
                marginTop: 4, 
                fontSize: 11, 
                fontWeight: focused ? '800' : '600', 
                color: focused ? colors.primary : colors.textPlaceholder 
              }}>
                {label}
              </Text>
            </View>
          );
        }
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} name={name} />}
      </Tab.Screen>
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const previousStatus = useRef(status);

  // Signing out - or a 401 that the api client turned into one - must take the user back
  // to the start rather than leaving them on a signed-in screen that silently fails.
  useEffect(() => {
    if (previousStatus.current === 'authenticated' && status === 'anonymous' && navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Language' as never }] });
    }
    previousStatus.current = status;
  }, [status]);

  // Handle WhatsApp resume deep links (e.g. techartha://resume?target=EditProfile&ref=...)
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        const url = event?.url;
        if (!url || typeof url !== 'string' || !url.includes('resume')) return;

        // Safe parameter extraction avoiding dependency on WHATWG URL constructor
        const getParam = (src: string, key: string) => {
          const match = src.match(new RegExp('[?&]' + key + '=([^&#]*)'));
          return match ? decodeURIComponent(match[1]) : null;
        };

        const target = getParam(url, 'target') || 'EditProfile';
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
      if (initialUrl && initialUrl.includes('resume')) {
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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={status === 'authenticated' ? 'MainTabs' : 'Language'}
    >
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Signup">
        {(props) => <SignupScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      <Stack.Screen name="KYC">
        {(props) => <KycScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
      {/* Both names resolve to the result screen. The cherry-picked version pointed
          RiskProfileResult at GoalSelectionScreen, which skipped the risk result
          entirely - every one of our screens navigates to RiskProfileResult. */}
      <Stack.Screen name="RiskProfileResult" component={RiskResultScreen} />
      <Stack.Screen name="RiskResult" component={RiskResultScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="InvestmentBuckets" component={InvestmentBucketsScreen} />
      <Stack.Screen name="CustomBucket" component={CustomBucketScreen} />
      <Stack.Screen name="PlanSummary" component={PlanSummaryScreen} />
      <Stack.Screen name="GoalDetails" component={GoalDetailsScreen} />
      <Stack.Screen name="Article" component={ArticleScreen} />
      <Stack.Screen name="Learn" component={LearnScreen} />
      <Stack.Screen name="FamilyPortfolio" component={FamilyPortfolioScreen} />
      <Stack.Screen name="EditGoal" component={EditGoalScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Funds">
        {(props) => <FundsScreen {...props} apiUrl={API_URL} />}
      </Stack.Screen>
      {/* Restored: the cherry-picked App.tsx predates these screens, so they were on
          disk but unreachable - including the email verification inside EditProfile. */}
      <Stack.Screen name="Invest" component={InvestScreen} />
      <Stack.Screen name="FundDetail" component={FundDetailScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="BankAccounts" component={BankAccountsScreen} />
      <Stack.Screen name="NomineeDetails" component={NomineeDetailsScreen} />
      <Stack.Screen name="ActiveMandates" component={ActiveMandatesScreen} />
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
    <NavigationContainer ref={navigationRef} theme={navTheme}>
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
