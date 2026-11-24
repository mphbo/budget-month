"use client";

import { useState } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { LineChart } from "@mui/x-charts";
import type { Account } from "../lib/account-types";
import type { EquityHistoryPoint, MonthOption } from "../lib/month-types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const exactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMonthLabel = (month: string | null) => {
  if (!month) {
    return "";
  }

  const [name, year] = month.split(" ");

  return name && year ? `${name.slice(0, 3)} ${year.slice(-2)}` : month;
};

type EquityChangeChartProps = {
  allPoints: EquityHistoryPoint[];
  accounts: Account[];
  currentMonth: MonthOption;
};

export const EquityChangeChart = ({
  allPoints,
  accounts,
  currentMonth,
}: EquityChangeChartProps) => {
  const [includeFutureProjections, setIncludeFutureProjections] =
    useState(false);

  const categoriesByType = (["asset", "liability"] as const).map((type) => {
    const currentCategories = accounts
      .filter((account) => account.type === type)
      .map((account) => account.category);

    const historicalCategories = allPoints.flatMap((point) =>
      Object.keys(type === "asset" ? point.assets : point.liabilities),
    );

    return {
      type,
      categories: [...new Set([...currentCategories, ...historicalCategories])],
    };
  });

  const [selectedAssets, setSelectedAssets] = useState(
    () =>
      new Set(
        categoriesByType.find(({ type }) => type === "asset")?.categories ?? [],
      ),
  );

  const [selectedLiabilities, setSelectedLiabilities] = useState(
    () =>
      new Set(
        categoriesByType.find(({ type }) => type === "liability")?.categories ??
          [],
      ),
  );

  const currentMonthIndex = allPoints.findIndex(
    (point) => point.month === currentMonth.name,
  );

  const hasFutureMonths =
    currentMonthIndex >= 0 && currentMonthIndex < allPoints.length - 1;

  const visiblePoints =
    !includeFutureProjections && currentMonthIndex >= 0
      ? allPoints.slice(0, currentMonthIndex + 1)
      : allPoints;

  const selectedCategoryCount = selectedAssets.size + selectedLiabilities.size;

  const chartData = visiblePoints.map((point) => ({
    month: point.month,
    equity:
      [...selectedAssets].reduce(
        (total, category) => total + (point.assets[category] ?? 0),
        0,
      ) +
      [...selectedLiabilities].reduce(
        (total, category) => total + (point.liabilities[category] ?? 0),
        0,
      ),
  }));

  console.log({ allPoints, accounts, currentMonth });
  console.log({ chartData });

  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const isMediumScreen = useMediaQuery("(max-width:900px)");

  const maxLabels = isSmallScreen ? 4 : isMediumScreen ? 8 : 12;
  const labelInterval = Math.ceil(chartData.length / maxLabels);

  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ minWidth: 0, p: 2.5, width: "100%" }}
    >
      <Box
        sx={{
          display: { xs: "block", md: "flex" },
          justifyContent: "space-between",
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5">Equity over time</Typography>
          <Typography color="text.secondary" variant="body2">
            Select categories to include in your equity trend
          </Typography>
        </Stack>

        {hasFutureMonths && (
          <FormControlLabel
            sx={{
              ml: 0,
              display: "flex",
              justifyContent: { xs: "flex-start", md: "flex-end" },
              mt: { xs: "12px", md: 0 },
            }}
            control={
              <Switch
                checked={includeFutureProjections}
                onChange={(event) =>
                  setIncludeFutureProjections(event.target.checked)
                }
              />
            }
            label="Include future projections"
          />
        )}
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 1.5 }}
      >
        {categoriesByType.map(({ type, categories }) => {
          if (categories.length === 0) {
            return null;
          }

          const selectedCategories =
            type === "asset" ? selectedAssets : selectedLiabilities;

          const setSelectedCategories =
            type === "asset" ? setSelectedAssets : setSelectedLiabilities;

          return (
            <Stack key={type} spacing={0.25}>
              <Typography variant="subtitle2">
                {type === "asset" ? "Assets" : "Liabilities"}
              </Typography>

              <FormGroup row>
                {categories.map((category) => (
                  <FormControlLabel
                    key={category}
                    control={
                      <Checkbox
                        checked={selectedCategories.has(category)}
                        onChange={(event) => {
                          setSelectedCategories((current) => {
                            const next = new Set(current);

                            if (event.target.checked) {
                              next.add(category);
                            } else {
                              next.delete(category);
                            }

                            return next;
                          });
                        }}
                        size="small"
                      />
                    }
                    label={category}
                  />
                ))}
              </FormGroup>
            </Stack>
          );
        })}
      </Stack>

      <Box sx={{ mt: 2, width: "100%" }}>
        {visiblePoints.length === 0 ? (
          <Typography color="text.secondary">
            Create a budget month to start tracking your equity.
          </Typography>
        ) : selectedCategoryCount === 0 ? (
          <Typography color="text.secondary">
            Select at least one category to show its equity history.
          </Typography>
        ) : (
          <LineChart
            height={400}
            dataset={chartData}
            margin={{ left: 0, right: 40, top: 20, bottom: 90 }}
            series={[
              {
                dataKey: "equity",
                label: "Equity",
                curve: "natural",
                showMark: true,
                valueFormatter: (value) =>
                  value == null ? "" : exactCurrency.format(value),
              },
            ]}
            xAxis={[
              {
                scaleType: "point",
                data: chartData.map((point) => point.month),
                height: 90,
                position: "bottom",
                valueFormatter: (value: string) => formatMonthLabel(value),
                tickLabelInterval: (_value: string, index: number) =>
                  index % labelInterval === 0 || index === chartData.length - 1,
                tickLabelStyle: {
                  textAnchor: "end",
                  fontSize: 12,
                },
              },
            ]}
            yAxis={[
              {
                width: 110,
                valueFormatter: (value: number) => currency.format(value),
              },
            ]}
            grid={{
              vertical: true,
              horizontal: true,
            }}
          />
        )}
      </Box>
    </Paper>
  );
};
