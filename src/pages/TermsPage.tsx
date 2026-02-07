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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
          <div className="mt-1 text-sm text-slate-400">Effective date: [EFFECTIVE_DATE]</div>
        </div>
        <Link to="/privacy" className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
          Privacy Policy
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300">
        This is a template. Replace placeholders like <span className="text-slate-100">[OPERATOR_LEGAL_NAME]</span>{' '}
        and <span className="text-slate-100">[WEBSITE_URL]</span> before publishing.
      </div>

      <Section title="1) Overview">
        These Terms govern your use of <span className="text-slate-100">Polls That Shouldn’t Exist</span> (the
        “Service”) operated by <span className="text-slate-100">[OPERATOR_LEGAL_NAME]</span>. By using the Service,
        you agree to these Terms.
      </Section>

      <Section title="2) Accounts">
        You may need an account to vote or submit poll suggestions. You’re responsible for activity under your
        account.
      </Section>

      <Section title="3) Polls and voting">
        Polls refresh around <span className="text-slate-100">00:00 UTC</span>. One vote per poll per account.
      </Section>

      <Section title="4) User submissions">
        If you submit poll suggestions, you grant us a license to host and display them to operate the Service. Don’t
        submit illegal, harmful, or infringing content. We can review, approve, reject, or remove submissions.
      </Section>

      <Section title="5) Public profiles and attribution">
        If your suggestion is approved and used, we may show “Created by …” attribution only when your profile is
        public; otherwise it may show “Unknown”.
      </Section>

      <Section title="6) Acceptable use">
        Don’t abuse the Service, bypass protections, scrape, or attempt unauthorized access.
      </Section>

      <Section title="7) Disclaimers and limitation of liability">
        The Service is provided “as is.” To the maximum extent permitted by law, we disclaim warranties and limit
        liability as described in the full Terms.
      </Section>

      <Section title="8) Contact">
        Contact us at <span className="text-slate-100">[CONTACT_EMAIL]</span>.
      </Section>
    </div>
  )
}

