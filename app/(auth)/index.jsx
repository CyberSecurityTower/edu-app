// app/(auth)/index.jsx

import { Redirect } from 'expo-router';

export default function AuthIndex() {
  // This component will immediately redirect the user from the base '(auth)' route
  // to the 'create-account' screen.
  return <Redirect href="/create-account" />;
}