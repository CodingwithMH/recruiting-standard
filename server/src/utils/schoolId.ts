export const SCHOOL_ID_PREFIX = "SCH";
export const SCHOOL_ID_MIN = 10000;
export const SCHOOL_ID_MAX = 99999;
export const SCHOOL_ID_PATTERN = /^SCH-\d{5}$/;

/**
 * Formats a numeric sequence into the permanent, immutable School ID format
 * used across the platform (e.g. `SCH-10492`).
 */
export function formatSchoolId(sequence: number): string {
  if (
    !Number.isInteger(sequence) ||
    sequence < SCHOOL_ID_MIN ||
    sequence > SCHOOL_ID_MAX
  ) {
    throw new RangeError(
      `School ID sequence must be an integer between ${SCHOOL_ID_MIN} and ${SCHOOL_ID_MAX}`
    );
  }

  return `${SCHOOL_ID_PREFIX}-${String(sequence).padStart(5, "0")}`;
}

/**
 * Parses a permanent School ID back into its numeric sequence.
 * Returns `null` when the value is not a valid School ID.
 */
export function parseSchoolId(value: string): number | null {
  if (!SCHOOL_ID_PATTERN.test(value)) {
    return null;
  }

  const sequence = Number(value.slice(SCHOOL_ID_PREFIX.length + 1));

  if (sequence < SCHOOL_ID_MIN || sequence > SCHOOL_ID_MAX) {
    return null;
  }

  return sequence;
}

export function isValidSchoolId(value: string): boolean {
  return parseSchoolId(value) !== null;
}

/**
 * Generates a candidate permanent School ID. Callers must persist it inside a
 * unique-constrained column and retry on collisions (see school.service.ts).
 */
export function generateCandidateSchoolId(
  random: () => number = Math.random
): string {
  const range = SCHOOL_ID_MAX - SCHOOL_ID_MIN + 1;
  const sequence = Math.min(
    SCHOOL_ID_MAX,
    SCHOOL_ID_MIN + Math.floor(random() * range)
  );

  return formatSchoolId(sequence);
}
