/**
 * Enumerates all security policy violation codes raised by the core security layer.
 */
export type SecurityErrorCode =
  | 'FORBIDDEN_CODE_EXECUTION'
  | 'PATH_TRAVERSAL_BLOCKED'
  | 'INVALID_PATH'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'ASSET_INVALID_MAGIC_BYTES'
  | 'ASSET_SIZE_EXCEEDED'
  | 'ASSET_EMPTY_FILE'
  | 'ASSET_UNSAFE_CONTENT'
  | 'BACKUP_FAILED';

/**
 * Structured error thrown when a security rule or validation policy is violated.
 */
export class SecurityError extends Error {
  public readonly code: SecurityErrorCode;
  public readonly details?: string;

  constructor(code: SecurityErrorCode, message: string, details?: string) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}
