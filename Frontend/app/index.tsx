import { Redirect } from "expo-router";

// for now automatically redirects to the welcome screen
// once add authentication can check if user is loged in and redirect to either
// auth welcomescreen or just straight to the dashboard welcomescreen
export default function Index() {
  return <Redirect href="/screens/onboarding/WelcomeScreen" />;
}