import { router } from "expo-router";
import { useEffect } from "react";
import { View, Text } from "react-native";
import { useAuth } from "../src/contexts/AuthContext";



export default function Index() {
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (initializing) return;
    if (user) router.replace("/(tabs)/search");
    else router.replace("/(auth)/login");
  }, [user, initializing]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Loading...</Text>
    </View>
  );
}
