import { NextResponse } from "next/server";
import { isUuid } from "../../../../lib/linked-institution-types";
import { unlinkInstitution } from "../../../../lib/linked-institutions";
import { linkedInstitutionErrorResponse } from "../../errors";

export const DELETE = async (
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
    await unlinkInstitution(id);
    return NextResponse.json({ unlinked: true });
  } catch (error) {
    return linkedInstitutionErrorResponse(
      "Could not disconnect this institution",
      error,
    );
  }
};
