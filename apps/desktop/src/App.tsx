import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AuthClient } from '@companyio/auth-client';
import { useAuth } from '@companyio/auth-react';

type SessionType = 'technical' | 'coding' | 'system-design' | 'behavioral';

const DesktopAuthPanel = ({ client }: { client: AuthClient }) => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'sign-up') {
        await client.signUp({ name, email, password, businessName: 'Interview Copilot' });
      } else {
        await client.signInWithPassword({ email, password });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="desktop-auth-form" onSubmit={submit}>
      <div className="desktop-auth-tabs">
        <button type="button" onClick={() => setMode('sign-in')} aria-pressed={mode === 'sign-in'}>
          Sign in
        </button>
        <button type="button" onClick={() => setMode('sign-up')} aria-pressed={mode === 'sign-up'}>
          Create account
        </button>
      </div>
      {mode === 'sign-up' && (
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
      )}
      <label>
        Work email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error && <div className="desktop-auth-error">{error}</div>}
      <button className="desktop-auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? 'Connecting...'
          : mode === 'sign-in'
            ? 'Continue to workspace'
            : 'Create workspace'}
      </button>
    </form>
  );
};

type SessionConfig = {
  id: SessionType;
  title: string;
  description: string;
  icon: string;
};

type TranscriptItem = {
  id: number;
  speaker: 'Interviewer' | 'You';
  text: string;
  time: string;
};

type SpeechRecognitionResultEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const SESSION_TYPES: SessionConfig[] = [
  {
    id: 'technical',
    title: 'Technical Interview',
    description: 'Practice technical and behavioral interview questions.',
    icon: '●',
  },
  {
    id: 'coding',
    title: 'Coding & Algorithms',
    description: 'Practice algorithmic problems and coding challenges.',
    icon: '</>',
  },
  {
    id: 'system-design',
    title: 'System Design',
    description: 'Practice architecture, scalability and distributed systems.',
    icon: '◇',
  },
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'Practice communication, leadership and experience-based questions.',
    icon: '✦',
  },
];

const INITIAL_TRANSCRIPT: TranscriptItem[] = [
  {
    id: 1,
    speaker: 'Interviewer',
    text: 'Can you explain how the Node.js event loop works?',
    time: '00:18',
  },
  {
    id: 2,
    speaker: 'You',
    text: 'Sure. Node.js uses an event-driven architecture and a non-blocking I/O model...',
    time: '00:31',
  },
  {
    id: 3,
    speaker: 'Interviewer',
    text: 'How is it different from using multiple threads?',
    time: '00:46',
  },
];

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');

  const remainingSeconds = (seconds % 60).toString().padStart(2, '0');

  return `${minutes}:${remainingSeconds}`;
};

const getSessionTitle = (sessionType: SessionType) => {
  return (
    SESSION_TYPES.find((session) => session.id === sessionType)?.title ?? 'Technical Interview'
  );
};

const getSessionDescription = (sessionType: SessionType) => {
  return SESSION_TYPES.find((session) => session.id === sessionType)?.description ?? '';
};

const InterviewWorkspace: React.FC = () => {
  const { signOut } = useAuth();

  const [selectedSession, setSelectedSession] = useState<SessionType>('technical');

  const [activeSession, setActiveSession] = useState<SessionType | null>(null);

  const [sessionSeconds, setSessionSeconds] = useState(0);

  const [isListening, setIsListening] = useState(false);

  const [isPaused, setIsPaused] = useState(false);

  const [question, setQuestion] = useState(
    'Explain how the Node.js event loop works and how it handles asynchronous operations.'
  );

  const [answer, setAnswer] = useState(
    'Node.js uses an event-driven architecture with a non-blocking I/O model. The event loop continuously checks for completed asynchronous operations and executes their callbacks when the JavaScript call stack is available.'
  );

  const [transcript, setTranscript] = useState<TranscriptItem[]>(INITIAL_TRANSCRIPT);

  const [interimTranscript, setInterimTranscript] = useState('');

  const [microphoneError, setMicrophoneError] = useState('');

  const [questionInput, setQuestionInput] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);

  const [showSettings, setShowSettings] = useState(false);

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const sessionSecondsRef = useRef(0);

  /*
   * Session timer
   */
  useEffect(() => {
    if (!activeSession || isPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      setSessionSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeSession, isPaused]);

  useEffect(() => {
    sessionSecondsRef.current = sessionSeconds;
  }, [sessionSeconds]);

  useEffect(() => {
    if (!activeSession || !isListening || isPaused) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setInterimTranscript('');
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setMicrophoneError('Live transcription is not available in this desktop runtime.');
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let finalText = '';
      let currentInterim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? '';

        if (result.isFinal) {
          finalText += text;
        } else {
          currentInterim += text;
        }
      }

      if (finalText.trim()) {
        setTranscript((items) => [
          ...items,
          {
            id: Date.now(),
            speaker: 'You',
            text: finalText.trim(),
            time: formatTime(sessionSecondsRef.current),
          },
        ]);
      }

      setInterimTranscript(currentInterim.trim());
    };
    recognition.onerror = () => {
      setMicrophoneError(
        'Microphone access was interrupted. Check your permissions and try again.'
      );
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition && isListening && !isPaused) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    setMicrophoneError('');

    try {
      recognition.start();
    } catch {
      setMicrophoneError('Unable to start the microphone. Check your permissions and try again.');
    }

    return () => {
      recognition.onend = null;
      recognition.stop();

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [activeSession, isListening, isPaused]);

  const selectedSessionTitle = useMemo(() => getSessionTitle(selectedSession), [selectedSession]);

  const startSession = () => {
    setActiveSession(selectedSession);
    setSessionSeconds(0);
    setIsPaused(false);
    setIsListening(true);
    setIsPrivacyMode(false);

    setTranscript(INITIAL_TRANSCRIPT);

    setQuestion(
      selectedSession === 'coding'
        ? 'Given an array of integers, find the longest consecutive sequence in O(n) time.'
        : selectedSession === 'system-design'
          ? 'Design a scalable URL shortening service that can handle millions of requests per day.'
          : selectedSession === 'behavioral'
            ? 'Tell me about a challenging project you worked on and how you handled it.'
            : 'Explain how the Node.js event loop works and how it handles asynchronous operations.'
    );

    setAnswer(
      selectedSession === 'coding'
        ? 'Use a Set to store all numbers. For each number that does not have a predecessor, start building a consecutive sequence. This gives O(n) expected time and O(n) space.'
        : selectedSession === 'system-design'
          ? 'Start with the requirements, define the API, estimate scale, then design the storage, ID generation, caching and read/write architecture. Discuss horizontal scaling and availability.'
          : selectedSession === 'behavioral'
            ? 'Use the STAR structure: explain the Situation, describe the Task, explain the Actions you personally took, and finish with measurable Results.'
            : 'Node.js uses an event-driven architecture with a non-blocking I/O model. The event loop coordinates asynchronous operations and executes callbacks when the JavaScript call stack is available.'
    );
  };

  const endSession = () => {
    setActiveSession(null);
    setIsListening(false);
    setIsPaused(false);
    setIsPrivacyMode(false);
    setSessionSeconds(0);
  };

  const togglePrivacyMode = () => {
    setIsPrivacyMode((enabled) => !enabled);
    setIsListening(false);
    setIsPaused(true);
    setInterimTranscript('');
  };

  const togglePause = () => {
    setIsPaused((paused) => !paused);
    setIsListening((listening) => !listening);
  };

  const askAI = () => {
    const trimmedQuestion = questionInput.trim();

    if (!trimmedQuestion) {
      return;
    }

    setIsGenerating(true);

    window.setTimeout(() => {
      setQuestion(trimmedQuestion);

      setAnswer(
        `A good approach would be to first clarify the requirements, identify the constraints, and then break the problem into smaller components. From there, choose the appropriate data structures and algorithms, explain the trade-offs, and validate the solution with examples and edge cases.`
      );

      setIsGenerating(false);
      setQuestionInput('');
    }, 700);
  };

  /*
   * LANDING / SESSION SELECTION
   */
  if (!activeSession) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">IC</div>

            <div>
              <div className="brand-title">Interview Copilot</div>
              <div className="brand-subtitle">AI-powered practice workspace</div>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="connection-status">
              <span className="status-dot" />
              Local
            </div>

            <button
              className="icon-button"
              type="button"
              onClick={() => setShowSettings((value) => !value)}
              aria-label="Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </header>

        {showSettings && (
          <div className="settings-popover">
            <div className="settings-title">Settings</div>

            <div className="settings-row">
              <span>AI Provider</span>
              <span className="settings-value">Not connected</span>
            </div>

            <div className="settings-row">
              <span>Microphone</span>
              <span className="settings-value">Not connected</span>
            </div>

            <div className="settings-row">
              <span>Database</span>
              <span className="settings-value">PostgreSQL</span>
            </div>
          </div>
        )}

        <main className="landing-content">
          <div className="eyebrow">INTERVIEW WORKSPACE</div>

          <h1>
            Prepare.
            <span>Practice.</span>
            Improve.
          </h1>

          <p className="hero-description">
            Run focused interview practice sessions with real-time context and AI-powered
            assistance.
          </p>

          <section className="session-section">
            <div className="section-heading">
              <h2>Start a session</h2>

              <p>Choose the type of practice you want to run.</p>
            </div>

            <div className="session-list">
              {SESSION_TYPES.map((session) => {
                const isSelected = selectedSession === session.id;

                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`session-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedSession(session.id)}
                  >
                    <div className="session-card-top">
                      <div
                        className={`session-icon ${
                          session.id === 'coding'
                            ? 'blue'
                            : session.id === 'system-design'
                              ? 'cyan'
                              : session.id === 'behavioral'
                                ? 'green'
                                : ''
                        }`}
                      >
                        {session.icon}
                      </div>

                      <div className={`selection-circle ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <CheckIcon />}
                      </div>
                    </div>

                    <div className="session-card-content">
                      <h3>{session.title}</h3>
                      <p>{session.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button type="button" className="start-button" onClick={startSession}>
              Start {selectedSessionTitle}
              <ArrowRightIcon />
            </button>
          </section>
        </main>
      </div>
    );
  }

  /*
   * ACTIVE SESSION WORKSPACE
   */
  return (
    <div className="app-shell workspace-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">IC</div>

          <div>
            <div className="brand-title">Interview Copilot</div>

            <div className="brand-subtitle">{getSessionTitle(activeSession)}</div>
          </div>
        </div>

        <div className="workspace-header-right">
          <div className="session-time">
            <ClockIcon />
            {formatTime(sessionSeconds)}
          </div>

          <div className={`connection-status ${isListening ? 'listening' : 'paused'}`}>
            <span className="status-dot" />
            {isListening ? 'Listening' : 'Paused'}
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            aria-label="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="settings-popover">
          <div className="settings-title">Settings</div>

          <div className="settings-row">
            <span>AI Provider</span>
            <span className="settings-value">Not connected</span>
          </div>

          <div className="settings-row privacy-setting-row">
            <span>
              <strong>Privacy Mode</strong>
              <small>Pause capture and hide session content</small>
            </span>

            <button
              className={`privacy-toggle ${isPrivacyMode ? 'enabled' : ''}`}
              type="button"
              onClick={togglePrivacyMode}
              aria-pressed={isPrivacyMode}
              aria-label={`${isPrivacyMode ? 'Disable' : 'Enable'} Privacy Mode`}
            >
              <span />
            </button>
          </div>

          <div className="settings-row account-setting-row">
            <span>
              <strong>Account</strong>
              <small>Sign out of this Desktop app</small>
            </span>

            <button className="settings-sign-out" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
      )}

      <main className="workspace">
        <div className="workspace-title-row">
          <div>
            <div className="eyebrow">LIVE SESSION</div>

            <h1>{getSessionTitle(activeSession)}</h1>

            <p>{getSessionDescription(activeSession)}</p>
          </div>

          <div className="live-indicator">
            <span />
            {isPrivacyMode ? 'PRIVATE' : isListening ? 'LIVE' : 'PAUSED'}
          </div>
        </div>

        <div className="workspace-grid">
          {/* TRANSCRIPT */}
          <section className="panel transcript-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">
                  <MicIcon />
                  Live Transcript
                </div>

                <div className="panel-subtitle">Conversation captured during the session</div>
              </div>

              <div className="recording-badge">
                <span />
                {isListening ? 'Recording' : 'Paused'}
              </div>
            </div>

            <div className="transcript-content">
              {isPrivacyMode ? (
                <div className="privacy-notice">
                  <LockIcon />
                  <strong>Transcript hidden</strong>
                  <span>Privacy Mode is pausing microphone capture.</span>
                </div>
              ) : (
                transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`transcript-item ${item.speaker === 'You' ? 'you' : ''}`}
                  >
                    <div className="transcript-meta">
                      <span>{item.speaker}</span>
                      <time>{item.time}</time>
                    </div>

                    <p>{item.text}</p>
                  </div>
                ))
              )}

              {!isPrivacyMode && isListening && (
                <div className="transcript-listening">
                  <div className="audio-bars">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>{interimTranscript || 'Listening for conversation...'}</span>
                </div>
              )}

              {microphoneError && <div className="transcript-error">{microphoneError}</div>}
            </div>
          </section>

          {/* AI COPILOT */}
          <section className="panel copilot-panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">
                  <SparklesIcon />
                  AI Copilot
                </div>

                <div className="panel-subtitle">Real-time analysis and suggestions</div>
              </div>

              <div className="ai-badge">AI</div>
            </div>

            <div className="copilot-content">
              {isPrivacyMode ? (
                <div className="privacy-notice">
                  <LockIcon />
                  <strong>Copilot paused</strong>
                  <span>AI suggestions are hidden while Privacy Mode is active.</span>
                </div>
              ) : (
                <>
                  <div className="copilot-section">
                    <div className="section-label">DETECTED QUESTION</div>

                    <div className="question-box">{question}</div>
                  </div>

                  <div className="divider" />

                  <div className="copilot-section">
                    <div className="section-label">SUGGESTED APPROACH</div>

                    <div className="answer-box">
                      {isGenerating ? (
                        <div className="generating">
                          <div className="loading-dots">
                            <span />
                            <span />
                            <span />
                          </div>
                          Generating response...
                        </div>
                      ) : (
                        answer
                      )}
                    </div>
                  </div>

                  <div className="copilot-actions">
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() =>
                        setAnswer(
                          'Think aloud while answering. Start with the core idea, explain your reasoning, mention trade-offs, and finish with complexity or edge cases.'
                        )
                      }
                    >
                      <RefreshIcon />
                      Improve
                    </button>

                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() =>
                        setAnswer(
                          'Break the problem into smaller parts. Define the requirements first, then explain the solution step-by-step and validate it with an example.'
                        )
                      }
                    >
                      <LightbulbIcon />
                      Hint
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* ASK AI */}
        <section className="ask-ai-panel">
          <div className="ask-ai-icon">
            <SparklesIcon />
          </div>

          <input
            value={questionInput}
            onChange={(event) => setQuestionInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                askAI();
              }
            }}
            placeholder="Ask Copilot anything about the current interview..."
          />

          <button
            type="button"
            className="ask-button"
            onClick={askAI}
            disabled={isPrivacyMode || !questionInput.trim() || isGenerating}
          >
            Ask AI
            <ArrowUpIcon />
          </button>
        </section>
      </main>

      {/* BOTTOM CONTROL BAR */}
      <footer className="session-footer">
        <div className="footer-left">
          <div className="footer-status">
            <span className={`footer-status-dot ${isListening ? 'active' : ''}`} />

            {isListening ? 'Listening to microphone' : 'Microphone paused'}
          </div>

          <div className="footer-time">{formatTime(sessionSeconds)}</div>
        </div>

        <div className="footer-actions">
          <button type="button" className="pause-button" onClick={togglePause}>
            {isPaused ? <PlayIcon /> : <PauseIcon />}

            {isPaused ? 'Resume' : 'Pause'}
          </button>

          <button type="button" className="end-button" onClick={endSession}>
            <StopIcon />
            End Session
          </button>
        </div>
      </footer>
    </div>
  );
};

/*
 * Icons
 */

const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.02 1.56v.08h-2.7V20a1.7 1.7 0 0 0-1.02-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 7.4 15a1.7 1.7 0 0 0-1.56-1.02h-.08v-2.7h.08A1.7 1.7 0 0 0 7.4 10a1.7 1.7 0 0 0-.34-1.88L7 8.06l1.9-1.9.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.86 5v-.08h2.7V5a1.7 1.7 0 0 0 1.02 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.9 1.9-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.02h.08v2.7h-.08A1.7 1.7 0 0 0 19.4 15Z" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const LockIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);

const MicIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
    <path d="M8 21h8" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
    <path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
    <path d="m5 15 .6 1.9L7.5 18l-1.9.6L5 20.5l-.6-1.9L2.5 18l1.9-.6L5 15Z" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
    <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
  </svg>
);

const LightbulbIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M8.2 14.5A6 6 0 1 1 16 14.5c-.9.8-1.3 1.5-1.4 2.5H9.6c-.1-1-.5-1.7-1.4-2.5Z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5Z" />
  </svg>
);

const StopIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const App: React.FC = () => {
  const { client, user, isLoading } = useAuth();

  if (isLoading) return <div className="desktop-auth-loading">Loading workspace...</div>;

  if (!user) {
    return (
      <main className="desktop-auth-page">
        <div className="desktop-auth-brand">IC</div>
        <div className="desktop-auth-copy">
          <div className="eyebrow">INTERVIEW COPILOT DESKTOP</div>
          <h1>Your practice workspace, everywhere.</h1>
          <p>Sign in once and keep your account connected across web and desktop.</p>
        </div>
        <div className="desktop-auth-surface">
          <DesktopAuthPanel client={client} />
        </div>
      </main>
    );
  }

  return <InterviewWorkspace />;
};

export default App;
