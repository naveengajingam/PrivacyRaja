interface Props {
  size?: number;
  className?: string;
  spokes?: number;
  strokeOpacity?: number;
}

/**
 * Ashoka Chakra — 24-spoke wheel motif. Pure SVG, themable via currentColor.
 */
export function AshokaChakra({
  size = 240,
  className = "",
  spokes = 24,
  strokeOpacity = 1,
}: Props) {
  const cx = 50;
  const cy = 50;
  const outerR = 46;
  const innerR = 8;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <g stroke="currentColor" strokeOpacity={strokeOpacity} fill="none">
        <circle cx={cx} cy={cy} r={outerR} strokeWidth={1.2} />
        <circle cx={cx} cy={cy} r={outerR - 3} strokeWidth={0.4} />
        <circle cx={cx} cy={cy} r={innerR} strokeWidth={1.2} />
        <circle cx={cx} cy={cy} r={2} fill="currentColor" stroke="none" />
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
              strokeWidth={0.6}
            />
          );
        })}
      </g>
    </svg>
  );
}
