export default function StatCard({ icon: Icon, label, value, subtext, color, glowColor }) {
    return (
        <div className="glass-card" style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '20px 24px', position: 'relative', overflow: 'hidden'
        }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: glowColor || 'var(--accent-blue-glow)',
                filter: 'blur(30px)', opacity: 0.5
            }} />

            {/* Icon */}
            <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: glowColor || 'var(--accent-blue-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, position: 'relative'
            }}>
                {Icon && <Icon size={22} color={color || 'var(--accent-blue)'} />}
            </div>

            {/* Content */}
            <div style={{ position: 'relative' }}>
                <p style={{
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    fontWeight: 600, marginBottom: 2
                }}>
                    {label}
                </p>
                <p style={{
                    fontSize: '1.5rem', fontWeight: 700,
                    color: color || 'var(--text-primary)'
                }}>
                    {value}
                </p>
                {subtext && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {subtext}
                    </p>
                )}
            </div>
        </div>
    );
}
