import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedClientUser } from '../interfaces/jwt-payload.interface';

/**
 * Decorator to extract the current authenticated client user from the request
 */
export const CurrentClientUser = createParamDecorator(
  (data: keyof AuthenticatedClientUser | undefined, ctx: ExecutionContext): AuthenticatedClientUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const clientUser = request.clientUser;

    return data ? clientUser?.[data] : clientUser;
  },
);

/**
 * Decorator to extract the client ID from the current authenticated client user
 */
export const CurrentClientId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const clientUser = request.clientUser;

    return clientUser?.clientId;
  },
);

/**
 * Decorator to extract the client user role from the current authenticated client user
 */
export const CurrentClientUserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const clientUser = request.clientUser;

    return clientUser?.role;
  },
);