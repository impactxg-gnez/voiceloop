import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 8L22 12L18 16" />
      <path d="M2 8L6 12L2 16" />
      <path d="M12 2L8.5 5.5C7.521 6.479 7.021 7.021 7.021 8C7.021 8.979 7.521 9.521 8.5 10.5L12 14L15.5 10.5C16.479 9.521 16.979 8.979 16.979 8C16.979 7.021 16.479 6.479 15.5 5.5L12 2z" />
      <path d="M7 12H17" />
    </svg>
  );
}
