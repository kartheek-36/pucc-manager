// Financial calculations and IST (Asia/Kolkata) timezone utilities

export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Format an amount in Indian Rupees (INR)
 * e.g., 18450 -> ₹18,450
 */
export function formatINR(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * Round a monetary value strictly to 2 decimal places to prevent floating point inaccuracy
 */
export function roundTo2Decimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate net collection safely: total_collection - expenses
 */
export function calculateNetCollection(totalCollection: number, expenses: number): number {
  return roundTo2Decimals(totalCollection - expenses);
}

/**
 * Calculate total tests: petrol + diesel + other
 */
export function calculateTotalTests(petrol: number, diesel: number, other: number): number {
  return Math.max(0, petrol) + Math.max(0, diesel) + Math.max(0, other);
}

/**
 * Get current date as YYYY-MM-DD string in Asia/Kolkata timezone
 */
export function getTodayISTDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // en-CA gives YYYY-MM-DD format
}

/**
 * Convert any Date or ISO string to YYYY-MM-DD in Asia/Kolkata
 */
export function toISTDateString(dateInput: Date | string): string {
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return getTodayISTDateString();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE_IST,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  }
  if (isNaN(dateInput.getTime())) return getTodayISTDateString();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateInput);
}

/**
 * Format a timestamp into human-readable IST time
 * e.g. "06:30 PM"
 */
export function formatISTTime(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE_IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Format a timestamp into human-readable IST Date & Time
 * e.g. "06 Oct 2026, 06:30 PM"
 */
export function formatISTDateTime(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE_IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Check if the current time in IST is past a given deadline hour (e.g. 20 for 8:00 PM IST)
 */
export function isPastISTDeadline(deadlineHour: number = 20, deadlineMinute: number = 0): boolean {
  const now = new Date();
  const istString = now.toLocaleTimeString('en-US', {
    timeZone: TIMEZONE_IST,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const [currentHourStr, currentMinStr] = istString.split(':');
  const currentHour = parseInt(currentHourStr, 10);
  const currentMin = parseInt(currentMinStr, 10);

  if (currentHour > deadlineHour) return true;
  if (currentHour === deadlineHour && currentMin >= deadlineMinute) return true;
  return false;
}

/**
 * Get date range for the current week (Monday to Sunday) in IST
 */
export function getCurrentWeekISTRange(): { start: string; end: string; days: string[] } {
  const todayStr = getTodayISTDateString();
  const [y, m, d] = todayStr.split('-').map(Number);
  // construct in UTC representing midnight
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday, 1 is Monday
  const distanceToMonday = (dayOfWeek + 6) % 7; // days since Monday

  const monday = new Date(dateObj);
  monday.setUTCDate(monday.getUTCDate() - distanceToMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setUTCDate(cur.getUTCDate() + i);
    days.push(cur.toISOString().split('T')[0]);
  }

  return {
    start: days[0],
    end: days[6],
    days,
  };
}

/**
 * Get the last 7 dates ending today in IST
 */
export function getLast7DaysIST(): string[] {
  const todayStr = getTodayISTDateString();
  const [y, m, d] = todayStr.split('-').map(Number);
  const result: string[] = [];

  for (let i = 6; i >= 0; i--) {
    const cur = new Date(Date.UTC(y, m - 1, d));
    cur.setUTCDate(cur.getUTCDate() - i);
    result.push(cur.toISOString().split('T')[0]);
  }

  return result;
}

/**
 * Get date range for current month in IST
 */
export function getCurrentMonthISTRange(): { start: string; end: string; year: number; month: number } {
  const todayStr = getTodayISTDateString();
  const [year, month] = todayStr.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return { start, end, year, month };
}

/**
 * Get date string for the day preceding the given date (default today) in IST
 */
export function getYesterdayISTDateString(baseDateStr?: string): string {
  const target = baseDateStr || getTodayISTDateString();
  const [y, m, d] = target.split('-').map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  cur.setUTCDate(cur.getUTCDate() - 1);
  return cur.toISOString().split('T')[0];
}

/**
 * Calculate percentage difference rounded to 1 decimal place
 */
export function calculatePercentageChange(current: number, previous: number): {
  percent: number;
  formatted: string;
  isPositive: boolean;
} {
  if (previous <= 0) {
    if (current > 0) return { percent: 100, formatted: '+100%', isPositive: true };
    return { percent: 0, formatted: '0%', isPositive: true };
  }
  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;
  const sign = rounded >= 0 ? '+' : '';
  return {
    percent: rounded,
    formatted: `${sign}${rounded}%`,
    isPositive: rounded >= 0,
  };
}

