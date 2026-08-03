export default function Sparkline({ values, color = "#7ce4bd", height = 50 }) {
  const safeValues = values.length ? values : [42, 48, 44, 57, 52, 68, 63, 76, 71, 82];
  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(1, safeValues.length - 1)) * 100;
    const y = 88 - ((value - min) / range) * 70;
    return `${x},${y}`;
  }).join(" ");
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  const lastPoint = points.split(" ").at(-1).split(",");

  return (
    <svg className="sparkline" height={height} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Network activity trend">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2.8" fill={color} />
    </svg>
  );
}
