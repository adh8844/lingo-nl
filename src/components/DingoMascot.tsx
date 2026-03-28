import dingoLogo from "@/assets/dingo-logo.png";

interface DingoMascotProps {
  size?: number;
  className?: string;
}

const DingoMascot = ({ size = 96, className = "" }: DingoMascotProps) => {
  return (
    <img
      src={dingoLogo}
      alt="Dingo mascotte"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default DingoMascot;
