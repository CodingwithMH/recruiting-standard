import { prisma } from "../config/prisma.js";
import { effectiveSubscriptionState } from "../utils/subscriptionAccess.js";

type SchoolStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
type GlobalRole = "PLATFORM_ADMIN" | "SCHOOL_STAFF" | "ATHLETE" | "PARENT";
type UserStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
type VerificationStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";
type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";
type SubscriptionState =
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "PENDING";

interface PlatformActivityEvent {
  id: string;
  type: "SCHOOL" | "USER" | "PROFILE" | "DOCUMENT" | "SUBSCRIPTION";
  label: string;
  subject: string;
  at: string;
  href: string;
}

const SCHOOL_STATUSES: SchoolStatus[] = [
  "PENDING",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
];
const GLOBAL_ROLES: GlobalRole[] = [
  "PLATFORM_ADMIN",
  "SCHOOL_STAFF",
  "ATHLETE",
  "PARENT",
];
const USER_STATUSES: UserStatus[] = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
];
const VERIFICATION_STATUSES: VerificationStatus[] = [
  "UNVERIFIED",
  "PENDING",
  "APPROVED",
  "REJECTED",
];
const DOCUMENT_STATUSES: DocumentStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const SUBSCRIPTION_STATES: SubscriptionState[] = [
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
  "EXPIRED",
  "PENDING",
];

function countMap<T extends string>(
  rows: Array<Record<string, unknown>>,
  field: string,
  keys: readonly T[]
): Record<T, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[field]);
    const count = row._count as { _all: number } | undefined;
    counts.set(key, count?._all ?? 0);
  }
  return Object.fromEntries(keys.map((key) => [key, counts.get(key) ?? 0])) as Record<
    T,
    number
  >;
}

function totalOf(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export async function getPlatformDashboard() {
  const [
    schoolStatusRows,
    userRoleRows,
    userStatusRows,
    verificationRows,
    documentStatusRows,
    recentSchools,
    recentUsers,
    pendingAthletes,
    pendingDocuments,
    subscriptions,
    recruitingRecordCount,
    savedProspectCount,
    recentAthleteProfiles,
    recentDocuments,
  ] = await Promise.all([
    prisma.school.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["globalRole"],
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.athleteProfile.groupBy({
      by: ["verificationStatus"],
      _count: { _all: true },
    }),
    prisma.document.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.school.findMany({
      select: {
        id: true,
        name: true,
        schoolId: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        globalRole: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.athleteProfile.findMany({
      where: { verificationStatus: "PENDING" },
      select: {
        id: true,
        primarySport: true,
        graduationYear: true,
        completionPercentage: true,
        submittedForVerificationAt: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        documents: { select: { status: true } },
      },
      orderBy: { submittedForVerificationAt: "asc" },
      take: 6,
    }),
    prisma.document.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        athleteProfile: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    prisma.subscription.findMany({
      select: {
        id: true,
        state: true,
        expirationDate: true,
        updatedAt: true,
        school: { select: { name: true } },
      },
    }),
    prisma.recruitingRecord.count(),
    prisma.savedProspect.count(),
    prisma.athleteProfile.findMany({
      select: {
        id: true,
        verificationStatus: true,
        submittedForVerificationAt: true,
        verifiedAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        athleteProfile: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const schoolStatusCounts = countMap<SchoolStatus>(
    schoolStatusRows as unknown as Array<Record<string, unknown>>,
    "status",
    SCHOOL_STATUSES
  );
  const userRoleCounts = countMap<GlobalRole>(
    userRoleRows as unknown as Array<Record<string, unknown>>,
    "globalRole",
    GLOBAL_ROLES
  );
  const userStatusCounts = countMap<UserStatus>(
    userStatusRows as unknown as Array<Record<string, unknown>>,
    "status",
    USER_STATUSES
  );
  const verificationCounts = countMap<VerificationStatus>(
    verificationRows as unknown as Array<Record<string, unknown>>,
    "verificationStatus",
    VERIFICATION_STATUSES
  );
  const documentCounts = countMap<DocumentStatus>(
    documentStatusRows as unknown as Array<Record<string, unknown>>,
    "status",
    DOCUMENT_STATUSES
  );

  const subscriptionCounts = countMap<SubscriptionState>(
    subscriptions.map((subscription) => ({
      state: effectiveSubscriptionState(subscription),
      _count: { _all: 1 },
    })),
    "state",
    SUBSCRIPTION_STATES
  );

  const activity: PlatformActivityEvent[] = [];

  for (const school of recentSchools) {
    activity.push({
      id: `school-${school.id}`,
      type: "SCHOOL",
      label: "School registration submitted",
      subject: school.name,
      at: school.createdAt.toISOString(),
      href: `/admin/schools/${school.id}`,
    });
  }

  for (const account of recentUsers) {
    activity.push({
      id: `user-${account.id}`,
      type: "USER",
      label: `${account.globalRole.replace("_", " ")} account created`,
      subject: formatName(account.firstName, account.lastName),
      at: account.createdAt.toISOString(),
      href: "/admin/users",
    });
  }

  for (const profile of recentAthleteProfiles) {
    const athleteName = formatName(
      profile.user.firstName,
      profile.user.lastName
    );
    if (profile.submittedForVerificationAt) {
      activity.push({
        id: `profile-submitted-${profile.id}`,
        type: "PROFILE",
        label: "Profile submitted for verification",
        subject: athleteName,
        at: profile.submittedForVerificationAt.toISOString(),
        href: "/admin/verifications",
      });
    }
    if (profile.verifiedAt && profile.verificationStatus !== "UNVERIFIED") {
      activity.push({
        id: `profile-reviewed-${profile.id}`,
        type: "PROFILE",
        label: `Profile ${profile.verificationStatus.toLowerCase()}`,
        subject: athleteName,
        at: profile.verifiedAt.toISOString(),
        href: "/admin/verifications",
      });
    }
  }

  for (const document of recentDocuments) {
    const athleteName = formatName(
      document.athleteProfile.user.firstName,
      document.athleteProfile.user.lastName
    );
    activity.push({
      id: `document-uploaded-${document.id}`,
      type: "DOCUMENT",
      label: `Document uploaded · ${document.title}`,
      subject: athleteName,
      at: document.createdAt.toISOString(),
      href: "/admin/documents",
    });
    if (document.reviewedAt && document.status !== "PENDING") {
      activity.push({
        id: `document-reviewed-${document.id}`,
        type: "DOCUMENT",
        label: `Document ${document.status.toLowerCase()} · ${document.title}`,
        subject: athleteName,
        at: document.reviewedAt.toISOString(),
        href: "/admin/documents",
      });
    }
  }

  for (const subscription of subscriptions) {
    activity.push({
      id: `subscription-${subscription.id}`,
      type: "SUBSCRIPTION",
      label: `Subscription ${effectiveSubscriptionState(subscription).toLowerCase()}`,
      subject: subscription.school.name,
      at: subscription.updatedAt.toISOString(),
      href: "/admin/subscriptions",
    });
  }

  activity.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return {
    schools: {
      total: totalOf(schoolStatusCounts),
      statusCounts: schoolStatusCounts,
      items: recentSchools.map((school) => ({
        id: school.id,
        name: school.name,
        schoolId: school.schoolId,
        status: school.status,
        createdAt: school.createdAt.toISOString(),
      })),
    },
    users: {
      total: totalOf(userRoleCounts),
      roleCounts: userRoleCounts,
      statusCounts: userStatusCounts,
      items: recentUsers.map((account) => ({
        id: account.id,
        name: formatName(account.firstName, account.lastName),
        email: account.email,
        role: account.globalRole,
        status: account.status,
        createdAt: account.createdAt.toISOString(),
      })),
    },
    verificationQueue: {
      profilesPending: verificationCounts.PENDING,
      documentsPending: documentCounts.PENDING,
      profileCounts: verificationCounts,
      documentCounts,
      athletes: pendingAthletes.map((profile) => ({
        id: profile.id,
        name: formatName(profile.user.firstName, profile.user.lastName),
        email: profile.user.email,
        sport: profile.primarySport,
        graduationYear: profile.graduationYear,
        completionPercentage: profile.completionPercentage,
        submittedAt: profile.submittedForVerificationAt?.toISOString() ?? null,
        pendingDocuments: profile.documents.filter(
          (document) => document.status === "PENDING"
        ).length,
      })),
      documents: pendingDocuments.map((document) => ({
        id: document.id,
        title: document.title,
        type: document.type,
        athleteName: formatName(
          document.athleteProfile.user.firstName,
          document.athleteProfile.user.lastName
        ),
        createdAt: document.createdAt.toISOString(),
      })),
    },
    platformActivity: {
      activeSubscriptions: subscriptionCounts.ACTIVE,
      subscriptionCounts,
      recruitingRecords: recruitingRecordCount,
      savedProspects: savedProspectCount,
      events: activity.slice(0, 10),
    },
  };
}
