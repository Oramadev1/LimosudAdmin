import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";

type BrandLogoProps = {
  href?: string;
  className?: string;
  height?: number;
  onClick?: () => void;
};

export function BrandLogo({ href, className = "", height = 44, onClick }: BrandLogoProps) {
  const image = (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ height, width: Math.round(height * 2.4) }}
    >
      <Image
        src={siteConfig.logo}
        alt={siteConfig.name}
        fill
        className="object-contain object-left"
        sizes={`${Math.round(height * 2.4)}px`}
        priority
      />
    </span>
  );

  if (href === undefined) {
    return image;
  }

  return (
    <Link href={href} onClick={onClick} className="inline-flex transition-opacity hover:opacity-90">
      {image}
    </Link>
  );
}
