import { useEffect, useState } from 'react';

export const UNITS = ['seconds', 'minutes', 'hours', 'days', 'months'] as const;
export type UnitType = typeof UNITS[number];

export const MULTIPLIERS: Record<UnitType, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  months: 2592000,
};

export function convertToSeconds(value: string, unit: UnitType): number {
  const num = Math.max(1, Number(value));
  return num * MULTIPLIERS[unit];
}

export function parseSeconds(totalSeconds: number): { value: string; unit: UnitType } {
  if (totalSeconds === 0) return { value: '30', unit: 'minutes' };
  
  if (totalSeconds % 2592000 === 0) return { value: String(totalSeconds / 2592000), unit: 'months' };
  if (totalSeconds % 86400 === 0) return { value: String(totalSeconds / 86400), unit: 'days' };
  if (totalSeconds % 3600 === 0) return { value: String(totalSeconds / 3600), unit: 'hours' };
  if (totalSeconds % 60 === 0) return { value: String(totalSeconds / 60), unit: 'minutes' };
  return { value: String(totalSeconds), unit: 'seconds' };
}

interface IntervalInputProps {
  value: string;
  unit: UnitType;
  onChange: (value: string, unit: UnitType) => void;
  onErrorChange?: (error: string | null) => void;
  id?: string;
  touched?: boolean;
  onBlur?: () => void;
}

export function IntervalInput({ value, unit, onChange, onErrorChange, id, touched, onBlur }: IntervalInputProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let error: string | null = null;
    if (value === '') {
      error = "This field can't be left empty";
    } else if (Number(value) === 0) {
      error = "Ping frequency value cannot be zero";
    } else if (Number(value) < 0) {
      error = "Ping frequency value cannot be negative";
    }

    setLocalError(error);
    if (onErrorChange) {
      onErrorChange(error);
    }
  }, [value, onErrorChange]);

  const formatUnitLabel = (u: UnitType, v: string) => {
    if (v === '1' || v === '-1') {
      return u.slice(0, -1);
    }
    return u;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value, unit)}
          onBlur={onBlur}
          style={{
            width: '70px',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            backgroundColor: '#FCFCFC',
            fontSize: '15px',
            fontWeight: 'normal',
            color: '#111827',
            outline: 'none',
            textAlign: 'center',
          }}
        />
        <select
          value={unit}
          onChange={(e) => onChange(value, e.target.value as UnitType)}
          style={{
            width: '130px',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            backgroundColor: '#FCFCFC',
            fontSize: '15px',
            color: '#111827',
            outline: 'none',
          }}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {formatUnitLabel(u, value)}
            </option>
          ))}
        </select>
      </div>
      {localError && touched && <div style={{ color: '#F56565', fontSize: '13px' }}>{localError}</div>}
    </div>
  );
}
