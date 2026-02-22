import { Link } from 'react-router-dom'

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-100">{props.title}</h2>
      <div className="mt-2 text-sm leading-6 text-slate-300">{props.children}</div>
    </section>
  )
}

export function TermsPage() {
  return (
    <div className="p-6 border rounded-2xl border-white/10 bg-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
          <div className="mt-1 text-sm text-slate-400">Effective date: 2026-02-07</div>
        </div>
        <Link to="/privacy" className="px-3 py-2 text-sm rounded-xl bg-white/10 hover:bg-white/15">
          Privacy Policy
        </Link>
      </div>

      <div className="mt-4 text-sm leading-6 text-slate-300">
        These Terms of Service (<span className="text-slate-100">“Terms”</span>) govern your access to and use of{' '}
        <span className="text-slate-100">Polls That Shouldn’t Exist</span> (the{' '}
        <span className="text-slate-100">“Service”</span>), including the website at{' '}
        <a className="underline hover:no-underline" href="https://randompolls.vercel.app">
          https://randompolls.vercel.app
        </a>
        , operated by <span className="text-slate-100">SzaBee13</span>.
      </div>

      <div className="mt-3 text-sm leading-6 text-slate-300">
        By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
      </div>

      <Section title="1) Eligibility">
        You must be at least the age of digital consent in your country/region to use the Service. If you are using
        the Service on behalf of an organization, you represent that you have authority to bind that organization.
      </Section>

      <Section title="2) Accounts and authentication">
        To vote or submit poll suggestions, you must create an account. Authentication is provided via{' '}
        <a className="underline hover:no-underline" href="https://supabase.com">
          Supabase
        </a>{' '}
        (email/password and/or OAuth providers such as Google). You are responsible for safeguarding your account and
        for all activity under it.
      </Section>

      <Section title="3) Polls, voting, and results">
        <ul className="pl-5 space-y-1 list-disc">
          <li>The Service provides daily polls that refresh at approximately 00:00 UTC.</li>
          <li>You may vote once per poll per account.</li>
          <li>We may change, suspend, or discontinue polls at any time.</li>
          <li>Results may be displayed after you vote (or as otherwise configured in the Service).</li>
        </ul>
      </Section>

      <Section title="4) User submissions (poll suggestions)">
        You may submit poll suggestions (questions and answer options). By submitting content, you grant us a
        worldwide, non-exclusive, royalty-free license to host, store, reproduce, modify, adapt, publish, and display
        that content for operating and improving the Service.
        <div className="mt-3">You are responsible for your submissions. Do not submit content that:</div>
        <ul className="pl-5 mt-2 space-y-1 list-disc">
          <li>is illegal, defamatory, harassing, hateful, or violent</li>
          <li>infringes intellectual property rights</li>
          <li>includes personal data you do not have the right to share</li>
          <li>is spam or intended to manipulate the Service</li>
        </ul>
        <div className="mt-3">We may review, approve, reject, edit, or remove suggestions at our discretion.</div>
      </Section>

      <Section title="5) Attribution (“Created by …”)">
        If your poll suggestion is approved and later used as a daily poll, we may show attribution such as “Created
        by [display name]” and/or a link to your profile, only if your profile is public (or as otherwise described in
        our Privacy Policy). If your profile is private or attribution information is unavailable, the poll may show
        “Created by Unknown”.
      </Section>

      <Section title="6) Public profiles and vote history">
        If the Service offers a public profile feature, you can choose whether your profile is public. When enabled,
        other users may be able to view profile information and vote history as described in our Privacy Policy.
      </Section>

      <Section title="7) Acceptable use">
        You agree not to:
        <ul className="pl-5 mt-2 space-y-1 list-disc">
          <li>
            interfere with or disrupt the Service (including rate limiting, scraping, or attempting to bypass
            protections such as CAPTCHA)
          </li>
          <li>attempt unauthorized access to accounts, systems, or data</li>
          <li>use the Service to violate laws or regulations</li>
          <li>upload malicious code</li>
        </ul>
      </Section>

      <Section title="8) Moderation and enforcement">
        We may suspend or terminate accounts, remove content, or limit access if we reasonably believe you violated
        these Terms, the law, or are causing harm to the Service or others.
      </Section>

      <Section title="9) Third-party services">
        The Service relies on third-party services (for example: Supabase for authentication/database/storage, hCaptcha
        for abuse prevention, and hosting providers). Your use may also be subject to their terms and policies.
      </Section>

      <Section title="10) Intellectual property">
        We (and our licensors) retain all rights in the Service, including its design, code, and branding, except for
        user-submitted content where you retain ownership.
      </Section>

      <Section title="11) Disclaimers">
        <div className="px-4 py-3 font-mono text-xs border rounded-xl border-white/10 bg-black/30 text-slate-200">
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
          WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT.
        </div>
        <div className="mt-3">
          We do not guarantee that polls, results, or any content will be accurate, complete, or available.
        </div>
      </Section>

      <Section title="12) Limitation of liability">
        <div className="px-4 py-3 font-mono text-xs border rounded-xl border-white/10 bg-black/30 text-slate-200">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUES, DATA, OR GOODWILL, ARISING FROM OR
          RELATED TO YOUR USE OF THE SERVICE.
        </div>
        <div className="px-4 py-3 mt-3 font-mono text-xs border rounded-xl border-white/10 bg-black/30 text-slate-200">
          OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) USD $50 OR
          (B) THE AMOUNT YOU PAID US TO USE THE SERVICE IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM (IF
          ANY).
        </div>
      </Section>

      <Section title="13) Indemnification">
        You agree to defend, indemnify, and hold harmless SzaBee13 from and against claims, damages, liabilities, and
        expenses arising out of your use of the Service or your violation of these Terms.
      </Section>

      <Section title="14) Changes to these Terms">
        We may update these Terms from time to time. We will update the effective date above and, when appropriate,
        provide additional notice. Your continued use of the Service after changes become effective constitutes
        acceptance.
      </Section>

      <Section title="15) Contact">
        Questions about these Terms:
        <ul className="pl-5 mt-2 space-y-1 list-disc">
          <li>
            <span className="font-semibold text-slate-100">Email:</span>{' '}
            <a className="underline hover:no-underline" href="mailto:me@szabee.me">
              SzaBee13
            </a>
          </li>
        </ul>
      </Section>
    </div>
  )
}
