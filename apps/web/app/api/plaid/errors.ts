import { NextResponse } from "next/server";
import { LinkedInstitutionError } from "../../lib/linked-institutions";
import { getPlaidError } from "../../lib/plaid/client";
import { mutationErrorResponse } from "../errors";

const getErrorCode = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : null;

export const linkedInstitutionErrorResponse = (
  operation: string,
  error: unknown,
) => {
  if (error instanceof LinkedInstitutionError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  const plaidError = getPlaidError(error);
  if (plaidError) {
    console.error(`${operation} failed`, {
      errorType: plaidError.error_type,
      errorCode: plaidError.error_code,
      requestId: plaidError.request_id,
    });
    return NextResponse.json(
      {
        error: plaidError.display_message ?? `${operation}. Please try again.`,
        code: plaidError.error_code,
      },
      { status: 502 },
    );
  }

  if (getErrorCode(error) === "P0002" || getErrorCode(error) === "PGRST116") {
    return NextResponse.json(
      { error: "This linked institution no longer exists." },
      { status: 404 },
    );
  }
  if (
    error instanceof Error &&
    error.message.includes("Account limit reached")
  ) {
    return NextResponse.json(
      { error: "You can have up to 100 accounts." },
      { status: 409 },
    );
  }

  return mutationErrorResponse(operation, error);
};
