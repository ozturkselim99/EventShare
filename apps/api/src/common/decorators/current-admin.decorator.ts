import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Admin } from "@prisma/client";

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Admin => {
    const request = ctx.switchToHttp().getRequest<{ user: Admin }>();
    return request.user;
  },
);
