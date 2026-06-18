export function AdminImageThumb({
  src,
  alt,
  emptyLabel = "No image",
  size = "md",
  fit = "cover",
}: {
  src?: string | null;
  alt: string;
  emptyLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fit?: "cover" | "contain";
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10"
      : size === "lg"
        ? "h-24 w-24"
        : size === "xl"
          ? "h-28 w-36"
          : "h-14 w-14";

  const imageClass = fit === "contain" ? "max-h-full max-w-full object-contain" : "h-full w-full object-cover";

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-gray-100 bg-gray-50 p-1`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={imageClass} />
      ) : (
        <span className="px-1 text-center text-[10px] leading-tight text-gray-300">{emptyLabel}</span>
      )}
    </div>
  );
}
