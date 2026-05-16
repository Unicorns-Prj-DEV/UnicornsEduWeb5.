export const OPEN_DIRECT_TOPUP_APPROVAL_EVENT =
  "ue:open-direct-topup-approval";

export type OpenDirectTopUpApprovalPayload = {
  requestId: string;
  notificationId?: string;
};

const DIRECT_TOPUP_REQUEST_ID_ATTRIBUTE = "data-direct-topup-request-id";

export function extractDirectTopUpRequestId(message: string): string | null {
  const match = message.match(
    new RegExp(`${DIRECT_TOPUP_REQUEST_ID_ATTRIBUTE}=["']([^"']+)["']`, "i"),
  );
  return match?.[1]?.trim() || null;
}

export function openDirectTopUpApprovalPopup(
  payload: OpenDirectTopUpApprovalPayload,
) {
  window.dispatchEvent(
    new CustomEvent<OpenDirectTopUpApprovalPayload>(
      OPEN_DIRECT_TOPUP_APPROVAL_EVENT,
      { detail: payload },
    ),
  );
}
