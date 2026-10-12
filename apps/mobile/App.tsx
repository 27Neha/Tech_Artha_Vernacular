import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { LanguageScreen } from './src/screens/LanguageScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { ParentalApprovalScreen } from './src/screens/ParentalApprovalScreen';
import { MinorGuardianScreen } from './src/screens/MinorGuardianScreen';
import { MinorGuardianVerificationScreen } from './src/screens/MinorGuardianVerificationScreen';
import { MinorConsentScreen } from './src/screens/MinorConsentScreen';
import { MinorReviewScreen } from './src/screens/MinorReviewScreen';
import { KycScreen } from './src/screens/KycScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { FundsScreen } from './src/screens/FundsScreen';
import { FundDetailsScreen } from './src/screens/FundDetailsScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { LearnScreen } from './src/screens/LearnScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RiskAssessmentScreen } from './src/screens/RiskAssessmentScreen';
import { RiskResultScreen } from './src/screens/RiskResultScreen';
import { GoalSelectionScreen } from './src/screens/GoalSelectionScreen';
import { InvestmentBucketsScreen } from './src/screens/InvestmentBucketsScreen';
import { PlanSummaryScreen } from './src/screens/PlanSummaryScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { CustomBucketScreen } from './src/screens/CustomBucketScreen';
import { InvestScreen } from './src/screens/InvestScreen';
import { AuthProvider, useAuth } from './src/store/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const navigationRef = createNavigationContainerRef();

function MainTabs({ route }: any) {
  const { name } = route?.params || {};
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3C3985',
        tabBarInactiveTintColor: '#A0AEC0',
      }}
    >
      <Tab.Screen name="Home">{(props) => <HomeScreen {...props} name={name} />}</Tab.Screen>
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const previousStatus = useRef(status);

  // Signing out - or a 401 that the api client turned into one - must take the user back
  // to the start rather than leaving them on a signed-in screen that silently fails.
  useEffect(() => {
    if (previousStatus.current === 'authenticated' && status === 'anonymous' && navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Language' as never }] });
    }
    previousStatus.current = status;
  }, [status]);

  // Nothing renders until the keychain has been read, so initialRouteName is decided
  // once with the real answer: a returning user lands in the app, not on the splash.
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
      initialRouteName={status === 'authenticated' ? 'MainTabs' : 'Login'}
    >
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} phone={phone} setPhone={setPhone} />}
      </Stack.Screen>
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="ParentalApproval" component={ParentalApprovalScreen} />
      <Stack.Screen name="MinorGuardian" component={MinorGuardianScreen} />
      <Stack.Screen name="MinorGuardianVerification" component={MinorGuardianVerificationScreen} />
      <Stack.Screen name="MinorConsent" component={MinorConsentScreen} />
      <Stack.Screen name="MinorReview" component={MinorReviewScreen} />
      <Stack.Screen name="KYC">
        {(props) => (
          <KycScreen
            {...props}
            phone={phone}
            name={name}
            setName={setName}
            pan={pan}
            setPan={setPan}
            consent={consent}
            setConsent={setConsent}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
      <Stack.Screen name="RiskResult" component={RiskResultScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="InvestmentBuckets" component={InvestmentBucketsScreen} />
      <Stack.Screen name="PlanSummary" component={PlanSummaryScreen} />
      <Stack.Screen name="Plan" component={PlanScreen} />
      <Stack.Screen name="CustomBucket" component={CustomBucketScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="FundDetails" component={FundDetailsScreen} />
      <Stack.Screen name="Funds" component={FundsScreen} />
      <Stack.Screen name="Invest" component={InvestScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
