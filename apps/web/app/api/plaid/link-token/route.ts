import { NextResponse } from "next/server";
import { isUuid } from "../../../lib/linked-institution-types";
import { createLinkToken } from "../../../lib/linked-institutions";
import { linkedInstitutionErrorResponse } from "../errors";

export const POST = async (request: Request) => {
  const body: unknown = await request.json().catch(() => ({}));
  const institutionId =
    typeof body === "object" && body !== null && "institutionId" in body
      ? body.institutionId
      : undefined;

  if (institutionId !== undefined && !isUuid(institutionId)) {
    return NextResponse.json(
      { error: "Provide a valid linked institution." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({
      linkToken: await createLinkToken(institutionId),
    });
  } catch (error) {
    return linkedInstitutionErrorResponse(
      "Could not start connecting your institution",
      error,
    );
  }
};
