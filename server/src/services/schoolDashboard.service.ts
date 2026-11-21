import { prisma } from "../config/prisma.js";
import { listSchoolAthletes } from "./school.service.js";

type JsonObject = Record<string, unknown>;

type RecruitingStatus =
  | "EVALUATING"
  | "CONTACTED"
  | "OFFERED"
  | "COMMITTED"
  | "PASSED";

interface DashboardAthlete {
  athleteId: string;
  profileId: string | null;
  name: string;
  email: string;
  sport: string | null;
  graduationYear: number | null;
  completionPercentage: number;
  status: string;
  verificationStatus: string | null;
}

interface DashboardActivity {
  id: string;
  type: "CONTACT" | "OFFER" | "COMMITMENT" | "RECORD";
  label: string;
  athleteName: string;
  profileId: string;
  recordId: string;
  at: string;
}

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

function asArray(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const object = asObject(item);
    return object ? [object] : [];
  });
}

function asDateString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function sortByDateDesc(items: DashboardActivity[]): DashboardActivity[] {
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export async function getSchoolDashboard(schoolId: string) {
  const roster = await listSchoolAthletes(schoolId);

  const athletes: DashboardAthlete[] = roster.map((athlete) => ({
    athleteId: athlete.id,
    profileId: athlete.athleteProfile?.id ?? null,
    name: `${athlete.firstName} ${athlete.lastName}`,
    email: athlete.email,
    sport:
      athlete.athleteProfile?.sports?.[0] ??
      athlete.athleteProfile?.primarySport ??
      null,
    graduationYear: athlete.athleteProfile?.graduationYear ?? null,
    completionPercentage: athlete.athleteProfile?.completionPercentage ?? 0,
    status: athlete.status,
    verificationStatus: athlete.athleteProfile?.verificationStatus ?? null,
  }));

  const incompleteProfiles = athletes
    .filter((athlete) => athlete.completionPercentage < 100)
    .sort((a, b) => a.completionPercentage - b.completionPercentage);

  const [savedProspectCount, savedProspects] = await Promise.all([
    prisma.savedProspect.count({ where: { schoolId } }),
    prisma.savedProspect.findMany({
      where: { schoolId },
      select: {
        id: true,
        savedAt: true,
        athleteProfile: {
          select: {
            id: true,
            primarySport: true,
            sports: true,
            graduationYear: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { savedAt: "desc" },
      take: 6,
    }),
  ]);

  const records = await prisma.recruitingRecord.findMany({
    where: { schoolId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      contactLogs: true,
      offers: true,
      commitments: true,
      athleteProfile: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const statusCounts: Record<RecruitingStatus, number> = {
    EVALUATING: 0,
    CONTACTED: 0,
    OFFERED: 0,
    COMMITTED: 0,
    PASSED: 0,
  };

  let contactCount = 0;
  let offerCount = 0;
  let commitmentCount = 0;
  const activity: DashboardActivity[] = [];

  for (const record of records) {
    if (record.status in statusCounts) {
      statusCounts[record.status] += 1;
    }

    const athleteName = `${record.athleteProfile.user.firstName} ${record.athleteProfile.user.lastName}`;
    const profileId = record.athleteProfile.id;

    for (const contact of asArray(record.contactLogs)) {
      const at = asDateString(contact.date);
      if (!at) continue;
      contactCount += 1;
      activity.push({
        id: `${record.id}-contact-${String(contact.id ?? at)}`,
        type: "CONTACT",
        label: `Contact logged${contact.type ? ` · ${String(contact.type)}` : ""}`,
        athleteName,
        profileId,
        recordId: record.id,
        at,
      });
    }

    for (const offer of asArray(record.offers)) {
      const at = asDateString(offer.date);
      if (!at) continue;
      offerCount += 1;
      activity.push({
        id: `${record.id}-offer-${String(offer.id ?? at)}`,
        type: "OFFER",
        label: `Offer recorded${offer.type ? ` · ${String(offer.type)}` : ""}`,
        athleteName,
        profileId,
        recordId: record.id,
        at,
      });
    }

    const commitment = asObject(record.commitments);
    const committedAt = commitment ? asDateString(commitment.committedDate) : null;
    if (commitment && committedAt) {
      commitmentCount += 1;
      activity.push({
        id: `${record.id}-commitment-${committedAt}`,
        type: "COMMITMENT",
        label: "Commitment recorded",
        athleteName,
        profileId,
        recordId: record.id,
        at: committedAt,
      });
    }

    activity.push({
      id: `${record.id}-record`,
      type: "RECORD",
      label: `Recruiting record updated · ${record.status.replace("_", " ")}`,
      athleteName,
      profileId,
      recordId: record.id,
      at: record.updatedAt.toISOString(),
    });
  }

  return {
    athletes: {
      total: athletes.length,
      active: athletes.filter((athlete) => athlete.status === "ACTIVE").length,
      pendingApproval: athletes.filter(
        (athlete) => athlete.status === "PENDING"
      ).length,
      verified: athletes.filter(
        (athlete) => athlete.verificationStatus === "APPROVED"
      ).length,
      items: athletes.slice(0, 6),
    },
    incompleteProfiles: {
      total: incompleteProfiles.length,
      items: incompleteProfiles.slice(0, 6),
    },
    savedProspects: {
      total: savedProspectCount,
      items: savedProspects.map((prospect) => ({
        id: prospect.id,
        savedAt: prospect.savedAt.toISOString(),
        profileId: prospect.athleteProfile.id,
        name: `${prospect.athleteProfile.user.firstName} ${prospect.athleteProfile.user.lastName}`,
        sport:
          prospect.athleteProfile.primarySport ||
          prospect.athleteProfile.sports?.[0] ||
          null,
        graduationYear: prospect.athleteProfile.graduationYear,
      })),
    },
    recruitingActivity: {
      totalRecords: records.length,
      statusCounts,
      contactCount,
      offerCount,
      commitmentCount,
      items: sortByDateDesc(activity).slice(0, 8),
    },
  };
}
