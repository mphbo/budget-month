import { NextResponse } from "next/server";
import { getMonthBudget } from "../../../lib/monthData";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ month: string }> },
) {
  const { month } = await params;
  const budget = await getMonthBudget(month);

  if (!budget) {
    return NextResponse.json({ error: "Month not found." }, { status: 404 });
  }

  return NextResponse.json(budget);
}
