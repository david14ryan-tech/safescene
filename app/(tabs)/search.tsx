import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { searchMulti, posterUrl, type TmdbSearchItem } from "../../src/lib/tmdb";

export default function Search() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TmdbSearchItem[]>([]);

  const onSearch = async () => {
    try {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }

      setLoading(true);
      const items = await searchMulti(q);
      setResults(items);
    } catch (e: any) {
      Alert.alert("Search failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Search Movies & TV</Text>

      <View style={{ gap: 8 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for a movie or TV show..."
          autoCapitalize="none"
          style={{ borderWidth: 1, padding: 12, borderRadius: 10 }}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />

        <Pressable
          onPress={onSearch}
          disabled={loading}
          style={{
            borderWidth: 1,
            borderRadius: 10,
            padding: 12,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text>{loading ? "Searching..." : "Search"}</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator />}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.media_type}-${item.id}`}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const title = item.media_type === "movie" ? item.title : item.name;
          const date = item.media_type === "movie" ? item.release_date : item.first_air_date;
          const img = posterUrl(item.poster_path, "w185");

          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/title",
                  params: { id: String(item.id), type: item.media_type },
                })
              }
              style={{
                flexDirection: "row",
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 1,
              }}
            >
              {img ? (
                <Image source={{ uri: img }} style={{ width: 50, height: 75, borderRadius: 8 }} />
              ) : (
                <View
                  style={{
                    width: 50,
                    height: 75,
                    borderRadius: 8,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text>No img</Text>
                </View>
              )}

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "600" }}>{title ?? "Untitled"}</Text>
                <Text>
                  {item.media_type.toUpperCase()}
                  {date ? ` • ${date}` : ""}
                </Text>
                {!!item.overview && <Text numberOfLines={2}>{item.overview}</Text>}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={!loading ? <Text>Search results will appear here.</Text> : null}
      />
    </View>
  );
}

