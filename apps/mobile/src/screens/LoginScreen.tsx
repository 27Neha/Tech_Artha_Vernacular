import React from 'react';
import { AuthScreen, AuthScreenProps } from './AuthScreen';

export const LoginScreen = (props: AuthScreenProps) => {
  return <AuthScreen {...props} defaultTab="login" />;
};

export default LoginScreen;
