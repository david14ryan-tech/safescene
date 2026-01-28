import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function Register() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 20 }}>Register Screen</Text>
      <Link href="/(auth)/login">Already have an account? Login</Link>
    </View>
  );
}
