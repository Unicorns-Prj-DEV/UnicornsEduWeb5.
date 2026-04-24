import type { UserInfoDto } from "@/dtos/Auth.dto";

export const OPEN_EMAIL_VERIFICATION_MODAL_EVENT =
  "ue:open-email-verification-modal";

export function isAuthenticatedUser(user: UserInfoDto) {
  return Boolean(user.id && user.accountHandle);
}

export function isRestrictedByEmailVerification(user: UserInfoDto) {
  if (!isAuthenticatedUser(user)) {
    return false;
  }

  return user.canAccessRestrictedRoutes === false;
}

export function maskEmailAddress(email: string) {
  const normalizedEmail = email.trim();
  const [localPart = "", domainPart = ""] = normalizedEmail.split("@");
  if (!localPart || !domainPart) {
    return normalizedEmail;
  }

  const tail = localPart.slice(-4);
  return `...${tail}@${domainPart}`;
}

