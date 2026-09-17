export function isUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.message.includes("UNIQUE") || err.message.includes("unique")) {
      return true;
    }
  }
  const code = (err as { code?: string }).code;
  return code === "SQLITE_CONSTRAINT_UNIQUE";
}
