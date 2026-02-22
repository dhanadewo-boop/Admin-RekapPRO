export default function ProgressBar({ value, max, label, showPercentage = true, color }) {
    const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
    const isCompleted = percentage >= 100;

    const barColor = color || (isCompleted ? 'var(--gradient-success)' : 'var(--gradient-primary)');

    return (
        <div style={{ width: '100%' }}>
            {label && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 6
                }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
                    {showPercentage && (
                        <span style={{
                            fontSize: '0.8rem', fontWeight: 700,
                            color: isCompleted ? 'var(--accent-emerald)' : 'var(--accent-blue)'
                        }}>
                            {percentage}%
                        </span>
                    )}
                </div>
            )}
            <div style={{
                width: '100%', height: 8, background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-full)', overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%', width: `${percentage}%`,
                    background: barColor, borderRadius: 'var(--radius-full)',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: 'progressFill 1s ease-out',
                    boxShadow: isCompleted
                        ? '0 0 12px rgba(16, 185, 129, 0.4)'
                        : '0 0 12px rgba(59, 130, 246, 0.3)'
                }} />
            </div>
            {showPercentage && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4
                }}>
                    <span>Rp {(value || 0).toLocaleString('id-ID')}</span>
                    <span>Rp {(max || 0).toLocaleString('id-ID')}</span>
                </div>
            )}
        </div>
    );
}
