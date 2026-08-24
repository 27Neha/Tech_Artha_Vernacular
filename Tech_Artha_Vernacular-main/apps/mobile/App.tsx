import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

function MainTabs({ route }: any) {
  const { name } = route?.params || {};
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3C3985',
        tabBarInactiveTintColor: '#A0AEC0',
      })}
    >
      <Tab.Screen name="Home">
        {(props) => <HomeScreen {...props} name={name} />}
      </Tab.Screen>
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Language">
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login">
          {(props) => <LoginScreen {...props} phone={phone} setPhone={setPhone} apiUrl={API_URL} />}
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
              apiUrl={API_URL} 
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
        <Stack.Screen name="RiskProfileResult" component={GoalSelectionScreen} />
        <Stack.Screen name="InvestmentBuckets" component={InvestmentBucketsScreen} />
        <Stack.Screen name="PlanSummary" component={PlanSummaryScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Funds">
          {(props) => <FundsScreen {...props} apiUrl={API_URL} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
