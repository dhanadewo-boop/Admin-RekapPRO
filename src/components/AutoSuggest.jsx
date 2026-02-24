import { useState, useRef, useEffect } from 'react';

/**
 * AutoSuggest input component with dropdown suggestions
 * Props:
 *   value: string - current input value
 *   onChange: (value) => void - called when value changes
 *   suggestions: Array<{ label, sublabel?, value }> - list of suggestions
 *   onSelect: (item) => void - called when a suggestion is selected
 *   placeholder: string
 *   style: object - additional styles for the input
 */
export default function AutoSuggest({ value, onChange, suggestions, onSelect, placeholder, style }) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [filtered, setFiltered] = useState([]);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (value && value.length >= 1 && showDropdown) {
            setFiltered(suggestions.slice(0, 8));
        } else {
            setFiltered([]);
        }
    }, [value, suggestions, showDropdown]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <input
                type="text"
                value={value}
                onChange={e => {
                    onChange(e.target.value);
                    setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={placeholder}
                style={style}
            />
            {showDropdown && filtered.length > 0 && (
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
                    marginTop: 4
                }}>
                    {filtered.map((item, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                onSelect(item);
                                setShowDropdown(false);
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                width: '100%',
                                padding: '8px 12px',
                                fontSize: '0.85rem',
                                color: 'var(--text-primary)',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: i < filtered.length - 1 ? '1px solid #eef5f5' : 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={e => e.target.style.background = 'var(--bg-glass-hover)'}
                            onMouseLeave={e => e.target.style.background = 'transparent'}
                        >
                            <span style={{ fontWeight: 500 }}>{item.label}</span>
                            {item.sublabel && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                    {item.sublabel}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
