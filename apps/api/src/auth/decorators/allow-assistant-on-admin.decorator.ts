import { SetMetadata } from '@nestjs/common';

export const ALLOW_ASSISTANT_ON_ADMIN_KEY = 'allowAssistantOnAdminRoutes';

export const AllowAssistantOnAdminRoutes = (allow = true) =>
  SetMetadata(ALLOW_ASSISTANT_ON_ADMIN_KEY, allow);
