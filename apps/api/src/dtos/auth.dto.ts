import { UserRole } from 'generated/enums';
import { TokenPair } from 'src/auth/auth.service';

export interface LoginResponseDto {
  id: string;
  accountHandle: string;
  roleType: UserRole;
  tokenPair: TokenPair;
}
