import React, { useState } from 'react';
import './src/i18n/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { HomeIcon, TrendingIcon, WalletIcon, BookIcon, UserIcon, HeadsetIcon } from './src/components/Icons';
import { View, Text } from 'react-native';

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
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 85,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 24,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10
        },
        tabBarIcon: ({ focused, color }) => {
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
              <IconComponent color={focused ? '#3C3985' : '#A0AEC0'} size={24} />
              <Text style={{ 
                marginTop: 4, 
                fontSize: 11, 
                fontWeight: focused ? '800' : '600', 
                color: focused ? '#3C3985' : '#A0AEC0' 
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

export default function App() {
  
  
  


  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Language">
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Signup">
          {(props) => <SignupScreen {...props} apiUrl={API_URL} />}
        </Stack.Screen>
        <Stack.Screen name="Login">
          {(props) => <LoginScreen {...props} apiUrl={API_URL} />}
        </Stack.Screen>
        <Stack.Screen name="KYC">
          {(props) => (
            <KycScreen 
              {...props}
               
               
               
               
               
               
               
              apiUrl={API_URL} 
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
        <Stack.Screen name="RiskProfileResult" component={GoalSelectionScreen} />
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
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
