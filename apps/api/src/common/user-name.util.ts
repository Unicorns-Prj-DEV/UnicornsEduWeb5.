export interface UserNameParts {
  first_name?: string | null;
  last_name?: string | null;
}

export interface UserNameSource extends UserNameParts {
  accountHandle?: string | null;
  email?: string | null;
}

function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getUserFullNameFromParts(user?: UserNameParts | null) {
  if (!user) {
    return null;
  }

  const firstName = normalizeOptionalText(user.first_name);
  const lastName = normalizeOptionalText(user.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || null;
}

export function getPreferredUserFullName(user?: UserNameSource | null) {
  const fullName = getUserFullNameFromParts(user);
  if (fullName) {
    return fullName;
  }

  const accountHandle = normalizeOptionalText(user?.accountHandle);
  if (accountHandle) {
    return accountHandle;
  }

  return normalizeOptionalText(user?.email);
}

export function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return {
      first_name: '',
      last_name: null,
    };
  }

  const [first_name, ...rest] = normalized.split(' ');

  return {
    first_name,
    last_name: rest.length > 0 ? rest.join(' ') : null,
  };
}
