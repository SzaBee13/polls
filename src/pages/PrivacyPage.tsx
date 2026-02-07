import { Link } from 'react-router-dom'

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-100">{props.title}</h2>
      <div className="mt-2 text-sm leading-6 text-slate-300">{props.children}</div>
    </section>
  )
}

export function PrivacyPage() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
          <div className="mt-1 text-sm text-slate-400">Effective date: 2026-02-07</div>
        </div>
        <Link to="/terms" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          Terms of Service
        </Link>
      </div>

      <div className="mt-4 text-sm leading-6 text-slate-300">
        This Privacy Policy explains how <span className="text-slate-100">SzaBee13</span> collects, uses, shares, and
        protects information when you use <span className="text-slate-100">Polls That Shouldn’t Exist</span> (the{' '}
        <span className="text-slate-100">“Service”</span>) at{' '}
        <a className="underline hover:no-underline" href="https://randompolls.vercel.app">
          https://randompolls.vercel.app
        </a>
        .
      </div>

      <div className="mt-3 text-sm leading-6 text-slate-300">
        If you do not agree with this Privacy Policy, do not use the Service.
      </div>

      <Section title="1) Information we collect">
        <div className="font-semibold text-slate-100">A) Account information</div>
        <div className="mt-1">
          When you create an account, we process your email address, authentication identifiers (e.g. Supabase user
          ID), and OAuth provider data (e.g. Google profile name/photo) if you choose OAuth.
        </div>

        <div className="mt-4 font-semibold text-slate-100">B) Profile information (optional)</div>
        <div className="mt-1">
          If you create or edit a profile, we may process username, display name, profile picture (avatar) URL or
          uploaded image, and a public/private profile setting.
        </div>

        <div className="mt-4 font-semibold text-slate-100">C) Poll activity</div>
        <div className="mt-1">
          We process votes you cast (poll identifier, selected option, timestamps), aggregate poll results (counts per
          option), and poll suggestions you submit (question/options) and moderation status.
        </div>

        <div className="mt-4 font-semibold text-slate-100">D) Security and abuse-prevention data</div>
        <div className="mt-1">
          If enabled, we use hCaptcha to reduce abuse. hCaptcha may collect information as described in its own
          privacy policy, and we may process hCaptcha verification results (success/failure).
        </div>

        <div className="mt-4 font-semibold text-slate-100">E) Technical data</div>
        <div className="mt-1">
          We may process standard technical information such as IP address, device/browser information, and logs for
          security, debugging, and performance.
        </div>
      </Section>

      <Section title="2) How we use information">
        <ul className="list-disc space-y-1 pl-5">
          <li>provide and operate the Service (sign-in, voting, showing results)</li>
          <li>enforce “one vote per poll”</li>
          <li>review and moderate poll suggestions</li>
          <li>provide profiles and (if enabled) profile features</li>
          <li>prevent fraud, spam, and abuse</li>
          <li>debug, maintain, and improve the Service</li>
          <li>comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="3) Public profiles and vote history">
        If you enable a public profile, other users may be able to see your username and display name, your profile
        picture, and your vote history for past days.
        <div className="mt-3">
          To preserve the “surprise” element, today’s vote may remain hidden until a later time (for example, until
          the next UTC day), depending on how the Service is configured.
        </div>
        <div className="mt-3">
          If your profile is private, we aim to prevent your profile and vote history from being publicly visible.
        </div>
      </Section>

      <Section title="4) Sharing of information">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-slate-100">Service providers</span> we use to run the Service (e.g.
            Supabase for authentication/database/storage; hCaptcha for abuse prevention; hosting providers).
          </li>
          <li>
            <span className="font-semibold text-slate-100">Legal and safety</span>: if required by law, or to protect
            rights, safety, and security.
          </li>
        </ul>
        <div className="mt-3">We do not sell your personal information.</div>
      </Section>

      <Section title="5) Data retention">
        We retain information as long as necessary to provide the Service and for legitimate business purposes
        (security, auditing, dispute resolution) unless a longer retention period is required by law. You can request
        deletion as described below.
      </Section>

      <Section title="6) Your choices and rights">
        Depending on your location, you may have rights to access, correct, or delete your personal data, object to or
        restrict processing, and withdraw consent (where applicable).
        <div className="mt-3">
          You can also set your profile to public/private (if available), update your profile details, and change your
          password / enable 2FA (if available).
        </div>
        <div className="mt-3">
          To make a request, contact us at <span className="text-slate-100">[CONTACT_EMAIL]</span>.
        </div>
      </Section>

      <Section title="7) Security">
        We use reasonable technical and organizational measures to protect data. No system is 100% secure; please use
        a strong password and enable 2FA if available.
      </Section>

      <Section title="8) International transfers">
        Your information may be processed in countries other than where you live, including the United States,
        depending on where our service providers operate.
      </Section>

      <Section title="9) Children’s privacy">
        The Service is not intended for children under the age of digital consent. If you believe a child has provided
        personal information, contact us to request deletion.
      </Section>

      <Section title="10) Changes to this Privacy Policy">
        We may update this policy from time to time. We will update the effective date above and, when appropriate,
        provide additional notice.
      </Section>

      <Section title="11) Contact">
        Privacy questions or requests:
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <span className="font-semibold text-slate-100">Email:</span>{' '}
            <a className="underline hover:no-underline" href="mailto:szabee13.proton.me">
              szabee13.proton.me
            </a>
          </li>
        </ul>
      </Section>
    </div>
  )
}
