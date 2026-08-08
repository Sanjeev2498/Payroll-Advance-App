import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { TenantContextService } from '../../common/tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private tenantContextService: TenantContextService,
    private prismaService: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    console.log('🔍 JwtAuthGuard - Route isPublic:', isPublic);
    console.log('🔍 JwtAuthGuard - Handler:', context.getHandler().name);
    console.log('🔍 JwtAuthGuard - Class:', context.getClass().name);

    if (isPublic) {
      console.log('✅ JwtAuthGuard - Allowing public route');
      return true;
    }

    const result = await super.canActivate(context);

    if (result) {
      // After successful authentication, set tenant context
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      if (user && user.companyId) {
        // Set application-level tenant context
        this.tenantContextService.setContext(user.companyId, user.id, user.role);

        // Set database-level tenant context for RLS
        await this.prismaService.setTenantContext(user.companyId, user.role);
      }
    }

    return !!result;
  }
}
