import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { LanguageScreen } from './src/screens/LanguageScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { KycScreen } from './src/screens/KycScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { FundsScreen } from './src/screens/FundsScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { LearnScreen } from './src/screens/LearnScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RiskAssessmentScreen } from './src/screens/RiskAssessmentScreen';
import { GoalSelectionScreen } from './src/screens/GoalSelectionScreen';
import { InvestmentBucketsScreen } from './src/screens/InvestmentBucketsScreen';
import { PlanSummaryScreen } from './src/screens/PlanSummaryScreen';
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
      initialRouteName={status === 'authenticated' ? 'MainTabs' : 'Language'}
    >
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} phone={phone} setPhone={setPhone} />}
      </Stack.Screen>
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
      <Stack.Screen name="RiskProfileResult" component={GoalSelectionScreen} />
      <Stack.Screen name="InvestmentBuckets" component={InvestmentBucketsScreen} />
      <Stack.Screen name="PlanSummary" component={PlanSummaryScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Funds" component={FundsScreen} />
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
