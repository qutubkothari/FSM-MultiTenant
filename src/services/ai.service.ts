import OpenAI from 'openai';
import { ENV } from '@/config/env';
import { AI_CONFIG } from '@/config/constants';

class AIService {
  private static instance: AIService;
  private openai: OpenAI | null = null;

  private constructor() {
    if (ENV.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });
    }
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Intelligent customer name autocomplete using AI
   * Learns from previous entries and suggests most likely matches
   */
  async suggestCustomerName(input: string, previousCustomers: string[]): Promise<string[]> {
    if (!this.openai || input.length < 2) {
      return this.fallbackSuggestion(input, previousCustomers);
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an intelligent autocomplete assistant for a sales app. Given a partial customer name and a list of previous customers, suggest the 5 most likely complete customer names. Consider common business naming patterns, abbreviations, and typos. Return only the suggestions as a JSON array of strings.`,
          },
          {
            role: 'user',
            content: `Input: "${input}"\nPrevious customers: ${JSON.stringify(previousCustomers.slice(0, 20))}`,
          },
        ],
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const suggestions = JSON.parse(content);
        return Array.isArray(suggestions) ? suggestions : [];
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    }

    return this.fallbackSuggestion(input, previousCustomers);
  }

  /**
   * Intelligent contact person suggestion based on customer name
   */
  async suggestContactPerson(customerName: string, previousContacts: Record<string, string[]>): Promise<string[]> {
    if (!this.openai) {
      return previousContacts[customerName] || [];
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `You are helping suggest contact person names for a customer. Based on the customer name and previous contact history, suggest likely contact persons. Return as JSON array of strings.`,
          },
          {
            role: 'user',
            content: `Customer: "${customerName}"\nPrevious contacts: ${JSON.stringify(previousContacts)}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const suggestions = JSON.parse(content);
        return Array.isArray(suggestions) ? suggestions : [];
      }
    } catch (error) {
      console.error('AI contact suggestion error:', error);
    }

    return previousContacts[customerName] || [];
  }

  /**
   * Analyze visit remarks and extract insights
   */
  async analyzeVisitRemarks(remarks: string): Promise<{ sentiment: string; keywords: string[]; suggestions: string[] }> {
    if (!this.openai || !remarks) {
      return { sentiment: 'neutral', keywords: [], suggestions: [] };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `Analyze sales visit remarks and return: 1) sentiment (positive/neutral/negative), 2) key topics/keywords, 3) follow-up suggestions. Return as JSON: {sentiment: string, keywords: string[], suggestions: string[]}`,
          },
          {
            role: 'user',
            content: remarks,
          },
        ],
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: 0.5,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    }

    return { sentiment: 'neutral', keywords: [], suggestions: [] };
  }

  /**
   * Predict optimal next action based on meeting context
   */
  async predictNextAction(meetingType: string[], products: string[], customerHistory: any): Promise<string> {
    if (!this.openai) {
      return 'Meeting';
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: `Based on meeting type, products discussed, and customer history, predict the most appropriate next action from: Meeting, Send Sample, Visit Again with Management, Invite to Factory. Return only the action name.`,
          },
          {
            role: 'user',
            content: `Meeting types: ${meetingType.join(', ')}\nProducts: ${products.join(', ')}\nHistory: ${JSON.stringify(customerHistory)}`,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content?.trim() || 'Meeting';
    } catch (error) {
      console.error('AI prediction error:', error);
      return 'Meeting';
    }
  }

  /**
   * Fallback suggestion using simple string matching
   */
  private fallbackSuggestion(input: string, previousCustomers: string[]): string[] {
    const lowerInput = input.toLowerCase();
    return previousCustomers
      .filter((customer) => customer.toLowerCase().includes(lowerInput))
      .slice(0, 5);
  }
}

export default AIService.getInstance();
