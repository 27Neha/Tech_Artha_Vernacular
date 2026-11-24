-- Verified email address for the investor.
--
-- Nullable because existing users have none, and UNIQUE so one verified address cannot
-- be claimed by two accounts. The column is written only after a verified OTP, which is
-- what makes its presence meaningful as a verification flag.
ALTER TABLE "User" ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
