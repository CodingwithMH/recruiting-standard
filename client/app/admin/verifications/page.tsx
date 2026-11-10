import AthleteVerificationQueue from "@/components/admin/AthleteVerificationQueue";

export default function AdminVerificationsPage() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#102341]">
          Athlete Profile Verification
        </h1>
        <p className="text-xs sm:text-sm text-[#65748a] mt-1 leading-relaxed">
          Review athlete profiles submitted for verification. Approving a
          profile marks the athlete as verified in coach searches and unlocks
          document access for subscribed schools; rejecting requires notes
          that are shared with the athlete so they can fix and resubmit.
        </p>
      </div>

      <AthleteVerificationQueue />
    </div>
  );
}
