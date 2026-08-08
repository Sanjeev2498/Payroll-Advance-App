import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ApiSuccessResponse, ApiPaginatedResponse, ApiMetadata, PaginationMetadata } from '../dto/api-response.dto';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T> | ApiPaginatedResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<T> | ApiPaginatedResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || uuidv4();
    const correlationId = request.headers['x-correlation-id'];
    
    return next.handle().pipe(
      map(data => {
        // Create base metadata
        const baseMetadata: ApiMetadata = {
          timestamp: new Date().toISOString(),
          requestId,
          version: 'v1',
          ...(correlationId && { correlationId }),
        };

        // Check if data contains pagination info
        if (this.isPaginatedResponse(data)) {
          const paginationMetadata: PaginationMetadata = {
            ...baseMetadata,
            page: data.page || 1,
            limit: data.limit || 20,
            total: data.total || 0,
            totalPages: Math.ceil((data.total || 0) / (data.limit || 20)),
            hasNext: (data.page || 1) * (data.limit || 20) < (data.total || 0),
            hasPrevious: (data.page || 1) > 1,
          };

          return {
            success: true,
            data: data.data || data.items || [],
            metadata: paginationMetadata,
          } as ApiPaginatedResponse<T>;
        }

        // Standard success response
        return {
          success: true,
          data,
          metadata: baseMetadata,
        } as ApiSuccessResponse<T>;
      }),
    );
  }

  private isPaginatedResponse(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      (data.hasOwnProperty('total') || 
       data.hasOwnProperty('page') ||
       data.hasOwnProperty('limit') ||
       data.hasOwnProperty('totalPages'))
    );
  }
}