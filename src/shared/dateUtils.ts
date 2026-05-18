
/**
 * Calculates the next Saturday for a given date.
 * If the current date is Saturday, returns the current date.
 * @param date The date to start from
 */
export function getNextSaturday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0 (Sun) to 6 (Sat)
  
  if (day === 6) {
    // It's already Saturday, publish today
    return result;
  }
  
  // Calculate days until next Saturday
  const diff = 6 - day;
  result.setDate(result.getDate() + diff);
  
  // Set time to morning of Saturday (e.g., 6:00 AM)
  result.setHours(6, 0, 0, 0);
  
  return result;
}
