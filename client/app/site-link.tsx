import NextLink from "next/link";
import type { ReactNode } from "react";
type Props = {href: string; children: ReactNode; className?: string; onClick?: () => void; "aria-label"?: string; "aria-current"?: "page"};
export default function SiteLink({href,children,onClick,...props}:Props){
  if(href === "/") return <NextLink href={href} onClick={onClick} {...props}>{children}</NextLink>;
  return <span {...props}>{children}</span>;
}
