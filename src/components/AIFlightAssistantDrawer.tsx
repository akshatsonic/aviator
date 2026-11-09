import React, { useState, useRef, useEffect } from 'react';
import { Flight, ChatMessage } from '../types/flight.ts';
import { TimezoneCode, convertUtcTimeString } from '../utils/time.ts';
import { MarkdownView } from './MarkdownView.tsx';
import { Sparkles, Send, X, Crosshair, ArrowUpRight, Plane, Loader2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface AIFlightAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  useLiveData: boolean;
  onFocusFlight: (flightId: string) => void;
  prefilledQuery?: string;
  onClearPrefill?: () => void;
  timezone?: TimezoneCode;
}

const DEFAULT_SUGGESTIONS = [
  'Which aircraft have the highest altitude?',
  'Show available London Heathrow route estimates',
  'Explain the path lines on the radar',
  'Which aircraft are moving fastest?',
];

export const AIFlightAssistantDrawer: React.FC<AIFlightAssistantDrawerProps> = ({
  isOpen,
  onClose,
  flights,
  useLiveData,
  onFocusFlight,
  prefilledQuery,
  onClearPrefill,
  timezone = 'UTC',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "I'm the **SkyPulse Airspace Copilot**. Ask about aircraft position, altitude, speed, true track, or available route estimates. OpenSky telemetry does not include airline schedules or delay status.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQueries: [
        'Which aircraft have the highest altitude?',
        'Show Tokyo (HND) route estimates',
        'Explain the OpenSky telemetry fields',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isLoading, isMinimized]);

  // Handle prefilled query triggered from telemetry panel or external chips
  useEffect(() => {
    if (prefilledQuery) {
      setIsMinimized(false);
      sendMessage(prefilledQuery);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefilledQuery]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const queryText = userText.trim();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          useLiveData,
          flights: flights.slice(0, 60).map(({ trail: _trail, ...flight }) => flight),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Here is the current airspace telemetry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        matchedFlightNumbers: data.matchedFlightNumbers || [],
        suggestedQueries: data.suggestedQueries || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.warn('Backend fetch failed or timed out, executing client-side airspace analysis:', err);

      // Intelligent Client-Side Evaluation
      const q = queryText.toLowerCase();
      let matchedFlights: Flight[] = [];
      let reply = '';
      let matchedNumbers: string[] = [];

      // Check for en route to / destination (e.g. BLR, Bangalore, LHR, JFK)
      const airportMatches = ['blr', 'bom', 'del', 'dxb', 'lhr', 'jfk', 'hnd', 'sin', 'fra', 'cdg', 'syd', 'sfo', 'lax', 'ams', 'ist'];
      const matchedCode = airportMatches.find(c => q.includes(c) || (c === 'blr' && (q.includes('bangalore') || q.includes('bengaluru'))) || (c === 'bom' && q.includes('mumbai')) || (c === 'del' && q.includes('delhi')) || (c === 'lhr' && q.includes('london')));

      if (matchedCode) {
        const isEnroute = q.includes('to') || q.includes('enroute') || q.includes('heading') || q.includes('landing') || q.includes('arriving') || q.includes('arrival');
        if (isEnroute) {
          matchedFlights = flights.filter(f => f.destination.code.toLowerCase() === matchedCode);
        } else {
          matchedFlights = flights.filter(f => f.destination.code.toLowerCase() === matchedCode || f.origin.code.toLowerCase() === matchedCode);
        }

        if (matchedFlights.length > 0) {
          const sample = matchedFlights.slice(0, 4);
          matchedNumbers = sample.map(f => f.flightNumber);
          const lines = sample.map(f => `• **${f.flightNumber}** (${f.airline}): ${f.routeKnown === false ? 'route unavailable' : `${f.origin.code} ➔ ${f.destination.code}`} | FL${Math.round(f.altitude / 100)} (${f.altitude.toLocaleString()} ft) · ${f.velocity} kts · ${f.status === 'delayed' ? `Delayed +${f.delayMinutes}m` : f.status === 'unknown' ? 'schedule status unavailable' : 'On Time'}`).join('\n');
          reply = `Found **${matchedFlights.length} active flights** en route to **${matchedCode.toUpperCase()}**:\n\n${lines}\n\nClick any flight card below to focus and lock onto its live trajectory.`;
        }
      }

      // Check for delays
      if (!reply && (q.includes('delay') || q.includes('late'))) {
        matchedFlights = flights.filter(f => f.status === 'delayed').slice(0, 4);
        matchedNumbers = matchedFlights.map(f => f.flightNumber);
        const lines = matchedFlights.map(f => `• **${f.flightNumber}** (${f.airline}): ${f.origin.code} ➔ ${f.destination.code} — Delayed +${f.delayMinutes}m (ETA ${f.arrivalEstimated})`).join('\n');
        reply = `Found **${matchedFlights.length} delayed flights** in current airspace:\n\n${lines}`;
      }

      // Check specific flight number
      if (!reply) {
        const single = flights.find(f => q.includes(f.flightNumber.toLowerCase()) || q.includes(f.callsign.toLowerCase()));
        if (single) {
          matchedNumbers = [single.flightNumber];
          const route = single.routeKnown === false ? 'Its route is unavailable from live OpenSky telemetry.' : `Its callsign-derived route estimate is ${single.origin.city} (${single.origin.code}) to ${single.destination.city} (${single.destination.code}).`;
          const eta = single.arrivalEstimated ? ` Direct ETA estimate: ${single.arrivalEstimated} UTC.` : '';
          reply = `**Flight ${single.flightNumber}** (${single.airline}) is at **FL${Math.round(single.altitude / 100)}** (${single.altitude.toLocaleString()} ft), moving at **${single.velocity} kts** on true track **${single.heading}°**. ${route}${eta}`;
        }
      }

      // Fallback general
      if (!reply) {
        const sample = flights.slice(0, 3);
        matchedNumbers = sample.map(f => f.flightNumber);
        reply = flights.length > 0
          ? `SkyPulse has **${flights.length} aircraft** loaded in the monitored area. Ask about a callsign, airport, altitude, or speed.`
          : 'There are currently **no aircraft loaded** on the radar. Retry the live feed or search a wider area before asking about a specific flight.';
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        matchedFlightNumbers: matchedNumbers,
        suggestedQueries: ['Which aircraft are moving fastest?', 'Show London Heathrow route estimates', 'Explain the selected track'],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Airspace conversation cleared. How can I assist you with flights today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQueries: DEFAULT_SUGGESTIONS,
      },
    ]);
  };

  const getFlightByNumber = (flightNum: string): Flight | undefined => {
    const cleanNum = flightNum.toUpperCase().replace(/\s+/g, '');
    return flights.find(
      (f) =>
        f.flightNumber.toUpperCase() === cleanNum ||
        f.callsign.toUpperCase() === cleanNum ||
        f.flightNumber.toUpperCase().includes(cleanNum)
    );
  };

  if (!isOpen) return null;

  return (
    <aside
      onClick={(e) => e.stopPropagation()}
      className={`assistant-panel absolute right-4 z-[1050] flex flex-col overflow-hidden transition-all duration-200 ${
        isMinimized
          ? 'bottom-4 h-13 w-80'
          : 'bottom-4 top-4 w-[400px] max-w-[calc(100vw-2rem)]'
      }`}
    >
      {/* Header */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              Airspace Copilot
              <span className="text-[10px] font-mono text-[#737373] font-normal">Gemini</span>
            </h2>
            {!isMinimized && (
              <div className="text-[10px] text-slate-400">Position, speed, altitude, and route estimates</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Assistant' : 'Minimize Assistant'}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {!isMinimized && (
            <button
              onClick={handleResetChat}
              title="Reset Conversation"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const matchedFlights = (msg.matchedFlightNumbers || [])
                .map(getFlightByNumber)
                .filter((flight): flight is Flight => Boolean(flight));
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl p-3 leading-relaxed ${
                      isUser
                        ? 'bg-cyan-600 text-slate-950 font-medium rounded-br-none shadow-md'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow'
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                      <MarkdownView content={msg.text} />
                    )}

                    <div
                      className={`mt-1.5 text-[9px] font-mono ${
                        isUser ? 'text-slate-900/70' : 'text-slate-500'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Embedded Interactive Flight Cards in Assistant Responses */}
                  {!isUser && matchedFlights.length > 0 && (
                    <div className="w-full mt-2 space-y-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80 px-1">
                        Matching flights ({matchedFlights.length})
                      </div>
                      {matchedFlights.map((flight) => {
                        const isDelayed = flight.status === 'delayed';

                        return (
                          <div
                            key={flight.id}
                            className="bg-slate-950/90 border border-cyan-500/30 hover:border-cyan-400/80 rounded-lg p-2.5 transition-all shadow-sm group hover:shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                                    {flight.flightNumber}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {flight.airline}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300 font-medium">
                                  {flight.routeKnown === false ? (
                                    <span className="text-slate-500">Route unknown</span>
                                  ) : (
                                    <>
                                      <span className="font-mono text-cyan-300">{flight.origin.code}</span>
                                      <Plane className="w-3 h-3 text-slate-500 transform rotate-90" />
                                      <span className="font-mono text-emerald-300">{flight.destination.code}</span>
                                      <span className="text-slate-500 text-[10px]">(estimated)</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase shrink-0 ${
                                  isDelayed
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : flight.status === 'unknown'
                                      ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {isDelayed ? `Delayed +${flight.delayMinutes}m` : flight.status === 'unknown' ? 'Telemetry only' : 'On Time'}
                              </div>
                            </div>

                            {/* Telemetry snippet */}
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 pt-1.5 border-t border-slate-800/80">
                              <div>FL{Math.round(flight.altitude / 100)} · {flight.velocity} kts</div>
                              <div className="text-slate-300">
                                {flight.arrivalEstimated ? `Direct ETA: ${convertUtcTimeString(flight.arrivalEstimated, timezone || 'UTC')}` : 'ETA unavailable'}
                              </div>
                            </div>

                            {/* Direct Click Action: Jump to Flight on Radar */}
                            <button
                              onClick={() => {
                                onFocusFlight(flight.id);
                              }}
                              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1 px-2.5 bg-cyan-950/70 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 hover:border-cyan-400 rounded text-[11px] font-medium transition-all shadow-sm"
                            >
                              <Crosshair className="w-3 h-3" />
                              <span>Focus Flight on Radar</span>
                              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Follow-up Suggestion Chips */}
                  {!isUser && msg.suggestedQueries && msg.suggestedQueries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestedQueries.map((query, qi) => (
                        <button
                          key={qi}
                          onClick={() => sendMessage(query)}
                          className="text-[11px] px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-cyan-300 rounded-md transition-colors text-left"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Scanning radar feeds & querying flight intelligence...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Ask about a callsign, altitude, or airport…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
