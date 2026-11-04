import { NextResponse } from "next/server";

const isNextRedirectError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "digest" in error &&
  typeof error.digest === "string" &&
  error.digest.startsWith("NEXT_REDIRECT");

const getErrorCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : null;

const getErrorMessage = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"
    ? error.message
    : error instanceof Error
      ? error.message
      : null;

export const mutationErrorResponse = (operation: string, error: unknown) => {
  if (isNextRedirectError(error)) {
    throw error;
  }

  console.error(`${operation} failed`, error);
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error);
  if (
    errorCode === "23505" &&
    (errorMessage?.includes("account_items_user_name_unique") ||
      errorMessage?.includes("budget_items_month_total_equity_name_unique"))
  ) {
    return NextResponse.json(
      {
        error:
          "Account and Total Equity item names must be unique, ignoring capitalization.",
      },
      { status: 409 },
    );
  }
  if (errorCode === "PGRST202" || errorCode === "42883") {
    const migrationHint = operation.includes("previous month")
      ? " Apply 20261031000005_create_previous_budget_month.sql."
      : " Apply the pending Supabase migrations.";
    return NextResponse.json(
      {
        error: `A required database function is missing.${migrationHint} Then retry.`,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      error:
        process.env.NODE_ENV === "development" && errorMessage
          ? `${operation}: ${errorMessage}${errorCode ? ` (${errorCode})` : ""}`
          : `${operation}. Please try again.`,
    },
    { status: 500 },
  );
};
