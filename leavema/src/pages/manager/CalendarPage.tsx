// src/pages/manager/CalendarPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { AvailabilityCell } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

function getMonthDates(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push(`${year}-${mm}-${dd}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [hoveredCell, setHoveredCell] = useState<AvailabilityCell | null>(null);

  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDate = new Date(year, month + 1, 0);
  const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;

  const { data: cells, isLoading, isError, refetch } = useQuery<AvailabilityCell[]>({
    queryKey: ['availability', user?.teamId, firstDay, lastDay],
    queryFn: () =>
      api.get<AvailabilityCell[]>(`/teams/${user?.teamId}/availability?from=${firstDay}&to=${lastDay}`)
        .then((r) => r.data),
    enabled: !!user?.teamId,
  });

  const cellMap = new Map(cells?.map((c) => [c.date, c]));
  const allDays = getMonthDates(year, month);

  // Calculate starting weekday (0=Mon)
  const firstDayOfMonth = new Date(year, month, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Make Monday = 0

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const levelClass = (level?: string) => {
    if (!level) return 'weekend';
    return level.toLowerCase();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Team Calendar</h1>
        <p className="page-subtitle">Availability heatmap — green: low absence, amber: medium, red: high</p>
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn btn-secondary btn-sm" onClick={prevMonth} id="btn-prev-month">← Prev</button>
        <h2 style={{ fontWeight: 700, fontSize: '1.2rem', minWidth: 160, textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={nextMonth} id="btn-next-month">Next →</button>
      </div>

      {isError && (
        <div className="alert alert-red" style={{ marginBottom: 16 }}>
          Failed to load. <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {/* Empty cells for offset */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {allDays.map((date) => {
          const dow = new Date(date).getDay(); // 0=Sun, 6=Sat
          const isWeekend = dow === 0 || dow === 6;
          const cell = cellMap.get(date);
          return (
            <div
              key={date}
              className={`heatmap-cell ${isWeekend || !cell ? (isWeekend ? 'weekend' : 'empty') : levelClass(cell.level)}`}
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '1', minWidth: 36, maxWidth: 56, margin: 'auto' }}
              title={cell ? `${date}: ${cell.absentFte}/${cell.totalFte} FTE absent (${cell.level})` : date}
              onMouseEnter={() => cell && setHoveredCell(cell)}
              onMouseLeave={() => setHoveredCell(null)}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{date.slice(8)}</span>
              {isLoading && !isWeekend && (
                <div className="skeleton" style={{ width: '80%', height: 4, borderRadius: 2, marginTop: 2 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 20, alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span>Legend:</span>
        {[['low', 'var(--green-100)', 'Low absence'], ['medium', 'var(--amber-100)', 'Medium'], ['high', 'var(--red-100)', 'High absence']].map(([cls, bg, label]) => (
          <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, background: bg, border: `1px solid ${bg}`, borderRadius: 3 }} />
            {label}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, background: 'var(--bg-hover)', borderRadius: 3 }} />
          Weekend/Holiday
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div className="card" style={{ marginTop: 16, maxWidth: 320 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{hoveredCell.date}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {hoveredCell.absentFte} of {hoveredCell.totalFte} FTE absent · Level: <strong style={{ color: hoveredCell.level === 'HIGH' ? 'var(--red-500)' : hoveredCell.level === 'MEDIUM' ? 'var(--amber-500)' : 'var(--green-500)' }}>{hoveredCell.level}</strong>
          </div>
          {hoveredCell.employees && hoveredCell.employees.length > 0 && (
            <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Out: {hoveredCell.employees.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
