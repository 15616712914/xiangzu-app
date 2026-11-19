import { useState, type ImgHTMLAttributes } from "react";

/**
 * Image with a branded gradient fallback, so a failed load (e.g. a blocked CDN)
 * keeps the layout instead of showing broken alt text or collapsing.
 */
export function Img({ className = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div
        aria-hidden
        className={`${className} bg-gradient-to-br from-[#2a1d1a] via-[#4a1d18] to-[#8a2219]`}
      />
    );
  return <img {...props} className={`bg-[#3a221d] ${className}`} onError={() => setFailed(true)} />;
}
