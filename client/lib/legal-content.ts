export const LEGAL_VERSIONS = {
  TERMS_OF_USE: "2026-11-25",
  PRIVACY_POLICY: "2026-11-25",
  GUARDIAN_AUTHORIZATION: "2026-11-25",
} as const;

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  eyebrow: string;
  heading: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export const privacyPolicy: LegalDocument = {
  eyebrow: "Privacy Policy",
  heading: "Privacy Policy",
  intro:
    "MVP 4.18 Recruiting Technologies LLC (“MVP 4.18,” “we,” or “us”) operates the MVP 4.18 website and recruiting platform for prep and private schools, student-athletes, and their families. This policy explains how we collect, use, and share personal information and how to contact us about it.",
  effectiveDate: "November 25, 2026",
  sections: [
    {
      id: "information-we-collect",
      title: "Information we collect",
      paragraphs: [
        "Account and school information. We collect information you provide when you register a school, create an account, or contact us. This may include names, email addresses, account roles, school affiliations, and parent or guardian contact information.",
        "Athlete and recruiting information. Depending on the features you use, this may include age or eligibility information, graduation year, sport, position, athletic achievements, photos, highlight links, and recruiting activity. If verification is required, we may collect the specific documents requested through the verification process. Please submit documents only through the designated upload feature.",
        "School billing and support information. We may keep school billing contacts, invoices, payment records, and communications about subscriptions or support.",
        "Website and device information. When you visit or sign in, we may collect technical information such as your IP address, browser type, and sign-in activity. We may use cookies or similar technologies to keep you signed in, maintain security, and remember preferences.",
      ],
    },
    {
      id: "how-we-use-information",
      title: "How we use information",
      paragraphs: [
        "We use information to operate accounts, confirm eligibility and school affiliations, support recruiting, manage school subscriptions, respond to requests, maintain security, and meet legal obligations. We also use it to investigate suspected misuse and improve the platform.",
      ],
    },
    {
      id: "who-can-see-information",
      title: "Who can see information",
      paragraphs: [
        "Authorized users at approved schools may see eligible athlete recruiting information through the platform’s recruiting features. Access depends on the user’s role and the feature being used. A school’s private roster, internal recruiting notes, and verification materials are restricted to users authorized to access those records.",
        "We may share information with service providers that support hosting, authentication, email, storage, or other platform operations. We may also disclose information when legally required or when reasonably necessary to protect users or investigate misuse. Participating schools may separately handle information they receive for their own recruiting or admissions purposes under their own policies.",
      ],
    },
    {
      id: "student-athletes-and-guardians",
      title: "Student-athletes and guardians",
      paragraphs: [
        "The platform is intended for eligible student-athletes ages 14–19. If an athlete is below the age of legal majority where they live, a parent or legal guardian must authorize participation. Please contact us if you believe an ineligible child has submitted personal information or if you want to review information associated with your child’s account.",
      ],
    },
    {
      id: "retention-security-and-international-processing",
      title: "Retention, security, and international processing",
      paragraphs: [
        "We keep personal information for as long as reasonably necessary to provide the service, manage recruiting and subscription records, resolve disputes, and meet legal obligations. Retention depends on the type of record and the reason we hold it. We use safeguards designed to protect personal information and restrict access. Depending on where you live and where our providers operate, information may be processed in the United States or another country.",
      ],
    },
    {
      id: "your-choices-and-contact-information",
      title: "Your choices and contact information",
      paragraphs: [
        "You or an authorized parent or guardian may contact us to request access, correction, or deletion, or to withdraw consent where applicable. Other rights may apply depending on your location. We may verify your identity or authority before acting on a request. We will post updates to this policy here and provide additional notice when required.",
        "For privacy questions or requests, email mvp418.recruiting@gmail.com.",
      ],
    },
  ],
};

export const termsOfUse: LegalDocument = {
  eyebrow: "Terms of Use",
  heading: "Terms of Use",
  intro:
    "These Terms govern your use of the MVP 4.18 website and recruiting platform, operated by MVP 4.18 Recruiting Technologies LLC. If you accept these Terms on behalf of a school, you confirm that you have authority to act for that school.",
  effectiveDate: "November 25, 2026",
  sections: [
    {
      id: "eligibility-and-accounts",
      title: "Eligibility and accounts",
      paragraphs: [
        "School access is subject to approval and subscription activation. Athlete accounts are for eligible student-athletes ages 14–19 and are subject to verification and approval. Athletes below the age of legal majority where they live must have authorization from a parent or legal guardian. Athletes and families participate through the platform’s school-based access process.",
        "Provide accurate information, keep your credentials private, and contact us promptly if you suspect unauthorized use. School administrators are responsible for keeping staff access current and limiting access to authorized personnel.",
      ],
    },
    {
      id: "permitted-use",
      title: "Permitted use",
      paragraphs: [
        "Use MVP 4.18 for legitimate school recruiting, athlete profile management, and related communications. Use student information only for authorized recruiting or school purposes. Do not scrape or bulk export data, distribute private records, impersonate anyone, harass users, bypass access restrictions, or use athlete information for unrelated marketing.",
      ],
    },
    {
      id: "information-and-materials-you-submit",
      title: "Information and materials you submit",
      paragraphs: [
        "You retain ownership of materials you submit. By uploading them, you give MVP 4.18 permission to store, process, and display them as needed to operate the service and make them available to authorized users. Submit only materials you have the right to share. Schools must have the necessary authority or permissions before uploading student records or sharing them through the platform.",
      ],
    },
    {
      id: "school-subscriptions",
      title: "School subscriptions",
      paragraphs: [
        "The standard school subscription is $250 per month or $1,500 per year, as selected by the school. School subscriptions are activated manually by MVP 4.18. Any applicable taxes, payment deadlines, late fees, renewal terms, cancellation terms, or refund terms are governed by the school’s written order or agreement and applicable law. If there is a conflict over billing, the signed school agreement controls.",
      ],
    },
    {
      id: "recruiting-decisions-and-outcomes",
      title: "Recruiting decisions and outcomes",
      paragraphs: [
        "MVP 4.18 helps schools, student-athletes, and families connect and manage recruiting activity. Schools independently decide whom to contact, admit, recruit, or offer financial aid. Use of the platform does not guarantee a transfer, roster spot, scholarship, admission, or eligibility determination. Users should verify offers and eligibility directly with the relevant school or governing organization.",
      ],
    },
    {
      id: "suspension-and-termination",
      title: "Suspension and termination",
      paragraphs: [
        "We may restrict or suspend access for unpaid school subscriptions, eligibility issues, misuse, security concerns, or violations of these Terms. Where appropriate, we will explain the reason and what is needed to restore access. Contact us for help with a suspension or to request account closure. Personal information is handled under the Privacy Policy after access ends.",
      ],
    },
    {
      id: "changes-and-contact-information",
      title: "Changes and contact information",
      paragraphs: [
        "We may update these Terms and will post the revised effective date. We will provide notice or request renewed acceptance where required. These Terms preserve any rights that applicable law gives you. For questions, email mvp418.recruiting@gmail.com.",
      ],
    },
  ],
};
