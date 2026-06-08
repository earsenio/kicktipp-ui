import { getCountryCode } from "@/lib/country-flags";

interface CountryFlagProps {
  country: string;
  size?: number;
  className?: string;
}

export function CountryFlag({ country, size = 20, className }: CountryFlagProps) {
  const code = getCountryCode(country);
  if (!code) return null;
  return (
    <img
      src={`https://hatscripts.github.io/circle-flags/flags/${code}.svg`}
      alt={country}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      loading="eager"
    />
  );
}
