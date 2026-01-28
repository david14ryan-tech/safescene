import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "600" }}>SafeScene</Text>

      <Link href="(auth)/login">Go to Login</Link>
      <Link href="(auth)/register">Go to Register</Link>
      <Link href="(tabs)/search">Go to App (temporary)</Link>
    </View>
  );
}
