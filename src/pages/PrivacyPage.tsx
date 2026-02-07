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
          <div className="mt-1 text-sm text-slate-400">Effective date: [EFFECTIVE_DATE]</div>
        </div>
        <Link to="/terms" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          Terms of Service
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
        This is a template. Replace placeholders like <span className="text-slate-100">[OPERATOR_LEGAL_NAME]</span>{' '}
        and <span className="text-slate-100">[WEBSITE_URL]</span> before publishing.
      </div>

      <Section title="1) What we collect">
        We process account info (email, Supabase user ID), optional profile info (username, display name, avatar,
        public/private toggle), poll activity (votes and suggestions), and limited technical/security data.
      </Section>

      <Section title="2) Public profile toggle">
        If your profile is set to private, we aim to hide your profile and vote history from other users. If it’s
        public, other users may see your profile and past vote history.
      </Section>

      <Section title="3) Vote history timing">
        To preserve the “surprise” element, today’s vote may remain hidden until the next UTC day.
      </Section>

      <Section title="4) hCaptcha">
        We may use hCaptcha to reduce abuse. hCaptcha may collect information as described in its own policies, and we
        process verification results.
      </Section>

      <Section title="5) Sharing">
        We share data with service providers we use to run the Service (e.g., Supabase, hCaptcha, hosting) and when
        required by law.
      </Section>

      <Section title="6) Your choices">
        You can change your profile visibility, update your profile details, change password, and enable 2FA (if
        available). You can request deletion by contacting us.
      </Section>

      <Section title="7) Contact">
        Privacy requests: <span className="text-slate-100">[CONTACT_EMAIL]</span>.
      </Section>
    </div>
  )
}

