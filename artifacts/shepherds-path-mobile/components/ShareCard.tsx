import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 360;

export type ShareCardType = "verse" | "prayer" | "devotional";

interface ShareCardProps {
  type: ShareCardType;
  mainText: string;
  reference?: string;
  subText?: string;
}

export default function ShareCard({ type, mainText, reference, subText }: ShareCardProps) {
  const topLabel =
    type === "verse" ? "TODAY'S WORD" :
    type === "prayer" ? "GOD HEARD THIS" :
    "DEVOTIONAL";

  return (
    <LinearGradient
      colors={["#5A0070", "#7A018D", "#3D0050"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.card}
    >
      {/* Decorative circles */}
      <View style={styles.circleTop} />
      <View style={styles.circleBottom} />

      {/* Top brand row */}
      <View style={styles.topRow}>
        <View style={styles.brandPill}>
          <Text style={styles.brandPillText}>✦ SHEPHERD'S PATH</Text>
        </View>
        <Text style={styles.topLabel}>{topLabel}</Text>
      </View>

      {/* Main content */}
      <View style={styles.body}>
        {type === "prayer" && (
          <Feather name="heart" size={22} color="rgba(255,255,255,0.5)" style={{ marginBottom: 10 }} />
        )}
        <Text style={styles.mainText} numberOfLines={8}>
          "{mainText}"
        </Text>
        {!!reference && (
          <View style={styles.referenceRow}>
            <View style={styles.goldLine} />
            <Text style={styles.referenceText}>{reference}</Text>
            <View style={styles.goldLine} />
          </View>
        )}
        {!!subText && (
          <Text style={styles.subText} numberOfLines={3}>{subText}</Text>
        )}
      </View>

      {/* CTA footer */}
      <View style={styles.footer}>
        <Text style={styles.footerCta}>Find peace in the moment.</Text>
        <Text style={styles.footerApp}>Download Shepherd's Path</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    borderRadius: 0,
    padding: 28,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  circleTop: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  circleBottom: {
    position: "absolute",
    bottom: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandPill: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  brandPillText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
  topLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
  },
  mainText: {
    color: "#ffffff",
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    lineHeight: 27,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 16,
  },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  goldLine: {
    height: 1,
    width: 24,
    backgroundColor: "#D4880E",
  },
  referenceText: {
    color: "#D4880E",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  subText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
  },
  footer: {
    alignItems: "center",
    gap: 2,
  },
  footerCta: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  footerApp: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
