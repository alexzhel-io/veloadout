import { NextResponse } from 'next/server';
import { GetPresetsUseCase } from '@/application/gear/GetPresetsUseCase';

export const runtime = 'nodejs';

const useCase = new GetPresetsUseCase();

export async function GET() {
  const presets = useCase.execute();
  return NextResponse.json({ presets });
}
