import { Redirect } from 'expo-router';
 export default function Index() {
      // Redirects the user from the root route "/" to "/create-account"
      return <Redirect href="/create-account" />;
    }