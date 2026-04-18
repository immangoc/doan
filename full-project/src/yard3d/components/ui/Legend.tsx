import './Legend.css';

const legendItems = [
  { label: 'Kho Khô', color: 'var(--status-dry)' },
  { label: 'Kho Hàng dễ vỡ', color: 'var(--status-fragile)' },
  { label: 'Kho Lạnh', color: 'var(--status-cold)' },
  { label: 'Kho khác', color: 'var(--status-other)' },
];

export function Legend() {
  return (
    <div className="legend-grid">
      {legendItems.map((item) => (
        <div key={item.label} className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: item.color }} />
          <span className="legend-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
