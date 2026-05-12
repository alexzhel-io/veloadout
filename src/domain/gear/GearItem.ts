import { GearCategory } from './GearCategory';

export interface GearItemProps {
  id: string;
  names: Record<string, string>;
  aliases: string[];
  volumeLiters: number;
  weightGrams?: number;
  category: GearCategory;
  sourceUrl?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export class GearItem {
  private constructor(private readonly props: GearItemProps) {}

  static create(props: GearItemProps): GearItem {
    if (props.volumeLiters < 0) throw new Error('Volume cannot be negative');
    if (props.volumeLiters > 500) throw new Error('Volume exceeds realistic limit');
    if (!props.names['en']) throw new Error('English name is required');
    return new GearItem(props);
  }

  get id() { return this.props.id; }
  get names() { return this.props.names; }
  get aliases() { return this.props.aliases; }
  get volumeLiters() { return this.props.volumeLiters; }
  get weightGrams() { return this.props.weightGrams; }
  get category() { return this.props.category; }
  get sourceUrl() { return this.props.sourceUrl; }
  get verifiedAt() { return this.props.verifiedAt; }
  get createdAt() { return this.props.createdAt; }

  getName(locale: string): string {
    return this.props.names[locale] ?? this.props.names['en'];
  }

  toPlain(): GearItemProps {
    return { ...this.props };
  }
}
