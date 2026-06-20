import * as React from "react";

type P = { size?: number; className?: string };
const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconSearch = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);
export const IconX = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.4}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconChevron = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.2}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const IconHouse = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9.5a.5.5 0 0 0 .5.5H9v-6h6v6h3.5a.5.5 0 0 0 .5-.5V10" />
  </svg>
);
export const IconLock = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={3.2}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IconAlert = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={1.8}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
);
export const IconLine = ({ size = 20, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C6.5 2 2 5.6 2 10c0 3.9 3.5 7.2 8.3 7.9.3.07.7.22.8.5.07.25.05.64.02.9l-.13.8c-.04.24-.2.93.82.5 1.02-.42 5.5-3.24 7.5-5.55C20.6 13.5 22 11.9 22 10c0-4.4-4.5-8-10-8Z" />
  </svg>
);
export const IconShield = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconLogout = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);
export const IconBarcode = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" />
  </svg>
);
export const IconInfo = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </svg>
);
export const IconDownload = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </svg>
);
export const IconEye = ({ size = 20, className, off }: P & { off?: boolean }) =>
  off ? (
    <svg {...base(size)} className={className}>
      <path d="M9.9 4.2A9.9 9.9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.4 3.4M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a9.5 9.5 0 0 0 4.4-1M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  ) : (
    <svg {...base(size)} className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
