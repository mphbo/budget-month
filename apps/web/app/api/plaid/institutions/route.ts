import { NextResponse } from "next/server";
import {
  getLinkedInstitutionsAccess,
  linkInstitution,
} from "../../../lib/linked-institutions";
import { linkedInstitutionErrorResponse } from "../errors";

export const GET = async () => {
  return NextResponse.json(await getLinkedInstitutionsAccess());
};

export const POST = async (request: Request) => {
  const body: unknown = await request.json().catch(() => null);
  const publicToken =
    typeof body === "object" && body !== null && "publicToken" in body
      ? body.publicToken
      : undefined;

  if (
    typeof publicToken !== "string" ||
    publicToken.length === 0 ||
    publicToken.length > 500
  ) {
    return NextResponse.json(
      { error: "Provide the public token returned by Plaid Link." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await linkInstitution(publicToken), {
      status: 201,
    });
  } catch (error) {
    return linkedInstitutionErrorResponse(
      "Could not connect your institution",
      error,
    );
  }
};
