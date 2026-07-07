import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
  };
};

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const headerValue = request.headers.authorization;
    const authorization = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!authorization) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization header format.');
    }

    const client = this.supabaseService.createPublicClient(token);

    if (!client) {
      throw new UnauthorizedException('Supabase is not configured.');
    }

    const { data, error } = await client.auth.getUser();

    if (error || !data?.user) {
      throw new UnauthorizedException('Invalid session.');
    }

    request.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
    };

    return true;
  }
}
