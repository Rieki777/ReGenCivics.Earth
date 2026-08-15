/**
 * Helpers shared by the extracted db domain modules.
 *
 * These lived as private helpers inside server/db.ts. They moved here when the
 * applications domain came out (foundation audit Phase 2, finding C1): every
 * domain that runs an INSERT/UPDATE/DELETE needs them, and the alternatives
 * were to widen db.ts's public API or to duplicate the helper per module.
 *
 * Underscore prefix marks this as internal to server/db/, not a domain.
 */

/**
 * mysql2 INSERT/UPDATE/DELETE result shape. drizzle wraps it but the
 * runtime object is the same. Centralizing the type lets us drop most
 * `(result as any).insertId` / `.affectedRows` casts.
 */
export type MysqlMutationResult = {
  insertId: number;
  affectedRows: number;
  warningStatus?: number;
};

export function asMutationResult(r: unknown): MysqlMutationResult {
  // drizzle returns [ResultSetHeader, FieldPacket[]] for some shapes and
  // a single ResultSetHeader for others. Normalise.
  if (Array.isArray(r)) return r[0] as MysqlMutationResult;
  return r as MysqlMutationResult;
}
