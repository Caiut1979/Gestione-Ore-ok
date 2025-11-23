
export const getDaysInMonth = (month: number, year: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Fixed: Uses Local Time explicitly to avoid UTC timezone shifts (e.g., 1st becoming 30th)
export const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const isHoliday = (date: Date): boolean => {
  const day = date.getDay();
  // 0 is Sunday.
  if (day === 0) return true;
  
  // Fixed Italian holidays (simplified)
  const d = date.getDate();
  const m = date.getMonth(); // 0-indexed
  
  // 1 Jan, 6 Jan, 25 Apr, 1 May, 2 Jun, 15 Aug, 1 Nov, 8 Dec, 25 Dec, 26 Dec
  if (d === 1 && m === 0) return true;
  if (d === 6 && m === 0) return true;
  if (d === 25 && m === 3) return true;
  if (d === 1 && m === 4) return true;
  if (d === 2 && m === 5) return true;
  if (d === 15 && m === 7) return true;
  if (d === 1 && m === 10) return true;
  if (d === 8 && m === 11) return true;
  if (d === 25 && m === 11) return true;
  if (d === 26 && m === 11) return true;

  return false;
};

export const getDayName = (date: Date): string => {
  return date.toLocaleDateString('it-IT', { weekday: 'short' });
};

export const months = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Formats 8.5 to "8,30" and -0.5 to "-0,30"
// Returns empty string if 0
export const formatHoursDisplay = (hours: number): string => {
  if (hours === undefined || hours === null || isNaN(hours)) return '';
  if (hours === 0) return ''; // Explicitly return empty for 0 to clear inputs

  const sign = hours < 0 ? '-' : '';
  const absHours = Math.abs(hours);
  
  const h = Math.floor(absHours);
  const decimal = absHours - h;
  
  // Check for effectively .5 (30 mins)
  if (Math.abs(decimal - 0.5) < 0.01) {
    return `${sign}${h},30`;
  }
  
  if (decimal < 0.01) {
    return `${sign}${h}`;
  }
  
  // Other decimals
  return `${sign}${absHours.toFixed(2).replace('.', ',')}`;
};

// Parses "8,30" to 8.5 and "-0,30" to -0.5
export const parseHoursInput = (input: string): number => {
  if (!input) return 0;
  
  let cleanInput = input.trim().replace(',', '.');
  const isNegative = cleanInput.startsWith('-');
  
  if (isNegative) {
    cleanInput = cleanInput.substring(1);
  }
  
  let result = 0;
  
  // Check for .30 or .3 notation which implies 30 minutes (.5)
  if (cleanInput.endsWith('.30') || cleanInput.endsWith('.3')) {
    const parts = cleanInput.split('.');
    const h = parseInt(parts[0] || '0', 10);
    result = h + 0.5;
  } else {
    result = parseFloat(cleanInput);
  }
  
  if (isNaN(result)) return 0;
  return isNegative ? -result : result;
};

// Increment or decrement hours string by 0.5
export const adjustHours = (currentInput: string, delta: number): string => {
  const currentVal = parseHoursInput(currentInput);
  const newVal = currentVal + delta;
  return formatHoursDisplay(newVal);
};
