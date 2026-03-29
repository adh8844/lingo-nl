import { useState, useEffect } from "react";
import dingoDancing from "@/assets/dingo-dancing.png";
import dingoSunglasses from "@/assets/dingo-sunglasses.png";
import dingoEatingD from "@/assets/dingo-eating-d.png";
import dingoConfetti from "@/assets/dingo-confetti.png";
import dingoTrophy from "@/assets/dingo-trophy.png";
import dingoLogo from "@/assets/dingo-final-zittend-cool.png";

type VariantType = "static" | "animated";

interface StaticVariant {
  type: "static";
  src: string;
  alt: string;
  animClass: string;
  duration: number;
}

interface AnimatedVariant {
  type: "animated";
  src: string;
  alt: string;
  animClass: string;
  duration: number;
}

type Variant = StaticVariant | AnimatedVariant;

const variants: Variant[] = [
  // Existing static image variants
  { type: "static", src: dingoDancing, alt: "Dansende Dingo", animClass: "animate-win-dingo", duration: 3500 },
  { type: "static", src: dingoSunglasses, alt: "Coole Dingo", animClass: "animate-win-dingo", duration: 3500 },
  { type: "static", src: dingoEatingD, alt: "Dingo eet de D", animClass: "animate-win-dingo", duration: 3500 },
  { type: "static", src: dingoConfetti, alt: "Dingo viert feest", animClass: "animate-win-dingo", duration: 3500 },
  { type: "static", src: dingoTrophy, alt: "Dingo met trofee", animClass: "animate-win-dingo", duration: 3500 },
  // New animated variants using the main Dingo logo
  { type: "animated", src: dingoLogo, alt: "Dingo springt juichend", animClass: "animate-dingo-jump", duration: 3000 },
  { type: "animated", src: dingoLogo, alt: "Dingo doet de moonwalk", animClass: "animate-dingo-moonwalk", duration: 3500 },
  { type: "animated", src: dingoLogo, alt: "Dingo steekt duim op", animClass: "animate-dingo-thumbsup", duration: 2500 },
  { type: "animated", src: dingoLogo, alt: "Dingo wandelt weg", animClass: "animate-dingo-walkout", duration: 4000 },
  { type: "animated", src: dingoLogo, alt: "Dingo blaast ballon op", animClass: "animate-dingo-balloon", duration: 3500 },
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
