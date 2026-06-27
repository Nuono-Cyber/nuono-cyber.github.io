import { Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="brand-mark-icon">
        <Instagram className="h-5 w-5 text-white" strokeWidth={2.2} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="whitespace-nowrap text-base font-extrabold leading-tight text-foreground">
            <span className="text-primary">NAD</span> Analytics
          </div>
          <div className="whitespace-nowrap text-[11px] leading-tight text-muted-foreground">Instagram intelligence</div>
        </div>
      )}
    </div>
  );
}
