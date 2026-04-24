interface StaffIconProps {
  className?: string;
  saved?: boolean;
}

export function StaffIcon({ className, saved = false }: StaffIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={saved ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="22" x2="12" y2="11" />
      <path d="M12 11 C12 4 5 4 5 9" />
    </svg>
  );
}
