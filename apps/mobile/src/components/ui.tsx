import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = {
  background: "#111827",
  surface: "#1f2937",
  elevated: "#273449",
  border: "#374151",
  text: "#f9fafb",
  muted: "#9ca3af",
  accent: "#6ee7b7",
  danger: "#fca5a5",
  success: "#86efac",
};

export function Page({
  children,
  scroll = true,
  ...props
}: ViewProps & { scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          {...props}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.page, styles.fill]} {...props}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

export function Heading({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Button({
  children,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
  busy = false,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondaryButton,
        danger && styles.dangerButton,
        (disabled || busy) && styles.disabledButton,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          color={secondary ? colors.text : colors.background}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            secondary && styles.secondaryButtonText,
            danger && styles.dangerButtonText,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function TextButton({
  children,
  onPress,
  disabled = false,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.textButton}
    >
      <Text style={[styles.textButtonText, disabled && styles.disabledText]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function Notice({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "info" | "error" | "success";
}) {
  return (
    <View
      style={[
        styles.notice,
        kind === "error" && styles.errorNotice,
        kind === "success" && styles.successNotice,
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          kind === "error" && { color: colors.danger },
          kind === "success" && { color: colors.success },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function SectionTitle({
  children,
  action,
}: {
  children: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <Page scroll={false} style={styles.loading}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.subtitle}>{label}</Text>
    </Page>
  );
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  page: { padding: 20, paddingBottom: 48, gap: 20, flexGrow: 1 },
  fill: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  heading: { gap: 6 },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  fieldWrap: { width: "100%" },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.background,
    paddingHorizontal: 13,
    fontSize: 16,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text },
  dangerButton: { backgroundColor: "#7f1d1d" },
  dangerButtonText: { color: "#fee2e2" },
  disabledButton: { opacity: 0.5 },
  textButton: { alignSelf: "flex-start", paddingVertical: 8 },
  textButtonText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  disabledText: { color: colors.muted },
  notice: {
    borderRadius: 10,
    padding: 13,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: { color: colors.muted, lineHeight: 20 },
  errorNotice: { backgroundColor: "#451a1a", borderColor: "#7f1d1d" },
  successNotice: { backgroundColor: "#12332b", borderColor: "#166534" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700" },
  loading: { alignItems: "center", justifyContent: "center", gap: 14 },
});
