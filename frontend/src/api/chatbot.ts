import axiosInstance from './axios';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessagePayload {
  role: ChatRole;
  content: string;
}

export interface AskChatbotResponse {
  success: boolean;
  answer: string;
}

export const chatbotApi = {
  ask: async (
    question: string,
    history: ChatMessagePayload[] = []
  ): Promise<AskChatbotResponse> => {
    const response = await axiosInstance.post('/chatbot/ask', {
      question,
      history,
    });
    return response.data;
  },
};
