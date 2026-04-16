import type { Request, Response } from 'express';
import Logger from '../../logger.js';
import {
  generateStudentChatbotReply,
  type ChatHistoryMessage,
} from '../../service/chatbot.service.js';

export const askStudentChatbot = async (req: Request, res: Response) => {
  try {
    const { question, history } = req.body as {
      question?: string;
      history?: ChatHistoryMessage[];
    };

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Question is required' });
    }

    if (question.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Question is too long. Please keep it under 2000 characters.',
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .slice(-10)
          .filter(
            (item) =>
              item &&
              (item.role === 'user' || item.role === 'assistant') &&
              typeof item.content === 'string',
          )
      : [];

    const answer = await generateStudentChatbotReply(
      req.user.id,
      question,
      safeHistory,
    );

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error) {
    Logger.error('Error in askStudentChatbot', { error });
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to get chatbot response',
    });
  }
};
