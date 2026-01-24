import { InsightRecommendation } from '@/types/instagram';
import { cn } from '@/lib/utils';
import { Lightbulb, TrendingUp, AlertTriangle, Info } from 'lucide-react';

interface InsightCardProps {
  insight: InsightRecommendation;
  className?: string;
}

const ICON_MAP = {
  success: TrendingUp,
  warning: AlertTriangle,
  info: Info,
  tip: Lightbulb,
};

const STYLE_MAP = {
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
  info: 'border-info/30 bg-info/5',
  tip: 'border-primary/30 bg-primary/5',
};

const ICON_COLOR_MAP = {
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  tip: 'text-primary',
};

const IMPACT_MAP = {
  high: 'Alto Impacto',
  medium: 'Médio Impacto',
  low: 'Baixo Impacto',
};

export function InsightCard({ insight, className }: InsightCardProps) {
  const Icon = ICON_MAP[insight.type];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all hover:shadow-lg',
        STYLE_MAP[insight.type],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg bg-background/50', ICON_COLOR_MAP[insight.type])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm">{insight.title}</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground shrink-0">
              {IMPACT_MAP[insight.impact]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
          {insight.metric && insight.value && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{insight.metric}:</span>
              <span className="font-mono text-sm font-medium">{insight.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
