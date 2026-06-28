export class AuthResponseDto {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      companyId: string;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
  message: string;
}

export class RefreshTokenDto {
  refreshToken: string;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
