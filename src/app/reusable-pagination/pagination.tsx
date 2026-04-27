"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page:    number;
  pages:   number;
  total:   number;
  limit:   number;
  onPage:  (p: number) => void;
}

export default function Pagination({ page, pages, total, limit, onPage }: Props) {
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  // Build page numbers to show
  const nums: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
    nums.push(i);
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-gray-400">
        Showing {from}–{to} of {total.toLocaleString()} records
      </p>
      <div className="flex items-center gap-1">
        <PageBtn onClick={() => onPage(1)} disabled={page === 1} label="«" />
        <PageBtn onClick={() => onPage(page - 1)} disabled={page === 1} label={<ChevronLeft size={14} />} />
        {nums[0] > 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
        {nums.map((n) => (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              n === page
                ? "bg-green-600 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {n}
          </button>
        ))}
        {nums[nums.length - 1] < pages && <span className="px-1 text-gray-400 text-sm">…</span>}
        <PageBtn onClick={() => onPage(page + 1)} disabled={page === pages} label={<ChevronRight size={14} />} />
        <PageBtn onClick={() => onPage(pages)} disabled={page === pages} label="»" />
      </div>
    </div>
  );
}

function PageBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
    >
      {label}
    </button>
  );
}
