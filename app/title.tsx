import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { getDetails, posterUrl, type MediaType, type TmdbDetails } from "../src/lib/tmdb";
import { TRIGGERS, type TriggerKey } from "../src/constants/triggers";
import { useAuth } from "../src/contexts/AuthContext";
import { db } from "../src/lib/firebase";
import { titleKey as makeTitleKey, voteDocId } from "../src/lib/voteIds";

type TriggerValue = "yes" | "no" | "unsure" | null;
type VoteValue = Exclude<TriggerValue, null>;

type CommunityStat = {
  yes: number;
  no: number;
  unsure: number;
  total: number;
};

const COLORS = {
  yes: "#D32F2F", // red
  no: "#2E7D32", // green
  unsure: "#F57C00", // orange
  neutralBorder: "#C9C9C9",
  neutralBg: "transparent",
  neutralText: "#111",
  selectedText: "#fff",
};

function emptyCommunity(): Record<TriggerKey, CommunityStat> {
  return Object.fromEntries(
    TRIGGERS.map((t) => [t.key, { yes: 0, no: 0, unsure: 0, total: 0 }])
  ) as Record<TriggerKey, CommunityStat>;
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function topVerdict(stat: CommunityStat): { value: VoteValue; label: string; percent: number } | null {
  if (!stat.total) return null;

  const yesP = pct(stat.yes, stat.total);
  const noP = pct(stat.no, stat.total);
  const unP = pct(stat.unsure, stat.total);

  if (yesP >= noP && yesP >= unP) return { value: "yes", label: "Present", percent: yesP };
  if (noP >= yesP && noP >= unP) return { value: "no", label: "Not present", percent: noP };
  return { value: "unsure", label: "Unsure", percent: unP };
}

function labelForValue(v: VoteValue) {
  if (v === "yes") return "Present";
  if (v === "no") return "Not present";
  return "Unsure";
}

export default function Title() {
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<TmdbDetails | null>(null);
  const [savingKey, setSavingKey] = useState<TriggerKey | null>(null);

  const [community, setCommunity] = useState<Record<TriggerKey, CommunityStat>>(emptyCommunity());

  const initialSelections = useMemo(() => {
    return Object.fromEntries(TRIGGERS.map((t) => [t.key, null])) as Record<
      TriggerKey,
      TriggerValue
    >;
  }, []);

  const [triggerSelections, setTriggerSelections] = useState<Record<TriggerKey, TriggerValue>>(
    initialSelections
  );

  // Accordion state: store which trigger cards are expanded
  const [expanded, setExpanded] = useState<Set<TriggerKey>>(() => new Set());

  const mediaType: MediaType | null =
    type === "movie" || type === "tv" ? (type as MediaType) : null;

  const tmdbId = id ? Number(id) : NaN;

  const currentTitleKey = useMemo(() => {
    if (!mediaType || !Number.isFinite(tmdbId)) return null;
    return makeTitleKey(mediaType, tmdbId);
  }, [mediaType, tmdbId]);

  const toggleExpanded = (k: TriggerKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(TRIGGERS.map((t) => t.key)));
  const collapseAll = () => setExpanded(new Set());

  // Fetch TMDB title details
  useEffect(() => {
    const run = async () => {
      try {
        if (!mediaType) throw new Error("Invalid media type.");
        if (!Number.isFinite(tmdbId)) throw new Error("Invalid title id.");

        setLoading(true);
        const data = await getDetails(mediaType, tmdbId);
        setDetails(data);
      } catch (e: any) {
        Alert.alert("Failed to load title", e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [mediaType, tmdbId]);

  // Load user's votes for this title
  useEffect(() => {
    const run = async () => {
      try {
        if (!user) return;
        if (!currentTitleKey) return;

        setTriggerSelections(initialSelections);

        const qRef = query(
          collection(db, "triggerVotes"),
          where("uid", "==", user.uid),
          where("titleKey", "==", currentTitleKey)
        );

        const snap = await getDocs(qRef);

        const next = { ...initialSelections };
        snap.forEach((d) => {
          const data = d.data() as any;
          const k = data.triggerKey as TriggerKey;
          const v = data.value as TriggerValue;

          if (k && (v === "yes" || v === "no" || v === "unsure")) {
            next[k] = v;
          }
        });

        setTriggerSelections(next);
      } catch (e: any) {
        console.log("Failed to load user votes:", e?.message ?? e);
      }
    };

    run();
  }, [user, currentTitleKey, initialSelections]);

  // Load community votes for this title
  const refreshCommunity = async () => {
    try {
      if (!currentTitleKey) return;

      const qRef = query(collection(db, "triggerVotes"), where("titleKey", "==", currentTitleKey));
      const snap = await getDocs(qRef);

      const stats = emptyCommunity();

      snap.forEach((d) => {
        const data = d.data() as any;
        const k = data.triggerKey as TriggerKey;
        const v = data.value as VoteValue;

        if (!k) return;
        if (!(v === "yes" || v === "no" || v === "unsure")) return;

        stats[k][v] += 1;
        stats[k].total += 1;
      });

      setCommunity(stats);
    } catch (e: any) {
      console.log("Failed to load community votes:", e?.message ?? e);
    }
  };

  useEffect(() => {
    refreshCommunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTitleKey]);

  const saveVote = async (triggerKey: TriggerKey, value: VoteValue) => {
    try {
      if (!user) {
        Alert.alert("Not logged in", "Please log in to vote.");
        return;
      }
      if (!mediaType || !Number.isFinite(tmdbId) || !currentTitleKey) {
        Alert.alert("Error", "Missing title info.");
        return;
      }

      // optimistic UI
      setTriggerSelections((prev) => ({ ...prev, [triggerKey]: value }));
      setSavingKey(triggerKey);

      const voteId = voteDocId(mediaType, tmdbId, triggerKey, user.uid);
      const ref = doc(db, "triggerVotes", voteId);

      await setDoc(
        ref,
        {
          uid: user.uid,
          titleKey: currentTitleKey,
          tmdbId,
          mediaType,
          triggerKey,
          value,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      await refreshCommunity();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10 }}>Loading title…</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text>Could not load title.</Text>
      </View>
    );
  }

  const titleText = details.media_type === "movie" ? details.title : details.name;
  const date = details.media_type === "movie" ? details.release_date : details.first_air_date;
  const img = posterUrl(details.poster_path, "w500");
  const genres = (details.genres ?? []).map((g: { id: number; name: string }) => g.name).join(", ");

  const buttonStyle = (yourValue: TriggerValue, v: VoteValue, disabled: boolean) => {
    const selected = yourValue === v;
    return {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center" as const,
      backgroundColor: selected ? COLORS[v] : COLORS.neutralBg,
      borderColor: selected ? COLORS[v] : COLORS.neutralBorder,
      opacity: disabled ? 0.7 : 1,
    };
  };

  const buttonTextStyle = (yourValue: TriggerValue, v: VoteValue) => {
    const selected = yourValue === v;
    return {
      color: selected ? COLORS.selectedText : COLORS.neutralText,
      fontWeight: "600" as const,
    };
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {img ? (
        <Image source={{ uri: img }} style={{ width: "100%", height: 420, borderRadius: 16 }} />
      ) : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>{titleText ?? "Untitled"}</Text>
        <Text>
          {details.media_type.toUpperCase()}
          {date ? ` • ${date}` : ""}
        </Text>
        {!!genres && <Text>{genres}</Text>}
      </View>

      {!!details.overview && <Text style={{ lineHeight: 20 }}>{details.overview}</Text>}

      <View style={{ marginTop: 18, gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Trigger warnings</Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={expandAll}>
              <Text style={{ fontWeight: "600" }}>Expand all</Text>
            </Pressable>
            <Pressable onPress={collapseAll}>
              <Text style={{ fontWeight: "600" }}>Collapse all</Text>
            </Pressable>
          </View>
        </View>

        {TRIGGERS.map((t) => {
          const yourValue = triggerSelections[t.key];
          const stat = community[t.key];
          const verdict = topVerdict(stat);
          const isOpen = expanded.has(t.key);

          const yesPct = pct(stat.yes, stat.total);
          const noPct = pct(stat.no, stat.total);
          const unsurePct = pct(stat.unsure, stat.total);

          const badgeBg = verdict ? COLORS[verdict.value] : "#999";

          return (
            <View
              key={t.key}
              style={{
                padding: 12,
                borderWidth: 1,
                borderRadius: 12,
                gap: 10,
              }}
            >
              {/* Collapsed header: tap anywhere here to expand */}
              <Pressable onPress={() => toggleExpanded(t.key)} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontWeight: "800" }}>
                      {t.label}
                      {savingKey === t.key ? " (saving…)" : ""}
                    </Text>

                    {/* Quick summary line (always visible) */}
                    {verdict ? (
                      <Text style={{ opacity: 0.8 }}>
                        Community: {verdict.label} ({verdict.percent}%) • {stat.total} votes
                      </Text>
                    ) : (
                      <Text style={{ opacity: 0.6 }}>No votes yet</Text>
                    )}

                    {/* Your vote mini-line (always visible) */}
                    {yourValue ? (
                      <Text style={{ opacity: 0.8 }}>
                        Your vote:{" "}
                        <Text
                          style={{
                            fontWeight: "800",
                            color:
                              yourValue === "yes"
                                ? COLORS.yes
                                : yourValue === "no"
                                ? COLORS.no
                                : COLORS.unsure,
                          }}
                        >
                          {labelForValue(yourValue)}
                        </Text>
                      </Text>
                    ) : (
                      <Text style={{ opacity: 0.7 }}>Tap to vote</Text>
                    )}
                  </View>

                  {/* Badge + chevron */}
                  <View style={{ alignItems: "flex-end", gap: 8 }}>
                    {verdict ? (
                      <View
                        style={{
                          backgroundColor: badgeBg,
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "800" }}>
                          {verdict.label} {verdict.percent}%
                        </Text>
                      </View>
                    ) : null}

                    <Text style={{ fontWeight: "800", opacity: 0.7 }}>
                      {isOpen ? "▲" : "▼"}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Expanded content */}
              {isOpen ? (
                <View style={{ gap: 10 }}>
                  {/* Detailed community breakdown */}
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: COLORS.yes, fontWeight: "700" }}>
                      Present: {yesPct}% ({stat.yes})
                    </Text>
                    <Text style={{ color: COLORS.no, fontWeight: "700" }}>
                      Not present: {noPct}% ({stat.no})
                    </Text>
                    <Text style={{ color: COLORS.unsure, fontWeight: "700" }}>
                      Unsure: {unsurePct}% ({stat.unsure})
                    </Text>
                    <Text style={{ opacity: 0.75 }}>Total votes: {stat.total}</Text>
                  </View>

                  {/* Vote buttons */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => saveVote(t.key, "yes")}
                      style={buttonStyle(yourValue, "yes", !!savingKey && savingKey !== t.key)}
                    >
                      <Text style={buttonTextStyle(yourValue, "yes")}>Present</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => saveVote(t.key, "unsure")}
                      style={buttonStyle(yourValue, "unsure", !!savingKey && savingKey !== t.key)}
                    >
                      <Text style={buttonTextStyle(yourValue, "unsure")}>Unsure</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => saveVote(t.key, "no")}
                      style={buttonStyle(yourValue, "no", !!savingKey && savingKey !== t.key)}
                    >
                      <Text style={buttonTextStyle(yourValue, "no")}>Not present</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
