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

// Types
type Message = {
  sender: 'bot' | 'user';
  text: string;
  timestamp?: string;
};
type ChatSessions = { [sessionId: string]: Message[] };
type Session = { id: string; name: string };
type ToneType = 'empathetic' | 'motivational' | 'reflective' | 'funny';
type MoodEntry = { date: string; mood: string; session: string };

const moodScoreMap: Record<string, number> = {
  happy: 2,
  relieved: 1,
  neutral: 0,
  sad: -2,
  anxious: -1,
  angry: -2,
  tired: -1,
  stressed: -1,
  lonely: -1,
  depressed: -2
};
const moodEmojiMap: Record<string, string> = {
  happy: '😊',
  relieved: '😌',
  neutral: '😐',
  sad: '😢',
  anxious: '😰',
  angry: '😠',
  tired: '😴',
  stressed: '😫',
  lonely: '😞',
  depressed: '💧'
};
const moodColorMap: Record<string, string> = {
  happy: '#FFFEF0',
  relieved: '#F4FBF8',
  neutral: '#FAFAFA',
  sad: '#E3F3F9',
  anxious: '#F1F2FD',
  angry: '#FDE8E8',
  tired: '#F7F7FA',
  stressed: '#FFF5FA',
  lonely: '#F6F1FB',
  depressed: '#EEEEEE'
};

const detectMood = (input: string): string => {
  const lower = input.toLowerCase();
  if (/(happy|glad|joy|grateful|cheerful|excited)/.test(lower)) return 'happy';
  if (/(sad|down|blue|depressed|unhappy|cry)/.test(lower)) return 'sad';
  if (/(angry|mad|furious|annoyed|irritated)/.test(lower)) return 'angry';
  if (/(stressed|tired|burned|overwhelmed)/.test(lower)) return 'stressed';
  if (/(anxious|worried|nervous|scared|afraid)/.test(lower)) return 'anxious';
  return 'neutral';
};

const CustomEmojiLabel = ({ x, y, value }: LabelProps) => {
  const xPos = typeof x === 'number' ? x : 0;
  const yPos = typeof y === 'number' ? y : 0;
  if (typeof value !== 'string') return null;
  return (
    <text x={xPos} y={yPos - 8} textAnchor="middle" fontSize="16" fill="#9C83D3">
      {value}
    </text>
  );
};

const botResponse = async (
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> => {
  try {
    const res = await axios.post('/api/chat', { messages: history });
    return res.data.reply as string;
  } catch (err) {
    console.error('API error:', err);
    return "Sorry, I'm having trouble understanding that right now.";
  }
};

// Hook for animated gradient background
const useAnimatedGradient = (gradient: string) => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.transition = 'background 1s ease-in-out';
    root.style.background = gradient;
    return () => {
      root.style.transition = '';
    };
  }, [gradient]);
};


export default function Home() {
  const [bgColor, setBgColor] = useState<string>('linear-gradient(to right, #ffffff, #ffffff)');
  useAnimatedGradient(bgColor);

  const [nickname] = useState('Nicole');
  const [tone, setTone] = useState<ToneType>('empathetic');
  const [moodLog, setMoodLog] = useState<MoodEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([
    { id: 'default', name: 'Day 1' }
  ]);
  const [messages, setMessages] = useState<ChatSessions>({
    default: [{ sender: 'bot', text: `How are you, ${nickname}?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
  });
  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [input, setInput] = useState('');
  const [showStats, setShowStats] = useState(false);

  const currentMessages = messages[currentSessionId] || [];

  const gradientMap: Record<string, string> = {
    happy: 'linear-gradient(to right, #FFFDE7, #FFF9C4)',
    relieved: 'linear-gradient(to right, #E8F5E9, #C8E6C9)',
    neutral: 'linear-gradient(to right, #F5F5F5, #EEEEEE)',
    sad: 'linear-gradient(to right, #E3F2FD, #BBDEFB)',
    anxious: 'linear-gradient(to right, #F3E5F5, #E1BEE7)',
    angry: 'linear-gradient(to right, #FFEBEE, #FFCDD2)',
    tired: 'linear-gradient(to right, #FAFAFA, #F0F0F0)',
    stressed: 'linear-gradient(to right, #FFF3E0, #FFE0B2)',
    lonely: 'linear-gradient(to right, #EDE7F6, #D1C4E9)',
    depressed: 'linear-gradient(to right, #F0F0F0, #E0E0E0)'
  };

  const cumulativeChartData = sessions.reduce<
    { session: string; score: number; emoji: string }[]
  >((acc, session, idx) => {
    const entries = moodLog.filter(m => m.session === session.name);
    const sessionScore = entries.reduce((sum, { mood }) => sum + (moodScoreMap[mood] || 0), 0);
    const moodCount: Record<string, number> = {};
    entries.forEach(({ mood }) => {
      moodCount[mood] = (moodCount[mood] || 0) + 1;
    });
    const dominantMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    const emoji = moodEmojiMap[dominantMood] || '❓';
    const prevScore = acc[idx - 1]?.score || 0;
    acc.push({ session: session.name, score: prevScore + sessionScore, emoji });
    return acc;
  }, []);

  const weeklyScore = moodLog.reduce((sum, entry) => sum + (moodScoreMap[entry.mood] || 0), 0);
  const weeklyMood = weeklyScore > 0 ? 'Positive 😊' : weeklyScore < 0 ? 'Negative 😞' : 'Neutral 😐';

const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newUserMsgs: Message[] = [...currentMessages, { sender: 'user', text: userText, timestamp }];
    setMessages(prev => ({ ...prev, [currentSessionId]: newUserMsgs }));

    const detectedMood = detectMood(userText);

    const moodAudioMap: Record<string, string> = {
      happy: '/happy.mp3',
      sad: '/sad.mp3',
      angry: '/angry.mp3'
    };
    const moodSound = moodAudioMap[detectedMood];
    if (moodSound) {
      const audio = new Audio(moodSound);
      audio.play();
    }

    setBgColor(gradientMap[detectedMood] || 'linear-gradient(to right, #ffffff, #ffffff)');

    const currentSessionName = sessions.find(s => s.id === currentSessionId)?.name || 'Unknown';
    const today = new Date().toISOString().split('T')[0];
    setMoodLog(prev => [...prev, { date: today, mood: detectedMood, session: currentSessionName }]);

    const history = newUserMsgs.map(m => ({ role: m.sender, content: m.text })) as { role: 'user' | 'assistant'; content: string }[];
    const replyText = await botResponse(history);
    const updatedMsgs: Message[] = [...newUserMsgs, { sender: 'bot', text: replyText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
    setMessages(prev => ({ ...prev, [currentSessionId]: updatedMsgs }));
    setInput('');
  };

  const createNewSession = () => {
    const id = uuidv4();
    const name = `Day ${sessions.length + 1}`;
    const newSession: Session = { id, name };
    setSessions(prev => [...prev, newSession]);
    setMessages(prev => ({ ...prev, [id]: [{ sender: 'bot', text: `How are you, ${nickname}?`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] }));
    setCurrentSessionId(id);
    setBgColor('linear-gradient(to right, #ffffff, #ffffff)');
  };

  return (
    <div className="min-h-screen flex text-primary transition-colors duration-1000" style={{ background: bgColor }}>
      <aside className="w-64 bg-[#D8CCF1] text-white p-6 space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="RantMe Logo" width={36} height={36} className="rounded-md" />
          <h1 className="text-2xl font-bold text-[#9C83D3]">RantMe</h1>
        </div>

        <button onClick={createNewSession} className="bg-white text-[#9C83D3] rounded-lg px-3 py-2 shadow">+ New Rant</button>
        <button onClick={() => setShowStats(!showStats)} className="bg-white text-[#9C83D3] rounded-lg px-3 py-2 shadow">📊 View Stats</button>

        <h2 className="text-sm font-semibold text-white/80">Chat History</h2>
        <ul className="space-y-2 text-sm">
          {sessions.map(session => (
            <li key={session.id} className="relative group">
              <button
                onClick={() => setCurrentSessionId(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg ${session.id === currentSessionId ? 'bg-white text-[#9C83D3]' : 'hover:bg-white/20'}`}
              >
                {session.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="p-4 flex items-center gap-3 border-b">
          <label htmlFor="tone" className="text-sm font-medium text-gray-600">Bot Tone:</label>
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

        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {currentMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'bot' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-sm px-4 py-2 rounded-lg shadow ${msg.sender === 'bot' ? 'bg-white text-gray-800' : 'bg-[#9C83D3] text-white'}`}>
                <div>{msg.text}</div>
                <div className="text-xs text-gray-500 mt-1 text-right">{msg.timestamp}</div>
              </div>
            </div>
          ))}
        </div>

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

        {showStats && (
          <div className="border-t bg-white p-4">
            <h3 className="text-lg font-semibold mb-2 text-[#9C83D3]">📊 Mood Stats by Session</h3>
            <p className="text-sm text-gray-700 mb-4">Overall Mood This Week: <span className="font-bold">{weeklyMood}</span></p>
            {moodLog.length === 0 ? (
              <p className="text-sm text-gray-500">No data recorded yet.</p>
            ) : (
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}
