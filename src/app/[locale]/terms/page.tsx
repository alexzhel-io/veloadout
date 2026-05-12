import { LegalLayout } from '@/presentation/components/LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p><strong>Last updated:</strong> 2026-05-12</p>

      <h2>1. Service</h2>
      <p>Veloadout is a free tool for estimating bikepacking gear volumes. Provided as-is, no warranties.</p>

      <h2>2. Accuracy disclaimer</h2>
      <p>Volume and weight data is crowd-sourced and AI-assisted. It may be inaccurate. Always verify critical gear specs with the manufacturer before purchasing or relying on them for a trip.</p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>No automated scraping or abuse of the AI search endpoint</li>
        <li>No use for illegal purposes</li>
      </ul>

      <h2>4. Account</h2>
      <p>You may create an account using your email. You are responsible for keeping access to your inbox secure.</p>

      <h2>5. Termination</h2>
      <p>You can delete your account anytime. We may suspend accounts that violate these terms.</p>

      <h2>6. Liability</h2>
      <p>To the extent permitted by law, we are not liable for any damages arising from use of the service.</p>

      <h2>7. Changes</h2>
      <p>We may update these terms. Continued use after changes constitutes acceptance.</p>
    </LegalLayout>
  );
}
