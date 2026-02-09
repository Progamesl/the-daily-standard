export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:w-auto focus:h-auto focus:overflow-visible focus:clip-auto focus:whitespace-normal"
    >
      Skip to main content
    </a>
  );
}
