import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

export default function DataTable({ columns, data, searchable = true, searchPlaceholder = 'Cari...' }) {
    const [search, setSearch] = useState('');
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(0);
    const perPage = 15;

    // Filter
    const filtered = useMemo(() => {
        if (!search) return data;
        const q = search.toLowerCase();
        return data.filter(row =>
            columns.some(col => {
                const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                return String(val || '').toLowerCase().includes(q);
            })
        );
    }, [data, search, columns]);

    // Sort
    const sorted = useMemo(() => {
        if (!sortCol) return filtered;
        const col = columns.find(c => c.key === sortCol);
        if (!col) return filtered;
        return [...filtered].sort((a, b) => {
            const aVal = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor];
            const bVal = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor];
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }
            const aStr = String(aVal || '');
            const bStr = String(bVal || '');
            return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
    }, [filtered, sortCol, sortDir, columns]);

    // Paginate
    const totalPages = Math.ceil(sorted.length / perPage);
    const paginated = sorted.slice(page * perPage, (page + 1) * perPage);

    const handleSort = (key) => {
        if (sortCol === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(key);
            setSortDir('asc');
        }
    };

    return (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Search */}
            {searchable && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
                    <div className="search-bar">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                    style={{
                                        cursor: col.sortable !== false ? 'pointer' : 'default',
                                        userSelect: 'none', whiteSpace: 'nowrap'
                                    }}
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        {col.header}
                                        {sortCol === col.key && (
                                            sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} style={{
                                    textAlign: 'center', padding: 40, color: 'var(--text-muted)'
                                }}>
                                    Tidak ada data
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row, i) => (
                                <tr key={row.id || i}>
                                    {columns.map(col => (
                                        <td key={col.key}>
                                            {col.render
                                                ? col.render(row)
                                                : typeof col.accessor === 'function'
                                                    ? col.accessor(row)
                                                    : row[col.accessor]
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', borderTop: '1px solid var(--border-glass)',
                    fontSize: '0.8rem', color: 'var(--text-secondary)'
                }}>
                    <span>
                        Menampilkan {page * perPage + 1}-{Math.min((page + 1) * perPage, sorted.length)} dari {sorted.length}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            Prev
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
