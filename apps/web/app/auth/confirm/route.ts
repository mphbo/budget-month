import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const GET = async (request: NextRequest) => {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const code = request.nextUrl.searchParams.get("code");
  const type = request.nextUrl.searchParams.get("type");
  const requestedNext = request.nextUrl.searchParams.get("next");

  const nextPath =
    type === "recovery" || requestedNext === "/settings/password"
      ? "/settings/password"
      : type === "email_change" || requestedNext === "/settings/account"
        ? "/settings/account"
        : "/";

  if (
    code ||
    (tokenHash &&
      (type === "email" || type === "email_change" || type === "recovery"))
  ) {
    try {
      const supabase = await createSupabaseServerClient();

      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.verifyOtp({
            token_hash: tokenHash as string,
            type: type as "email" | "email_change" | "recovery",
          });

      if (error) {
        console.error("Email confirmation verification failed", error);
      } else {
        return NextResponse.redirect(new URL(nextPath, request.url));
      }
    } catch (callbackError) {
      console.error("Email confirmation callback failed", callbackError);
    }
  }

  return NextResponse.redirect(
    new URL(
      type === "recovery"
        ? "/forgot-password?message=reset-failed"
        : "/login?message=confirmation-failed",
      request.url,
    ),
  );
};
