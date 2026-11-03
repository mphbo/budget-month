"use client";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { Account } from "../lib/account-types";
import type { EquityHistoryPoint } from "../lib/month-types";

const chartWidth = 640;
const chartHeight = 220;
const plotLeft = 76;
const plotRight = 620;
const plotTop = 16;
const plotBottom = 152;
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

const getNiceStep = (value: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const factor =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return factor * magnitude;
};

export const EquityHistoryChart = ({
  points,
  accounts,
}: {
  points: EquityHistoryPoint[];
  accounts: Account[];
}) => {
  const categoryKey = (type: Account["type"], category: string) =>
    `${type}:${category}`;
  const categoriesByType = (["asset", "liability"] as const).map((type) => {
    const currentCategories = accounts
      .filter((account) => account.type === type)
      .map((account) => account.category);
    const historicalCategories = points.flatMap((point) =>
      Object.keys(point.categoryValues)
        .filter((key) => key.startsWith(`${type}:`))
        .map((key) => key.slice(type.length + 1)),
    );

    return {
      type,
      categories: [...new Set([...currentCategories, ...historicalCategories])],
    };
  });
  const [selectedCategories, setSelectedCategories] = useState(
    () =>
      new Set(
        categoriesByType.flatMap(({ type, categories }) =>
          categories.map((category) => categoryKey(type, category)),
        ),
      ),
  );
  const availableCategoryKeys = categoriesByType.flatMap(
    ({ type, categories }) =>
      categories.map((category) => categoryKey(type, category)),
  );
  const selectedCategoryKeys = availableCategoryKeys.filter((key) =>
    selectedCategories.has(key),
  );
  const chartPoints = points.map((point) => ({
    month: point.month,
    equity: selectedCategoryKeys.reduce(
      (total, key) => total + (point.categoryValues[key] ?? 0),
      0,
    ),
  }));

  if (points.length === 0) {
    return (
      <Paper
        component="section"
        sx={{ minWidth: 0, p: 2.5, width: "100%" }}
        variant="outlined"
      >
        <Typography variant="h5">Equity over time</Typography>
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Create a budget month to start tracking your equity.
        </Typography>
      </Paper>
    );
  }

  const values = chartPoints.map((point) => point.equity);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = rawMin === rawMax ? Math.max(Math.abs(rawMin) * 0.1, 1) : 0;
  const min = rawMin - padding;
  const max = rawMax + padding;
  const tickStep = getNiceStep((max - min) / 4);
  const firstTick = Math.floor(min / tickStep) * tickStep;
  const lastTick = Math.ceil(max / tickStep) * tickStep;
  const ticks: number[] = [];
  for (let tick = firstTick; tick <= lastTick; tick += tickStep) {
    ticks.push(Number(tick.toPrecision(12)));
  }
  const axisMin = ticks[0];
  const axisMax = ticks[ticks.length - 1];
  const range = axisMax - axisMin;
  const x = (index: number) =>
    plotLeft +
    (index * (plotRight - plotLeft)) / Math.max(points.length - 1, 1);
  const y = (value: number) =>
    plotBottom - ((value - axisMin) / range) * (plotBottom - plotTop);
  const polyline = chartPoints
    .map((point, index) => `${x(index)},${y(point.equity)}`)
    .join(" ");
  const labelStep = Math.max(1, Math.ceil((points.length - 1) / 5));
  const labelIndices = new Set<number>();
  for (let index = 0; index < points.length; index += labelStep) {
    labelIndices.add(index);
  }
  labelIndices.add(points.length - 1);

  return (
    <Paper
      component="section"
      sx={{ minWidth: 0, p: 2.5, width: "100%" }}
      variant="outlined"
    >
      <Stack spacing={0.5}>
        <Typography variant="h5">Equity over time</Typography>
        <Typography color="text.secondary" variant="body2">
          Select categories to include in your equity trend
        </Typography>
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 1.5 }}
      >
        {categoriesByType.map(({ type, categories }) => {
          if (categories.length === 0) {
            return null;
          }

          return (
            <Stack key={type} spacing={0.25}>
              <Typography variant="subtitle2">
                {type === "asset" ? "Assets" : "Liabilities"}
              </Typography>
              <FormGroup row>
                {categories.map((category) => {
                  const key = categoryKey(type, category);
                  return (
                    <FormControlLabel
                      key={key}
                      control={
                        <Checkbox
                          checked={selectedCategories.has(key)}
                          onChange={(event) => {
                            setSelectedCategories((current) => {
                              const next = new Set(current);
                              if (event.target.checked) {
                                next.add(key);
                              } else {
                                next.delete(key);
                              }
                              return next;
                            });
                          }}
                          size="small"
                        />
                      }
                      label={category}
                    />
                  );
                })}
              </FormGroup>
            </Stack>
          );
        })}
      </Stack>
      {selectedCategoryKeys.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Select at least one category to show its equity history.
        </Typography>
      ) : (
        <Box sx={{ mt: 2, width: "100%" }}>
          <svg
            aria-label="Equity trend across budget months"
            role="img"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ display: "block", width: "100%", height: "auto" }}
          >
            <style>
              {`g.equity-point .equity-point-label { opacity: 0; transition: opacity 120ms ease; }
            g.equity-point:hover .equity-point-label { opacity: 1; }`}
            </style>
            {ticks.map((value) => {
              const tickY = y(value);
              return (
                <g key={value}>
                  <line
                    x1={plotLeft}
                    x2={plotRight}
                    y1={tickY}
                    y2={tickY}
                    stroke="currentColor"
                    opacity="0.16"
                  />
                  <text
                    x={plotLeft - 10}
                    y={tickY + 4}
                    textAnchor="end"
                    fill="currentColor"
                    opacity="0.7"
                    fontSize="12"
                  >
                    {currency.format(value)}
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              points={polyline}
              stroke="#90caf9"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeWidth="3"
            />
            {chartPoints.map((point, index) => {
              const pointX = x(index);
              const pointY = y(point.equity);
              const exactValue = exactCurrency.format(point.equity);
              return (
                <g
                  key={point.month}
                  aria-label={`${point.month}: ${exactValue}`}
                  className="equity-point"
                >
                  <circle cx={pointX} cy={pointY} r="5" fill="#90caf9" />
                  <text
                    className="equity-point-label"
                    x={pointX}
                    y={pointY < plotTop + 20 ? pointY + 22 : pointY - 12}
                    textAnchor={
                      index === 0
                        ? "start"
                        : index === points.length - 1
                          ? "end"
                          : "middle"
                    }
                    fill="currentColor"
                    fontSize="12"
                    fontWeight="600"
                    paintOrder="stroke"
                    pointerEvents="none"
                    stroke="#23272f"
                    strokeLinejoin="round"
                    strokeWidth="4"
                  >
                    {exactValue}
                  </text>
                </g>
              );
            })}
            {[...labelIndices].map((index) => (
              <text
                key={chartPoints[index].month}
                x={x(index)}
                y={plotBottom + 28}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                fill="currentColor"
                opacity="0.7"
                fontSize="12"
              >
                {chartPoints[index].month}
              </text>
            ))}
          </svg>
        </Box>
      )}
    </Paper>
  );
};
