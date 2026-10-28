import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FieldMapper } from '../utils/field-mapper.util';
import { FindOptions } from '../types/field-mapping.types';

/**
 * Abstract base repository providing automatic field name translation between
 * camelCase (API/DTO layer) and snake_case (database/Prisma layer).
 *
 * Features:
 * - Automatic bidirectional field name translation
 * - Type-safe CRUD operations
 * - Lifecycle hooks for custom business logic
 * - Soft delete support
 * - Comprehensive error handling with meaningful messages
 * - Performance-optimized with caching
 *
 * @template TModel - Prisma model type (snake_case fields)
 * @template TDto - DTO type (camelCase fields) used in API responses
 * @template TCreateDto - DTO type for create operations
 * @template TUpdateDto - DTO type for update operations
 *
 * @example
 * ```typescript
 * export class EmployeeRepository extends BaseRepository<
 *   employees,              // Prisma model
 *   EmployeeDto,           // API DTO
 *   CreateEmployeeDto,     // Create DTO
 *   UpdateEmployeeDto      // Update DTO
 * > {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'employees');
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<
  TModel,
  TDto,
  TCreateDto = Partial<TDto>,
  TUpdateDto = Partial<TDto>,
> {
  protected readonly logger: Logger;
  private readonly hasSoftDelete: boolean;

  /**
   * Initialize the repository
   *
   * @param prisma - PrismaService instance for database operations
   * @param modelName - Name of the Prisma model (e.g., 'employees', 'companies')
   * @param options - Optional configuration
   */
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
    protected readonly options?: {
      /** Enable soft delete support (checks for deleted_at field) */
      softDelete?: boolean;
      /** Custom logger name */
      loggerName?: string;
    },
  ) {
    this.logger = new Logger(options?.loggerName || `${modelName}Repository`);
    this.hasSoftDelete = options?.softDelete ?? true;
  }

  /**
   * Find a single record matching the WHERE clause
   *
   * @param where - Filter conditions (camelCase)
   * @param include - Optional relations to include
   * @returns The matching record as DTO or null
   *
   * @example
   * ```typescript
   * const employee = await repository.findOne({ employeeNumber: 'E001' });
   * ```
   */
  async findOne(
    where: Partial<TDto>,
    include?: Record<string, boolean>,
  ): Promise<TDto | null> {
    try {
      // Translate camelCase WHERE to snake_case
      const snakeCaseWhere = FieldMapper.whereToSnakeCase(where);

      // Add soft delete filter
      const finalWhere = this.applySoftDeleteFilter(snakeCaseWhere);

      this.logger.debug(`findOne: ${JSON.stringify(finalWhere)}`);

      // Execute Prisma query
      const result = await this.getPrismaModel().findFirst({
        where: finalWhere,
        include,
      });

      if (!result) {
        return null;
      }

      // Transform to camelCase DTO
      const dto = this.transformToDto(result as TModel);

      // Call lifecycle hook
      return this.afterFind ? await this.afterFind(dto) : dto;
    } catch (error) {
      return this.handleError('findOne', error, { where });
    }
  }

  /**
   * Find multiple records with pagination and filtering
   *
   * @param where - Filter conditions (camelCase)
   * @param options - Pagination and sorting options
   * @returns Array of matching records as DTOs
   *
   * @example
   * ```typescript
   * const employees = await repository.findMany(
   *   { companyId: 'company-123', employmentStatus: 'ACTIVE' },
   *   { skip: 0, take: 10, orderBy: { hireDate: 'desc' } }
   * );
   * ```
   */
  async findMany(
    where?: Partial<TDto>,
    options?: FindOptions,
  ): Promise<TDto[]> {
    try {
      // Translate camelCase WHERE to snake_case
      const snakeCaseWhere = where
        ? FieldMapper.whereToSnakeCase(where)
        : undefined;

      // Add soft delete filter
      const finalWhere = this.applySoftDeleteFilter(snakeCaseWhere);

      // Translate orderBy if provided
      const orderBy = options?.orderBy
        ? FieldMapper.objectToSnakeCase(options.orderBy)
        : undefined;

      this.logger.debug(
        `findMany: where=${JSON.stringify(finalWhere)}, options=${JSON.stringify(options)}`,
      );

      // Execute Prisma query
      const results = await this.getPrismaModel().findMany({
        where: finalWhere,
        skip: options?.skip,
        take: options?.take,
        orderBy,
        include: options?.include,
      });

      // Transform all results to camelCase DTOs
      const dtos = results.map((result: TModel) =>
        this.transformToDto(result),
      );

      // Call lifecycle hook if defined
      if (this.afterFind) {
        return Promise.all(dtos.map((dto) => this.afterFind!(dto)));
      }

      return dtos;
    } catch (error) {
      return this.handleError('findMany', error, { where, options });
    }
  }

  /**
   * Create a new record
   *
   * @param data - Data for the new record (camelCase)
   * @returns The created record as DTO
   *
   * @example
   * ```typescript
   * const employee = await repository.create({
   *   employeeNumber: 'E001',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * });
   * ```
   */
  async create(data: TCreateDto): Promise<TDto> {
    try {
      // Call beforeCreate hook
      let processedData = data;
      if (this.beforeCreate) {
        processedData = await this.beforeCreate(data);
      }

      // Translate camelCase data to snake_case
      const snakeCaseData = FieldMapper.objectToSnakeCase(processedData);

      this.logger.debug(`create: ${JSON.stringify(snakeCaseData)}`);

      // Execute Prisma create
      const result = await this.getPrismaModel().create({
        data: snakeCaseData,
      });

      // Transform to camelCase DTO
      let dto = this.transformToDto(result as TModel);

      // Call afterCreate hook
      if (this.afterCreate) {
        dto = await this.afterCreate(dto);
      }

      return dto;
    } catch (error) {
      return this.handleError('create', error, { data });
    }
  }

  /**
   * Update an existing record by ID
   *
   * @param id - Record ID
   * @param data - Data to update (camelCase)
   * @returns The updated record as DTO
   *
   * @example
   * ```typescript
   * const employee = await repository.update('employee-id-123', {
   *   firstName: 'Jane',
   *   employmentStatus: 'INACTIVE'
   * });
   * ```
   */
  async update(id: string, data: TUpdateDto): Promise<TDto> {
    try {
      // Call beforeUpdate hook
      let processedData = data;
      if (this.beforeUpdate) {
        processedData = await this.beforeUpdate(id, data);
      }

      // Translate camelCase data to snake_case
      const snakeCaseData = FieldMapper.objectToSnakeCase(processedData);

      this.logger.debug(
        `update: id=${id}, data=${JSON.stringify(snakeCaseData)}`,
      );

      // Execute Prisma update
      const result = await this.getPrismaModel().update({
        where: { id },
        data: snakeCaseData,
      });

      // Transform to camelCase DTO
      let dto = this.transformToDto(result as TModel);

      // Call afterUpdate hook
      if (this.afterUpdate) {
        dto = await this.afterUpdate(dto);
      }

      return dto;
    } catch (error) {
      return this.handleError('update', error, { id, data });
    }
  }

  /**
   * Delete a record by ID (soft delete if enabled, hard delete otherwise)
   *
   * @param id - Record ID
   * @returns The deleted record as DTO
   *
   * @example
   * ```typescript
   * const employee = await repository.delete('employee-id-123');
   * ```
   */
  async delete(id: string): Promise<TDto> {
    try {
      // Call beforeDelete hook
      if (this.beforeDelete) {
        await this.beforeDelete(id);
      }

      this.logger.debug(`delete: id=${id}, softDelete=${this.hasSoftDelete}`);

      let result: any;

      if (this.hasSoftDelete) {
        // Soft delete: set deleted_at timestamp
        result = await this.getPrismaModel().update({
          where: { id },
          data: { deleted_at: new Date() },
        });
      } else {
        // Hard delete: remove from database
        result = await this.getPrismaModel().delete({
          where: { id },
        });
      }

      // Transform to camelCase DTO
      let dto = this.transformToDto(result as TModel);

      // Call afterDelete hook
      if (this.afterDelete) {
        dto = await this.afterDelete(dto);
      }

      return dto;
    } catch (error) {
      return this.handleError('delete', error, { id });
    }
  }

  /**
   * Count records matching the WHERE clause
   *
   * @param where - Filter conditions (camelCase)
   * @returns Number of matching records
   *
   * @example
   * ```typescript
   * const activeCount = await repository.count({ employmentStatus: 'ACTIVE' });
   * ```
   */
  async count(where?: Partial<TDto>): Promise<number> {
    try {
      // Translate camelCase WHERE to snake_case
      const snakeCaseWhere = where
        ? FieldMapper.whereToSnakeCase(where)
        : undefined;

      // Add soft delete filter
      const finalWhere = this.applySoftDeleteFilter(snakeCaseWhere);

      this.logger.debug(`count: ${JSON.stringify(finalWhere)}`);

      // Execute Prisma count
      return await this.getPrismaModel().count({
        where: finalWhere,
      });
    } catch (error) {
      return this.handleError('count', error, { where });
    }
  }

  /**
   * Check if a record exists
   *
   * @param where - Filter conditions (camelCase)
   * @returns True if record exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await repository.exists({ employeeNumber: 'E001' });
   * ```
   */
  async exists(where: Partial<TDto>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Find a record by ID
   *
   * @param id - Record ID
   * @param include - Optional relations to include
   * @returns The matching record as DTO or null
   *
   * @example
   * ```typescript
   * const employee = await repository.findById('employee-id-123');
   * ```
   */
  async findById(
    id: string,
    include?: Record<string, boolean>,
  ): Promise<TDto | null> {
    try {
      const where: any = { id };

      // Add soft delete filter
      const finalWhere = this.applySoftDeleteFilter(where);

      this.logger.debug(`findById: id=${id}`);

      const result = await this.getPrismaModel().findFirst({
        where: finalWhere,
        include,
      });

      if (!result) {
        return null;
      }

      const dto = this.transformToDto(result as TModel);
      return this.afterFind ? await this.afterFind(dto) : dto;
    } catch (error) {
      return this.handleError('findById', error, { id });
    }
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  // Subclasses can override these methods to inject custom logic

  /**
   * Hook called before creating a record
   * Override to add validation, data transformation, or side effects
   *
   * @param data - Create data (camelCase)
   * @returns Processed data
   */
  protected beforeCreate?(data: TCreateDto): Promise<TCreateDto>;

  /**
   * Hook called after creating a record
   * Override to add logging, notifications, or side effects
   *
   * @param result - Created record as DTO
   * @returns Processed DTO
   */
  protected afterCreate?(result: TDto): Promise<TDto>;

  /**
   * Hook called before updating a record
   * Override to add validation, data transformation, or side effects
   *
   * @param id - Record ID
   * @param data - Update data (camelCase)
   * @returns Processed data
   */
  protected beforeUpdate?(
    id: string,
    data: TUpdateDto,
  ): Promise<TUpdateDto>;

  /**
   * Hook called after updating a record
   * Override to add logging, notifications, or side effects
   *
   * @param result - Updated record as DTO
   * @returns Processed DTO
   */
  protected afterUpdate?(result: TDto): Promise<TDto>;

  /**
   * Hook called before deleting a record
   * Override to add validation or side effects
   *
   * @param id - Record ID
   */
  protected beforeDelete?(id: string): Promise<void>;

  /**
   * Hook called after deleting a record
   * Override to add logging, notifications, or side effects
   *
   * @param result - Deleted record as DTO
   * @returns Processed DTO
   */
  protected afterDelete?(result: TDto): Promise<TDto>;

  /**
   * Hook called after finding record(s)
   * Override to add data enrichment or transformations
   *
   * @param result - Found record as DTO
   * @returns Processed DTO
   */
  protected afterFind?(result: TDto): Promise<TDto>;

  // ============================================================================
  // TRANSFORMATION METHODS
  // ============================================================================

  /**
   * Transform Prisma model (snake_case) to DTO (camelCase)
   * Override for custom transformation logic
   *
   * @param model - Prisma model result
   * @returns DTO with camelCase fields
   */
  protected transformToDto(model: TModel): TDto {
    return FieldMapper.objectToCamelCase(model) as TDto;
  }

  /**
   * Transform DTO (camelCase) to Prisma model (snake_case)
   * Override for custom transformation logic
   *
   * @param dto - DTO with camelCase fields
   * @returns Prisma model with snake_case fields
   */
  protected transformFromDto(dto: Partial<TDto>): Partial<TModel> {
    return FieldMapper.objectToSnakeCase(dto) as any as Partial<TModel>;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get the Prisma model delegate for this repository
   * @returns Prisma model delegate
   */
  protected getPrismaModel(): any {
    const model = (this.prisma as any)[this.modelName];
    if (!model) {
      throw new Error(
        `Prisma model '${this.modelName}' not found. Check that the model name matches your Prisma schema.`,
      );
    }
    return model;
  }

  /**
   * Apply soft delete filter to WHERE clause if enabled
   * @param where - WHERE clause
   * @returns WHERE clause with soft delete filter
   */
  private applySoftDeleteFilter(where?: any): any {
    if (!this.hasSoftDelete) {
      return where || {};
    }

    return {
      ...where,
      deleted_at: null,
    };
  }

  /**
   * Handle and transform errors from Prisma operations
   *
   * @param operation - Name of the operation that failed
   * @param error - The error that occurred
   * @param context - Additional context for debugging
   * @throws Never returns, always throws
   */
  protected handleError(
    operation: string,
    error: any,
    context?: Record<string, any>,
  ): never {
    this.logger.error(
      `${operation} failed: ${error.message}`,
      error.stack,
      context,
    );

    // Transform Prisma-specific errors based on error code
    if (error?.code?.startsWith?.('P')) {
      throw this.transformPrismaError(error, operation, context);
    }

    // Handle validation errors
    if (error?.message?.includes?.('Argument') || error?.message?.includes?.('Unknown arg')) {
      throw new Error(
        `Validation error in ${operation}: ${this.extractValidationMessage(error.message)}`,
      );
    }

    // Re-throw other errors as-is
    throw error;
  }

  /**
   * Transform Prisma error codes into meaningful error messages
   *
   * @param error - Prisma error
   * @param operation - Operation name
   * @param context - Additional context
   * @returns Transformed error
   */
  private transformPrismaError(
    error: any,
    operation: string,
    context?: Record<string, any>,
  ): Error {
    const { code, meta } = error;

    switch (code) {
      case 'P2002': {
        // Unique constraint violation
        const field = this.extractFieldFromMeta(meta);
        return new Error(
          `A record with this ${field} already exists. Please use a different value.`,
        );
      }

      case 'P2025': {
        // Record not found
        return new Error(
          `Record not found in ${this.modelName}. The record may have been deleted.`,
        );
      }

      case 'P2003': {
        // Foreign key constraint violation
        const field = this.extractFieldFromMeta(meta);
        return new Error(
          `Invalid ${field}: the referenced record does not exist.`,
        );
      }

      case 'P2014': {
        // Required relation violation
        const relation = this.extractFieldFromMeta(meta);
        return new Error(
          `Cannot ${operation} ${this.modelName}: missing required relation '${relation}'.`,
        );
      }

      case 'P2016': {
        // Query interpretation error
        return new Error(
          `Invalid query for ${operation}: ${error.message}`,
        );
      }

      case 'P2021': {
        // Table does not exist
        return new Error(
          `Database table for ${this.modelName} does not exist. Please run migrations.`,
        );
      }

      case 'P2022': {
        // Column does not exist
        const column = this.extractFieldFromMeta(meta);
        return new Error(
          `Field '${column}' does not exist in ${this.modelName}. Please check the schema.`,
        );
      }

      default: {
        // Generic Prisma error
        return new Error(
          `Database error in ${operation} for ${this.modelName}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Extract field name from Prisma error metadata
   * Attempts to convert snake_case to camelCase for user-facing messages
   *
   * @param meta - Error metadata
   * @returns Field name
   */
  private extractFieldFromMeta(meta?: any): string {
    if (!meta) return 'field';

    // Try various metadata fields
    const snakeField =
      meta.target?.[0] ||
      meta.field_name ||
      meta.column ||
      meta.relation_name ||
      'field';

    // Convert to camelCase for user-facing message
    return FieldMapper.toCamelCase(snakeField);
  }

  /**
   * Extract clean validation message from Prisma validation error
   *
   * @param fullMessage - Full Prisma validation error message
   * @returns Clean, user-friendly message
   */
  private extractValidationMessage(fullMessage: string): string {
    // Prisma validation errors are verbose; extract the key part
    const lines = fullMessage.split('\n');
    const relevantLine = lines.find(
      (line) => line.includes('Argument') || line.includes('Unknown'),
    );
    return relevantLine || fullMessage;
  }
}
