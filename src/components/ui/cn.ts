/**
 * `cn` — class-name joiner.
 *
 * Tiny utility wrapper around `clsx` + `tailwind-merge` (added as deps when
 * the first component actually needs it). Phase 0 avoids pulling those deps
 * for a single trivial call site — this implementation just filters falsy
 * strings. Replaced with the full version when Phase 5+ introduces real UI.
 *
 * Why a wrapper at all? Keeping `cn(...)` as the project-wide convention
 * means later migration to clsx+twMerge touches one file, not every
 * component. Adding it now costs nothing and prevents inconsistency.
 */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}
