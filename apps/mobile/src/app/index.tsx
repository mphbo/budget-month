import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import {
  Button,
  Card,
  colors,
  Divider,
  Field,
  formatCurrency,
  Heading,
  Label,
  Loading,
  Notice,
  Page,
  SectionTitle,
  TextButton,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import {
  createAccount,
  createMonth,
  deleteMonth,
  getAccounts,
  getDeletableMonths,
  getEquityHistory,
  getMonths,
  getNextMonth,
  getPreviousMonth,
  saveAccounts,
} from "../lib/data";
import { getSupabase } from "../lib/supabase";
import {
  type Account,
  type AccountType,
  accountCategories,
  type EquityHistoryPoint,
  type MonthOption,
} from "../lib/types";

type AccountDraft = Omit<Account, "amount"> & { amount: string };
type AccountForm = {
  id?: string;
  name: string;
  type: AccountType;
  category: string;
  amount: string;
};

export default function DashboardScreen() {
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [history, setHistory] = useState<EquityHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDraft, setAccountDraft] = useState<AccountDraft[]>([]);
  const [accountForm, setAccountForm] = useState<AccountForm | null>(null);
  const [savingAccounts, setSavingAccounts] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [monthMode, setMonthMode] = useState<{
    direction: "previous" | "next";
    name: string;
  } | null>(null);
  const [monthBusy, setMonthBusy] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextAccounts, nextMonths] = await Promise.all([
        getAccounts(),
        getMonths(),
      ]);
      const nextHistory = await getEquityHistory(nextAccounts);
      setAccounts(nextAccounts);
      setAccountDraft(
        nextAccounts.map((account) => ({
          ...account,
          amount: account.amount.toFixed(2),
        })),
      );
      setMonths(nextMonths);
      setHistory(nextHistory);
      setSelectedCategories((current) => {
        if (current.size > 0) return current;
        return new Set(
          nextHistory.flatMap((point) => Object.keys(point.categoryValues)),
        );
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your budget.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const equity = accounts.reduce(
    (total, account) =>
      total + (account.type === "liability" ? -account.amount : account.amount),
    0,
  );
  const nextMonth = getNextMonth(months);
  const previousMonth = getPreviousMonth(months);
  const deletableMonths = getDeletableMonths(months);
  const draftDirty =
    JSON.stringify(
      accountDraft.map(({ name, type, category, amount }) => ({
        name: name.trim(),
        type,
        category: category.trim(),
        amount,
      })),
    ) !==
    JSON.stringify(
      accounts.map((account) => ({
        name: account.name.trim(),
        type: account.type,
        category: account.category.trim(),
        amount: account.amount.toFixed(2),
      })),
    );

  const chartPoints = useMemo(
    () =>
      history.map((point) => ({
        ...point,
        equity: Object.entries(point.categoryValues)
          .filter(([key]) => selectedCategories.has(key))
          .reduce((sum, [, value]) => sum + value, 0),
      })),
    [history, selectedCategories],
  );
  const chartValues = chartPoints.map((point) => point.equity);
  const chartMin = Math.min(0, ...chartValues);
  const chartMax = Math.max(0, ...chartValues, 1);
  const chartPointsString = chartPoints
    .map((point, index) => {
      const x = 26 + (index * 308) / Math.max(chartPoints.length - 1, 1);
      const y = 16 + ((chartMax - point.equity) / (chartMax - chartMin)) * 112;
      return `${x},${y}`;
    })
    .join(" ");

  const confirmCreateMonth = async (mode: "copy" | "fresh") => {
    if (!monthMode) return;
    setMonthBusy(true);
    setError(null);
    try {
      const created = await createMonth(monthMode.direction, mode);
      setMonthMode(null);
      router.push(`/month/${created.slug}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create that month.",
      );
    } finally {
      setMonthBusy(false);
    }
  };

  const confirmDeleteMonth = (month: MonthOption) => {
    Alert.alert(
      `Delete ${month.name}?`,
      "Only the oldest past month or newest future month can be deleted. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                await deleteMonth(month.slug);
                await load(true);
              } catch (deleteError) {
                setError(
                  deleteError instanceof Error
                    ? deleteError.message
                    : "Could not delete the month.",
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const openNewAccount = (type: AccountType = "asset") => {
    setAccountForm({
      name: "",
      type,
      category: accountCategories[type][0],
      amount: "",
    });
  };

  const submitAccount = async () => {
    if (!accountForm) return;
    const name = accountForm.name.trim();
    const category = accountForm.category.trim();
    if (!name || name.length > 120 || !category || category.length > 100) {
      setError("Enter an account name and category.");
      return;
    }
    if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(accountForm.amount)) {
      setError("Enter a non-negative amount with up to 2 decimal places.");
      return;
    }
    setAccountBusy(true);
    setError(null);
    try {
      if (accountForm.id) {
        setAccountDraft((current) =>
          current.map((account) =>
            account.id === accountForm.id
              ? {
                  ...account,
                  name,
                  type: accountForm.type,
                  category,
                  amount: accountForm.amount,
                }
              : account,
          ),
        );
      } else {
        await createAccount({
          name,
          type: accountForm.type,
          category,
          amount: accountForm.amount,
        });
        await load(true);
      }
      setAccountForm(null);
    } catch (accountError) {
      setError(
        accountError instanceof Error
          ? accountError.message
          : "Could not save this account.",
      );
    } finally {
      setAccountBusy(false);
    }
  };

  const saveAccountChanges = async () => {
    if (
      accountDraft.some(
        (account) =>
          !account.name.trim() ||
          !account.category.trim() ||
          !/^\d{1,12}(?:\.\d{1,2})?$/.test(account.amount),
      )
    ) {
      setError(
        "Check each account's name, category, and amount before saving.",
      );
      return;
    }
    setSavingAccounts(true);
    setError(null);
    try {
      await saveAccounts(
        accountDraft.map((account) => ({
          ...account,
          amount: Number(account.amount),
        })),
      );
      await load(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save accounts.",
      );
    } finally {
      setSavingAccounts(false);
    }
  };

  if (loading) return <Loading label="Loading your finances..." />;

  const categories = [
    ...new Set(history.flatMap((point) => Object.keys(point.categoryValues))),
  ];

  return (
    <Page>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <Heading subtitle={`Signed in as ${session?.user.email ?? ""}`}>
          Budget Month
        </Heading>
        <TextButton
          disabled={busy}
          onPress={() => {
            void getSupabase()
              .auth.signOut()
              .then(({ error: signOutError }) => {
                if (signOutError) {
                  setError("Could not sign out. Please try again.");
                }
              })
              .catch((signOutError: unknown) => {
                setError(
                  signOutError instanceof Error
                    ? signOutError.message
                    : "Could not sign out. Please try again.",
                );
              });
          }}
        >
          Sign out
        </TextButton>
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {refreshing ? <Notice>Refreshing your data...</Notice> : null}

      <Card>
        <SectionTitle>Net total</SectionTitle>
        <Text style={{ color: colors.accent, fontSize: 32, fontWeight: "700" }}>
          {formatCurrency(equity)}
        </Text>
        <Text style={{ color: colors.muted }}>
          Across {accounts.length}{" "}
          {accounts.length === 1 ? "account" : "accounts"}
        </Text>
      </Card>

      <Card>
        <View style={{ gap: 4 }}>
          <SectionTitle>Equity over time</SectionTitle>
          <Text style={{ color: colors.muted }}>
            Choose categories to include in your trend.
          </Text>
        </View>
        {history.length ? (
          <Svg width="100%" height={165} viewBox="0 0 360 160">
            <Line x1="24" y1="130" x2="340" y2="130" stroke={colors.border} />
            <Line x1="24" y1="72" x2="340" y2="72" stroke={colors.border} />
            <Polyline
              fill="none"
              points={chartPointsString}
              stroke={colors.accent}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {chartPoints.length === 1 ? (
              <Circle
                cx="26"
                cy={
                  16 +
                  ((chartMax - chartPoints[0].equity) / (chartMax - chartMin)) *
                    112
                }
                r="4"
                fill={colors.accent}
              />
            ) : null}
            {chartPoints.map((point, index) => {
              const stride = Math.max(1, Math.ceil(chartPoints.length / 4));
              if (index % stride !== 0 && index !== chartPoints.length - 1)
                return null;
              return (
                <SvgText
                  key={point.month}
                  x={26 + (index * 308) / Math.max(chartPoints.length - 1, 1)}
                  y="153"
                  fill={colors.muted}
                  fontSize="9"
                  textAnchor="middle"
                >
                  {point.month.split(" ")[0].slice(0, 3)}
                </SvgText>
              );
            })}
          </Svg>
        ) : (
          <Text style={{ color: colors.muted }}>
            Create a budget month to start tracking equity.
          </Text>
        )}
        {categories.length ? (
          <View style={{ gap: 8 }}>
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() =>
                  setSelectedCategories((current) => {
                    const next = new Set(current);
                    if (next.has(category)) next.delete(category);
                    else next.add(category);
                    return next;
                  })
                }
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <Text style={{ color: colors.accent, fontSize: 18 }}>
                  {selectedCategories.has(category) ? "☑" : "□"}
                </Text>
                <Text style={{ color: colors.text }}>{category}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionTitle
          action={
            <TextButton onPress={() => openNewAccount("asset")}>
              + Add
            </TextButton>
          }
        >
          Accounts
        </SectionTitle>
        {(["asset", "liability"] as const).map((type) => {
          const entries = accountDraft.filter(
            (account) => account.type === type,
          );
          return (
            <View key={type} style={{ gap: 12 }}>
              <Label>{type === "asset" ? "ASSETS" : "LIABILITIES"}</Label>
              {entries.length === 0 ? (
                <Text style={{ color: colors.muted }}>
                  No {type === "asset" ? "assets" : "liabilities"} yet.
                </Text>
              ) : null}
              {entries.map((account) => (
                <View key={account.id} style={{ gap: 3 }}>
                  <Pressable onPress={() => setAccountForm({ ...account })}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                        >
                          {account.name}
                        </Text>
                        <Text style={{ color: colors.muted, marginTop: 3 }}>
                          {account.category} · {type}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: colors.text,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {formatCurrency(Number(account.amount) || 0)}
                      </Text>
                    </View>
                  </Pressable>
                  <TextButton
                    disabled={savingAccounts}
                    onPress={() =>
                      setAccountDraft((current) =>
                        current.filter((entry) => entry.id !== account.id),
                      )
                    }
                  >
                    Remove from accounts
                  </TextButton>
                  <Divider />
                </View>
              ))}
            </View>
          );
        })}
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Changes sync with this month&apos;s Total Equity after you save. Past
          months stay as historical snapshots.
        </Text>
        <Button
          busy={savingAccounts}
          disabled={!draftDirty}
          onPress={() => void saveAccountChanges()}
        >
          Save account changes
        </Button>
      </Card>

      <Card>
        <SectionTitle>Monthly budgets</SectionTitle>
        <View style={{ gap: 10 }}>
          {months.length === 0 ? (
            <Text style={{ color: colors.muted }}>No budget months yet.</Text>
          ) : null}
          {months.map((month) => (
            <View
              key={month.slug}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Pressable
                onPress={() => router.push(`/month/${month.slug}`)}
                style={{ flex: 1, paddingVertical: 8 }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {month.name} ›
                </Text>
              </Pressable>
              {deletableMonths.includes(month.slug) ? (
                <TextButton
                  disabled={busy}
                  onPress={() => confirmDeleteMonth(month)}
                >
                  Delete
                </TextButton>
              ) : null}
            </View>
          ))}
        </View>
        <Divider />
        <View style={{ gap: 10 }}>
          {previousMonth ? (
            <Button
              secondary
              disabled={monthBusy}
              onPress={() =>
                setMonthMode({
                  direction: "previous",
                  name: previousMonth.name,
                })
              }
            >
              Add previous month · {previousMonth.name}
            </Button>
          ) : null}
          <Button
            secondary
            disabled={monthBusy}
            onPress={() =>
              setMonthMode({ direction: "next", name: nextMonth.name })
            }
          >
            Add month · {nextMonth.name}
          </Button>
        </View>
      </Card>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!accountBusy) setAccountForm(null);
        }}
        transparent
        visible={accountForm !== null}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000b",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
            <Card>
              <SectionTitle>
                {accountForm?.id ? "Edit account" : "Add account"}
              </SectionTitle>
              <Field
                label="Name"
                maxLength={120}
                onChangeText={(name) =>
                  setAccountForm((current) => current && { ...current, name })
                }
                value={accountForm?.name ?? ""}
              />
              <Label>TYPE</Label>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["asset", "liability"] as const).map((type) => (
                  <Button
                    key={type}
                    secondary={accountForm?.type !== type}
                    onPress={() =>
                      setAccountForm(
                        (current) =>
                          current && {
                            ...current,
                            type,
                            category: accountCategories[type][0],
                          },
                      )
                    }
                  >
                    {type === "asset" ? "Asset" : "Liability"}
                  </Button>
                ))}
              </View>
              <Label>CATEGORY</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {accountCategories[accountForm?.type ?? "asset"].map(
                  (category) => (
                    <Pressable
                      key={category}
                      onPress={() =>
                        setAccountForm(
                          (current) => current && { ...current, category },
                        )
                      }
                      style={{
                        backgroundColor:
                          accountForm?.category === category
                            ? colors.accent
                            : colors.elevated,
                        borderRadius: 16,
                        paddingHorizontal: 11,
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            accountForm?.category === category
                              ? colors.background
                              : colors.text,
                        }}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
              <Field
                label="Custom category"
                maxLength={100}
                onChangeText={(category) =>
                  setAccountForm(
                    (current) => current && { ...current, category },
                  )
                }
                value={accountForm?.category ?? ""}
              />
              <Field
                keyboardType="decimal-pad"
                label="Amount"
                onChangeText={(amount) =>
                  setAccountForm((current) => current && { ...current, amount })
                }
                value={accountForm?.amount ?? ""}
              />
              <Button
                busy={accountBusy}
                disabled={!accountForm}
                onPress={() => void submitAccount()}
              >
                {accountForm?.id ? "Apply changes" : "Add account"}
              </Button>
              <Button
                secondary
                disabled={accountBusy}
                onPress={() => setAccountForm(null)}
              >
                Cancel
              </Button>
            </Card>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!monthBusy) setMonthMode(null);
        }}
        transparent
        visible={monthMode !== null}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#000b",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          >
            <Card>
              <SectionTitle>{monthMode?.name ?? "Create month"}</SectionTitle>
              <Text style={{ color: colors.muted, lineHeight: 21 }}>
                Start with a copy of the adjacent month, or create an empty
                budget.
              </Text>
              <Button
                busy={monthBusy}
                onPress={() => void confirmCreateMonth("copy")}
              >
                Copy adjacent month
              </Button>
              <Button
                secondary
                disabled={monthBusy}
                onPress={() => void confirmCreateMonth("fresh")}
              >
                Start fresh
              </Button>
              <Button
                secondary
                disabled={monthBusy}
                onPress={() => setMonthMode(null)}
              >
                Cancel
              </Button>
            </Card>
          </ScrollView>
        </View>
      </Modal>

      <TextButton disabled={busy} onPress={() => void load(true)}>
        Refresh data
      </TextButton>
    </Page>
  );
}
