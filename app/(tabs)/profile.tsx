import { View, Text, Pressable, Alert } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../src/lib/firebase";
import { useAuth } from "../../src/contexts/AuthContext";


export default function Profile() {
  const { user } = useAuth();

  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      Alert.alert("Logout failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Profile</Text>
      <Text>Signed in as: {user?.email ?? "Unknown"}</Text>

      <Pressable
        onPress={onLogout}
        style={{ padding: 14, borderRadius: 8, borderWidth: 1, alignItems: "center" }}
      >
        <Text>Logout</Text>
      </Pressable>
    </View>
  );
}
