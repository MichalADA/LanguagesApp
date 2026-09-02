import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: string;
  email: string;
}

/**
 * Resolves the authenticated user from the JWT populated by JwtStrategy.
 * All /me/* endpoints must derive userId from this — never from request body/params.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as CurrentUserPayload;
  },
);
