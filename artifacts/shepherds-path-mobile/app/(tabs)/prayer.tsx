import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { fetchPrayerWall, submitPrayer, prayForEntry } from "@/lib/api";

const SESSION_ID_KEY = "sp_session_id";

export default function PrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState("");
  const [newPrayer, setNewPrayer] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_ID_KEY).then((id) => { if (id) setSessionId(id); });
  }, []);

  const { data: prayers, isLoading } = useQuery({
    queryKey: ["prayer-wall", sessionId],
    queryFn: () => fetchPrayerWall(sessionId),
    enabled: !!sessionId,
    staleTime: 30000,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitPrayer(newPrayer.trim(), sessionId),
    onSuccess: () => {
      setNewPrayer("");
      setShowInput(false);
      queryClient.invalidateQueries({ queryKey: ["prayer-wall", sessionId] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const prayMutation = useMutation({
    mutationFn: (id: number) => prayForEntry(id, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prayer-wall", sessionId] }),
  });

  const styles = makeStyles(colors, insets);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card} testID={`card-prayer-${item.id}`}>
      <Text style={styles.prayerText}>{item.request}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.prayerCount}>
          <Feather name="heart" size={12} color={colors.mutedForeground} /> {item.prayCount ?? 0} praying
        </Text>
        <TouchableOpacity
          style={[styles.prayBtn, item.hasPrayed && styles.prayBtnActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); prayMutation.mutate(item.id); }}
          testID={`button-pray-${item.id}`}
          disabled={item.hasPrayed}
        >
          <Text style={[styles.prayBtnText, item.hasPrayed && { color: colors.primaryForeground }]}>
            {item.hasPrayed ? "Prayed" : "I'll pray"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={prayers ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Prayer Wall</Text>
            <Text style={styles.subtitle}>Lift one another up in prayer</Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="heart" size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>No prayer requests yet</Text>
              <Text style={styles.emptySubtext}>Be the first to share</Text>
            </View>
          ) : null
        }
        ListFooterComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!(prayers && prayers.length > 0)}
      />

      {/* Submit area */}
      {showInput ? (
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={styles.input}
            value={newPrayer}
            onChangeText={setNewPrayer}
            placeholder="Share your prayer request..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            autoFocus
            testID="input-prayer"
          />
          <View style={styles.inputActions}>
            <TouchableOpacity onPress={() => setShowInput(false)} testID="button-cancel-prayer">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!newPrayer.trim() || submitMutation.isPending) && styles.submitBtnDisabled]}
              onPress={() => submitMutation.mutate()}
              disabled={!newPrayer.trim() || submitMutation.isPending}
              testID="button-submit-prayer"
            >
              <Text style={styles.submitBtnText}>
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.fab, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowInput(true); }}
            testID="button-add-prayer"
          >
            <Feather name="plus" size={24} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: {
      paddingHorizontal: 16,
      paddingBottom: insets.bottom + 80,
      paddingTop: isWeb ? 67 : 0,
    },
    header: { marginBottom: 20, marginTop: 8 },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground },
    subtitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 4 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    prayerText: { fontSize: 15, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 12, justifyContent: "space-between" },
    prayerCount: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    prayBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    prayBtnActive: { backgroundColor: colors.primary },
    prayBtnText: { fontSize: 13, color: colors.primary, fontFamily: "Inter_600SemiBold" },
    empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
    emptyText: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    emptySubtext: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    inputArea: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      minHeight: 80,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    cancelText: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    submitBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: 8,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    fab: { position: "absolute", right: 20 },
    fabBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
