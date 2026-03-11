import { UserRole } from 'generated/client';
import { TokenPair } from 'src/auth/auth.service';

export interface LoginResponseDto {
  id: string;
  email: string;
  roleType: UserRole;
  tokenPair: TokenPair;
}
