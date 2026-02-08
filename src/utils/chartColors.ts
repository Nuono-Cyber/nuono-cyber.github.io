// Centralized chart colors using CSS variables for theme support
export const getChartColors = () => ({
  primary: 'hsl(var(--chart-1))',
  secondary: 'hsl(var(--chart-2))',
  tertiary: 'hsl(var(--chart-3))',
  quaternary: 'hsl(var(--chart-4))',
  quinary: 'hsl(var(--chart-5))',
  senary: 'hsl(var(--chart-6))',
  
  // Named aliases for common use cases
  views: 'hsl(var(--chart-1))',
  reach: 'hsl(var(--chart-2))',
  engagement: 'hsl(var(--chart-3))',
  warning: 'hsl(var(--chart-4))',
  info: 'hsl(var(--chart-5))',
  accent: 'hsl(var(--chart-6))',
  
  // Semantic colors
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  
  // UI elements
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
  background: 'hsl(var(--card))',
  border: 'hsl(var(--border))',
  foreground: 'hsl(var(--foreground))',
});

export const CHART_COLORS_ARRAY = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
];

export const getTooltipStyle = () => ({
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
});
