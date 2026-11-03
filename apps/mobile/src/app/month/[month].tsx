import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
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
} from "../../components/ui";
import { getMonthBudget, saveMonthBudget } from "../../lib/data";
import {
  type AccountType,
  accountCategories,
  type BudgetInput,
  type BudgetSection,
  currentMonthStart,
  type EditableBudgetItem,
  type MonthBudget,
  monthStartFromSlug,
  sections,
} from "../../lib/types";

type EditableBudget = Record<BudgetSection, EditableBudgetItem[]>;

const createDraft = (budget: MonthBudget): EditableBudget =>
  Object.fromEntries(
    sections.map(({ key }) => [
      key,
      budget[key].map((item, index) => ({
        ...item,
        id: `${key}-${index}-${Date.now()}`,
        amount: item.amount.toFixed(2),
      })),
    ]),
  ) as EditableBudget;

const toInput = (draft: EditableBudget): BudgetInput =>
  Object.fromEntries(
    sections.map(({ key }) => [
      key,
      draft[key].map((item) => ({
        item: item.item.trim(),
        amount: Number(item.amount),
        ...(item.accountId ? { accountId: item.accountId } : {}),
        ...(item.accountType ? { accountType: item.accountType } : {}),
        ...(item.category ? { category: item.category } : {}),
        ...(item.date ? { date: item.date } : {}),
      })),
    ]),
  ) as BudgetInput;

const snapshot = (budget: BudgetInput) => JSON.stringify(budget);

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export default function MonthScreen() {
  const params = useLocalSearchParams<{ month: string }>();
  const slug = Array.isArray(params.month) ? params.month[0] : params.month;
  const monthStart = monthStartFromSlug(slug ?? "");
  const isCurrentMonth = monthStart === currentMonthStart();
  const isFutureMonth = Boolean(monthStart && monthStart > currentMonthStart());
  const [budget, setBudget] = useState<MonthBudget | null>(null);
  const [draft, setDraft] = useState<EditableBudget | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) {
      setError("That month URL is invalid.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loaded = await getMonthBudget(slug);
      const nextDraft = createDraft(loaded);
      setBudget(loaded);
      setDraft(nextDraft);
      setSavedSnapshot(snapshot(toInput(nextDraft)));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load this budget.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentInput = useMemo(() => (draft ? toInput(draft) : null), [draft]);
  const isDirty = Boolean(
    currentInput && snapshot(currentInput) !== savedSnapshot,
  );
  const incomeTotal =
    draft?.income.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ??
    0;
  const expenseTotal =
    draft?.expenses.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    ) ?? 0;
  const difference = incomeTotal - expenseTotal;

  const updateItem = (
    section: BudgetSection,
    id: string,
    patch: {
      [Key in keyof EditableBudgetItem]?: EditableBudgetItem[Key] | undefined;
    },
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            [section]: current[section].map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
    setError(null);
    setSavedMessage(null);
  };

  const removeItem = (section: BudgetSection, item: EditableBudgetItem) => {
    const remove = () =>
      setDraft((current) =>
        current
          ? {
              ...current,
              [section]: current[section].filter(
                (entry) => entry.id !== item.id,
              ),
            }
          : current,
      );
    if (section === "totalEquity" && isCurrentMonth && item.accountId) {
      Alert.alert(
        `Remove ${item.item}?`,
        "Removing this current-month equity row also deletes the linked account and its balances.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove account", style: "destructive", onPress: remove },
        ],
      );
    } else {
      remove();
    }
  };

  const addItem = (section: BudgetSection) => {
    const id = `${section}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setDraft((current) =>
      current
        ? {
            ...current,
            [section]: [...current[section], { id, item: "", amount: "0.00" }],
          }
        : current,
    );
    setError(null);
  };

  const updateClassification = (
    item: EditableBudgetItem,
    type: AccountType,
    category: string,
  ) => {
    const amount = Number(item.amount) || 0;
    updateItem("totalEquity", item.id, {
      accountType: type,
      category,
      amount: (type === "liability"
        ? -Math.abs(amount)
        : Math.abs(amount)
      ).toFixed(2),
    });
  };

  const save = async () => {
    if (!draft || !slug) return;
    for (const { key, title } of sections) {
      if (draft[key].length > 100) {
        setError(`${title} can contain up to 100 rows.`);
        return;
      }
      for (const item of draft[key]) {
        if (!item.item.trim() || item.item.trim().length > 200) {
          setError(`${title}: each row needs a name of 1 to 200 characters.`);
          return;
        }
        if (!/^-?\d{1,12}(?:\.\d{1,2})?$/.test(item.amount)) {
          setError(
            `${title}: enter an amount with up to 12 digits and 2 decimals.`,
          );
          return;
        }
        if (
          item.date &&
          ((key !== "income" && key !== "expenses") || !isValidDate(item.date))
        ) {
          setError("Dates must be valid and use YYYY-MM-DD.");
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const input = toInput(draft);
      await saveMonthBudget(slug, input);
      setSavedSnapshot(snapshot(input));
      setSavedMessage(
        isCurrentMonth
          ? "Changes saved and account balances synced."
          : "Changes saved.",
      );
      if (isCurrentMonth) await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this month's budget.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading your budget..." />;
  if (!budget || !draft) {
    return (
      <Page>
        <Notice kind="error">
          {error ?? "This budget month could not be loaded."}
        </Notice>
        <Button onPress={() => router.replace("/")}>Back to dashboard</Button>
      </Page>
    );
  }

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
        <Heading subtitle={`Plan and track your finances for ${budget.name}.`}>
          {budget.name}
        </Heading>
        <TextButton onPress={() => router.replace("/")}>Dashboard</TextButton>
      </View>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Card>
        <SectionTitle>Cash flow</SectionTitle>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, gap: 5 }}>
            <Label>INCOME</Label>
            <Text
              style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}
            >
              {formatCurrency(incomeTotal)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Label>EXPENSES</Label>
            <Text
              style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}
            >
              {formatCurrency(expenseTotal)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Label>
              {difference > 0
                ? "SURPLUS"
                : difference < 0
                  ? "DEFICIT"
                  : "BALANCE"}
            </Label>
            <Text
              style={{
                color: difference < 0 ? colors.danger : colors.success,
                fontSize: 17,
                fontWeight: "700",
              }}
            >
              {formatCurrency(Math.abs(difference))}
            </Text>
          </View>
        </View>
      </Card>

      {sections.map(({ key, title }) => {
        const total = draft[key].reduce(
          (sum, item) => sum + (Number(item.amount) || 0),
          0,
        );
        const readOnly = key === "equityChange";
        const currentLinked = key === "totalEquity" && isCurrentMonth;
        return (
          <Card key={key}>
            <SectionTitle>{title}</SectionTitle>
            {draft[key].length === 0 ? (
              <Text style={{ color: colors.muted }}>
                {readOnly ? "No equity changes." : "No rows yet."}
              </Text>
            ) : null}
            {draft[key].map((item, index) => (
              <View key={item.id} style={{ gap: 10 }}>
                {currentLinked && item.accountId ? (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: "600",
                          flex: 1,
                        }}
                      >
                        {item.item}
                      </Text>
                      <TextButton
                        disabled={saving}
                        onPress={() => removeItem(key, item)}
                      >
                        Remove
                      </TextButton>
                    </View>
                    <Label>ACCOUNT TYPE</Label>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(["asset", "liability"] as const).map((type) => (
                        <Button
                          key={type}
                          secondary={item.accountType !== type}
                          disabled={saving}
                          onPress={() =>
                            updateClassification(
                              item,
                              type,
                              item.accountType === type
                                ? (item.category ?? accountCategories[type][0])
                                : accountCategories[type][0],
                            )
                          }
                        >
                          {type === "asset" ? "Asset" : "Liability"}
                        </Button>
                      ))}
                    </View>
                    <Label>CATEGORY</Label>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                    >
                      {accountCategories[item.accountType ?? "asset"].map(
                        (category) => (
                          <Pressable
                            key={category}
                            disabled={saving}
                            onPress={() =>
                              updateClassification(
                                item,
                                item.accountType ?? "asset",
                                category,
                              )
                            }
                            style={{
                              backgroundColor:
                                item.category === category
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
                                  item.category === category
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
                      editable={!saving}
                      label="Custom category"
                      maxLength={100}
                      onChangeText={(category) =>
                        updateClassification(
                          item,
                          item.accountType ?? "asset",
                          category,
                        )
                      }
                      value={item.category ?? ""}
                    />
                  </>
                ) : (
                  <>
                    <Field
                      editable={!readOnly && !saving}
                      label={`Item ${index + 1}`}
                      maxLength={200}
                      onChangeText={(itemName) =>
                        updateItem(key, item.id, { item: itemName })
                      }
                      value={item.item}
                    />
                    {key === "totalEquity" && item.accountId ? (
                      <>
                        <Label>ACCOUNT TYPE</Label>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {(["asset", "liability"] as const).map((type) => (
                            <Button
                              key={type}
                              secondary={item.accountType !== type}
                              disabled={saving}
                              onPress={() =>
                                updateClassification(
                                  item,
                                  type,
                                  item.accountType === type
                                    ? (item.category ??
                                        accountCategories[type][0])
                                    : accountCategories[type][0],
                                )
                              }
                            >
                              {type === "asset" ? "Asset" : "Liability"}
                            </Button>
                          ))}
                        </View>
                        <Label>CATEGORY</Label>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 7,
                          }}
                        >
                          {accountCategories[item.accountType ?? "asset"].map(
                            (category) => (
                              <Pressable
                                key={category}
                                disabled={saving}
                                onPress={() =>
                                  updateClassification(
                                    item,
                                    item.accountType ?? "asset",
                                    category,
                                  )
                                }
                                style={{
                                  backgroundColor:
                                    item.category === category
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
                                      item.category === category
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
                          editable={!saving}
                          label="Custom category"
                          maxLength={100}
                          onChangeText={(category) =>
                            updateClassification(
                              item,
                              item.accountType ?? "asset",
                              category,
                            )
                          }
                          value={item.category ?? ""}
                        />
                      </>
                    ) : null}
                  </>
                )}
                <Field
                  editable={!readOnly && !saving}
                  keyboardType="decimal-pad"
                  label="Amount"
                  onChangeText={(amount) =>
                    updateItem(key, item.id, { amount })
                  }
                  value={item.amount}
                />
                {key === "income" || key === "expenses" ? (
                  <Field
                    editable={!saving}
                    label="Date (optional)"
                    onChangeText={(date) => updateItem(key, item.id, { date })}
                    placeholder="YYYY-MM-DD"
                    value={item.date ?? ""}
                  />
                ) : null}
                {!readOnly ? (
                  <TextButton
                    disabled={saving}
                    onPress={() => removeItem(key, item)}
                  >
                    Remove row
                  </TextButton>
                ) : null}
                <Divider />
              </View>
            ))}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: colors.muted, fontWeight: "600" }}>
                Total
              </Text>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {formatCurrency(total)}
              </Text>
            </View>
            {currentLinked ? (
              <Notice>
                Current-month equity is synced to accounts. Add accounts on the
                dashboard; removing a row removes its linked account.
              </Notice>
            ) : null}
            {!readOnly && !currentLinked ? (
              <Button
                secondary
                disabled={saving || draft[key].length >= 100}
                onPress={() => addItem(key)}
              >
                Add item
              </Button>
            ) : null}
          </Card>
        );
      })}

      <Notice>
        {isCurrentMonth
          ? "This month’s Total Equity syncs with Accounts. Liabilities are negative. Equity Change compares this month with the previous available month."
          : isFutureMonth
            ? "This is a planned future month. Equity balances are estimates; account balances are unchanged until the current month."
            : "This is a historical snapshot. Changes here do not affect current account balances."}
      </Notice>
      {savedMessage ? <Notice kind="success">{savedMessage}</Notice> : null}
      <Button busy={saving} disabled={!isDirty} onPress={() => void save()}>
        {isCurrentMonth ? "Save changes and sync accounts" : "Save changes"}
      </Button>
      <Button secondary onPress={() => router.replace("/")}>
        Back to dashboard
      </Button>
    </Page>
  );
}
