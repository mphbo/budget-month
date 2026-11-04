import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Heading, Loading, Notice, Page } from "../../components/ui";
import { getSupabase } from "../../lib/supabase";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    next?: string;
    token_hash?: string;
    type?: string;
  }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokenHash = Array.isArray(params.token_hash)
      ? params.token_hash[0]
      : params.token_hash;
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const type = Array.isArray(params.type) ? params.type[0] : params.type;
    const requestedNext = Array.isArray(params.next)
      ? params.next[0]
      : params.next;
    const nextRoute =
      requestedNext === "/settings/password" || type === "recovery"
        ? "/settings/password"
        : "/";
    if (!code && (!tokenHash || (type !== "email" && type !== "recovery"))) {
      setError(
        "This link is invalid or has expired. Request a new link and try again.",
      );
      setLoading(false);
      return;
    }
    try {
      void (async () => {
        try {
          const auth = getSupabase().auth;
          const { error: verifyError } = code
            ? await auth.exchangeCodeForSession(code)
            : await auth.verifyOtp({
                token_hash: tokenHash as string,
                type: type as "email" | "recovery",
              });
          if (verifyError) {
            setError(
              "This link is invalid or has expired. Request a new link and try again.",
            );
          } else {
            router.replace(nextRoute);
          }
        } catch (verifyError) {
          setError(
            verifyError instanceof Error
              ? verifyError.message
              : "Could not verify this link.",
          );
        } finally {
          setLoading(false);
        }
      })();
    } catch (callbackError) {
      setError(
        callbackError instanceof Error
          ? callbackError.message
          : "Could not verify this link.",
      );
      setLoading(false);
    }
  }, [params.code, params.next, params.token_hash, params.type, router]);

  if (loading) return <Loading label="Confirming your email..." />;
  return (
    <Page>
      <Heading>Verify link</Heading>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button onPress={() => router.replace("/login")}>
        Return to sign in
      </Button>
    </Page>
  );
}
