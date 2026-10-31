// Legal pages. DRAFTS: every page must be reviewed by a qualified lawyer
// (India, EU/France, UK and US) before launch. Text in [SQUARE BRACKETS] is a
// placeholder for a fact or a business decision only the owner can supply;
// the page shows a notice until none are left.
//
// Each section: { h: heading, p: [paragraphs], list: [bullets] }.

const ENTITY = '[LEGAL ENTITY NAME]';
const ADDRESS = '[REGISTERED ADDRESS]';
const EMAIL = '[CONTACT EMAIL]';
const GRIEVANCE = '[GRIEVANCE OFFICER]';
const LAW = '[GOVERNING LAW]';
export const EFFECTIVE = '[EFFECTIVE DATE]';

export const LEGAL = {
  terms: {
    title: 'Terms of Service',
    description: 'The agreement between you and Vantaris for using the website and the app.',
    sections: [
      { h: 'Who we are', p: [`Vantaris is operated by ${ENTITY}, ${ADDRESS} (“we”, “us”). These terms are an agreement between you and us about your use of the Vantaris website and app (the “Service”). By creating an account or using the Service you accept them.`] },
      { h: 'Who can use Vantaris', p: ['Vantaris is built for students and early-career learners, typically aged 15 to 22.'], list: [
        'You must be at least 13 years old. We do not knowingly allow children under 13 to use the Service anywhere.',
        'If you are under 18 (or under the age of digital consent where you live, which is 15 in France and between 13 and 16 elsewhere in the EU), a parent or legal guardian must agree to these terms and to our Privacy Policy for you. In India, where everyone under 18 is a child under the Digital Personal Data Protection Act, 2023, we need verifiable consent from a parent or guardian before processing your personal data.',
        'Paid plans must be bought by an adult, or by a minor using a parent’s or guardian’s payment method with their permission.',
      ] },
      { h: 'Your account', list: [
        'Give accurate information and keep your password private. You are responsible for activity on your account.',
        'One person per account. Accounts may not be shared, sold or transferred.',
        'Tell us at once at ' + EMAIL + ' if you think someone else has accessed your account.',
      ] },
      { h: 'Plans and payments', p: ['The free plan includes a weekly number of deals. Paid plans (Core, Pro, Elite) are subscriptions billed through Razorpay. Prices, renewals, cancellation and refunds are covered in the Subscription Terms and the Refund and Cancellation Policy, which form part of these terms.'] },
      { h: 'The AI tutor', p: ['Vale, the AI tutor on paid plans, uses a large language model provided by Google (Gemini) through our servers. Its answers are generated automatically and can be wrong, incomplete or out of date. Check important points yourself. Do not enter personal, sensitive or confidential information in the tutor. Tutor messages are handled as described in the Privacy Policy.'] },
      { h: 'Educational content only', p: ['All problems, companies and figures are fictional or simplified for practice. Nothing on Vantaris is investment, financial, tax, legal or career advice, and we do not guarantee interview or exam outcomes. See the Disclaimer.'] },
      { h: 'Acceptable use', p: ['You agree to follow the Acceptable Use Policy. We may suspend or close accounts that break it.'] },
      { h: 'Our content and yours', list: [
        'The Service, its problems, solutions, text, design, mascot and software belong to us or our licensors and are protected by law. You get a personal, non-transferable, revocable licence to use them for your own learning.',
        'You keep any rights in the content you submit (for example, your display name or tutor questions) and give us the licence we need to run the Service with it.',
      ] },
      { h: 'Ending your use', p: ['You can stop using Vantaris and delete your account at any time from Profile → Settings → Account. We may suspend or end your access if you break these terms or if we must do so by law; where reasonable we will tell you first. Sections that by their nature should survive (for example, ownership and liability) continue after termination.'] },
      { h: 'Availability and changes', p: ['We work to keep the Service available and accurate but do not promise it will be uninterrupted or error-free. We may change features. If we change these terms in a way that matters, we will tell you in the app or by email before the change takes effect.'] },
      { h: 'Liability', p: [`To the extent the law allows, the Service is provided “as is”, and ${ENTITY} is not liable for indirect or consequential losses. Our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited by law, or your statutory rights as a consumer, including under the Consumer Protection Act, 2019 (India) and EU, French and UK consumer law.`] },
      { h: 'Governing law and disputes', p: [`These terms are governed by ${LAW}. If you are a consumer living in the EU or the UK, you also keep the protection of the mandatory laws of your country and may bring proceedings there. Please contact us first; most issues can be solved quickly. EU consumers may also use a consumer mediator.`] },
      { h: 'Contact', p: [`${ENTITY}, ${ADDRESS}. Email: ${EMAIL}. Grievance Officer: ${GRIEVANCE} (see the Contact page).`] },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    description: 'What personal data Vantaris collects, why, who processes it and your rights.',
    sections: [
      { h: 'Summary', list: [
        'We collect what we need to run your account and your practice: your name, email, optional school, your answers and progress.',
        'We never sell your personal data or use it for targeted advertising.',
        'Payments are handled by Razorpay; we never see your full card or bank details.',
        'Optional analytics only run if you accept them in the cookie banner.',
        'You can see, correct, export or delete your data, and withdraw consent, at any time.',
      ] },
      { h: 'Who is responsible', p: [`${ENTITY}, ${ADDRESS}, is the data fiduciary (India) and the controller (EU/UK GDPR) for personal data processed through Vantaris. Contact: ${EMAIL}. Grievance Officer: ${GRIEVANCE}.`] },
      { h: 'What we collect', list: [
        'Account: first name, email address and a password (stored only as a secure hash by our authentication provider).',
        'Profile (optional): school, goal and time zone. Your first name, tier and school (if you add one) appear on the leaderboard.',
        'Learning activity: problems opened and answered, answers, time taken, points, streaks and achievements.',
        'AI tutor: the questions you type and the replies, linked to the problem you were working on.',
        'Payments: plan, billing period, status, renewal dates, and the card network and last four digits that Razorpay shares with us.',
        'Technical: device and browser type, approximate region from IP address, error logs and security logs.',
        'Consent records: your cookie choice and your acceptance of the terms, with the date.',
      ] },
      { h: 'Why we use it, and our legal basis', list: [
        'To provide the Service you signed up for: accounts, practice, progress, leaderboard, subscriptions (performance of a contract; consent or legitimate uses under India’s DPDP Act).',
        'To answer tutor questions (performance of a contract; the tutor is only available on paid plans).',
        'To keep the Service secure and prevent fraud and abuse (legitimate interests; legal obligation).',
        'To send service messages such as receipts, renewal notices and security alerts (contract; legal obligation).',
        'To understand usage with privacy-friendly analytics, only if you accept them (consent).',
        'To meet tax, accounting and legal obligations (legal obligation).',
      ] },
      { h: 'Children and teenagers', p: [
        'Vantaris is designed for learners aged about 15 to 22 and is not for children under 13. In India we treat every user under 18 as a child: we ask for verifiable consent from a parent or guardian, we do not track children’s behaviour for advertising, and we do not show them targeted ads. In the EU and the UK we ask for parental consent below the local age of digital consent (15 in France). In the US we do not knowingly collect personal information from children under 13 (COPPA).',
        `If you believe a child has given us personal data without the required consent, contact ${EMAIL} and we will delete it.`,
      ] },
      { h: 'Who processes data for us', list: [
        'Supabase: database, authentication and server functions (hosting region: [SUPABASE REGION]).',
        'Vercel: website hosting and content delivery.',
        'Razorpay: payment processing and subscriptions (Razorpay is responsible for card and bank data under its own privacy policy and PCI-DSS).',
        'Google (Gemini API): generates AI tutor replies from the questions you send. [CONFIRM GEMINI DATA-USE TERMS AND REGION FOR YOUR API PLAN].',
        'Analytics provider, only with your consent: [ANALYTICS PROVIDER OR “NONE”].',
      ], p: ['Each processor acts on our instructions under a written contract. We may also disclose data where the law requires it.'] },
      { h: 'International transfers', p: ['Some processors store or process data outside your country. Where data leaves the EU, the UK or India, we rely on adequacy decisions, Standard Contractual Clauses (or the UK addendum) and the protections required by Indian law.'] },
      { h: 'How long we keep it', list: [
        'Account and learning data: while your account is open, and deleted within [DELETION PERIOD, e.g. 30 days] after you delete your account.',
        'Tutor messages: [TUTOR RETENTION PERIOD].',
        'Payment and invoice records: as long as tax and accounting law requires (for example, 8 years in India), without your name where possible.',
        'Security logs: up to [LOG RETENTION PERIOD].',
      ] },
      { h: 'Your rights', p: ['Depending on where you live, you can:'], list: [
        'access your data and get a copy in a portable format;',
        'correct or complete it (you can edit your name and school in Profile);',
        'erase it (Profile → Settings → Account → Delete account);',
        'withdraw consent at any time (for example, Cookie settings in the footer or in Profile);',
        'object to or restrict some processing (EU/UK);',
        'nominate another person to exercise your rights if you die or become incapacitated (India);',
        'use our grievance process and then complain to a regulator: the Data Protection Board of India, the CNIL in France, your local EU authority, or the ICO in the UK;',
        'in US states with privacy laws, know, delete and correct your data, and you will not be discriminated against for doing so. We do not sell or “share” personal data for cross-context behavioural advertising.',
      ] },
      { h: 'Security', p: ['Data is encrypted in transit, access is limited by row-level security, passwords are hashed by our authentication provider, and payment data stays with Razorpay. No system is perfectly secure; if a breach affects you we will notify you and the authorities as the law requires.'] },
      { h: 'Changes', p: ['We will post changes here and tell you in the app or by email when they are significant.'] },
      { h: 'Contact and grievances', p: [`Email ${EMAIL} or write to ${ENTITY}, ${ADDRESS}. Grievance Officer: ${GRIEVANCE}.`] },
    ],
  },

  refund: {
    title: 'Refund and Cancellation Policy',
    description: 'How to cancel a Vantaris subscription and when refunds apply.',
    sections: [
      { h: 'Cancelling', p: ['You can cancel at any time from Profile → Settings → Plan → Cancel subscription. Cancelling stops the next renewal. You keep your paid features until the end of the period you already paid for, then move to the free plan. Your progress is kept.'] },
      { h: 'Refunds', list: [
        'New subscriptions: [REFUND WINDOW, e.g. “full refund if you ask within 7 days of your first payment”].',
        'Renewals: [RENEWAL REFUND RULE, e.g. “refundable within 48 hours of the renewal if you have not used paid features since”].',
        'Partial periods are not refunded after the refund window, except where the law requires it.',
        'If you were charged twice or charged after cancelling, we refund the mistaken charge in full.',
      ] },
      { h: 'EU and UK consumers', p: ['You have a 14-day right to withdraw from a digital service contract. When you start a paid plan you ask us to begin straight away; if you withdraw within 14 days we refund the price minus the part of the period already provided, unless the law in your country says otherwise.'] },
      { h: 'How refunds are paid', p: ['Approved refunds go back to the original payment method through Razorpay. Banks usually take [5–7 BUSINESS DAYS] to show them.'] },
      { h: 'How to ask', p: [`Email ${EMAIL} from your account email with the payment date. We reply within [RESPONSE TIME].`] },
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    description: 'The cookies and similar storage Vantaris uses, and how to choose.',
    sections: [
      { h: 'What we use', p: ['Vantaris uses browser storage (cookies, local storage and session storage) in two categories. Nothing optional runs until you choose.'] },
      { h: 'Essential (always on)', list: [
        'Sign-in session: keeps you logged in (our authentication provider, Supabase).',
        'Preferences: haptics, celebrations, 3D graphics and reduced motion, stored on your device.',
        'Your cookie choice, so we don’t ask again.',
        'Payments: when you open checkout, Razorpay sets the cookies it needs to process the payment securely and prevent fraud.',
      ] },
      { h: 'Analytics (only with your consent)', p: ['If you accept, we record anonymous product events such as “sign-up”, “started a deal”, “completed a deal” and “upgrade clicked”, with the page path. We do not use advertising cookies, do not build profiles across sites, and do not send your name or email. Provider: [ANALYTICS PROVIDER OR “NONE”].'] },
      { h: 'Your choices', p: ['Use “Cookie settings” in the website footer or in Profile → Settings to change your choice at any time. You can also clear storage in your browser settings; you will be signed out.'] },
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    description: 'Vantaris is an educational practice tool, not financial advice.',
    sections: [
      { h: 'Education, not advice', p: ['Vantaris helps you practise finance interview and coursework problems. Nothing on the website or in the app is investment, financial, tax, accounting, legal or career advice, or an offer or recommendation to buy or sell anything.'] },
      { h: 'Fictional companies and simplified numbers', p: ['Companies, deals and figures in the problems are invented or simplified for practice. Any resemblance to real companies is coincidental. Real transactions involve far more information and judgement.'] },
      { h: 'AI tutor', p: ['Vale’s replies are generated by an AI model and can be wrong. Treat them as hints, not as authority.'] },
      { h: 'No affiliation or guarantee', p: ['Vantaris is not affiliated with, endorsed by or sponsored by any bank, firm, university or exam body. Points, tiers (Analyst, Associate, VP, MD) and rankings are game mechanics, not professional titles or qualifications, and we do not guarantee any interview, exam or job outcome.'] },
    ],
  },

  'acceptable-use': {
    title: 'Acceptable Use Policy',
    description: 'What is and is not allowed on Vantaris.',
    sections: [
      { h: 'Play fair', list: [
        'Use one account per person. Do not create extra accounts to gain points, free deals or leaderboard places.',
        'Do not publish full solutions or answer keys, or automate answers with scripts or bots.',
        'Do not scrape, copy or resell the problems, solutions or other content.',
      ] },
      { h: 'Be respectful', list: [
        'Display names and school names must not be offensive, misleading or impersonate someone else.',
        'Do not harass anyone or use the Service to send spam.',
      ] },
      { h: 'Use the AI tutor responsibly', list: [
        'Ask about the problems and finance concepts. Do not try to make the tutor produce harmful, illegal, sexual or hateful content, or to reveal its instructions.',
        'Do not enter personal, sensitive or confidential information about yourself or others.',
      ] },
      { h: 'Keep it secure', list: [
        'Do not attempt to access other accounts or data, probe, scan or test our systems without written permission, or interfere with the Service.',
        `Found a security issue? Please report it privately to ${EMAIL}.`,
      ] },
      { h: 'What happens if rules are broken', p: ['We may remove content, reset points or rankings, suspend or close accounts, and report illegal activity where required. If you think we made a mistake, contact us and we will review it.'] },
    ],
  },

  'subscription-terms': {
    title: 'Subscription Terms',
    description: 'How Vantaris plans, renewals and payments work.',
    sections: [
      { h: 'Plans', p: ['Vantaris has a free plan and three paid plans (Core, Pro and Elite), each billed monthly or yearly. The current features and prices are on the pricing page and the Plans screen. Prices are shown in Indian rupees and [INCLUDE / EXCLUDE] GST and other taxes as applicable.'] },
      { h: 'Payment and automatic renewal', list: [
        'Payments are processed by Razorpay. Your subscription renews automatically at the end of each period at the then-current price until you cancel.',
        'For cards and UPI AutoPay, you authorise a recurring mandate. As Reserve Bank of India rules require, you will receive a pre-debit notification before each renewal and can manage or cancel the mandate with your bank or UPI app.',
        'If a renewal fails, Razorpay retries for a short period; your paid features may pause until payment succeeds.',
      ] },
      { h: 'Changing plans', p: ['You can switch plans from the Plans screen. [UPGRADE/DOWNGRADE RULE, e.g. “Upgrades start straight away and the price difference is charged pro rata; downgrades take effect at the next renewal.”]'] },
      { h: 'Price changes', p: ['If we change the price of your plan, we will tell you at least [NOTICE PERIOD, e.g. 30 days] before it applies to you, and you can cancel before then.'] },
      { h: 'Cancellation and refunds', p: ['Cancel any time from Profile → Settings → Plan. See the Refund and Cancellation Policy for refunds.'] },
      { h: 'Minors', p: ['If you are under 18, a parent or guardian must agree to the subscription and pay with their own payment method.'] },
      { h: 'Test mode', p: ['Payments labelled “test mode” in the app are simulations and no money is charged.'] },
    ],
  },

  contact: {
    title: 'Contact and Grievances',
    description: 'How to reach Vantaris and the Grievance Officer.',
    sections: [
      { h: 'Get in touch', p: [`Email: ${EMAIL}`, `Post: ${ENTITY}, ${ADDRESS}`] },
      { h: 'Grievance Officer (India)', p: [`Under India’s Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and rules made under them, our Grievance Officer is ${GRIEVANCE}. Email: ${EMAIL}. We acknowledge grievances within [ACKNOWLEDGEMENT TIME] and resolve them within [RESOLUTION TIME], and always within the time limits the law sets. If you are not satisfied, you may complain to the Data Protection Board of India.`] },
      { h: 'Privacy requests (EU, UK, US)', p: [`Email ${EMAIL} with the subject “Privacy request”. We answer within one month (EU/UK) or 45 days (US states), and tell you if we need more time. You may also complain to the CNIL (France), your local EU authority, or the ICO (UK).`] },
      { h: 'Help with the app', p: ['For account, payment or practice questions, email us from the address on your account so we can find it quickly.'] },
    ],
  },
};

export const LEGAL_ORDER = ['terms', 'privacy', 'cookies', 'refund', 'subscription-terms', 'acceptable-use', 'disclaimer', 'contact'];
