import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AdminRequest = {
  user?: {
    email?: string;
  };
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const email = request.user?.email?.trim().toLowerCase();

    if (!email) {
      throw new ForbiddenException('Admin access requires a verified account email.');
    }

    const configuredEmails =
      this.configService.get<string>('ADMIN_EMAILS')?.split(',') ?? [];
    const isAdmin = configuredEmails
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .includes(email);

    if (!isAdmin) {
      throw new ForbiddenException('Admin access is not enabled for this account.');
    }

    return true;
  }
}
