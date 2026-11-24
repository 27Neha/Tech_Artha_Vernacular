'use client';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../../TranslationProvider';

type Message = { id: string; sender: 'user' | 'ai'; text: string; isError?: boolean };

interface RiskHistoryItem {
  id: string;
  version: number;
  score: number;
  category: string;
  answers: Record<string, number>;
  reasons: string[];
  createdAt: string;
}

const SUGGESTED_QUESTIONS = [
  "What is an SIP?",
  "How is my portfolio doing?",
  "Explain Mutual Funds",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function ChatbotPage() {
  const router = useRouter();
  const { lang, setLang } = useTranslation();
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am the TechArtha AI Assistant. How can I help you with your investments today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<RiskHistoryItem[]>([]);
  const [questionnaireMap, setQuestionnaireMap] = useState<Record<string, { prompt: string; options: { label: string; score: number }[] }>>({});
  const [selectedAssessmentIndex, setSelectedAssessmentIndex] = useState(0);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const fetchRiskHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      // 1. Fetch questionnaire structure
      const qRes = await fetch(`${API_URL}/risk/questionnaire`, { headers });
      if (qRes.ok) {
        const qData = await qRes.json();
        const map: Record<string, any> = {};
        (qData.questions || []).forEach((q: any) => {
          map[q.id] = { prompt: q.prompt, options: q.options };
        });
        setQuestionnaireMap(map);
      }

      // 2. Fetch history
      const hRes = await fetch(`${API_URL}/risk/history`, { headers });
      if (hRes.ok) {
        const hData = await hRes.json();
        setHistoryList(Array.isArray(hData) ? hData : []);
        setSelectedAssessmentIndex(0);
      }
    } catch (err) {
      console.error('Error fetching risk history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    const newMsg: Message = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_URL}/assistant/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ message: text, locale: lang })
      });

      if (!res.ok) throw new Error('Failed to fetch AI response');
      const data = await res.json();
      
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: data.text }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'ai', 
        text: 'I am currently unable to connect to my local AI engine. Please try again later or refer to the FAQs.',
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const currentAssessment = historyList[selectedAssessmentIndex];

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shrink-0 shadow-sm z-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-3xl leading-none text-[var(--dark)]">‹</button>
          <div className="flex flex-col">
            <h1 className="text-lg font-extrabold text-[var(--dark)] flex items-center gap-2">
              TechArtha AI <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </h1>
            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Local Engine Active</p>
          </div>
        </div>

        {/* Header Actions: My Risk Assessment History button & Language */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRiskHistory}
            className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[#E0DEFA] px-3 py-1.5 rounded-full transition-all border border-[#D4D2F5]"
          >
            📊 <span>My Risk Assessment History</span>
          </button>
          
          <select 
            value={lang} 
            onChange={(e) => {
              setLang(e.target.value as any);
              localStorage.setItem('language', e.target.value);
            }}
            className="bg-gray-100 text-[var(--dark)] text-xs font-bold py-1.5 px-2 rounded-lg outline-none border-none cursor-pointer"
          >
            <option value="en">EN</option>
            <option value="hi">HI</option>
            <option value="mr">MR</option>
          </select>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-[var(--primary)] text-white rounded-tr-sm' : msg.isError ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-sm' : 'bg-white text-[var(--dark)] shadow-sm border border-gray-100 rounded-tl-sm'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && !isTyping && (
        <div className="p-4 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button 
              key={idx} 
              onClick={() => handleSend(q)}
              className="whitespace-nowrap bg-white border border-[var(--primary)] text-[var(--primary)] text-xs font-bold px-4 py-2 rounded-full hover:bg-[var(--primary-light)] transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-full border border-gray-200 focus-within:border-[var(--primary)] transition-all">
          <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[var(--primary)] transition-all shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask TechArtha AI..." 
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--dark)]"
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${input.trim() ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">TechArtha AI can make mistakes. Verify important info.</p>
      </div>

      {/* Modal: My Risk Assessment History */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[var(--primary)] text-white p-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">My Risk Assessment History</h2>
                <p className="text-xs text-white/70">Read-Only Conversational Log</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition-all"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-3 border-[var(--primary)] border-t-transparent animate-spin" />
                <span className="text-sm font-semibold text-gray-500">Loading your assessment logs...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-base font-bold text-gray-800">No Assessment History Found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  You haven't completed a risk profiling assessment yet. Complete the assessment to see your conversation log here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Assessment Selector if multiple */}
                {historyList.length > 1 && (
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
                    <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Assessments:</span>
                    {historyList.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedAssessmentIndex(idx)}
                        className={`text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                          idx === selectedAssessmentIndex
                            ? 'bg-[var(--primary)] text-white shadow-sm'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ({item.category})
                      </button>
                    ))}
                  </div>
                )}

                {/* Current Assessment Banner */}
                {currentAssessment && (
                  <div className="bg-[#EBEBFA] border-b border-[#D4D2F5] px-6 py-3 flex items-center justify-between shrink-0">
                    <div>
                      <h4 className="text-sm font-extrabold text-[var(--primary)]">{currentAssessment.category} Investor Profile</h4>
                      <p className="text-xs text-gray-500">
                        Assessed on {new Date(currentAssessment.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className="bg-[var(--orange)] text-white text-xs font-extrabold px-2.5 py-1 rounded-full">
                      Score: {currentAssessment.score}
                    </span>
                  </div>
                )}

                {/* Conversation Log (Chat format) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 bg-[#F8F9FB]">
                  {currentAssessment &&
                    Object.entries(currentAssessment.answers || {}).map(([qId, scoreVal], index) => {
                      const qDef = questionnaireMap[qId];
                      const prompt = qDef?.prompt || `Question ${index + 1}: ${qId}`;
                      const options = qDef?.options || [];
                      const optDef = options.find((o) => o.score === scoreVal);
                      const answerLabel = optDef?.label || `Option Score: ${scoreVal}`;

                      return (
                        <div key={`qa-${index}`} className="flex flex-col gap-3">
                          {/* Bot Question with full questionnaire options */}
                          <div className="flex items-start gap-3 max-w-[88%]">
                            <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-sm">
                              🤖
                            </div>
                            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-sm shadow-sm flex-1">
                              <span className="text-[10px] font-extrabold text-[var(--orange)] uppercase tracking-wide block mb-1">
                                Question {index + 1}
                              </span>
                              <p className="text-sm font-bold text-[#102A54] leading-snug">{prompt}</p>

                              {/* Options List under question */}
                              {options.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1.5">
                                  <span className="text-[11px] font-bold text-gray-400">Available Options:</span>
                                  {options.map((opt, optIdx) => {
                                    const wasChosen = opt.score === scoreVal;
                                    return (
                                      <div
                                        key={`h-opt-${optIdx}`}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                                          wasChosen
                                            ? 'bg-indigo-50 border border-indigo-200 font-bold text-[#102A54]'
                                            : 'bg-gray-50 text-gray-600'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${wasChosen ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            {String.fromCharCode(65 + optIdx)}
                                          </span>
                                          <span>{opt.label}</span>
                                        </div>
                                        {wasChosen && (
                                          <span className="text-[10px] font-extrabold text-[var(--primary)] bg-white px-2 py-0.5 rounded shadow-xs">
                                            ✓ Selected
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* User Answer Bubble with user emoji and neutral card design */}
                          <div className="flex items-start justify-end gap-3">
                            <div className="bg-white border border-gray-300 px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm max-w-md">
                              <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wide block text-right mb-0.5">
                                You answered
                              </span>
                              <p className="text-sm font-bold text-[#0F172A] leading-snug">{answerLabel}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-sm">
                              👤
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
