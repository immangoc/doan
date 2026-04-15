import { Anchor, Waves, Container } from 'lucide-react';

interface HungThuyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'default' | 'white';
  imageSrc?: string;
}

export default function HungThuyLogo({
  size = 'md',
  showText = true,
  variant = 'default',
  imageSrc,
}: HungThuyLogoProps) {
  const sizes = {
    sm: { logo: 32, icon: 14, text: 'text-sm' },
    md: { logo: 40, icon: 18, text: 'text-base' },
    lg: { logo: 56, icon: 24, text: 'text-xl' },
  };

  const colors = {
    default: {
      bg: 'bg-gradient-to-br from-blue-900 to-blue-700',
      text: 'text-gray-900 dark:text-white',
      subtext: 'text-blue-700 dark:text-blue-400',
    },
    white: {
      bg: 'bg-white',
      text: 'text-white',
      subtext: 'text-white/80',
    },
  };

  const currentSize = sizes[size];
  const currentColor = colors[variant];
  const logoSrc = imageSrc ?? '/logo-new.svg';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative rounded-xl shadow-lg overflow-hidden bg-white p-2 flex items-center justify-center`}
        style={{ width: currentSize.logo, height: currentSize.logo }}
      >
        <img
          src={logoSrc}
          alt="Hùng Thủy logo"
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className={`font-bold ${currentSize.text} ${currentColor.text} leading-tight`}>
            Hùng Thủy
          </div>
          <div className={`text-xs ${currentColor.subtext} font-medium`}>
            Port Logistics
          </div>
        </div>
      )}
    </div>
  );
}
