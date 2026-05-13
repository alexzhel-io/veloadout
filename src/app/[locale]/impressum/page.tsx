import { LegalLayout } from '@/presentation/components/LegalLayout';

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <p><strong>Angaben gemäß § 5 TMG:</strong></p>
      <p>
        Yevgen Zhelichowski<br />
        Berlinerstr. 70<br />
        80805 München<br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>E-Mail: <a href="mailto:support@veloadout.com">support@veloadout.com</a></p>

      <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>Yevgen Zhelichowski (Anschrift wie oben)</p>

      <h2>Haftungsausschluss</h2>
      <p>Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
    </LegalLayout>
  );
}
