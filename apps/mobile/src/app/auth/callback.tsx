import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Heading, Loading, Notice, Page } from "../../components/ui";
import { getSupabase } from "../../lib/supabase";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokenHash = Array.isArray(params.token_hash)
      ? params.token_hash[0]
      : params.token_hash;
    const type = Array.isArray(params.type) ? params.type[0] : params.type;
    if (!tokenHash || type !== "email") {
      setError(
        "This confirmation link is invalid or has expired. Request a new one and try again.",
      );
      setLoading(false);
      return;
    }
    try {
      void getSupabase()
        .auth.verifyOtp({ token_hash: tokenHash, type: "email" })
        .then(({ error: verifyError }) => {
          if (verifyError) {
            setError(
              "This confirmation link is invalid or has expired. Request a new one and try again.",
            );
          } else {
            router.replace("/");
          }
        })
        .catch((verifyError: unknown) => {
          setError(
            verifyError instanceof Error
              ? verifyError.message
              : "Could not confirm your email.",
          );
        })
        .finally(() => setLoading(false));
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Could not confirm your email.",
      );
      setLoading(false);
    }
  }, [params.token_hash, params.type, router]);

  if (loading) return <Loading label="Confirming your email..." />;
  return (
    <Page>
      <Heading>Email confirmation</Heading>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button onPress={() => router.replace("/login")}>
        Return to sign in
      </Button>
    </Page>
  );
}
