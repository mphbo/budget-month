import { NextResponse } from "next/server";
import { isUuid } from "../../../../../lib/linked-institution-types";
import { refreshInstitution } from "../../../../../lib/linked-institutions";
import { linkedInstitutionErrorResponse } from "../../../errors";

export const POST = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { error: "Provide a valid linked institution." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await refreshInstitution(id));
  } catch (error) {
    return linkedInstitutionErrorResponse(
      "Could not refresh balances for this institution",
      error,
    );
  }
};
