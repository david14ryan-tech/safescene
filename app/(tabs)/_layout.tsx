import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../../src/contexts/AuthContext";



export default function TabLayout() {
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (initializing) return;
    if (!user) router.replace("/(auth)/login");
  }, [user, initializing]);

  return (
    <Tabs>
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
