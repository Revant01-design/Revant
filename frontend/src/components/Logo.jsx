/**
 * Brand Logo component for Revant.
 * Usage:
 *   <Logo variant="dark" size="sm" /> on dark navy backgrounds (wraps in white pill)
 *   <Logo variant="light" size="md" /> on white/light backgrounds (logo as-is)
 */
export default function Logo({ variant = "light", size = "md", className = "" }) {
  const sizes = {
    xs: "h-6",
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
  };
  const heightCls = sizes[size] || sizes.md;

  if (variant === "dark") {
    return (
      <div className={`inline-flex items-center bg-white rounded-md px-3 py-1.5 ${className}`}>
        <img src="/logo-revant.png" alt="Revant" className={`${heightCls} w-auto`} />
      </div>
    );
  }

  return (
    <img
      src="/logo-revant.png"
      alt="Revant"
      className={`${heightCls} w-auto ${className}`}
    />
  );
}
