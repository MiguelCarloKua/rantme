'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import type { LabelProps } from 'recharts';

// ——— Types —————————————————————————————————————————————————
type Message = {
  sender: 'bot' | 'user';
  text: string;
  timestamp?: string;
};
type ChatSessions = { [sessionId: string]: Message[] };
type Session = { id: string; name: string };
type ToneType = 'empathetic' | 'motivational' | 'reflective' | 'funny';
type MoodEntry = { date: string; mood: string; session: string };

// ——— Inverse calming themes —————————————————————————————
const inverseTheme: Record<string, { bg: string; text: string }> = {
  sad: {
    bg: 'linear-gradient(to bottom, #A5D6A7, #E8F5E9)',       // Calming greens with deeper top
    text: '#1B5E20',
  },
  angry: {
    bg: 'linear-gradient(to bottom, #64B5F6, #E3F2FD)',       // Soothing blues with stronger contrast
    text: '#0D47A1',
  },
  anxious: {
    bg: 'linear-gradient(to bottom, #FFF176, #FFFDE7)',       // Warm reassurance with vivid yellow top
    text: '#F57F17',
  },
  stressed: {
    bg: 'linear-gradient(to bottom, #CE93D8, #F3E5F5)',       // Relaxing purples with noticeable gradient
    text: '#4A148C',
  },
  depressed: {
    bg: 'linear-gradient(to bottom, #B0BEC5, #FFFFFF)',       // Clean, soft contrast with emotional gray
    text: '#37474F',
  },
  neutral: {
    bg: 'linear-gradient(to bottom, #ffffffff, #ffffffff)',   // Stay neutral with clearer shading
    text: 'rgba(0, 0, 0, 1)ff',
  },
  happy: {
    bg: 'linear-gradient(to bottom, #4DD0E1, #E0F7FA)',       // Cool teal to calm overexcitement
    text: '#006064',
  },
  relieved: {
    bg: 'linear-gradient(to bottom, #AED581, #F1F8E9)',       // Grounding greens with more depth
    text: '#33691E',
  },
  tired: {
    bg: 'linear-gradient(to bottom, #FFB74D, #FFF3E0)',       // Gentle orange warmth with improved visibility
    text: '#E65100',
  },
  lonely: {
    bg: 'linear-gradient(to bottom, #4FC3F7, #E1F5FE)',       // Inviting, light blue with bolder top
    text: '#01579B',
  },
};

// ——— Offline maps for chart only —————————————————————————————
const moodScoreMap: Record<string, number> = {
  happy: 2, relieved: 1, neutral: 0, sad: -2,
  anxious: -1, angry: -2, tired: -1,
  stressed: -1, lonely: -1, depressed: -2
};
const moodEmojiMap: Record<string, string> = {
  happy: '😊', relieved: '😌', neutral: '😐', sad: '😢',
  anxious: '😰', angry: '😠', tired: '😴',
  stressed: '😫', lonely: '😞', depressed: '💧'
};

// ——— Map HuggingFace labels → our theme keys ——————————————————
function normalizeEmotion(hfLabel: string): keyof typeof inverseTheme {
  const l = hfLabel.toLowerCase();
  switch (l) {
    case 'sadness': return 'sad';
    case 'anger':   return 'angry';
    case 'fear':    return 'anxious';
    case 'joy':     return 'happy';
    case 'neutral': return 'neutral';
    case 'disgust': return 'stressed';
    case 'surprise':return 'relieved';
    default:        return 'neutral';
  }
}

// ——— Custom chart label —————————————————————————————————
const CustomEmojiLabel = ({ x, y, value }: LabelProps) => {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof value !== 'string')
    return null;
  return (
    <text x={x} y={y - 8} textAnchor="middle" fontSize="16" fill="#9C83D3">
      {value}
    </text>
  );
};

// ——— Chat API call ————————————————————————————————————
const botResponse = async (
  history: { role: 'user' | 'assistant'; content: string }[],
  tone: ToneType
): Promise<string> => {
  try {
    const res = await axios.post('/api/chat', { messages: history, tone });
    return res.data.reply as string;
  } catch {
    return "Sorry, I'm having trouble right now.";
  }
};

// ——— Animated background hook —————————————————————————
const useAnimatedGradient = (gradient: string) => {
  useEffect(() => {
    document.documentElement.style.transition = 'background 1s ease-in-out';
    document.documentElement.style.background = gradient;
  }, [gradient]);
};

// ——— Main component —————————————————————————————————————
export default function Home() {
  // Theme state
  const [bg, setBg] = useState(inverseTheme.neutral.bg);
  const [textColor, setTextColor] = useState(inverseTheme.neutral.text);
  useAnimatedGradient(bg);

  // Chat state
  const [tone, setTone] = useState<ToneType>('empathetic');
  const [moodLog, setMoodLog] = useState<MoodEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([{ id: 'default', name: 'Day 1' }]);
  const [messages, setMessages] = useState<ChatSessions>({
    default: [{
      sender: 'bot',
      text: `Greetings! How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]
  });
  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [input, setInput] = useState('');
  const [showStats, setShowStats] = useState(false);

  const currentMessages = messages[currentSessionId] || [];

  // Chart data
  const cumulativeChartData = sessions.map(sess => {
    const entries = moodLog.filter(m => m.session === sess.name);
    const score = entries.reduce((s, e) => s + (moodScoreMap[e.mood] || 0), 0);
    const dominant = entries.length
      ? entries.reduce((a, b) =>
          (moodScoreMap[a.mood] || 0) > (moodScoreMap[b.mood] || 0) ? a : b
        ).mood
      : 'neutral';
    return { session: sess.name, score, emoji: moodEmojiMap[dominant] || '❓' };
  });

  // Weekly summary
  const weeklyScore = moodLog.reduce((s, e) => s + (moodScoreMap[e.mood] || 0), 0);
  const weeklyMood = weeklyScore > 0
    ? 'Positive 😊'
    : weeklyScore < 0
    ? 'Negative 😞'
    : 'Neutral 😐';

  // Send message handler
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1) Append user
    const newUserMsgs: Message[] = [
      ...currentMessages,
      { sender: 'user', text: userText, timestamp }
    ];
    setMessages(prev => ({ ...prev, [currentSessionId]: newUserMsgs }));

    // 2) Call emotion API
    let hfLabel = 'neutral';
    try {
      const emoRes = await axios.post('/api/emotion', { text: userText });
      hfLabel = emoRes.data.label || 'neutral';
    } catch {
      console.error('Emotion API error');
    }

    // 3) Normalize + apply inverse theme
    const norm = normalizeEmotion(hfLabel);
    const theme = inverseTheme[norm];
    setBg(theme.bg);
    setTextColor(theme.text);

    // 4) Log mood
    const today = new Date().toISOString().split('T')[0];
    setMoodLog(log => [
      ...log,
      { date: today, mood: norm, session: sessions.find(s => s.id === currentSessionId)!.name }
    ]);

    // 5) Build LLM history
    const history = newUserMsgs.map(m => {
      const role: 'user' | 'assistant' = m.sender === 'user' ? 'user' : 'assistant';
      return { role, content: m.text };
    });


    // 6) Bot reply
    const reply = await botResponse(history, tone);
    const updatedMsgs: Message[] = [
      ...newUserMsgs,
      { sender: 'bot', text: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setMessages(prev => ({ ...prev, [currentSessionId]: updatedMsgs }));

    setInput('');
  };

  // Create new session
  const createNewSession = () => {
    const id = uuidv4(), name = `Day ${sessions.length + 1}`;
    setSessions(prev => [...prev, { id, name }]);
    setMessages(prev => ({
      ...prev,
      [id]: [{
        sender: 'bot',
        text: `Greetings! How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]
    }));
    setCurrentSessionId(id);
    setBg(inverseTheme.neutral.bg);
    setTextColor(inverseTheme.neutral.text);
  };

  return (
    <div style={{ background: bg, color: textColor }} className="min-h-screen flex transition-colors duration-1000">
      {/* Sidebar */}
      <aside className="w-64 bg-[#D8CCF1] text-white p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="RantMe Logo" width={36} height={36} className="rounded-md" />
          <h1 className="text-2xl font-bold text-[#9C83D3]">RantMe</h1>
        </div>
        <button onClick={createNewSession} className="bg-white text-[#9C83D3] px-3 py-2 rounded-lg shadow">+ New Rant</button>
        <button onClick={() => setShowStats(s => !s)} className="bg-white text-[#9C83D3] px-3 py-2 rounded-lg shadow">📊 View Stats</button>
        <h2 className="text-sm font-semibold text-white/80">Chat History</h2>
        <ul className="space-y-2 text-sm">
          {sessions.map(sess => (
            <li key={sess.id}>
              <button
                onClick={() => setCurrentSessionId(sess.id)}
                className={`w-full text-left px-3 py-2 rounded-lg ${
                  sess.id === currentSessionId ? 'bg-white text-[#9C83D3]' : 'hover:bg-white/20'
                }`}
              >
                {sess.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Tone selector */}
        <div className="p-4 flex items-center gap-3 border-b">
          <label htmlFor="tone" className="text-sm font-medium">Bot Tone:</label>
          <select
            id="tone"
            value={tone}
            onChange={e => setTone(e.target.value as ToneType)}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="empathetic">Empathetic</option>
            <option value="motivational">Motivational</option>
            <option value="reflective">Reflective</option>
            <option value="funny">Light-hearted</option>
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {currentMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-sm px-4 py-2 rounded-lg shadow ${
                msg.sender === 'bot' ? 'bg-white text-gray-800' : 'bg-[#9C83D3] text-white'
              }`}>
                <div>{msg.text}</div>
                <div className="text-xs text-gray-500 mt-1 text-right">{msg.timestamp}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t bg-white p-4 flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="your rant here..."
            className="flex-1 rounded-xl border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9C83D3]"
          />
          <button onClick={sendMessage} className="bg-[#9C83D3] text-white px-5 py-2 rounded-xl">Send</button>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="border-t bg-white p-4">
            <h3 className="text-lg font-semibold mb-2 text-[#9C83D3]">📊 Mood Stats by Session</h3>
            <p className="text-sm text-gray-700 mb-4">
              Overall Mood This Week: <span className="font-bold">{weeklyMood}</span>
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={cumulativeChartData}>
                <XAxis dataKey="session" padding={{ left: 20, right: 20 }} />
                <YAxis domain={[-8, 12]} />
                <Tooltip formatter={(v: number) => [`${v} pts`, 'Mood Score']} />
                <Line type="monotone" dataKey="score" stroke="#9C83D3" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="emoji"
                  stroke="#ffde59"
                  strokeWidth={0}
                  dot={{ r: 8, stroke: '#FF8CD1', strokeWidth: 2, fill: '#fff' }}
                  label={<CustomEmojiLabel />}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}
