import { LegalLayout } from '@/presentation/components/LegalLayout';

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <p><strong>Angaben gemäß § 5 TMG:</strong></p>
      <p>
        Eugene Z.<br />
        [Straße + Hausnummer]<br />
        [PLZ + Ort]<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>E-Mail: [deine E-Mail hier eintragen]</p>

      <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>Eugene Z. (Anschrift wie oben)</p>

      <h2>Haftungsausschluss</h2>
      <p>Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>

      <p className="text-text-muted text-sm mt-8">
        <em>Hinweis: Bitte vor dem Deployment vollständige Adresse einsetzen — Impressumspflicht in DE.</em>
      </p>
    </LegalLayout>
  );
}
