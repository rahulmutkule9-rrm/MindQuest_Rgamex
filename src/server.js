import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: false } });
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '256kb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'mindquest-arena', time: new Date().toISOString() }));

const QUESTION_BANK = {
  Paradoxes: [
    { q: 'A ship has every plank replaced over time. Is it still the same ship?', options: ['Yes, identity follows continuity', 'No, identity follows original matter', 'Both can be defensible', 'The question has no meaningful answer'], answer: 2, tags: ['identity','continuity'], difficulty: 'Adept' },
    { q: 'A rule says: “Break this rule.” What is the most useful first move?', options: ['Break it immediately', 'Treat the instruction as self-referential', 'Ignore the rule', 'Ask another rule to decide'], answer: 1, tags: ['logic','self-reference'], difficulty: 'Grandmaster' },
    { q: 'A perfectly fair coin lands heads ten times. What changes about the next toss?', options: ['Heads becomes less likely', 'Tails becomes more likely', 'Nothing about the physical probability', 'The coin must be biased'], answer: 2, tags: ['probability','independence'], difficulty: 'Apprentice' }
  ],
  'AI Ethics': [
    { q: 'An AI model is accurate overall but systematically misses one subgroup. What should happen first?', options: ['Deploy anyway', 'Measure subgroup performance and investigate causes', 'Delete the model', 'Hide the subgroup metric'], answer: 1, tags: ['fairness','evaluation'], difficulty: 'Adept' },
    { q: 'An automated system can explain a decision but the explanation is known to be misleading. What matters?', options: ['Explanation exists', 'Explanation is faithful and useful', 'The UI looks transparent', 'The model is fast'], answer: 1, tags: ['transparency','accountability'], difficulty: 'Grandmaster' },
    { q: 'Who should own responsibility for a high-impact AI decision?', options: ['Only the model', 'Only the end user', 'A defined human governance chain', 'Nobody'], answer: 2, tags: ['governance','accountability'], difficulty: 'Apprentice' }
  ],
  'Game Theory': [
    { q: 'Two players can cooperate for a better joint outcome, but each has a short-term incentive to defect. This resembles:', options: ['Prisoner’s dilemma', 'Binary search', 'Bayes theorem', 'A sorting network'], answer: 0, tags: ['strategy','cooperation'], difficulty: 'Apprentice' },
    { q: 'In a repeated interaction, what can sustain cooperation?', options: ['No memory', 'Future consequences', 'Random typing', 'Removing all choices'], answer: 1, tags: ['repeated games','incentives'], difficulty: 'Adept' },
    { q: 'A Nash equilibrium describes a situation where:', options: ['Everyone gets the maximum possible payoff', 'No player gains by changing strategy alone', 'Players always cooperate', 'The game ends immediately'], answer: 1, tags: ['equilibrium','strategy'], difficulty: 'Adept' }
  ],
  'Cybernetic Dilemmas': [
    { q: 'A feedback system amplifies every small error. What is the first engineering concern?', options: ['Positive feedback instability', 'UI color', 'File naming', 'Keyboard layout'], answer: 0, tags: ['feedback','stability'], difficulty: 'Adept' },
    { q: 'An autonomous system optimizes one metric and harms the broader goal. This is closest to:', options: ['Specification gaming', 'Compression', 'Caching', 'Encryption'], answer: 0, tags: ['alignment','optimization'], difficulty: 'Grandmaster' },
    { q: 'A safe control loop should generally react to noisy measurements by:', options: ['Ignoring all data', 'Using filtering/robust control', 'Increasing noise', 'Removing feedback'], answer: 1, tags: ['control','robustness'], difficulty: 'Apprentice' }
  ],
  'General Knowledge': [
    { q: 'Which planet has the largest number of moons currently recognized?', options: ['Earth', 'Jupiter', 'Mars', 'Venus'], answer: 1, tags: ['space'], difficulty: 'Apprentice' },
    { q: 'Which data structure uses FIFO ordering?', options: ['Stack', 'Queue', 'Heap', 'Tree'], answer: 1, tags: ['computing'], difficulty: 'Apprentice' },
    { q: 'What does CPU stand for?', options: ['Central Processing Unit', 'Core Program Utility', 'Computer Primary Unit', 'Central Program User'], answer: 0, tags: ['computing'], difficulty: 'Apprentice' }
  ],
  Cricket: [
    { q: 'How many legal balls are normally bowled in one over in cricket?', options: ['4', '5', '6', '8'], answer: 2, tags: ['rules'], difficulty: 'Apprentice' },
    { q: 'What is a score of zero by a batter called?', options: ['Duck', 'Goose', 'Blank', 'Nil'], answer: 0, tags: ['terminology'], difficulty: 'Apprentice' },
    { q: 'LBW stands for:', options: ['Leg Before Wicket', 'Left Bat Wide', 'Long Ball Win', 'Leg Behind Wicket'], answer: 0, tags: ['rules'], difficulty: 'Apprentice' }
  ],
  Movies: [
    { q: 'What is a screenplay primarily used for?', options: ['Guiding a film production', 'Mixing audio only', 'Selling tickets', 'Designing cinema seats'], answer: 0, tags: ['film'], difficulty: 'Apprentice' },
    { q: 'A film’s editing mainly controls:', options: ['Shot order and pacing', 'Camera battery chemistry', 'Theater rent', 'Actor contracts'], answer: 0, tags: ['editing'], difficulty: 'Adept' },
    { q: 'A montage is commonly used to:', options: ['Compress or connect a sequence of events', 'Stop all sound', 'Remove the cast', 'Change the projector'], answer: 0, tags: ['cinema','editing'], difficulty: 'Adept' }
  ],
  Science: [
    { q: 'What is the basic unit of life?', options: ['Atom', 'Cell', 'Tissue', 'Organ'], answer: 1, tags: ['biology'], difficulty: 'Apprentice' },
    { q: 'What force attracts masses toward one another?', options: ['Gravity', 'Friction', 'Buoyancy', 'Voltage'], answer: 0, tags: ['physics'], difficulty: 'Apprentice' },
    { q: 'DNA primarily stores:', options: ['Hereditary information', 'Heat', 'Sound', 'Electric current'], answer: 0, tags: ['biology'], difficulty: 'Apprentice' }
  ],
  Technology: [
    { q: 'What does API commonly mean in software?', options: ['Application Programming Interface', 'Automated Program Index', 'Application Process Input', 'Advanced Protocol Internet'], answer: 0, tags: ['software'], difficulty: 'Apprentice' },
    { q: 'Which protocol is commonly used for secure web traffic?', options: ['HTTP', 'HTTPS', 'FTP', 'SMTP'], answer: 1, tags: ['web','security'], difficulty: 'Apprentice' },
    { q: 'A hash function is commonly used to:', options: ['Map data to a fixed-size digest', 'Render a video', 'Increase screen brightness', 'Compress every file losslessly'], answer: 0, tags: ['security'], difficulty: 'Adept' }
  ],
  History: [
    { q: 'A primary historical source is:', options: ['A firsthand document or artifact', 'A modern opinion post', 'A random prediction', 'A fictional story'], answer: 0, tags: ['method'], difficulty: 'Apprentice' },
    { q: 'Archaeology primarily studies the past through:', options: ['Material remains', 'Stock prices', 'Weather forecasts', 'Future simulations'], answer: 0, tags: ['archaeology'], difficulty: 'Apprentice' },
    { q: 'Why do historians compare multiple sources?', options: ['To test claims and context', 'To make every source identical', 'To avoid evidence', 'To remove uncertainty completely'], answer: 0, tags: ['historical method'], difficulty: 'Adept' }
  ],
  Love: [
    { q: 'Which action is most likely to strengthen a healthy relationship?', options: ['Honest communication and mutual respect', 'Avoiding every difficult conversation', 'Always agreeing with each other', 'Keeping all feelings secret'], answer: 0, tags: ['relationships','communication'], difficulty: 'Apprentice' },
    { q: 'What is a useful way to handle a disagreement with someone you care about?', options: ['Listen to understand before responding', 'Try to win at any cost', 'Ignore the other person completely', 'Use personal attacks'], answer: 0, tags: ['conflict','empathy'], difficulty: 'Adept' },
    { q: 'Which best describes trust in a relationship?', options: ['It can grow through consistent, reliable actions', 'It requires never setting boundaries', 'It means sharing every private detail', 'It cannot change over time'], answer: 0, tags: ['trust','boundaries'], difficulty: 'Adept' },
    { q: 'Which is a healthy sign when two people have different opinions?', options: ['They can disagree while respecting each other', 'One person must always surrender', 'They avoid speaking honestly', 'They compete to embarrass each other'], answer: 0, tags: ['respect','communication'], difficulty: 'Apprentice' },
    { q: 'Why can empathy improve a relationship?', options: ['It helps people understand another person’s feelings and perspective', 'It guarantees both people will always agree', 'It removes the need for communication', 'It prevents people from having boundaries'], answer: 0, tags: ['empathy','perspective'], difficulty: 'Grandmaster' }
  ],
  Music: [
    { q: 'Tempo refers to:', options: ['Speed of the beat', 'Loudness only', 'Instrument material', 'Song length only'], answer: 0, tags: ['music theory'], difficulty: 'Apprentice' },
    { q: 'Harmony generally concerns:', options: ['Notes sounding together', 'Only drum volume', 'Lyrics spelling', 'Album artwork'], answer: 0, tags: ['music theory'], difficulty: 'Adept' },
    { q: 'Rhythm is primarily about:', options: ['Pattern of durations and beats', 'Pitch only', 'Recording hardware', 'Stage lighting'], answer: 0, tags: ['music theory'], difficulty: 'Apprentice' }
  ]
};

const rooms = new Map();
const profiles = new Map();
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) : null;

function roomCode() { let c; do c = Math.random().toString(36).slice(2, 8).toUpperCase(); while (rooms.has(c)); return c; }
function safeName(name) { return String(name || 'Player').trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 18) || 'Player'; }
function xpForDifficulty(d) { return d === 'Grandmaster' ? 300 : d === 'Adept' ? 180 : 80; }
function levelFromXP(xp) { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1); }
function titleForLevel(l) { return l >= 20 ? 'Grandmaster Dialectic' : l >= 12 ? 'Senior Dialectician' : l >= 7 ? 'Master Reasoner' : l >= 4 ? 'Logic Adept' : 'Novice Inquirer'; }
function pickQuestion(topic, used = [], difficulty = null) {
  const pool = QUESTION_BANK[topic] || QUESTION_BANK['General Knowledge'];
  const fresh = pool.map((q,i)=>({q,i})).filter(x => !used.includes(x.i));
  const candidates = fresh.length ? fresh : pool.map((q,i)=>({q,i}));
  const filtered = difficulty ? candidates.filter(x => x.q.difficulty === difficulty) : candidates;
  const list = filtered.length ? filtered : candidates;
  return list[Math.floor(Math.random() * list.length)];
}
function publicRoom(r) { return { code:r.code, hostId:r.hostId, topic:r.topic, state:r.state, round:r.round, totalRounds:r.totalRounds, question:r.question ? { q:r.question.q, options:r.question.options, tags:r.question.tags, difficulty:r.question.difficulty } : null, players:[...r.players.values()].map(p=>({id:p.id,name:p.name,ready:p.ready,score:p.score,online:p.online}))}; }
function broadcast(r) { io.to(r.code).emit('room:update', publicRoom(r)); }

async function aiJson(prompt, mode='fast') {
  if (!ai) return null;
  const model = mode === 'high' ? 'gemini-3.1-pro-preview' : 'gemini-3.8-flash';
  const config = mode === 'high' ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }, responseMimeType: 'application/json' } : { responseMimeType: 'application/json' };
  const res = await ai.models.generateContent({ model, contents: prompt, config });
  const text = res.text || '{}';
  try { return JSON.parse(text); } catch { return null; }
}

app.post('/api/ai/generate', async (req,res) => {
  const { topic='General Knowledge', difficulty='Adept', count=3 } = req.body || {};
  if (!ai) return res.json({ source:'built-in', questions:[] });
  try {
    const data = await aiJson(`Generate ${Math.min(5,Math.max(1,count))} original multiple-choice cognitive quiz questions about ${topic}. Difficulty ${difficulty}. Return JSON {questions:[{q:string,options:[string,string,string,string],answer:number,tags:string[],difficulty:string}]} with exactly one correct answer. No politics persuasion; keep factual and game-safe.`, 'high');
    res.json({ source:'gemini', ...(data || {questions:[]}) });
  } catch (e) { res.status(200).json({ source:'fallback', questions:[], warning:'AI unavailable; built-in bank remains active.' }); }
});

app.post('/api/ai/evaluate', async (req,res) => {
  const { challenge, answer, topic } = req.body || {};
  if (!ai) return res.json({ source:'local', scores:{logic:72,novelty:68,nuance:70,rhetoric:65,speed:74}, verdict:'Solid reasoning. Identify one assumption and test its consequence.', critique:'Your response addresses the core problem. Add a concrete trade-off to strengthen it.' });
  try {
    const data = await aiJson(`Evaluate a player's response to a cognitive challenge. Topic: ${topic}. Challenge: ${challenge}. Player response: ${answer}. Return JSON only: {scores:{logic:0-100,novelty:0-100,nuance:0-100,rhetoric:0-100,speed:0-100},verdict:string,critique:string,fallacies:[string]}. Do not reveal hidden chain-of-thought; provide concise evidence-based feedback.`, 'high');
    res.json({ source:'gemini', ...data });
  } catch { res.json({ source:'fallback', scores:{logic:70,novelty:65,nuance:68,rhetoric:66,speed:70}, verdict:'Reasonable argument with room for deeper trade-off analysis.', critique:'Consider the strongest counterargument before finalizing your claim.', fallacies:[] }); }
});

app.use(express.static(path.join(root, 'dist')));
app.get('*', (req,res) => { if (req.path.startsWith('/socket.io')) return res.status(404).end(); res.sendFile(path.join(root,'dist','index.html')); });

io.on('connection', socket => {
  socket.on('profile:save', ({name}) => {
    const n=safeName(name); const p=profiles.get(socket.id) || {xp:0,streak:1,badges:[],radar:{logic:60,novelty:60,nuance:60,rhetoric:60,speed:60}}; p.name=n; profiles.set(socket.id,p); socket.emit('profile', {...p,level:levelFromXP(p.xp),title:titleForLevel(levelFromXP(p.xp)),multiplier:Math.min(1.5,1+Math.max(0,p.streak-1)*0.05)});
  });
  socket.on('room:create', ({name,topic}) => { const code=roomCode(); const p={id:socket.id,name:safeName(name),ready:false,score:0,online:true}; const r={code,hostId:socket.id,topic:QUESTION_BANK[topic]?topic:'General Knowledge',state:'LOBBY',round:0,totalRounds:5,question:null,used:[],players:new Map([[socket.id,p]]),answers:new Map(),startedAt:0}; rooms.set(code,r); socket.join(code); socket.data.room=code; broadcast(r); });
  socket.on('room:join', ({code,name}) => { const r=rooms.get(String(code||'').trim().toUpperCase()); if(!r) return socket.emit('error:toast','Room not found.'); if(r.state!=='LOBBY') return socket.emit('error:toast','Game already started.'); if(r.players.size>=8) return socket.emit('error:toast','Room is full.'); const base=safeName(name); const used=[...r.players.values()].map(p=>p.name.toLowerCase()); let final=base, i=2; while(used.includes(final.toLowerCase())) final=`${base} #${i++}`; const p={id:socket.id,name:final,ready:false,score:0,online:true}; r.players.set(socket.id,p); socket.join(r.code); socket.data.room=r.code; broadcast(r); socket.emit('room:joined',r.code); });
  socket.on('room:topic', topic => { const r=rooms.get(socket.data.room); if(!r) return; if(r.hostId!==socket.id){ socket.emit('error:toast','Only the host can select the topic.'); return; } if(r.state!=='LOBBY'){ socket.emit('error:toast','Topic can only be changed in the lobby.'); return; } if(!QUESTION_BANK[topic]){ socket.emit('error:toast','Invalid topic.'); return; } r.topic=topic; broadcast(r); });
  socket.on('room:ready', () => { const r=rooms.get(socket.data.room); if(!r||r.state!=='LOBBY') return; const p=r.players.get(socket.id); if(!p) return; p.ready=!p.ready; broadcast(r); });
  socket.on('room:start', () => { const r=rooms.get(socket.data.room); if(!r||r.hostId!==socket.id||r.state!=='LOBBY') return; if(r.players.size<1) return; r.state='IN_GAME'; r.round=1; r.used=[]; r.answers=new Map(); r.question=nextQ(r); io.to(r.code).emit('round:started',{round:r.round}); broadcast(r); });
  socket.on('answer', ({choice}) => { const r=rooms.get(socket.data.room); if(!r||r.state!=='IN_GAME'||!r.question) return; if(r.answers.has(socket.id)) return; const c=Number(choice); if(!Number.isInteger(c)||c<0||c>3) return; r.answers.set(socket.id,c); const p=r.players.get(socket.id); let gained=0; if(p && c===r.question.answer){ gained=xpForDifficulty(r.question.difficulty); p.score += gained; const prof=profiles.get(socket.id) || {name:p.name,xp:0,streak:1,badges:[],radar:{logic:60,novelty:60,nuance:60,rhetoric:60,speed:60}}; const before=levelFromXP(prof.xp); prof.xp += gained; prof.name=p.name; profiles.set(socket.id,prof); const after=levelFromXP(prof.xp); io.to(socket.id).emit('profile',{...prof,level:after,title:titleForLevel(after),multiplier:Math.min(1.5,1+Math.max(0,prof.streak-1)*0.05),levelUp:after>before}); } io.to(socket.id).emit('answer:ack',{correct:c===r.question.answer,correctAnswer:r.question.answer,score:p?.score||0,gained}); if(r.answers.size===r.players.size) finishRound(r); else broadcast(r); });
  socket.on('debate:evaluate', async ({challenge,answer,topic}) => { try { const data=await evaluateLocalOrAI(challenge,answer,topic); socket.emit('debate:result',data); } catch { socket.emit('debate:result',{verdict:'Evaluation unavailable',scores:{logic:60,novelty:60,nuance:60,rhetoric:60,speed:60},critique:'Try again.'}); } });
  socket.on('disconnect', () => {
    const code=socket.data.room;
    const r=rooms.get(code);
    if(!r) return;
    r.players.delete(socket.id);
    r.answers.delete(socket.id);
    if(r.hostId===socket.id) r.hostId=r.players.keys().next().value;
    if(r.players.size===0){ rooms.delete(code); return; }
    broadcast(r);
    if(r.state==='IN_GAME' && r.answers.size===r.players.size) finishRound(r);
  });
});
function nextQ(r){ if(r.used.length >= (QUESTION_BANK[r.topic]||QUESTION_BANK['General Knowledge']).length) r.used=[]; const pick=pickQuestion(r.topic,r.used); r.used.push(pick.i); return pick.q; }
function finishRound(r){ r.state='ROUND_OVER'; broadcast(r); setTimeout(()=>{ if(!rooms.has(r.code))return; if(r.round>=r.totalRounds){ r.state='GAME_OVER'; broadcast(r); return; } r.round++; r.state='IN_GAME'; r.answers=new Map(); r.question=nextQ(r); io.to(r.code).emit('round:started',{round:r.round}); broadcast(r); },2500); }
async function evaluateLocalOrAI(challenge,answer,topic){ if(!ai) return {source:'local',scores:{logic:72,novelty:68,nuance:70,rhetoric:65,speed:74},verdict:'Solid reasoning. Add one counterargument and test it.',critique:'Your answer addresses the main issue. Make the trade-off explicit.',fallacies:[]}; const data=await aiJson(`Evaluate this response. Topic ${topic}. Challenge ${challenge}. Response ${answer}. Return JSON with scores logic,novelty,nuance,rhetoric,speed 0-100, verdict, critique, fallacies. Do not reveal chain-of-thought.`, 'high'); return data || {scores:{logic:70,novelty:65,nuance:68,rhetoric:66,speed:70},verdict:'Solid response.',critique:'Consider a counterargument.',fallacies:[]}; }

server.listen(PORT, '0.0.0.0', () => console.log(`MindQuest Arena running on port ${PORT}`));
