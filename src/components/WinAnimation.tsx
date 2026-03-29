import { useState, useEffect } from "react";
import dingoDancing from "@/assets/dingo-dancing.png";
import dingoSunglasses from "@/assets/dingo-sunglasses.png";
import dingoEatingD from "@/assets/dingo-eating-d.png";
import dingoConfetti from "@/assets/dingo-confetti.png";
import dingoTrophy from "@/assets/dingo-trophy.png";
interface Variant {
  src: string;
  alt: string;
  animClass: string;
  duration: number;
}

const variants: Variant[] = [
  { src: dingoDancing, alt: "Dansende Dingo", animClass: "animate-win-dingo", duration: 3500 },
  { src: dingoSunglasses, alt: "Coole Dingo", animClass: "animate-win-dingo", duration: 3500 },
  { src: dingoEatingD, alt: "Dingo eet de D", animClass: "animate-win-dingo", duration: 3500 },
  { src: dingoConfetti, alt: "Dingo viert feest", animClass: "animate-win-dingo", duration: 3500 },
  { src: dingoTrophy, alt: "Dingo met trofee", animClass: "animate-win-dingo", duration: 3500 },
];

interface WinAnimationProps {
  onDismiss?: () => void;
}

const WinAnimation = ({ onDismiss }: WinAnimationProps) => {
  const [variant] = useState(() => variants[Math.floor(Math.random() * variants.length)]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, variant.duration);
    return () => clearTimeout(timer);
  }, [onDismiss, variant.duration]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
      onClick={() => { setVisible(false); onDismiss?.(); }}
    >
      <div className={`pointer-events-auto ${variant.animClass}`}>
        <img
          src={variant.src}
          alt={variant.alt}
          width={200}
          height={200}
          className="w-48 h-48 sm:w-56 sm:h-56 object-contain drop-shadow-2xl"
        />
      </div>
    </div>
  );
};

export default WinAnimation;
