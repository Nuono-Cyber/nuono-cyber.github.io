import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
  iconColor?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  className,
  iconColor = 'text-primary',
}: MetricCardProps) {
  return (
    <div className={cn('metric-card group', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className={cn('p-2 rounded-lg bg-secondary/60', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span className={cn(
              'inline-flex items-center text-[11px] font-semibold',
              trend >= 0 ? 'text-success' : 'text-destructive'
            )}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          )}
        </div>
        {trendLabel && (
          <p className="text-[11px] text-muted-foreground">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
