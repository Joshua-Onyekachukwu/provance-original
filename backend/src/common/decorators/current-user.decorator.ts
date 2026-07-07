import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserPayload = {
  id: string;
  email?: string;
};

type RequestWithUser = {
  user?: CurrentUserPayload;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserPayload => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      return { id: '' };
    }

    return request.user;
  },
);
