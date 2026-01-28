import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "SafeScene" }} />
      <Stack.Screen name="(auth)/login" options={{ title: "Login" }} />
      <Stack.Screen name="(auth)/register" options={{ title: "Register" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
