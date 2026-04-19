/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, History, Leaf, Brain, Activity, Settings, Network, MessageSquare, AlertCircle } from 'lucide-react';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { processEcomindTurn, MemoryState, EcomindOutput, EpistemicStance } from './gemini';
import { SettingsModal } from './components/SettingsModal';
import { EcologyGraph } from './components/EcologyGraph';

const INITIAL_MEMORY: MemoryState = {
  visitor_id: '',
  long_term_themes: [],
  recurring_patterns: [],
  emotional_tones: [],
  double_binds_detected: [],
  assumptions_noted: [],
  contextual_motifs: []
};

// Default environment variable for webhook
const ENV_WEBHOOK_URL = (import.meta as any).env.VITE_SHEETS_WEBHOOK_URL;

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  epistemicStance?: EpistemicStance;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memory, setMemory] = useState<MemoryState>(INITIAL_MEMORY);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'ecology'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Visitor ID and Memory
  useEffect(() => {
    const storedId = localStorage.getItem('ecomind_visitor_id');
    const id = storedId || crypto.randomUUID();
    if (!storedId) localStorage.setItem('ecomind_visitor_id', id);
    setVisitorId(id);

    // Fetch memory from Firestore
    async function loadMemory() {
      const docRef = doc(db, 'visitors', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMemory(docSnap.data() as MemoryState);
      } else {
        setMemory({ ...INITIAL_MEMORY, visitor_id: id });
      }
    }
    loadMemory();
  }, []);

  useEffect(() => {
    if (viewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, viewMode]);

  const processMessage = async (text: string) => {
    if (!text.trim() || isLoading || !visitorId) return;

    const userMessage = text.trim();
    setInput('');
    setSuggestedPrompts([]);
    
    const newMessage: Message = { id: Date.now().toString(), role: 'user', content: userMessage };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const customKey = localStorage.getItem('ecomind_gemini_key') || undefined;
      const customWebhook = localStorage.getItem('ecomind_webhook_url') || ENV_WEBHOOK_URL;

      // 1. Process with Gemini
      const output: EcomindOutput = await processEcomindTurn(userMessage, memory, customKey);

      // 2. Update Memory in state and Firestore
      const updatedMemory = { ...output.updated_memory, updatedAt: new Date().toISOString() };
      setMemory(updatedMemory);
      await setDoc(doc(db, 'visitors', visitorId), updatedMemory);
      
      // Update contextual prompts
      if (output.suggested_prompts) {
        setSuggestedPrompts(output.suggested_prompts);
      }

      // 3. Log to internal Firestore logs
      await addDoc(collection(db, 'logs'), {
        timestamp: serverTimestamp(),
        visitor_message: userMessage,
        agent_response: output.conversational_response,
        detected_patterns: output.detected_patterns,
        ecological_reframing: output.ecological_reframing,
        level_of_learning: output.level_of_learning,
        feedback_loops_detected: output.feedback_loops_detected,
        memory_snapshot: updatedMemory
      });

      // 4. Log to Google Sheets Webhook
      if (customWebhook && customWebhook !== "https://script.google.com/macros/s/.../exec") {
        try {
          await fetch(customWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              visitor_message: userMessage,
              agent_response: output.conversational_response,
              detected_patterns: output.detected_patterns,
              ecological_reframing: output.ecological_reframing,
              level_of_learning: output.level_of_learning,
              feedback_loops_detected: output.feedback_loops_detected,
              memory_snapshot: updatedMemory
            })
          });
        } catch (webhookErr) {
          console.error("Webhook logging failed:", webhookErr);
        }
      }

      // 5. Update UI with response
      const agentMessage: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'agent', 
        content: output.conversational_response,
        epistemicStance: output.epistemic_stance
      };
      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error("Ecomind Error:", error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'agent', content: "Our ecology of thought seems momentarily clouded. Let's breathe for a moment." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    processMessage(input);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 relative">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Header */}
      <header className="w-full max-w-2xl mb-12 relative flex flex-col items-center text-center">
        <div className="absolute right-0 top-0 flex gap-2">
           <button 
             onClick={() => setViewMode(viewMode === 'chat' ? 'ecology' : 'chat')}
             className="p-2 text-organic-ink/50 hover:text-organic-ink bg-white/50 rounded-full transition-all"
           >
             {viewMode === 'chat' ? <Network className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
           </button>
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-2 text-organic-ink/50 hover:text-organic-ink bg-white/50 rounded-full transition-all"
           >
             <Settings className="w-5 h-5" />
           </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-organic-olive/10 rounded-full mb-4"
        >
          <Leaf className="w-4 h-4 text-organic-olive" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-organic-olive">Ecomind Agent</span>
        </motion.div>
        <h1 className="font-serif text-5xl sm:text-6xl text-organic-ink font-light leading-tight">
          Ecology of <span className="italic italic-small">Mind</span>
        </h1>
        <p className="mt-4 text-organic-ink/60 font-light max-w-md mx-auto text-sm sm:text-base italic">
          "The major problems in the world are the result of the difference between how nature works and the way people think."
        </p>
      </header>

      {/* Main Area */}
      <main className="w-full max-w-2xl flex-grow flex flex-col bg-white rounded-[32px] shadow-sm border border-organic-ink/5 overflow-hidden">
        
        {viewMode === 'ecology' ? (
          <div className="flex-grow p-4 min-h-[500px]">
            <h3 className="font-serif text-center text-2xl text-organic-ink/80 italic mb-2">Relational Topology</h3>
            <p className="text-center text-xs text-organic-ink/40 uppercase tracking-widest mb-6">Visualizing Your Mental Ecology</p>
            <div className="w-full h-[400px] border border-organic-ink/5 rounded-2xl bg-organic-bg/10 relative">
               <EcologyGraph memory={memory} />
            </div>
            <div className="mt-6 flex justify-center gap-4 text-xs text-organic-ink/50">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#8b8b6d]"></div>Themes</div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#A1A186]"></div>Patterns</div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#D68953]"></div>Double Binds</div>
            </div>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-8 relative">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 absolute inset-0">
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-16 h-16 bg-organic-olive/5 rounded-full flex items-center justify-center mb-6"
                >
                  <Brain className="w-8 h-8 text-organic-olive/40" />
                </motion.div>
                <h2 className="font-serif text-xl text-organic-ink/80 italic">A context is forming...</h2>
                <p className="mt-2 text-sm text-organic-ink/40 max-w-xs">
                  What relational loops are you noticing today? Share a pattern, a contradiction, or a simple observation.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] px-0 py-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <p className={`text-base sm:text-lg leading-relaxed ${m.role === 'agent' ? 'font-serif italic' : 'font-sans'}`}>
                      {m.content}
                    </p>
                  </div>
                  
                  {/* Epistemic Humility Indicator */}
                  {m.role === 'agent' && m.epistemicStance && (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-organic-olive/5 rounded-full text-xs text-organic-olive/70 italic"
                      style={{ opacity: 0.5 + (0.5 * (1 - m.epistemicStance.confidence)) }} // Higher uncertainty = higher opacity of the indicator
                    >
                      <AlertCircle className="w-3 h-3" />
                      {m.epistemicStance.subtle_indicator_text}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start pt-4"
              >
                <div className="flex gap-1.5 items-center">
                  <span className="w-1 h-1 bg-organic-olive/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-organic-olive/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-organic-olive/40 rounded-full animate-bounce"></span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Persistent Memory Stats (Subtle) */}
        {viewMode === 'chat' && memory.long_term_themes.length > 0 && (
          <div className="px-6 py-3 bg-organic-bg/50 border-t border-organic-ink/5 flex items-center gap-4 overflow-x-auto no-scrollbar">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-organic-olive/60 whitespace-nowrap">
              <History className="w-3 h-3" /> Ecology:
            </span>
            {memory.long_term_themes.slice(-3).map((theme, i) => (
              <span key={i} className="text-[10px] text-organic-ink/40 whitespace-nowrap bg-white/50 px-2 py-0.5 rounded-full border border-organic-ink/5 shadow-sm">
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Input Area (Only in Chat Mode) */}
        {viewMode === 'chat' && (
          <div className="bg-white border-t border-organic-ink/5">
            {/* Suggested Contextual Prompts */}
            {suggestedPrompts.length > 0 && !isLoading && (
               <div className="px-4 pt-3 flex flex-col gap-2">
                 <span className="text-[10px] uppercase tracking-wider text-organic-ink/40 ml-2">Potential Inquiries:</span>
                 <div className="flex flex-wrap gap-2">
                   {suggestedPrompts.slice(0, 2).map((prompt, i) => (
                     <button
                       key={i}
                       onClick={() => processMessage(prompt)}
                       className="text-left text-xs bg-organic-olive/5 hover:bg-organic-olive/10 text-organic-ink/80 rounded-2xl px-4 py-2 border border-organic-olive/10 transition-colors"
                     >
                       "{prompt}"
                     </button>
                   ))}
                 </div>
               </div>
            )}
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Observation or inquiry..."
                  className="w-full bg-organic-bg/30 border-none rounded-2xl py-4 pl-6 pr-14 focus:ring-1 focus:ring-organic-olive/20 transition-all placeholder:text-organic-ink/20 text-organic-ink"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 p-2 text-organic-olive hover:text-organic-olive/70 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer Details */}
      <footer className="mt-8 text-[10px] uppercase tracking-[0.2em] text-organic-ink/30 flex flex-wrap justify-center items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3" />
          <span>Epistemic Humility Engaged</span>
        </div>
        <div className="flex items-center gap-2">
          <Leaf className="w-3 h-3" />
          <span>Relational Mapping Active</span>
        </div>
      </footer>
    </div>
  );
}

