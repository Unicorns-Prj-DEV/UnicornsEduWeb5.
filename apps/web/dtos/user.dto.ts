export interface CreateUserPayload {
  email: string;
  phone: string;
  password: string;
  name: string;
  roleType: string;
  province: string;
  accountHandle: string;
}

export interface UpdateUserPayload {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  roleType?: string;
  status?: string;
  linkId?: string;
  province?: string;
  accountHandle?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}
