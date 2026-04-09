"use client";

interface Props {
  filename: string;
  headers: string[];
  // Rows are already strings/numbers — we handle CSV escaping
  rows: (string | number)[][];
  label?: string;
}

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function CsvExportButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
}: Props) {
  const handleExport = () => {
    const lines = [headers.map(escapeCsv).join(",")];
    for (const row of rows) {
      lines.push(row.map(escapeCsv).join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={rows.length === 0}
      className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-label font-semibold text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40"
    >
      <span className="material-symbols-outlined text-sm">download</span>
      {label}
    </button>
  );
}
