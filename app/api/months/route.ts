import { NextResponse } from "next/server";
import {
  createNextMonth,
  getMonthOptions,
  getNextMonthOption,
} from "../../lib/budgets";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const GET = async () => {
  const months = await getMonthOptions();
  const nextMonth = await getNextMonthOption(months);
  return NextResponse.json({ months, nextMonth });
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

  if (!isRecord(body) || (body.mode !== "copy" && body.mode !== "fresh")) {
    return NextResponse.json(
      { error: "Choose whether to copy the previous month or start fresh." },
      { status: 400 },
    );
  }

  const createdMonth = await createNextMonth(body.mode);

  if (!createdMonth) {
    return NextResponse.json(
      { error: "The next month already exists. Refresh and try again." },
      { status: 409 },
    );
  }

  const months = await getMonthOptions();
  return NextResponse.json(
    {
      month: createdMonth,
      months,
      nextMonth: await getNextMonthOption(months),
    },
    { status: 201 },
  );
};
