export type LegalSection = {
  id: string;
  title: string;
  body: string;
};

export type LegalDocument = {
  eyebrow: string;
  heading: string;
  intro: string;
  lastUpdated: string;
  status: string;
  draftNotice: string;
  sections: LegalSection[];
};

export const privacyPolicy: LegalDocument = {
  eyebrow: "Privacy Policy",
  heading: "Your information matters.",
  intro: "How MVP 4.18 handles information submitted through this site.",
  lastUpdated: "Draft policy · Last updated October 27, 2026",
  status: "Draft",
  draftNotice:
    "DRAFT — awaiting client-approved content. This is placeholder copy for the preview. Operating entity, contact details, service providers, and jurisdiction will be confirmed prior to production launch.",
  sections: [
    {
      id: "information-you-provide",
      title: "Information you provide",
      body: "When the service launches, we may collect information you submit, such as your name, school, professional email, profile details, and messages. Preview forms currently do not transmit or save submissions.",
    },
    {
      id: "how-information-is-used",
      title: "How information is used",
      body: "Information will be used to provide account access, support recruiting connections, respond to inquiries, and maintain the service. Details will be updated to reflect the actual services in use.",
    },
    {
      id: "sharing-and-visibility",
      title: "Sharing and visibility",
      body: "Profile visibility and any sharing with other users or service providers will be explained before live accounts become available. Do not submit sensitive athlete information through this preview.",
    },
    {
      id: "retention-and-your-choices",
      title: "Retention and your choices",
      body: "The final policy will describe retention periods and how to request access, correction, or deletion of account information.",
    },
    {
      id: "cookies-and-contact",
      title: "Cookies and contact",
      body: "This preview does not include advertising analytics. Contact channels and details about any production cookies will be added before launch.",
    },
  ],
};

export const termsOfUse: LegalDocument = {
  eyebrow: "Terms of Use",
  heading: "A clear foundation.",
  intro: "The current draft terms for using the MVP 4.18 platform.",
  lastUpdated: "Draft terms · Last updated November 5, 2026",
  status: "Draft",
  draftNotice:
    "DRAFT — awaiting client-approved content. This is placeholder copy for the preview. Operating entity, contact details, governing law, and dispute process will be confirmed prior to production launch.",
  sections: [
    {
      id: "using-the-platform",
      title: "Using the platform",
      body: "MVP 4.18 is intended to help schools and student-athletes discover and communicate with each other. This preview is for demonstration and does not provide live accounts.",
    },
    {
      id: "account-responsibilities",
      title: "Account responsibilities",
      body: "When registration becomes available, users must provide accurate information, protect account credentials, and have authority to represent their institution.",
    },
    {
      id: "respectful-participation",
      title: "Respectful participation",
      body: "Users must not impersonate others, misuse personal information, upload material without permission, harass other users, or use the platform unlawfully.",
    },
    {
      id: "recruiting-and-admissions",
      title: "Recruiting and admissions",
      body: "Connections do not guarantee recruitment, admission, scholarships, eligibility, or athletic placement. Each institution makes its own decisions and is responsible for applicable requirements.",
    },
    {
      id: "plans-and-payments",
      title: "Plans and payments",
      body: "Displayed prices are the actual launch plans. Payments are collected manually by our team. Final cancellation terms and payment conditions will be provided before any purchase.",
    },
    {
      id: "late-payment-fee",
      title: "Late payment fee",
      body: "Monthly school subscriptions are billed at $250 per month and are due when each monthly billing period ends. If a monthly payment is not received by its due date, a $25 late fee plus 6.25% tax is added to the amount due. Late fees apply only to monthly plans and are collected together with the next payment.",
    },
    {
      id: "changes-and-contact",
      title: "Changes and contact",
      body: "The final terms will identify the operating entity, governing law, dispute process, and support contact before the service launches.",
    },
  ],
};
