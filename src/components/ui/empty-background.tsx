import Icon from '@/components/ui/icon';

interface EmptyBackgroundProps {
  icons: string[];
  text: string;
  subtext?: string;
  minHeight?: string;
}

const POSITIONS = [
  { top: '6%',  left: '8%',  size: 28, rotate: -15, opacity: 0.07 },
  { top: '5%',  left: '35%', size: 20, rotate: 20,  opacity: 0.05 },
  { top: '4%',  left: '62%', size: 32, rotate: -8,  opacity: 0.06 },
  { top: '3%',  left: '85%', size: 22, rotate: 12,  opacity: 0.08 },
  { top: '18%', left: '2%',  size: 18, rotate: 30,  opacity: 0.05 },
  { top: '20%', left: '22%', size: 26, rotate: -20, opacity: 0.07 },
  { top: '22%', left: '48%', size: 16, rotate: 15,  opacity: 0.06 },
  { top: '18%', left: '70%', size: 30, rotate: -10, opacity: 0.05 },
  { top: '19%', left: '90%', size: 20, rotate: 25,  opacity: 0.07 },
  { top: '35%', left: '12%', size: 24, rotate: -5,  opacity: 0.06 },
  { top: '38%', left: '38%', size: 18, rotate: 18,  opacity: 0.05 },
  { top: '36%', left: '60%', size: 28, rotate: -22, opacity: 0.08 },
  { top: '37%', left: '80%', size: 16, rotate: 8,   opacity: 0.06 },
  { top: '52%', left: '5%',  size: 22, rotate: -12, opacity: 0.07 },
  { top: '54%', left: '28%', size: 30, rotate: 22,  opacity: 0.05 },
  { top: '50%', left: '52%', size: 18, rotate: -18, opacity: 0.06 },
  { top: '53%', left: '74%', size: 24, rotate: 10,  opacity: 0.07 },
  { top: '51%', left: '93%', size: 20, rotate: -25, opacity: 0.05 },
  { top: '66%', left: '15%', size: 26, rotate: 14,  opacity: 0.06 },
  { top: '68%', left: '42%', size: 20, rotate: -8,  opacity: 0.08 },
  { top: '67%', left: '65%', size: 28, rotate: 20,  opacity: 0.05 },
  { top: '65%', left: '85%', size: 16, rotate: -15, opacity: 0.07 },
  { top: '80%', left: '3%',  size: 20, rotate: 10,  opacity: 0.06 },
  { top: '82%', left: '25%', size: 24, rotate: -20, opacity: 0.05 },
  { top: '79%', left: '50%', size: 18, rotate: 15,  opacity: 0.07 },
  { top: '81%', left: '72%', size: 30, rotate: -10, opacity: 0.06 },
  { top: '80%', left: '90%', size: 22, rotate: 28,  opacity: 0.05 },
  { top: '92%', left: '10%', size: 16, rotate: -18, opacity: 0.07 },
  { top: '93%', left: '40%', size: 26, rotate: 12,  opacity: 0.06 },
  { top: '91%', left: '68%', size: 20, rotate: -22, opacity: 0.05 },
  { top: '94%', left: '88%', size: 24, rotate: 8,   opacity: 0.07 },
];

export default function EmptyBackground({ icons, text, subtext, minHeight = '60vh' }: EmptyBackgroundProps) {
  return (
    <div className="relative overflow-hidden flex items-center justify-center" style={{ minHeight }}>
      {POSITIONS.map((pos, i) => {
        const iconName = icons[i % icons.length];
        return (
          <div
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              top: pos.top,
              left: pos.left,
              transform: `rotate(${pos.rotate}deg)`,
              opacity: pos.opacity,
            }}
          >
            <Icon name={iconName} size={pos.size} />
          </div>
        );
      })}
      <div className="relative z-10 text-center text-muted-foreground px-4">
        <p className="text-sm font-medium">{text}</p>
        {subtext && <p className="text-xs mt-1 opacity-70">{subtext}</p>}
      </div>
    </div>
  );
}
