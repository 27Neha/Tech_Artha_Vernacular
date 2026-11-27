import React from 'react';
import { AuthScreen, AuthScreenProps } from './AuthScreen';

export const SignupScreen = (props: AuthScreenProps) => {
  return <AuthScreen {...props} defaultTab="signup" />;
};

export default SignupScreen;
