import DocumentReviewQueue from "@/components/admin/DocumentReviewQueue";

export default function AdminDocumentsPage() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
          Private Document Verification
        </h1>
        <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
          Review official transcripts, eligibility forms, and combine reports.
          Files live in private object storage and open through short-lived
          signed links only.
        </p>
      </div>

      <DocumentReviewQueue />
    </div>
  );
}
