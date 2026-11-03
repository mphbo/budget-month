import { NextResponse } from "next/server";
import {
  createNextMonth,
  createPreviousMonth,
  getDeletableMonthSlugs,
  getMonthOptions,
  getNextMonthOption,
  getPreviousMonthOption,
} from "../../lib/budgets";
import { mutationErrorResponse } from "../errors";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const GET = async () => {
  const months = await getMonthOptions();
  const nextMonth = await getNextMonthOption(months);
  const previousMonth = getPreviousMonthOption(months);
  return NextResponse.json({
    months,
    nextMonth,
    previousMonth,
    deletableMonths: getDeletableMonthSlugs(months),
  });
};

export const POST = async (request: Request) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    throw error;
  }

  if (
    !isRecord(body) ||
    (body.mode !== "copy" && body.mode !== "fresh") ||
    (body.direction !== undefined &&
      body.direction !== "previous" &&
      body.direction !== "next")
  ) {
    return NextResponse.json(
      { error: "Choose whether to copy the previous month or start fresh." },
      { status: 400 },
    );
  }

  const direction = body.direction === "previous" ? "previous" : "next";
  try {
    const createdMonth =
      direction === "previous"
        ? await createPreviousMonth(body.mode)
        : await createNextMonth(body.mode);

    if (!createdMonth) {
      return NextResponse.json(
        {
          error: `The ${direction} month already exists. Refresh and try again.`,
        },
        { status: 409 },
      );
    }

    const months = await getMonthOptions();
    const nextMonth = await getNextMonthOption(months);
    return NextResponse.json(
      {
        month: createdMonth,
        months,
        nextMonth,
        previousMonth: getPreviousMonthOption(months),
        deletableMonths: getDeletableMonthSlugs(months),
      },
      { status: 201 },
    );
  } catch (error) {
    return mutationErrorResponse(
      `Could not create the ${direction} month`,
      error,
    );
  }
};
