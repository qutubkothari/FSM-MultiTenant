import { Visit, SalesmanStats, ProductStats } from '@/types/database.types';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

/**
 * Calculate salesman performance metrics
 */
export function calculateSalesmanStats(visits: Visit[]): SalesmanStats[] {
  const statsMap = new Map<string, SalesmanStats>();

  visits.forEach((visit) => {
    const { salesman_id } = visit;
    
    if (!statsMap.has(salesman_id)) {
      statsMap.set(salesman_id, {
        salesman_id,
        salesman_name: '', // Will be filled from salesman data
        total_visits: 0,
        introductions: 0,
        enquiries: 0,
        orders: 0,
        payments: 0,
        follow_ups: 0,
        hit_ratio: 0,
      });
    }

    const stats = statsMap.get(salesman_id)!;
    stats.total_visits++;

    // Count meeting types
    if (visit.meeting_type.includes('Introduction')) stats.introductions++;
    if (visit.meeting_type.includes('Enquiry')) stats.enquiries++;
    if (visit.meeting_type.includes('Order')) stats.orders++;
    if (visit.meeting_type.includes('Payment')) stats.payments++;
    if (visit.meeting_type.includes('Follow-up')) stats.follow_ups++;
  });

  // Calculate hit ratios
  statsMap.forEach((stats) => {
    if (stats.enquiries > 0) {
      stats.hit_ratio = (stats.orders / stats.enquiries) * 100;
    }
  });

  return Array.from(statsMap.values());
}

/**
 * Calculate product discussion statistics
 */
export function calculateProductStats(visits: Visit[]): ProductStats[] {
  const statsMap = new Map<string, ProductStats>();

  visits.forEach((visit) => {
    visit.products_discussed.forEach((productId) => {
      if (!statsMap.has(productId)) {
        statsMap.set(productId, {
          product_id: productId,
          product_name: '', // Will be filled from product data
          discussion_count: 0,
          conversion_count: 0,
        });
      }

      const stats = statsMap.get(productId)!;
      stats.discussion_count++;

      // Count as conversion if visit included an order
      if (visit.meeting_type.includes('Order')) {
        stats.conversion_count++;
      }
    });
  });

  return Array.from(statsMap.values()).sort(
    (a, b) => b.discussion_count - a.discussion_count
  );
}

/**
 * Filter visits by date range
 */
export function filterVisitsByDateRange(
  visits: Visit[],
  startDate: Date,
  endDate: Date
): Visit[] {
  const start = startOfDay(startDate);
  const end = endOfDay(endDate);

  return visits.filter((visit) => {
    const visitDate = new Date(visit.created_at);
    return isWithinInterval(visitDate, { start, end });
  });
}

/**
 * Group visits by date
 */
export function groupVisitsByDate(visits: Visit[]): Record<string, Visit[]> {
  const grouped: Record<string, Visit[]> = {};

  visits.forEach((visit) => {
    const date = format(new Date(visit.created_at), 'yyyy-MM-dd');
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(visit);
  });

  return grouped;
}

/**
 * Calculate average visits per day
 */
export function calculateAverageVisitsPerDay(visits: Visit[]): number {
  if (visits.length === 0) return 0;

  const grouped = groupVisitsByDate(visits);
  const days = Object.keys(grouped).length;

  return days > 0 ? visits.length / days : 0;
}

/**
 * Get top customers by visit frequency
 */
export function getTopCustomers(visits: Visit[], limit = 10): Array<{ name: string; count: number }> {
  const customerCounts = new Map<string, number>();

  visits.forEach((visit) => {
    const count = customerCounts.get(visit.customer_name) || 0;
    customerCounts.set(visit.customer_name, count + 1);
  });

  return Array.from(customerCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Calculate potential pipeline value
 * This is a placeholder - you can customize based on your business logic
 */
export function calculatePipelineValue(visits: Visit[]): number {
  const weights = {
    High: 100000,
    Medium: 50000,
    Low: 20000,
  };

  return visits.reduce((total, visit) => {
    if (visit.meeting_type.includes('Enquiry') || visit.meeting_type.includes('Order')) {
      return total + weights[visit.potential];
    }
    return total;
  }, 0);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate visit duration in minutes
 */
export function calculateVisitDuration(visit: Visit): number | null {
  if (!visit.time_out) return null;

  const timeIn = new Date(visit.time_in).getTime();
  const timeOut = new Date(visit.time_out).getTime();
  
  return Math.round((timeOut - timeIn) / (1000 * 60));
}

/**
 * Get average visit duration
 */
export function getAverageVisitDuration(visits: Visit[]): number {
  const durations = visits
    .map(calculateVisitDuration)
    .filter((d): d is number => d !== null);

  if (durations.length === 0) return 0;

  return durations.reduce((sum, d) => sum + d, 0) / durations.length;
}
