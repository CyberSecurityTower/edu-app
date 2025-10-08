import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CreateAccountScreen from '../CreateAccountScreen';
import LoginScreen from '../LoginScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;