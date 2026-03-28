import { useState, useEffect } from "react";
import dingoDancing from "@/assets/dingo-dancing.png";
import dingoSunglasses from "@/assets/dingo-sunglasses.png";
import dingoEatingD from "@/assets/dingo-eating-d.png";
import dingoConfetti from "@/assets/dingo-confetti.png";
import dingoTrophy from "@/assets/dingo-trophy.png";

const variants = [
  { src: dingoDancing, alt: "Dansende Dingo" },
  { src: dingoSunglasses, alt: "Coole Dingo" },
  { src: dingoEatingD, alt: "Dingo eet de D" },
  { src: dingoConfetti, alt: "Dingo viert feest" },
  { src: dingoTrophy, alt: "Dingo met trofee" },
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
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      onClick={() => { setVisible(false); onDismiss?.(); }}
    >
      <div className="pointer-events-auto animate-win-dingo">
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
