import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function Login() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 20 }}>Login Screen</Text>
      <Link href="/(auth)/register">Need an account? Register</Link>
      <Link href="/(tabs)/search">Continue to App (temporary)</Link>
    </View>
  );
}
