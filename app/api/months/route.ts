import { NextResponse } from "next/server";
import {
  createNextMonth,
  getMonthOptions,
  getNextMonthOption,
} from "../../lib/monthData";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET() {
  return NextResponse.json({
    months: getMonthOptions(),
    nextMonth: getNextMonthOption(),
  });
}

export async function POST(request: Request) {
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

  const createdMonth = createNextMonth(body.mode);

  if (!createdMonth) {
    return NextResponse.json(
      { error: "The next month could not be created." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      month: {
        slug: createdMonth.slug,
        name: createdMonth.budget.name,
      },
      nextMonth: getNextMonthOption(),
    },
    { status: 201 },
  );
}
