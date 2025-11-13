// AI Service for intelligent recommendations
// Note: For production, you'll need to add your OpenAI API key to environment variables

interface VisitRecommendation {
  customer: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedProducts?: string[];
}

interface AIInsight {
  type: 'recommendation' | 'alert' | 'tip';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export const aiService = {
  // Analyze visit history and provide recommendations
  async getVisitRecommendations(visits: any[]): Promise<VisitRecommendation[]> {
    // Mock AI recommendations based on visit patterns
    // In production, this would call OpenAI API
    
    const recommendations: VisitRecommendation[] = [];
    
    // Analyze visit frequency
    const customerVisitCount = new Map<string, number>();
    visits.forEach(visit => {
      const count = customerVisitCount.get(visit.customer_name) || 0;
      customerVisitCount.set(visit.customer_name, count + 1);
    });
    
    // Find customers not visited recently
    const today = new Date();
    const recentVisits = visits.filter(v => {
      const visitDate = new Date(v.created_at);
      const daysSince = (today.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });
    
    const recentCustomers = new Set(recentVisits.map(v => v.customer_name));
    const allCustomers = Array.from(customerVisitCount.keys());
    
    // Recommend revisiting old customers
    allCustomers.forEach(customer => {
      if (!recentCustomers.has(customer)) {
        recommendations.push({
          customer,
          reason: 'Not visited in over 7 days - follow-up recommended',
          priority: 'high',
          suggestedProducts: ['Product A', 'Product B'],
        });
      }
    });
    
    return recommendations.slice(0, 5); // Return top 5
  },

  // Get AI-powered insights for the salesman
  async getDailyInsights(_salesmanId: string, visits: any[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    // Calculate today's visits
    const today = new Date().toDateString();
    const todayVisits = visits.filter(v => 
      new Date(v.created_at).toDateString() === today
    );
    
    // Performance insight
    if (todayVisits.length > 5) {
      insights.push({
        type: 'tip',
        title: 'Great Performance!',
        description: `You've completed ${todayVisits.length} visits today. Keep up the excellent work!`,
        priority: 'high',
      });
    } else if (todayVisits.length === 0) {
      insights.push({
        type: 'alert',
        title: 'Start Your Day',
        description: 'No visits recorded today. Check your recommended customers below.',
        priority: 'medium',
      });
    }
    
    // Weekly pattern analysis
    const last7Days = visits.filter(v => {
      const visitDate = new Date(v.created_at);
      const daysSince = (Date.now() - visitDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });
    
    if (last7Days.length < 10) {
      insights.push({
        type: 'recommendation',
        title: 'Increase Activity',
        description: 'Your visit frequency is below target. Aim for at least 2-3 visits per day.',
        priority: 'medium',
      });
    }
    
    // Success rate insight
    const successfulVisits = visits.filter(v => v.status === 'completed');
    const successRate = visits.length > 0 
      ? Math.round((successfulVisits.length / visits.length) * 100)
      : 0;
    
    if (successRate > 80) {
      insights.push({
        type: 'tip',
        title: 'High Success Rate',
        description: `${successRate}% of your visits are successful. Excellent conversion rate!`,
        priority: 'high',
      });
    }
    
    return insights;
  },

  // Smart product recommendations based on customer history
  async getProductRecommendations(customerName: string, pastVisits: any[]): Promise<string[]> {
    // In production, this would use ML to analyze purchase patterns
    const customerVisits = pastVisits.filter(v => v.customer_name === customerName);
    
    if (customerVisits.length === 0) {
      return ['Product A', 'Product B', 'Product C']; // Default recommendations
    }
    
    // Analyze notes for product mentions
    const products = new Set<string>();
    customerVisits.forEach(visit => {
      if (visit.notes) {
        // Simple keyword extraction
        if (visit.notes.toLowerCase().includes('product a')) products.add('Product A');
        if (visit.notes.toLowerCase().includes('product b')) products.add('Product B');
        if (visit.notes.toLowerCase().includes('product c')) products.add('Product C');
      }
    });
    
    return Array.from(products).slice(0, 3);
  },

  // Generate visit summary using AI
  async generateVisitSummary(visit: any): Promise<string> {
    // In production, use OpenAI to generate intelligent summaries
    const status = visit.status === 'completed' ? 'successful' : 'pending';
    const location = visit.location_address || 'Location not recorded';
    
    return `Visit to ${visit.customer_name} - ${status}. Location: ${location}. ${visit.notes || 'No additional notes.'}`;
  },

  // Route optimization (future feature)
  async optimizeRoute(customers: any[]): Promise<any[]> {
    // In production, use Google Maps API + AI to optimize visit routes
    // For now, return customers sorted by proximity (mock)
    return customers.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  },
};
