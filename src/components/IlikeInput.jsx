import { useState, useRef, useEffect } from 'react';

/**
 * IlikeInput — fast search input with ilike-style filtering
 * 
 * Behavior:
 *   - As user types, filters items case-insensitively (like SQL ILIKE '%query%')
 *   - Shows matching results below input
 *   - Press Enter → auto-select first match
 *   - Press ArrowDown/Up → navigate results  
 *   - Press Escape → close results
 *   - Click result → select it
 * 
 * Props:
 *   value: string
 *   onChange: (value) => void
 *   items: Array<{ label, sublabel?, value }>
 *   onSelect: (item) => void
 *   placeholder: string
 *   style: object
 */
export default function IlikeInput({ value, onChange, items, onSelect, onShiftEnter, placeholder, style, inputRef }) {
    const [showResults, setShowResults] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef(null);
    const localInputRef = useRef(null);
    const activeInputRef = inputRef || localInputRef;

    // ILIKE filter: case-insensitive, match anywhere in label, sublabel, or shortcode
    const filtered = value && value.length >= 1 && showResults
        ? (() => {
            const q = value.toLowerCase().trim();
            const matches = items.filter(item => {
                const shortcode = item.value?.shortcode?.toLowerCase() || '';
                return item.label.toLowerCase().includes(q) ||
                    (item.sublabel && item.sublabel.toLowerCase().includes(q)) ||
                    shortcode === q ||
                    shortcode.startsWith(q);
            });
            // Sort: exact shortcode match first, then startsWith shortcode, then the rest
            matches.sort((a, b) => {
                const scA = a.value?.shortcode?.toLowerCase() || '';
                const scB = b.value?.shortcode?.toLowerCase() || '';
                const exactA = scA === q ? 2 : scA.startsWith(q) ? 1 : 0;
                const exactB = scB === q ? 2 : scB.startsWith(q) ? 1 : 0;
                return exactB - exactA;
            });
            return matches.slice(0, 8);
        })()
        : [];

    // Reset active index when results change
    useEffect(() => {
        setActiveIndex(0);
    }, [value]);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const selectItem = (item) => {
        onSelect(item);
        setShowResults(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            // Shift+Enter: select current match + add new product row
            e.preventDefault();
            if (filtered.length > 0) {
                selectItem(filtered[activeIndex]);
            }
            if (onShiftEnter) onShiftEnter();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered.length > 0) {
                selectItem(filtered[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowResults(false);
            activeInputRef.current?.blur();
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <input
                ref={activeInputRef}
                type="text"
                value={value}
                onChange={e => {
                    onChange(e.target.value);
                    setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                style={style}
            />
            {showResults && filtered.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: '#FFFFFF',
                    border: '1px solid var(--border-glass-hover)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-lg)',
                    maxHeight: 220,
                    overflowY: 'auto',
                    marginTop: 2
                }}>
                    {filtered.map((item, i) => {
                        const isActive = i === activeIndex;
                        // Highlight matching text
                        const highlightLabel = highlightMatch(item.label, value);
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => selectItem(item)}
                                onMouseEnter={() => setActiveIndex(i)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    width: '100%',
                                    padding: '7px 12px',
                                    fontSize: '0.83rem',
                                    color: 'var(--text-primary)',
                                    background: isActive ? 'var(--bg-glass-hover)' : 'transparent',
                                    border: 'none',
                                    borderBottom: i < filtered.length - 1 ? '1px solid #eef5f5' : 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.08s'
                                }}
                            >
                                <span style={{ fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: highlightLabel }} />
                                {item.sublabel && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                        {item.sublabel}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * Highlight matched substring in text
 */
function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${escapeHtml(before)}<b style="color:var(--accent-blue)">${escapeHtml(match)}</b>${escapeHtml(after)}`;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
