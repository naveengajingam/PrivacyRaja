interface Props {
  size?: number;
  className?: string;
  spokes?: number;
  strokeOpacity?: number;
}

/**
 * Compliance Core emblem — concentric hex/gear wheel with radial spokes.
 * (Same component name/API as the former AshokaChakra so call sites keep
 * working.)  Pure SVG, themable via currentColor.
 */
export function AshokaChakra({
  size = 240,
  className = "",
  spokes = 12,
  strokeOpacity = 1,
}: Props) {
  const cx = 50;
  const cy = 50;
  const outerR = 46;
  const midR = 34;
  const innerR = 14;
  const hubR = 4;

  // Hexagon points
  const hexPoints = Array.from({ length: 6 })
    .map((_, i) => {
      const a = ((i * 60 - 30) * Math.PI) / 180;
      return `${cx + Math.cos(a) * 40},${cy + Math.sin(a) * 40}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <g stroke="currentColor" strokeOpacity={strokeOpacity} fill="none">
        {/* outer ring */}
        <circle cx={cx} cy={cy} r={outerR} strokeWidth={1.2} />
        <circle cx={cx} cy={cy} r={outerR - 2} strokeWidth={0.3} />
        {/* hexagonal mid-frame */}
        <polygon points={hexPoints} strokeWidth={0.9} />
        {/* inner ring + hub */}
        <circle cx={cx} cy={cy} r={midR} strokeWidth={0.6} strokeDasharray="1 2" />
        <circle cx={cx} cy={cy} r={innerR} strokeWidth={1.1} />
        <circle cx={cx} cy={cy} r={hubR} fill="currentColor" stroke="none" />
        {/* radial spokes */}
        {Array.from({ length: spokes }).map((_, i) => {
          const angle = (i * 360) / spokes;
          const rad = (angle * Math.PI) / 180;
          const x2 = cx + Math.cos(rad) * (outerR - 3);
          const y2 = cy + Math.sin(rad) * (outerR - 3);
          const x1 = cx + Math.cos(rad) * innerR;
          const y1 = cy + Math.sin(rad) * innerR;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={0.5}
            />
          );
        })}
        {/* corner tick marks on outer ring */}
        {Array.from({ length: 4 }).map((_, i) => {
          const a = ((i * 90 + 45) * Math.PI) / 180;
          const x1 = cx + Math.cos(a) * outerR;
          const y1 = cy + Math.sin(a) * outerR;
          const x2 = cx + Math.cos(a) * (outerR + 3);
          const y2 = cy + Math.sin(a) * (outerR + 3);
          return (
            <line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.3} />
          );
        })}
      </g>
    </svg>
  );
}
