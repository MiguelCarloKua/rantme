'use client';

import { useState, useEffect, FormEvent } from 'react';
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

/* ─── Types ─────────────────────────────────────────────── */
type Message = {
  sender: 'bot' | 'user';
  text: string;
  timestamp?: string;
  mood?: string;              // per‑message mood flag
};
type ChatSessions = { [sessionId: string]: Message[] };
type Session = { id: string; name: string };
type ToneType = 'empathetic' | 'motivational' | 'reflective' | 'funny';
type MoodEntry = { date: string; mood: string; session: string };
type Task = {
  id: string;
  text: string;
  date: string;               // just the day, no time
  completed: boolean;
};

/* ─── Inverse calming themes ────────────────────────────── */
const inverseTheme: Record<string, { bg: string; text: string; tint: string }> = {
  sad: {
    bg: 'linear-gradient(to bottom, #A5D6A7, #E8F5E9)', // Gentle green for emotional ease
    text: '#1B5E20',
    tint: '#A2C8A3',
  },
  angry: {
    bg: 'linear-gradient(to bottom, #64B5F6, #E3F2FD)', // Cool blue to counter intense emotion
    text: '#0D47A1',
    tint: '#90B2E3',
  },
  anxious: {
    bg: 'linear-gradient(to bottom, #FFF176, #FFFDE7)', // Light yellow to ease mental tension
    text: '#F57F17',
    tint: '#FBBF80',
  },
  stressed: {
    bg: 'linear-gradient(to bottom, #CE93D8, #F3E5F5)', // Soft purple for emotional relaxation
    text: '#4A148C',
    tint: '#B280CC',
  },
  depressed: {
    bg: 'linear-gradient(to bottom, #B0BEC5, #FFFFFF)', // Muted gray with hopeful lightness
    text: '#37474F',
    tint: '#90A4AE',
  },
  neutral: {
    bg: 'linear-gradient(to bottom, #FFFFFF, #FFFFFF)', // Clean and unbiased background
    text: '#000000',
    tint: '#FFFFFF',
  },
  happy: {
    bg: 'linear-gradient(to bottom, #4DD0E1, #E0F7FA)', // Uplifting teal with clarity
    text: '#006064',
    tint: '#4DB6AC',
  },
  relieved: {
    bg: 'linear-gradient(to bottom, #AED581, #F1F8E9)', // Fresh green for calm and closure
    text: '#33691E',
    tint: '#A5D6A7',
  },
  tired: {
    bg: 'linear-gradient(to bottom, #FFB74D, #FFF3E0)', // Warm tones to soothe exhaustion
    text: '#E65100',
    tint: '#FFB380',
  },
  lonely: {
    bg: 'linear-gradient(to bottom, #4FC3F7, #E1F5FE)', // Soft blue for social comfort
    text: '#01579B',
    tint: '#64B5F6',
  },
};

/* ─── Maps for chart only ───────────────────────────────── */
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

/* ─── Map HF→our keys ───────────────────────────────────── */
function normalizeEmotion(hfLabel: string): keyof typeof inverseTheme {
  const l = hfLabel.toLowerCase();
  switch (l) {
    case 'sadness':  return 'sad';
    case 'anger':    return 'angry';
    case 'fear':     return 'anxious';
    case 'joy':      return 'happy';
    case 'neutral':  return 'neutral';
    case 'disgust':  return 'stressed';
    case 'surprise': return 'relieved';
    default:         return 'neutral';
  }
}

/* ─── Custom chart label ────────────────────────────────── */
const CustomEmojiLabel = ({ x, y, value }: LabelProps) => {
  if (typeof x !== 'number' || typeof y !== 'number' || typeof value !== 'string') return null;
  return (
    <text x={x} y={y - 8} textAnchor="middle" fontSize="16" fill="#9C83D3">
      {value}
    </text>
  );
};

/* ─── Chat API call ─────────────────────────────────────── */
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

/* ─── Animated background hook ──────────────────────────── */
const useAnimatedGradient = (gradient: string) => {
  useEffect(() => {
    document.documentElement.style.transition = 'background 1s ease-in-out';
    document.documentElement.style.background = gradient;
  }, [gradient]);
};

/* ─── Main component ────────────────────────────────────── */
export default function Home() {
  /* Theme state */
  const [bg, setBg] = useState(inverseTheme.neutral.bg);
  const [textColor, setTextColor] = useState(inverseTheme.neutral.text);
  const [tint, setTint] = useState(inverseTheme.neutral.tint);
  const [sessionThemes, setSessionThemes] = useState<Record<string, {bg:string;text:string;tint:string}>>({
    default: inverseTheme.neutral
  });

  /* per‑session tone state */
  const [tone, setTone] = useState<ToneType>('empathetic');
  const [sessionTones, setSessionTones] = useState<Record<string, ToneType>>({
    default: 'empathetic'
  });

  /* Checklist state */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');

  useAnimatedGradient(bg);

  /* Chat state */
  const [moodLog, setMoodLog] = useState<MoodEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([{ id: 'default', name: 'Day 1' }]);
  const [messages, setMessages] = useState<ChatSessions>({
    default: [{
      sender: 'bot',
      text: 'Greetings! How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]
  });
  const [currentSessionId, setCurrentSessionId] = useState('default');
  const [input, setInput] = useState('');
  const [showStats, setShowStats] = useState(false);

  /* When switching sessions, restore theme & tone */
  useEffect(() => {
    const theme = sessionThemes[currentSessionId] || inverseTheme.neutral;
    setBg(theme.bg);
    setTextColor(theme.text);
    setTint(theme.tint);
    setTone(sessionTones[currentSessionId] || 'empathetic');
  }, [currentSessionId, sessionThemes, sessionTones]);

  const currentMessages = messages[currentSessionId] || [];

  /* Chart data: average mood per session */
  const cumulativeChartData = sessions.map(sess => {
    const entries = moodLog.filter(m => m.session === sess.name);
    const avg = entries.length
      ? entries.reduce((sum, e) => sum + (moodScoreMap[e.mood] || 0), 0) / entries.length
      : 0;
    const counts: Record<string, number> = {};
    entries.forEach(e => { counts[e.mood] = (counts[e.mood]||0) + 1; });
    const dominant = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'neutral';
    return { session: sess.name, score: parseFloat(avg.toFixed(2)), emoji: moodEmojiMap[dominant] };
  });

  /* Weekly summary */
  const weeklyScore = moodLog.reduce((s,e) => s + (moodScoreMap[e.mood]||0), 0);
  let weeklyMood: string;
  if (weeklyScore>0) weeklyMood='Positive 😊';
  else if (weeklyScore<0) weeklyMood='Negative 😞';
  else weeklyMood='Neutral 😐';

  /* ── Send message handler ─────────────────────────────── */
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

    /* 1) Detect emotion */
    let hfLabel='neutral';
    try {
      const emoRes = await axios.post('/api/emotion',{ text:userText });
      hfLabel = emoRes.data.label||'neutral';
    } catch{ console.error('Emotion API error'); }
    const norm = normalizeEmotion(hfLabel);

    /* 2) Append user message */
    const newUserMsgs: Message[] = [
      ...currentMessages,
      { sender:'user', text:userText, timestamp, mood:norm }
    ];
    setMessages(p=>({...p,[currentSessionId]:newUserMsgs}));

    /* 3) Apply theme & remember */
    const theme = inverseTheme[norm];
    setBg(theme.bg); setTextColor(theme.text); setTint(theme.tint);
    setSessionThemes(p=>({...p,[currentSessionId]:theme}));

    /* 4) Log mood entry */
    const today = new Date().toISOString().split('T')[0];
    setMoodLog(l=>[...l,{ date:today, mood:norm, session: sessions.find(s=>s.id===currentSessionId)!.name }]);

    /* 5) Build LLM history */
    const history: { role: 'user' | 'assistant'; content: string }[] = newUserMsgs.map(m => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text
    }));

    /* 6) Bot reply */
    const reply = await botResponse(history,tone);
    const updatedMsgs: Message[] = [
      ...newUserMsgs,
      {
        sender:'bot',
        text:reply,
        timestamp:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
      }
    ];
    setMessages(p=>({...p,[currentSessionId]:updatedMsgs}));
    setInput('');
  };

  /* ── Create new session ───────────────────────────────── */
  const createNewSession = () => {
    const id=uuidv4(), name=`Day ${sessions.length+1}`;
    setSessions(p=>[...p,{id,name}]);
    setMessages(p=>({...p,[id]:[{ sender:'bot', text:'Greetings! How can I help you today?', timestamp:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }]}));
    setSessionThemes(p=>({...p,[id]:inverseTheme.neutral}));
    setSessionTones(p=>({...p,[id]:'empathetic'}));
    setCurrentSessionId(id);
  };

  /* ── Add new task ─────────────────────────────────────── */
  const addTask = (e:FormEvent) => {
    e.preventDefault();
    if (!newTaskText||!newTaskDate) return;
    setTasks(t=>[...t,{ id:uuidv4(), text:newTaskText, date:newTaskDate, completed:false }]);
    setNewTaskText(''); setNewTaskDate('');
  };
  /* ── Toggle task complete ─────────────────────────────── */
  const toggleTask = (id:string) => {
    setTasks(t=>t.map(x=> x.id===id? {...x,completed:!x.completed}:x ));
  };

  return (
    <div style={{background:bg, color:textColor}} className="min-h-screen flex transition-colors duration-1000">
      {/* Sidebar */}
      <aside className="w-64 p-6 space-y-4 border-r-4 border-white"
        style={{ backgroundColor: textColor!==inverseTheme.neutral.text?tint:'#D8CCF1', color: textColor!==inverseTheme.neutral.text?textColor:'#000' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="RantMe Logo" width={36} height={36} className="rounded-md"/>
          <h1 className="text-2xl font-bold" style={{ color: textColor!==inverseTheme.neutral.text?'#fff':'#9C83D3' }}>RantMe</h1>
        </div>
        <button onClick={createNewSession}
          className="w-full text-left bg-white px-3 py-2 rounded-lg shadow"
          style={{ color: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3' }}
        >+ New Rant</button>
        <button onClick={()=>{ setShowStats(s=>!s); setShowChecklist(false); }}
          className="w-full text-left bg-white px-3 py-2 rounded-lg shadow"
          style={{ color: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3' }}
        >📊 View Stats</button>
        <button onClick={()=>{ setShowChecklist(c=>!c); setShowStats(false); }}
          className="w-full text-left bg-white px-3 py-2 rounded-lg shadow"
          style={{ color: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3' }}
        >✅ Checklist</button>
        <h2 className="text-lg font-bold text-white/80">Chat History</h2>
        <ul className="space-y-2 text-sm">
          {sessions.map(sess=>(
            <li key={sess.id}>
              <button onClick={()=>setCurrentSessionId(sess.id)}
                className={`w-full text-left px-3 py-2 rounded-lg ${sess.id===currentSessionId?'bg-white':'hover:bg-white/20'}`}
                style={{ color: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3', fontWeight: sess.id===currentSessionId?'bold':'normal' }}
              >{sess.name}</button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Tone selector */}
        <div className="p-4 flex items-center gap-3 border-b-4"
          style={{
            backgroundColor: textColor!==inverseTheme.neutral.text?tint:'#fff',
            borderColor:'#fff',
            color:textColor!==inverseTheme.neutral.text?textColor:'#000'
          }}
        >
          <label htmlFor="tone" className="text-lg font-bold"
            style={{ color: textColor!==inverseTheme.neutral.text?'#fff':'#000' }}
          >Bot Tone:</label>
          <select id="tone" value={tone}
            onChange={e=>{
              const t=e.target.value as ToneType;
              setTone(t);
              setSessionTones(p=>({...p,[currentSessionId]:t}));
            }}
            className="rounded border px-2 py-1 text-sm"
            style={{ backgroundColor:'#fff', color:'#000', border:`2px solid ${textColor}` }}
          >
            <option value="empathetic">Empathetic</option>
            <option value="motivational">Motivational</option>
            <option value="reflective">Reflective</option>
            <option value="funny">Light‑hearted</option>
          </select>
        </div>

        {/* Chat */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {currentMessages.map((msg,i)=>(
            <div key={i} className={`flex ${msg.sender==='bot'?'justify-start':'justify-end'}`}>
              <div className={`max-w-sm px-4 py-2 rounded-lg shadow ${
                msg.sender==='bot'
                  ? 'bg-white text-gray-800'
                  : /* always white for any user message */ 'bg-white text-black'
              }`}>
                <div>{msg.text}</div>
                <div className="text-xs text-gray-500 mt-1 text-right">{msg.timestamp}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t-4 border-white p-4 flex gap-2"
          style={{ backgroundColor: textColor!==inverseTheme.neutral.text?tint:'#fff' }}
        >
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),sendMessage())}
            placeholder="your rant here..."
            className="flex-1 rounded-xl p-2 text-sm focus:outline-none"
            style={{ backgroundColor:'#fff', color:'#000', border:`2px solid ${textColor}` }}
          />
          <button onClick={sendMessage}
            className="px-5 py-2 rounded-xl transition-colors duration-300 text-white"
            style={{ backgroundColor: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3', border:`2px solid ${textColor}` }}
          >Send</button>
        </div>

        {/* Stats Panel */}
        {showStats && (
          <div className="border-t bg-white p-4">
            <h3 className="text-lg font-semibold mb-2"
              style={{ color: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3' }}
            >📊 Mood Stats by Session</h3>
            <p className="text-sm text-gray-700 mb-4">
              Overall Mood: <span className="font-bold">{weeklyMood}</span>
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={cumulativeChartData}>
                <XAxis dataKey="session" padding={{ left:20, right:20 }} />
                <YAxis domain={[-2,2]} />
                <Tooltip formatter={(v:number)=>([`${v} avg pts`,'Avg Mood'])} />
                <Line type="monotone" dataKey="score" stroke="#9C83D3" strokeWidth={2}/>
                <Line
                  type="monotone"
                  dataKey="emoji"
                  stroke="#ffde59"
                  strokeWidth={0}
                  dot={{r:8,stroke:'#FF8CD1',strokeWidth:2,fill:'#fff'}}
                  label={<CustomEmojiLabel/>}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Checklist Panel */}
        {showChecklist && (
          <div className="border-t bg-white p-4">
            <h3 className="text-lg font-semibold mb-2"
              style={{ color: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3' }}
            >✅ Checklist</h3>
            <form onSubmit={addTask} className="flex flex-col gap-2 mb-4">
              <input
                type="text"
                placeholder="Task description"
                value={newTaskText}
                onChange={e=>setNewTaskText(e.target.value)}
                className="border p-2 rounded"
              />
              <input
                type="date"
                value={newTaskDate}
                onChange={e=>setNewTaskDate(e.target.value)}
                className="border p-2 rounded"
              />
              <button type="submit"
                className="self-start px-4 py-2 rounded transition-colors duration-300 text-white"
                style={{
                  backgroundColor: textColor!==inverseTheme.neutral.text?textColor:'#9C83D3',
                  border: `2px solid ${textColor}`
                }}
              >Add Task</button>
            </form>
            <ul className="space-y-2">
              {tasks.map(t => (
                <li key={t.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={t.completed} onChange={() => toggleTask(t.id)} />
                  <span className={t.completed ? "line-through text-gray-500" : ""}>
                    {t.text} <small className="text-gray-400">({new Date(t.date).toLocaleDateString()})</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}