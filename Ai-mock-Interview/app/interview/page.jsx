"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Webcam from "react-webcam";

// Backend URL — no /api suffix (routes are at /interviews/...)
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const MAIN_APP_URL =
  process.env.NEXT_PUBLIC_MAIN_APP_URL || "http://localhost:5173";
const TOTAL_QUESTIONS = 5;

// ── Backend API helper ────────────────────────────────────────────────────────
function makeApi(token) {
  return async (path, options = {}) => {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    return res;
  };
}

const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const EVAL_MODEL = "x-ai/grok-code-fast-1";

// ── ElevenLabs: audio → transcript ───────────────────────────────────────────
async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob, "answer.webm");
  formData.append("model_id", "scribe_v1");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || "ElevenLabs transcription failed");
  }

  const data = await res.json();
  return (data.text || "").trim();
}

// ── OpenRouter: transcript → score + feedback ────────────────────────────────
async function evaluateAnswer(jobRole, question, transcript) {
  const prompt = `You are a technical interviewer evaluating an answer for the role of "${jobRole}".

Question: ${question}
Candidate's Answer: ${transcript}

Respond in this EXACT JSON format only (no markdown, no extra text):
{"score": <integer 0-10>, "feedback": "<one sentence feedback>"}

Score guide: 0-3 wrong/incomplete, 4-6 partial, 7-8 good, 9-10 excellent.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: EVAL_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error("OpenRouter evaluation failed");

  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  return {
    score: Math.min(10, Math.max(0, Number(parsed.score) || 0)),
    feedback: String(parsed.feedback ?? "No feedback provided."),
  };
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-700 font-medium text-lg">{label}</p>
      </div>
    </div>
  );
}

function ProgressBar({ current, total, label }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span className="font-medium">
          Question {current} of {total}
        </span>
        <span className="text-blue-600 font-medium">{label}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-2 bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Main interview component ──────────────────────────────────────────────────
function InterviewContent() {
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("interviewId");
  const jobRole = decodeURIComponent(searchParams.get("jobRole") || "Software Developer");
  const token = searchParams.get("token");

  // stage: init | webcam | ready | recording | transcribing | result | finishing | done | error
  const [stage, setStage] = useState("init");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [lastResult, setLastResult] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [camError, setCamError] = useState("");
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [initStatus, setInitStatus] = useState("Starting interview…");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const api = makeApi(token);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!interviewId || !token) {
      setErrorMsg("Missing interview parameters. Please start from the main platform.");
      setStage("error");
      return;
    }
    initInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initInterview = async () => {
    console.log("==> initInterview started! interviewId:", interviewId);
    try {
      // 1. Mark interview as IN_PROGRESS on backend
      setInitStatus("Starting interview on server…");
      console.log(`==> sending POST to ${BACKEND_URL}/interviews/${interviewId}/start`);
      
      const startRes = await api(`/interviews/${interviewId}/start`, { method: "POST" });
      console.log("==> POST /start response status:", startRes.status);
      
      const startData = await startRes.json();
      console.log("==> startData JSON:", startData);
      
      if (!startRes.ok && startData.message !== "Interview already in progress") {
        throw new Error(startData.message || "Failed to start interview");
      }

      // 2. Fetch the first question from backend (OpenRouter AI generates it)
      setInitStatus("Loading your first question…");
      console.log("==> calling loadNextQuestion...");
      await loadNextQuestion();

      // 3. Go to webcam setup stage
      console.log("==> setting stage to webcam!");
      setStage("webcam");
    } catch (err) {
      console.error("==> FATAL ERROR in initInterview:", err);
      setErrorMsg(err.message || "Failed to initialize interview. (Check console for CORS/network errors)");
      setStage("error");
    }
  };

  // ── Fetch next question from backend ────────────────────────────────────────
  const loadNextQuestion = async () => {
    const res = await api(`/interviews/${interviewId}/question`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load question");
    if (data.done) {
      await finishInterview();
      return true; // signals done
    }
    setCurrentQuestion(data.question);
    setQuestionNumber(data.questionNumber);
    return false;
  };

  // ── Webcam setup ─────────────────────────────────────────────────────────────
  const requestWebcam = async () => {
    setCamError("");
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setStage("ready");
    } catch {
      setCamError("Camera access was denied. Please allow camera access in your browser settings and try again.");
    }
  };

  // ── Start mic recording + timer ──────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.start();

      // start timer
      setRecordingSecs(0);
      timerRef.current = setInterval(() => {
        setRecordingSecs((s) => s + 1);
      }, 1000);

      setStage("recording");
    } catch {
      setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
      setStage("error");
    }
  };

  // ── Stop recording → Gemini transcription → backend evaluation ──────────────
  const stopAndSubmit = () => {
    if (!mediaRecorderRef.current) return;
    clearInterval(timerRef.current);
    setStage("transcribing");

    mediaRecorderRef.current.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // 1. ElevenLabs transcribes audio → text
        const transcript = await transcribeAudio(audioBlob);

        // 2. OpenRouter evaluates the transcript
        const { score, feedback } = await evaluateAnswer(jobRole, currentQuestion, transcript);

        // 3. Submit to backend to store (pass score + feedback so backend skips re-evaluation)
        const res = await api("/interviews/answer", {
          method: "POST",
          body: JSON.stringify({ interviewId, question: currentQuestion, transcript, score, feedback }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to submit answer");

        setLastResult({ score, feedback, transcript });
        setStage("result");
      } catch (err) {
        setErrorMsg(err.message || "Failed to process answer. Please try again.");
        setStage("error");
      }
    };

    mediaRecorderRef.current.stop();
  };

  // ── Next question or finish ──────────────────────────────────────────────────
  const handleNext = async () => {
    if (questionNumber >= TOTAL_QUESTIONS) {
      await finishInterview();
    } else {
      try {
        setStage("init");
        setInitStatus("Loading next question…");
        const done = await loadNextQuestion();
        if (!done) setStage("ready");
      } catch (err) {
        setErrorMsg(err.message || "Failed to load next question.");
        setStage("error");
      }
    }
  };

  // ── Complete interview on backend ────────────────────────────────────────────
  const finishInterview = async () => {
    setStage("finishing");
    try {
      const res = await api(`/interviews/${interviewId}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to complete interview");
      setFinalData(data);
      setStage("done");
    } catch (err) {
      setErrorMsg(err.message || "Failed to complete interview.");
      setStage("error");
    }
  };

  const goToDashboard = () => {
    window.location.href = `${MAIN_APP_URL}/student-dashboard`;
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── RENDER BY STAGE ───────────────────────────────────────────────────────────

  if (stage === "init") {
    return <Spinner label={initStatus} />;
  }

  if (stage === "finishing") {
    return <Spinner label="Calculating your results…" />;
  }

  if (stage === "transcribing") {
    return <Spinner label="Transcribing & evaluating your answer…" />;
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-3">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button
            onClick={goToDashboard}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Webcam setup (mandatory) ─────────────────────────────────────────────────
  if (stage === "webcam") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📷</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Camera Required</h2>
          <p className="text-gray-500 text-sm mb-2">
            Role: <span className="font-semibold text-blue-600">{jobRole}</span>
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Your webcam must be enabled for the entire interview. Click below to grant access.
          </p>
          {camError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {camError}
            </div>
          )}
          <button
            onClick={requestWebcam}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            {camError ? "Try Again" : "Enable Camera & Start Interview"}
          </button>
        </div>
      </div>
    );
  }

  // ── Ready: show question + webcam + record button ────────────────────────────
  if (stage === "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto pt-6">
          <ProgressBar current={questionNumber} total={TOTAL_QUESTIONS} label={jobRole} />

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Question */}
            <div className="p-6 border-b border-gray-100">
              <p className="text-xs font-semibold text-blue-500 uppercase mb-2">
                Question {questionNumber}
              </p>
              <p className="text-gray-900 text-lg font-medium leading-relaxed">
                {currentQuestion}
              </p>
            </div>

            {/* Webcam */}
            <div className="bg-gray-900 flex justify-center py-4">
              <Webcam
                mirrored
                height={200}
                width={300}
                className="rounded-xl"
                onUserMediaError={() => {
                  setErrorMsg("Camera was disconnected. Please refresh and try again.");
                  setStage("error");
                }}
              />
            </div>

            {/* Instructions + Record */}
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-xs text-yellow-700">
                <strong>Instructions:</strong> Read the question, prepare your answer, then click Record. Speak clearly and stop when done.
              </div>
              <button
                onClick={startRecording}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <span className="w-3 h-3 bg-white rounded-full" />
                Record My Answer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Recording ────────────────────────────────────────────────────────────────
  if (stage === "recording") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto pt-6">
          <ProgressBar current={questionNumber} total={TOTAL_QUESTIONS} label={jobRole} />

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Recording indicator */}
            <div className="bg-red-600 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                <span className="text-white font-semibold text-sm">RECORDING</span>
              </div>
              <span className="text-white font-mono text-sm">{formatTime(recordingSecs)}</span>
            </div>

            {/* Question reminder */}
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <p className="text-xs font-semibold text-blue-500 uppercase mb-1">
                Question {questionNumber}
              </p>
              <p className="text-gray-800 text-sm font-medium">{currentQuestion}</p>
            </div>

            {/* Webcam */}
            <div className="bg-gray-900 flex justify-center py-4">
              <Webcam
                mirrored
                height={200}
                width={300}
                className="rounded-xl"
              />
            </div>

            <div className="p-6">
              <button
                onClick={stopAndSubmit}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Stop Recording & Submit Answer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Per-answer result ────────────────────────────────────────────────────────
  if (stage === "result" && lastResult) {
    const isLast = questionNumber >= TOTAL_QUESTIONS;
    const scoreColor =
      lastResult.score >= 8 ? "text-green-600" : lastResult.score >= 5 ? "text-yellow-600" : "text-red-600";
    const scoreBg =
      lastResult.score >= 8 ? "bg-green-50 border-green-200" : lastResult.score >= 5 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto pt-8">
          <ProgressBar current={questionNumber} total={TOTAL_QUESTIONS} label={jobRole} />

          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Score */}
            <div className={`rounded-xl p-6 text-center mb-6 border ${scoreBg}`}>
              <div className={`text-5xl font-bold ${scoreColor}`}>{lastResult.score}/10</div>
              <p className="text-gray-500 text-sm mt-1">Question {questionNumber} score</p>
            </div>

            {/* Answer */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Your Answer</p>
              <p className="text-gray-700 text-sm leading-relaxed">{lastResult.transcript}</p>
            </div>

            {/* Feedback */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-blue-400 uppercase mb-1">AI Feedback</p>
              <p className="text-gray-800 text-sm leading-relaxed">{lastResult.feedback}</p>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              {isLast ? "Finish Interview" : "Next Question →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Final result ─────────────────────────────────────────────────────────────
  if (stage === "done" && finalData) {
    const cleared = finalData.isShortlisted === true;
    const answers = finalData.interview?.InterviewAnswer ?? [];
    const scoreColor = (s) =>
      s >= 8 ? "text-green-600" : s >= 5 ? "text-yellow-600" : "text-red-600";

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-12">

          {/* Result banner */}
          <div className={`rounded-2xl p-8 text-center mb-6 ${cleared ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className="text-6xl mb-3">{cleared ? "🎉" : "😔"}</div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: cleared ? "#16a34a" : "#dc2626" }}>
              {cleared ? "Cleared 1st Round ✓" : "Not Cleared"}
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              {cleared ? "You have been shortlisted for the next round." : "Keep practising and try again."}
            </p>
            <div className="text-5xl font-bold text-gray-900">{finalData.aiScore}/100</div>
            <p className="text-gray-400 text-xs mt-1">AI Score — pass threshold: 50</p>
          </div>

          {/* Per-question breakdown */}
          {answers.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="font-bold text-gray-800 mb-4 text-lg">Answer Breakdown</h2>
              <div className="space-y-3">
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
                    <div className="bg-gray-50 rounded-lg p-2 mb-1">
                      <p className="text-xs text-gray-500">{ans.transcript}</p>
                    </div>
                    <p className="text-xs text-gray-400 italic">{ans.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={goToDashboard}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Wrap in Suspense — required by Next.js 14 App Router for useSearchParams
export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
