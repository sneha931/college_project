import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api/interview';
import type { InterviewDetails, InterviewAnswer } from '../types';

const AI_INTERVIEW_URL =
  import.meta.env.VITE_AI_INTERVIEW_URL || 'http://localhost:3001';

type Stage = 'loading' | 'ready' | 'question' | 'evaluating' | 'result' | 'done' | 'error';

const TOTAL_QUESTIONS = 5;

export default function InterviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('loading');
  const [interview, setInterview] = useState<InterviewDetails | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<{ score: number; feedback: string } | null>(null);
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [isShortlisted, setIsShortlisted] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Load interview on mount
  useEffect(() => {
    if (!interviewId) return;
    loadInterview();
  }, [interviewId]);

  const loadInterview = async () => {
    try {
      const data = await interviewApi.getInterview(interviewId!);
      setInterview(data.interview);

      if (data.interview.status === 'COMPLETED') {
        setFinalScore(data.interview.aiScore);
        setVerdict(data.interview.verdict);
        setIsShortlisted(data.interview.isShortlisted);
        setAnswers(data.interview.InterviewAnswer ?? []);
        setStage('done');
        return;
      }

      if (data.interview.status === 'TERMINATED') {
        setErrorMsg('This interview has been terminated.');
        setStage('error');
        return;
      }

      // Redirect to AI interview app (Gemini + webcam)
      const token = localStorage.getItem('token') || '';
      const jobRole = encodeURIComponent(
        data.interview.JobPosts?.jobrole || 'Software Developer'
      );
      window.location.href = `${AI_INTERVIEW_URL}/interview?interviewId=${interviewId}&jobRole=${jobRole}&token=${token}`;
    } catch {
      setErrorMsg('Failed to load interview. Please check your link and try again.');
      setStage('error');
    }
  };

  const handleStart = async () => {
    try {
      setStage('loading');
      await interviewApi.startInterview(interviewId!);
      await fetchNextQuestion();
    } catch {
      setErrorMsg('Failed to start interview. Please try again.');
      setStage('error');
    }
  };

  const fetchNextQuestion = useCallback(async () => {
    try {
      setStage('loading');
      const data = await interviewApi.getNextQuestion(interviewId!);
      if (data.done) {
        await finishInterview();
        return;
      }
      setCurrentQuestion(data.question ?? '');
      setQuestionNumber(data.questionNumber);
      setTranscript('');
      setLastResult(null);
      setStage('question');
    } catch {
      setErrorMsg('Failed to load question. Please try again.');
      setStage('error');
    }
  }, [interviewId]);

  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) return;
    try {
      setStage('evaluating');
      const data = await interviewApi.submitAnswer({
        interviewId: interviewId!,
        question: currentQuestion,
        transcript: transcript.trim(),
      });
      setLastResult({ score: data.score, feedback: data.feedback });
      setStage('result');
    } catch {
      setErrorMsg('Failed to submit answer. Please try again.');
      setStage('error');
    }
  };

  const finishInterview = async () => {
    try {
      const data = await interviewApi.completeInterview(interviewId!);
      setFinalScore(data.aiScore);
      setVerdict(data.verdict);
      setIsShortlisted(data.isShortlisted);
      setAnswers(data.interview.InterviewAnswer ?? []);
      setStage('done');
    } catch {
      setErrorMsg('Failed to complete interview. Please contact support.');
      setStage('error');
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Ready (not started yet) ───────────────────────────────────────────────
  if (stage === 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-bold text-gray-900">AI Interview Round</h1>
            <p className="text-gray-500 mt-1">
              {interview?.JobPosts?.companyname} — {interview?.JobPosts?.jobrole}
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6 space-y-2 text-sm text-gray-700">
            <p>📋 <strong>{TOTAL_QUESTIONS} technical questions</strong> will be generated by AI</p>
            <p>⏱️ Take your time to answer each question thoughtfully</p>
            <p>🤖 Each answer is evaluated automatically by AI (score 0–10)</p>
            <p>✅ Score ≥ 70/100 = shortlisted for next round</p>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // ── Question ─────────────────────────────────────────────────────────────
  if (stage === 'question') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Question {questionNumber} of {TOTAL_QUESTIONS}</span>
              <span>{interview?.JobPosts?.jobrole}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full transition-all"
                style={{ width: `${((questionNumber - 1) / TOTAL_QUESTIONS) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl shadow p-6 mb-4">
            <div className="flex items-start gap-3 mb-5">
              <span className="flex-shrink-0 bg-blue-100 text-blue-700 font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                Q{questionNumber}
              </span>
              <p className="text-gray-900 text-lg font-medium leading-relaxed">{currentQuestion}</p>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Type your answer here..."
            />

            <button
              onClick={handleSubmitAnswer}
              disabled={!transcript.trim()}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Submit Answer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Evaluating ────────────────────────────────────────────────────────────
  if (stage === 'evaluating') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-700 font-medium">AI is evaluating your answer...</p>
        </div>
      </div>
    );
  }

  // ── Per-answer Result ─────────────────────────────────────────────────────
  if (stage === 'result' && lastResult) {
    const isLast = questionNumber >= TOTAL_QUESTIONS;
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8 max-w-lg w-full text-center">
          <div className={`text-5xl font-bold mb-2 ${scoreColor(lastResult.score)}`}>
            {lastResult.score}/10
          </div>
          <p className="text-gray-500 text-sm mb-4">Question {questionNumber} score</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">AI Feedback</p>
            <p className="text-gray-800 text-sm">{lastResult.feedback}</p>
          </div>

          <button
            onClick={isLast ? finishInterview : fetchNextQuestion}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            {isLast ? 'Finish Interview' : 'Next Question →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Done (final result) ───────────────────────────────────────────────────
  if (stage === 'done') {
    const selected = isShortlisted === true;
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Result banner */}
          <div className={`rounded-2xl p-8 text-center mb-6 ${selected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-5xl mb-3">{selected ? '🎉' : '😔'}</div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: selected ? '#16a34a' : '#dc2626' }}>
              {verdict === 'Cleared 1st Round' ? 'Cleared 1st Round ✓' : 'Not Cleared'}
            </h1>
            <div className="text-4xl font-bold mt-4 mb-1 text-gray-900">{finalScore}/100</div>
            <p className="text-gray-500 text-sm">AI Score (pass threshold: 50)</p>
          </div>

          {/* Answer breakdown */}
          {answers.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-4">Answer Breakdown</h2>
              <div className="space-y-4">
                {answers.map((ans, idx) => (
                  <div key={ans.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium text-gray-700 flex-1 pr-4">
                        Q{idx + 1}: {ans.question}
                      </p>
                      <span className={`text-sm font-bold flex-shrink-0 ${scoreColor(ans.score)}`}>
                        {ans.score}/10
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 italic">{ans.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/student-dashboard')}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
