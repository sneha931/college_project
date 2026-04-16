import { useEffect, useMemo, useRef, useState } from 'react';
import { chatbotApi } from '../api';
import { useAuth } from '../context/AuthContext';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const StudentChatbot = () => {
  const { role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(
    () => [
      'How can I improve my match score?',
      'How do I upload and update my resume?',
      'Where can I see shortlisted jobs?',
      'How do I check upcoming events and interviews?',
    ],
    []
  );

  const storageKey = 'student_chatbot_messages_v1';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I can help with jobs, profile, events, interviews, and portal navigation. What do you want to know?',
    },
  ]);

  useEffect(() => {
    if (role !== 'student') {
      return;
    }

    const savedRaw = localStorage.getItem(storageKey);
    if (!savedRaw) {
      return;
    }

    try {
      const parsed = JSON.parse(savedRaw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(
          parsed
            .filter(
              item =>
                item &&
                (item.role === 'user' || item.role === 'assistant') &&
                typeof item.content === 'string'
            )
            .slice(-40)
        );
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [role]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
  }, [messages]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isSending, isOpen]);

  const sendMessage = async (questionOverride?: string) => {
    const question = (questionOverride ?? input).trim();
    if (!question || isSending) {
      return;
    }

    setErrorMessage('');
    setLastQuestion(question);

    const userMessage: ChatMessage = { role: 'user', content: question };
    const nextMessages = [...messages, userMessage].slice(-40);
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await chatbotApi.ask(question, nextMessages.slice(-8));
      setMessages(prev => [
        ...prev.slice(-39),
        {
          role: 'assistant',
          content:
            response.answer ||
            'I could not generate an answer right now. Please try again.',
        },
      ]);
    } catch {
      setErrorMessage('Unable to reach chatbot. Please retry.');
    } finally {
      setIsSending(false);
    }
  };

  const submitQuickPrompt = async (prompt: string) => {
    void sendMessage(prompt);
  };

  const clearChat = () => {
    const defaultMessages: ChatMessage[] = [
      {
        role: 'assistant',
        content:
          'Chat reset. Ask me anything about jobs, profile, events, interviews, or student analysis.',
      },
    ];
    setMessages(defaultMessages);
    setErrorMessage('');
    localStorage.setItem(storageKey, JSON.stringify(defaultMessages));
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Student Assistant</p>
              <p className="text-[11px] text-blue-100">Portal Help Bot</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="text-white/90 hover:text-white text-xs border border-white/30 px-2 py-1 rounded"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/90 hover:text-white"
                aria-label="Close chatbot"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-3 pt-2 pb-1 bg-white border-b border-gray-100">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => submitQuickPrompt(prompt)}
                  disabled={isSending}
                  className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={messagesRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-600 rounded-2xl px-3 py-2 text-sm">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-white">
            {errorMessage && (
              <div className="mb-2 text-xs text-red-600 flex items-center justify-between">
                <span>{errorMessage}</span>
                {lastQuestion && (
                  <button
                    onClick={() => setInput(lastQuestion)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask about jobs, profile, events..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={isSending || !input.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-9.193-5.106A1 1 0 004 6.94v10.12a1 1 0 001.559.83l9.193-6.106a1 1 0 000-1.66z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="ml-auto w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
        aria-label="Open student chatbot"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z"
          />
        </svg>
      </button>
    </div>
  );
};

export default StudentChatbot;
