import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const GET = async (request: NextRequest) => {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const isSignupConfirmation = type === "email";

  if (tokenHash && isSignupConfirmation) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (!error) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?message=confirmation-failed", request.url),
  );
};
