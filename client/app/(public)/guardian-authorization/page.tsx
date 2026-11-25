import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import GuardianAuthorizationForm from "@/components/auth/GuardianAuthorizationForm";

export const instant = false;

export const metadata: Metadata = createPageMetadata({
  title: "Guardian Authorization",
  description:
    "Parent or legal guardian authorization for an MVP 4.18 student-athlete registration.",
  path: "/guardian-authorization",
  index: false,
});

export default async function GuardianAuthorizationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <section className="py-12 sm:py-16 px-[6%] bg-[#f4f7fc] min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#65748a]">
            MVP 4.18 Recruiting Technologies LLC
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102341] sm:text-4xl">
            Guardian authorization
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#65748a]">
            Review the student-athlete registration details and confirm your authorization.
          </p>
        </div>
        <GuardianAuthorizationForm token={token || ""} />
      </div>
    </section>
  );
}
