"use client";

import { useEffect, useMemo } from "react";

type TablePaginationProps = {
  total: number;
  page: number; // 0-based
  rowsPerPage: number;
  onPageChange: (nextPage: number) => void;
  onRowsPerPageChange: (nextRows: number) => void;
  rowsPerPageOptions?: number[];
  label?: string;
};

export default function TablePagination({
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100],
  label = "Linhas"
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, rowsPerPage)));

  const safePage = useMemo(() => {
    if (!Number.isFinite(page) || page < 0) return 0;
    return Math.min(page, totalPages - 1);
  }, [page, totalPages]);

  useEffect(() => {
    if (safePage !== page) onPageChange(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const from = total === 0 ? 0 : safePage * rowsPerPage + 1;
  const to = Math.min(total, (safePage + 1) * rowsPerPage);

  const podeVoltar = safePage > 0;
  const podeAvancar = safePage < totalPages - 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        paddingTop: 10,
        flexWrap: "wrap"
      }}
      aria-label="Paginação da tabela"
    >
      <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: "rgba(11, 18, 32, 0.72)", fontWeight: 800 }}>{label}</span>
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
          className="admin-dash-select-control"
          style={{ minWidth: 88, paddingTop: 8, paddingBottom: 8 }}
        >
          {rowsPerPageOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <span style={{ color: "rgba(11, 18, 32, 0.72)", fontWeight: 800 }}>
        {from}-{to} de {total}
      </span>

      <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          className="campeonatos-btn campeonatos-btn--ghost"
          onClick={() => onPageChange(0)}
          disabled={!podeVoltar}
          aria-label="Primeira página"
          title="Primeira página"
        >
          {"<<"}
        </button>
        <button
          type="button"
          className="campeonatos-btn campeonatos-btn--ghost"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!podeVoltar}
          aria-label="Página anterior"
          title="Página anterior"
        >
          {"<"}
        </button>
        <button
          type="button"
          className="campeonatos-btn campeonatos-btn--ghost"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!podeAvancar}
          aria-label="Próxima página"
          title="Próxima página"
        >
          {">"}
        </button>
        <button
          type="button"
          className="campeonatos-btn campeonatos-btn--ghost"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={!podeAvancar}
          aria-label="Última página"
          title="Última página"
        >
          {">>"}
        </button>
      </div>
    </div>
  );
}

