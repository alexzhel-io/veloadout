import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Veloadout — Bikepacking Gear Volume Calculator';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const labels: Record<string, { title: string; subtitle: string }> = {
  en: { title: 'Know your load before you go', subtitle: 'Bikepacking Gear Volume Calculator' },
  de: { title: 'Kenne deine Last, bevor du losgehst', subtitle: 'Bikepacking Volumenrechner' },
  ru: { title: 'Знай свой объём перед стартом', subtitle: 'Калькулятор объёма для байкпакинга' },
};

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { title, subtitle } = labels[locale] ?? labels.en;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #13111c 0%, #1c1a2e 60%, #2a1f4a 100%)',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🚴</div>
          <div style={{ color: 'white', fontSize: 56, fontWeight: 700, letterSpacing: '-0.02em' }}>Veloadout</div>
        </div>
        <div style={{ color: 'white', fontSize: 72, fontWeight: 800, textAlign: 'center', lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ color: '#a8a3c3', fontSize: 32, marginTop: 30, fontWeight: 400 }}>{subtitle}</div>
      </div>
    ),
    size,
  );
}
