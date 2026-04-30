import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { submitPrayer, PRAYER_CATEGORIES, type PrayerCategory } from "@/lib/api";

const REPORT_REASONS = [
  { key: "harmful", label: "Harmful or abusive" },
  { key: "spam", label: "Spam" },
  { key: "inappropriate", label: "Inappropriate content" },
  { key: "divisive", label: "Theological argument / divisive" },
  { key: "personal_info", label: "Contains personal information" },
  { key: "other", label: "Other" },
];

export default function SubmitPrayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { isSubscribed } = useSubscription();

  const [request, setRequest] = useState("");
  const [category, setCategory] = useState<PrayerCategory>("Other");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [crisisMessage, setCrisisMessage] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const styles = makeStyles(colors, insets);

  const handleSubmit = async () => {
    if (!request.trim() || request.trim().length < 5) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    setCrisisMessage("");

    const result = await submitPrayer({
      request: request.trim(),
      sessionId: sessionId || "",
      category,
      isAnonymous,
      displayName: isAnonymous ? undefined : displayName.trim() || undefined,
      isPro: isSubscribed,
    });

    setSubmitting(false);

    if (result.error === "self_harm" && result.crisis) {
      setCrisisMessage(result.crisis);
      return;
    }
    if (result.error === "free_limit") {
      setLimitReached(true);
      return;
    }
    if (result.error === "content_unsafe") {
      Alert.alert(
        "Unable to share",
        "Your request includes content that cannot be posted. Please review and try again.",
        [{ text: "OK" }]
      );
      return;
    }
    if (result.error) {
      Alert.alert("Something went wrong", "Please try again.", [{ text: "OK" }]);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
  };

  if (success) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.successIcon}>
          <Feather name="heart" size={36} color="#ffffff" />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Your prayer has been shared.</Text>
        <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
          Others can now stand with you in prayer.
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.submitBtnText}>Return to Prayer Wall</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (limitReached) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <Feather name="lock" size={36} color={colors.mutedForeground} />
        <Text style={[styles.successTitle, { color: colors.foreground }]}>You've shared today's prayer request.</Text>
        <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
          Free members can post once per day. Pro gives you more room to share, reflect, and keep your prayer journey without interruption.
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/subscription")}
        >
          <Text style={styles.submitBtnText}>Explore Pro</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.back()}>
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Share a Prayer</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        You can share as much or as little as you want. This is a safe place to be prayed for.
      </Text>

      {/* Crisis message */}
      {!!crisisMessage && (
        <View style={[styles.crisisCard, { backgroundColor: "#7A018D22", borderColor: "#7A018D55" }]}>
          <Feather name="heart" size={18} color={colors.primary} />
          <Text style={[styles.crisisText, { color: colors.foreground }]}>{crisisMessage}</Text>
        </View>
      )}

      {/* Prayer text */}
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Your prayer request</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        value={request}
        onChangeText={setRequest}
        placeholder="What would you like others to pray over?"
        placeholderTextColor={colors.mutedForeground}
        multiline
        maxLength={500}
        textAlignVertical="top"
        testID="input-prayer-request"
      />
      <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{request.length}/500</Text>

      {/* Category */}
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Category</Text>
      <TouchableOpacity
        style={[styles.categoryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowCategoryPicker(true)}
        testID="button-category"
      >
        <Text style={[styles.categoryBtnText, { color: colors.foreground }]}>{category}</Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Anonymous toggle */}
      <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Post anonymously</Text>
          <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
            {isAnonymous ? "Shows as "Anonymous Believer"" : "Shows your first name only"}
          </Text>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#ffffff"
          testID="toggle-anonymous"
        />
      </View>

      {!isAnonymous && (
        <TextInput
          style={[styles.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your first name (optional)"
          placeholderTextColor={colors.mutedForeground}
          maxLength={40}
          testID="input-display-name"
        />
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (request.trim().length < 5 || submitting) ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={request.trim().length < 5 || submitting}
        testID="button-submit-prayer"
      >
        {submitting
          ? <ActivityIndicator color="#ffffff" />
          : <Text style={styles.submitBtnText}>Share My Prayer</Text>}
      </TouchableOpacity>

      <Text style={[styles.safetyNote, { color: colors.mutedForeground }]}>
        All prayer requests are reviewed for safety. Content involving harm or personal information cannot be posted.
      </Text>

      {/* Category picker modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choose a category</Text>
            {PRAYER_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.modalOption, category === cat && { backgroundColor: colors.primary + "22" }]}
                onPress={() => { setCategory(cat); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.modalOptionText, { color: colors.foreground }, category === cat && { color: colors.primary, fontWeight: "700" }]}>
                  {cat}
                </Text>
                {category === cat && <Feather name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: any, insets: any) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: isWeb ? 67 : 0 },
    successContainer: { alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32, paddingTop: isWeb ? 67 : 0 },
    successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
    successBody: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
    intro: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 24, marginTop: 8 },
    crisisCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 20 },
    crisisText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
    fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8, marginTop: 16 },
    textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 120, lineHeight: 22 },
    charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
    categoryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, borderWidth: 1, padding: 14 },
    categoryBtnText: { fontSize: 15, fontFamily: "Inter_400Regular" },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, borderWidth: 1, padding: 14, marginTop: 16 },
    toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
    toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
    nameInput: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 12 },
    submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 24 },
    submitBtnText: { color: "#ffffff", fontFamily: "Inter_700Bold", fontSize: 16 },
    cancelText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
    safetyNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 16, lineHeight: 18 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4, paddingBottom: 40 },
    modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
    modalOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
    modalOptionText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  });
}
