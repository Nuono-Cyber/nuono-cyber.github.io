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
    <div className={cn('metric-card glow-border', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl bg-secondary/50', iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full',
            trend >= 0 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
          )}>
            <span>{trend >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trendLabel && (
          <p className="text-xs text-muted-foreground mt-2">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
