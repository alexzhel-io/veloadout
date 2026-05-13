import { LegalLayout } from '@/presentation/components/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p><strong>Last updated:</strong> 2026-05-12</p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Email address</strong> — when you sign in via magic link.</li>
        <li><strong>Gear lists</strong> — items you save to your account.</li>
        <li><strong>Server logs</strong> — IP address, user-agent, timestamps. Kept for 30 days for security.</li>
      </ul>

      <h2>2. How we use it</h2>
      <p>Only to operate the service: authenticate you, store your list, prevent abuse. We do not sell or share data with advertisers.</p>

      <h2>3. Third-party services</h2>
      <ul>
        <li><strong>Supabase</strong> (EU region) — authentication and database.</li>
        <li><strong>Anthropic Claude API</strong> — AI gear lookups. Your search query is sent to Anthropic but not your email or list.</li>
        <li><strong>Vercel</strong> — hosting.</li>
      </ul>

      <h2>4. Your rights (GDPR)</h2>
      <p>You can:</p>
      <ul>
        <li>Request a copy of your data</li>
        <li>
          Request deletion of your account and all associated data —
          send an email from the address you registered with. Deletion
          is performed within 30 days, in line with GDPR Article 17.
        </li>
        <li>Object to processing</li>
      </ul>
      <p>Contact: [deine E-Mail hier eintragen]</p>

      <h2>5. Cookies</h2>
      <p>We use only essential cookies for session/authentication. No analytics or advertising cookies.</p>
    </LegalLayout>
  );
}
