import React, { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/helpers'
import Spinner from './Spinner'

export default function Table({ columns, data, loading, onRowClick, emptyText = 'Aucune donnée', renderExpandableRow }) {
  const [expandedRows, setExpandedRows] = useState({})

  const toggleRow = (rowId) => {
    setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }))
  }

  const hasExpandable = typeof renderExpandableRow === 'function'

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            {hasExpandable && <th className="w-10 px-2 py-3"></th>}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (hasExpandable ? 1 : 0)} className="py-12 text-center">
                <Spinner className="mx-auto" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (hasExpandable ? 1 : 0)} className="py-12 text-center text-[var(--text-muted)] text-sm">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const rowId = row.id ?? i
              const isExpanded = !!expandedRows[rowId]
              return (
                <React.Fragment key={rowId}>
                  <tr
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-[var(--border)] bg-[var(--surface)] transition-colors last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-[var(--surface-2)]',
                      isExpanded && 'bg-[var(--surface-2)]/30'
                    )}
                  >
                    {hasExpandable && (
                      <td className="w-10 px-2 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRow(rowId)
                          }}
                          className="p-1 hover:bg-[var(--surface-2)] rounded transition-colors text-[var(--text-muted)] hover:text-[var(--text)] focus:outline-none"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4 py-3 text-[var(--text)]', col.className)}>
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                  {hasExpandable && isExpanded && (
                    <tr className="bg-[var(--surface-2)]/10 border-b border-[var(--border)] last:border-b-0">
                      <td colSpan={columns.length + 1} className="px-6 py-4">
                        {renderExpandableRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
