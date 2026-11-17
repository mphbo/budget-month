import { Container, Typography } from "@mui/material";
import { UpdatePasswordForm } from "../password/components/UpdatePasswordForm";
import { Profile } from "./components/Profile";
import { Subscription } from "./components/Subscription";
import { getCurrentSubscription } from "@/app/lib/billing/subscription";
import { connection } from "next/server";
import { Loading } from "@/app/components/Loading";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/app/lib/supabase/server";

const AccountContent = async () => {
  await connection();
  const supabase = await createSupabaseServerClient();
  const subscription = await getCurrentSubscription();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  console.log({ subscription });
  return (
    <Container sx={{ py: 8 }}>
      <Typography variant="h4" sx={{ my: "40px" }}>
        Account Settings
      </Typography>
      <Profile
        fullName={
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : ""
        }
        email={user.email ?? ""}
      />
      <Subscription subscription={subscription} />
      {/* <Typography>
        Choose a new password with at least 8 characters, one uppercase letter,
        and one symbol.
      </Typography> */}
      {/* <UpdatePasswordForm /> */}
    </Container>
  );
};

const Account = async () => {
  return (
    <Suspense fallback={<Loading />}>
      <AccountContent />
    </Suspense>
  );
};

export default Account;
