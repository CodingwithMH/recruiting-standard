import NextLink from "next/link";
import type { ComponentPropsWithoutRef } from "react";

// Thin wrapper so import paths stay consistent across the codebase.
// If we ever need to add tracking or prefetch overrides, one place to do it.
type Props = ComponentPropsWithoutRef<typeof NextLink>;

export default function SiteLink({ children, ...props }: Props) {
  return <NextLink {...props}>{children}</NextLink>;
}
