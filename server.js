const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const RECORDINGS_DIR = path.join(DATA_DIR, 'recordings');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const VOCABULARY_FILE = path.join(DATA_DIR, 'vocabulary.json');
const MISTAKES_FILE = path.join(DATA_DIR, 'mistakes.json');
const RECORDINGS_FILE = path.join(DATA_DIR, 'recordings.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8'
};

const scenarios = [
  {
    id: 'a2-self-introduction',
    level: 'A2',
    category: 'Interview',
    industry: 'general',
    focus: 'Simple interview introduction',
    topic: 'Basic self introduction',
    role: 'Interviewer',
    situation: 'You are in a short screening interview. The interviewer wants a simple and clear introduction.',
    userTask: 'Introduce your background, current work, and one reason you want the role.',
    openingLine: 'Thanks for joining today. Could you briefly introduce yourself?',
    prompt: 'The interviewer asks you to briefly introduce yourself.',
    sentenceFrame: 'My name is ..., I work as ..., and I am interested in ...',
    successGoal: 'Give a clear 30-second introduction with one work detail.',
    phraseBank: ['I work as...', 'My main responsibility is...', 'I am interested in...', 'Thank you for the opportunity.']
  },
  {
    id: 'b1-job-strengths',
    level: 'B1',
    category: 'Interview',
    industry: 'general',
    focus: 'Interview strengths',
    topic: 'Explaining your strengths',
    role: 'Interviewer',
    situation: 'You are applying for an international role. The interviewer wants practical examples.',
    userTask: 'Explain two strengths and support one of them with a short example.',
    openingLine: 'What strengths do you think you can bring to this position?',
    prompt: 'The interviewer asks about your strengths.',
    sentenceFrame: 'One strength I can bring is ..., for example ...',
    successGoal: 'Give at least one specific example and avoid generic claims.',
    phraseBank: ['One strength I can bring is...', 'A specific example is...', 'I learned how to...', 'This helped the team...']
  },
  {
    id: 'b2-engineering-interview',
    level: 'B2',
    category: 'Interview',
    industry: 'mechanical-engineering',
    focus: 'Engineering interview confidence',
    topic: 'Mechanical engineer interview',
    role: 'Engineering manager',
    situation: 'You are interviewing for a mechanical engineering role with an international team.',
    userTask: 'Explain your engineering experience, project role, and one technical achievement.',
    openingLine: 'Could you walk me through your mechanical engineering experience and one project you are proud of?',
    prompt: 'The engineering manager asks about your mechanical engineering experience.',
    sentenceFrame: 'In my previous project, I was responsible for ..., and the result was ...',
    successGoal: 'Connect your technical work to measurable project value.',
    phraseBank: ['I was responsible for...', 'The key challenge was...', 'We improved...', 'The result was...']
  },
  {
    id: 'c1-leadership-interview',
    level: 'C1',
    category: 'Interview',
    industry: 'mechanical-engineering',
    focus: 'Senior engineer interview',
    topic: 'Leading engineering decisions',
    role: 'Technical director',
    situation: 'You are interviewing for a senior engineer role. The director wants to test judgment and communication.',
    userTask: 'Discuss a difficult technical decision, trade-offs, and how you aligned stakeholders.',
    openingLine: 'Tell me about a time you had to make a difficult technical decision with incomplete information.',
    prompt: 'The technical director asks about a difficult technical decision.',
    sentenceFrame: 'The trade-off was between ..., so I decided to ... because ...',
    successGoal: 'Explain trade-offs, risk control, and stakeholder communication.',
    phraseBank: ['The trade-off was...', 'Based on the available data...', 'I aligned the team by...', 'The risk was mitigated by...']
  },
  {
    id: 'a2-hotel-check-in',
    level: 'A2',
    category: 'Travel',
    industry: 'general',
    focus: 'Travel service basics',
    topic: 'Hotel check-in',
    role: 'Hotel front desk',
    situation: 'You arrive at a hotel and need to check in, ask about breakfast, and confirm your room.',
    userTask: 'Check in politely, provide booking details, and ask one service question.',
    openingLine: 'Good evening. Welcome to our hotel. Do you have a reservation with us?',
    prompt: 'The hotel front desk asks whether you have a reservation.',
    sentenceFrame: 'Yes, I have a reservation under the name ..., and I would like to ask about ...',
    successGoal: 'Complete check-in and ask one clear question.',
    phraseBank: ['I have a reservation under...', 'Could I ask about...', 'Is breakfast included?', 'Thank you for your help.']
  },
  {
    id: 'a2-airport-check-in',
    level: 'A2',
    category: 'Travel',
    industry: 'general',
    focus: 'Airport check-in',
    topic: 'Airport check-in',
    role: 'Airport staff',
    situation: 'You are at the airport. You need to show your passport and ask about baggage.',
    userTask: 'Provide travel documents, ask about baggage, and confirm the gate.',
    openingLine: 'Good morning. May I see your passport and booking reference, please?',
    prompt: 'The airport staff asks for your passport and booking reference.',
    sentenceFrame: 'Sure, here is my passport. May I ask about ...',
    successGoal: 'Confirm baggage and the next step before ending the scene.',
    phraseBank: ['Here is my passport.', 'May I ask about my baggage?', 'Which gate should I go to?', 'Could you confirm the boarding time?']
  },
  {
    id: 'b1-travel-delay',
    level: 'B1',
    category: 'Travel',
    industry: 'general',
    focus: 'Travel problem solving',
    topic: 'Flight delay',
    role: 'Airline service agent',
    situation: 'Your flight is delayed and you need to understand the new schedule and your options.',
    userTask: 'Ask what happened, confirm the new time, and ask about compensation or next steps.',
    openingLine: 'I am sorry, but your flight has been delayed. How can I help you?',
    prompt: 'The airline agent tells you your flight is delayed.',
    sentenceFrame: 'Could you tell me the new departure time and what options I have?',
    successGoal: 'Ask practical questions calmly and confirm what you should do next.',
    phraseBank: ['Could you tell me...', 'What options do I have?', 'Is there any compensation?', 'What should I do next?']
  },
  {
    id: 'b2-business-trip',
    level: 'B2',
    category: 'Travel',
    industry: 'mechanical-engineering',
    focus: 'Business travel for engineers',
    topic: 'Factory visit travel',
    role: 'Local coordinator',
    situation: 'You are traveling to visit a supplier factory and need to coordinate pickup, safety rules, and schedule.',
    userTask: 'Confirm transportation, agenda, PPE requirements, and meeting time.',
    openingLine: 'Welcome. Before your factory visit tomorrow, could we confirm the schedule and safety requirements?',
    prompt: 'The coordinator wants to confirm your factory visit plan.',
    sentenceFrame: 'Could we confirm the agenda, pickup time, and PPE requirements?',
    successGoal: 'Confirm logistics and show professional preparation.',
    phraseBank: ['Could we confirm the agenda?', 'What PPE is required?', 'Who will pick me up?', 'I will arrive at...']
  },
  {
    id: 'a2-mexico-shopping',
    level: 'A2',
    category: 'Mexico daily life',
    industry: 'general',
    focus: 'Daily life basics in Mexico',
    topic: 'Shopping in Mexico',
    role: 'Store clerk',
    situation: 'You are buying daily items in Mexico and need to ask about price, size, and payment.',
    userTask: 'Ask for the item, confirm price, and ask whether card payment is accepted.',
    openingLine: 'Hi, can I help you find anything today?',
    prompt: 'The store clerk asks if you need help.',
    sentenceFrame: 'Yes, I am looking for ..., and I would like to know ...',
    successGoal: 'Complete a simple daily purchase politely.',
    phraseBank: ['I am looking for...', 'How much is it?', 'Can I pay by card?', 'That is all, thank you.']
  },
  {
    id: 'b1-mexico-small-talk',
    level: 'B1',
    category: 'Mexico daily life',
    industry: 'general',
    focus: 'Small talk in Mexico',
    topic: 'Talking with a neighbor',
    role: 'Neighbor',
    situation: 'You meet a neighbor in Mexico and make friendly small talk about life, language learning, and work.',
    userTask: 'Introduce your routine, talk about language learning, and ask a natural question.',
    openingLine: 'Hey, I see you around here often. How are you finding life in Mexico?',
    prompt: 'Your neighbor asks how life in Mexico is going.',
    sentenceFrame: 'Life here has been ..., because ...',
    successGoal: 'Keep a friendly conversation going for several turns.',
    phraseBank: ['Life here has been...', 'I am still getting used to...', 'I am learning Spanish because...', 'How about you?']
  },
  {
    id: 'b2-mexico-work-life',
    level: 'B2',
    category: 'Mexico daily life',
    industry: 'general',
    focus: 'Explaining cross-cultural work life',
    topic: 'Working in Mexico',
    role: 'Foreign coworker',
    situation: 'A foreign coworker asks about your experience working and living in Mexico as a Chinese professional.',
    userTask: 'Compare work culture, daily life, and language challenges with balanced examples.',
    openingLine: 'What has been the biggest adjustment for you while working in Mexico?',
    prompt: 'A coworker asks about your biggest adjustment in Mexico.',
    sentenceFrame: 'The biggest adjustment has been ..., but I have learned to ...',
    successGoal: 'Give a balanced answer with one concrete example.',
    phraseBank: ['The biggest adjustment has been...', 'Compared with China...', 'I have learned to...', 'One example is...']
  },
  {
    id: 'a2-work-update',
    level: 'A2',
    category: 'Workplace',
    industry: 'general',
    focus: 'Simple work update',
    topic: 'Daily work update',
    role: 'Foreign coworker',
    situation: 'A coworker asks what you are working on today.',
    userTask: 'Give a short update about your task, status, and next step.',
    openingLine: 'Hey, what are you working on today?',
    prompt: 'A coworker asks what you are working on today.',
    sentenceFrame: 'Today I am working on ..., and the next step is ...',
    successGoal: 'Give a clear and short work update.',
    phraseBank: ['I am working on...', 'The current status is...', 'The next step is...', 'I will update you later.']
  },
  {
    id: 'b1-meeting-update',
    level: 'B1',
    category: 'Workplace',
    industry: 'general',
    focus: 'Meeting participation',
    topic: 'Project meeting update',
    role: 'Project manager',
    situation: 'You are in a project meeting and need to report progress, blockers, and next steps.',
    userTask: 'Summarize progress, mention one blocker, and propose a next step.',
    openingLine: 'Could you give us a quick update on your part of the project?',
    prompt: 'The project manager asks for your project update.',
    sentenceFrame: 'So far, we have completed ..., but we still need to ...',
    successGoal: 'Sound organized and action-oriented.',
    phraseBank: ['So far, we have completed...', 'The main blocker is...', 'The next step is...', 'I need support with...']
  },
  {
    id: 'b2-cross-team-alignment',
    level: 'B2',
    category: 'Workplace',
    industry: 'general',
    focus: 'Cross-team communication',
    topic: 'Aligning with another team',
    role: 'Team lead',
    situation: 'Another team depends on your work. You need to align expectations and timeline.',
    userTask: 'Explain current progress, clarify dependency, and agree on next steps.',
    openingLine: 'We need to understand when your team can deliver the input we need. Could you clarify the timeline?',
    prompt: 'A team lead asks you to clarify the timeline.',
    sentenceFrame: 'Our current timeline is ..., but it depends on ...',
    successGoal: 'Clarify timeline and prevent misunderstanding.',
    phraseBank: ['Our current timeline is...', 'It depends on...', 'To avoid misunderstanding...', 'Let us align on...']
  },
  {
    id: 'c1-conflict-resolution',
    level: 'C1',
    category: 'Workplace',
    industry: 'general',
    focus: 'Professional disagreement',
    topic: 'Handling disagreement',
    role: 'Department manager',
    situation: 'You disagree with a proposed plan and need to explain your concerns professionally.',
    userTask: 'Acknowledge the other view, explain risks, and propose a constructive alternative.',
    openingLine: 'I understand you have concerns about this plan. Could you explain your position?',
    prompt: 'The manager asks you to explain your concerns about the plan.',
    sentenceFrame: 'I understand the intention, but my concern is ...',
    successGoal: 'Disagree diplomatically and propose a practical alternative.',
    phraseBank: ['I understand the intention...', 'My concern is...', 'The potential risk is...', 'An alternative could be...']
  },
  {
    id: 'a2-customer-greeting',
    level: 'A2',
    category: 'Customer communication',
    industry: 'general',
    focus: 'Customer greeting',
    topic: 'First customer call',
    role: 'Customer',
    situation: 'You join a short customer call and need to greet the customer and state your role.',
    userTask: 'Introduce yourself, say your role, and confirm the purpose of the call.',
    openingLine: 'Hello, nice to meet you. Could you introduce yourself before we begin?',
    prompt: 'The customer asks you to introduce yourself.',
    sentenceFrame: 'Nice to meet you. I am ..., and I am responsible for ...',
    successGoal: 'Start the call politely and clearly.',
    phraseBank: ['Nice to meet you.', 'I am responsible for...', 'The purpose of this call is...', 'Could we start with...?']
  },
  {
    id: 'b1-customer-status',
    level: 'B1',
    category: 'Customer communication',
    industry: 'general',
    focus: 'Customer status update',
    topic: 'Updating a customer',
    role: 'Customer',
    situation: 'A customer asks for a status update on an ongoing issue.',
    userTask: 'Explain current status, next action, and expected timing.',
    openingLine: 'Could you give me an update on the issue we discussed last week?',
    prompt: 'The customer asks for an issue update.',
    sentenceFrame: 'The current status is ..., and our next step is ...',
    successGoal: 'Be clear, honest, and reassuring.',
    phraseBank: ['The current status is...', 'We are still checking...', 'The next step is...', 'We expect to update you by...']
  },
  {
    id: 'b2-customer-delay',
    level: 'B2',
    category: 'Customer communication',
    industry: 'mechanical-engineering',
    focus: 'Explaining a delay',
    topic: 'Production delay',
    role: 'Customer',
    situation: 'A production delay affects delivery. You need to explain the reason and recovery plan.',
    userTask: 'Explain the delay, avoid blaming others, and propose a recovery plan.',
    openingLine: 'We heard the delivery may be delayed. Could you explain what happened and how you will recover?',
    prompt: 'The customer asks about a production delay.',
    sentenceFrame: 'The delay was caused by ..., and our recovery plan is ...',
    successGoal: 'Explain the issue professionally and rebuild trust.',
    phraseBank: ['The delay was caused by...', 'We understand the impact...', 'Our recovery plan is...', 'We will keep you updated...']
  },
  {
    id: 'c1-customer-negotiation',
    level: 'C1',
    category: 'Customer communication',
    industry: 'mechanical-engineering',
    focus: 'Customer negotiation',
    topic: 'Negotiating technical requirements',
    role: 'Customer engineering lead',
    situation: 'The customer requests a requirement change that may increase cost and risk.',
    userTask: 'Clarify the requirement, explain technical impact, and negotiate a realistic path.',
    openingLine: 'We need this tolerance tightened for the next batch. Can your team support that without changing the timeline?',
    prompt: 'The customer asks for a tighter tolerance without timeline change.',
    sentenceFrame: 'Technically it is possible, but the impact would be ...',
    successGoal: 'Negotiate with technical clarity and protect project feasibility.',
    phraseBank: ['Technically it is possible...', 'The impact would be...', 'To support this change...', 'A realistic option would be...']
  },
  {
    id: 'a2-machine-basic',
    level: 'A2',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Basic machine description',
    topic: 'Describing a machine',
    role: 'Foreign engineer',
    situation: 'A foreign engineer asks you to describe what a machine does in simple English.',
    userTask: 'Explain the machine function, main parts, and one simple safety note.',
    openingLine: 'Could you explain what this machine does in simple terms?',
    prompt: 'A foreign engineer asks what the machine does.',
    sentenceFrame: 'This machine is used to ..., and the main parts are ...',
    successGoal: 'Explain the machine in simple, clear English.',
    phraseBank: ['This machine is used to...', 'The main parts are...', 'It can...', 'For safety, we need to...']
  },
  {
    id: 'b1-machine-problem',
    level: 'B1',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Explaining machine problems',
    topic: 'Machine troubleshooting',
    role: 'Maintenance engineer',
    situation: 'A machine has an abnormal vibration and you need to explain the problem to a foreign maintenance engineer.',
    userTask: 'Describe the symptom, possible cause, and action you already took.',
    openingLine: 'Can you describe the problem you are seeing with the machine?',
    prompt: 'The maintenance engineer asks you to describe the machine problem.',
    sentenceFrame: 'The machine has ..., and we think it may be caused by ...',
    successGoal: 'Describe symptoms and possible causes clearly.',
    phraseBank: ['The machine has abnormal...', 'It may be caused by...', 'We already checked...', 'The next step is...']
  },
  {
    id: 'b1-drawing-dimensions',
    level: 'B1',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Drawing and dimensions',
    topic: 'Discussing dimensions',
    role: 'Supplier engineer',
    situation: 'You are reviewing a drawing with a supplier engineer and need to confirm dimensions.',
    userTask: 'Confirm one dimension, ask about tolerance, and clarify inspection method.',
    openingLine: 'I am looking at the drawing now. Could you clarify this dimension for me?',
    prompt: 'The supplier engineer asks you to clarify a drawing dimension.',
    sentenceFrame: 'This dimension should be ..., and the tolerance is ...',
    successGoal: 'Confirm dimension and tolerance without ambiguity.',
    phraseBank: ['This dimension should be...', 'The tolerance is...', 'Could you confirm...', 'How will you inspect it?']
  },
  {
    id: 'b2-tolerance-discussion',
    level: 'B2',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Tolerance discussion',
    topic: 'Tolerance and dimensions',
    role: 'Supplier quality engineer',
    situation: 'A supplier asks whether a part slightly outside tolerance can be accepted.',
    userTask: 'Explain the tolerance requirement, functional risk, and decision process.',
    openingLine: 'The part is slightly outside the tolerance. Can you accept it for this batch?',
    prompt: 'The supplier asks if an out-of-tolerance part can be accepted.',
    sentenceFrame: 'The nominal dimension is ..., and the tolerance is ..., so we need to evaluate ...',
    successGoal: 'Explain technical acceptance criteria clearly.',
    phraseBank: ['The nominal dimension is...', 'The tolerance range is...', 'The functional risk is...', 'We need to evaluate...']
  },
  {
    id: 'b2-root-cause-analysis',
    level: 'B2',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Root cause analysis',
    topic: 'Explaining root cause',
    role: 'Quality manager',
    situation: 'A quality issue occurred and you need to explain the root cause analysis in English.',
    userTask: 'Describe the issue, suspected root cause, containment action, and corrective action.',
    openingLine: 'Could you explain your root cause analysis and what corrective actions you propose?',
    prompt: 'The quality manager asks for your root cause analysis.',
    sentenceFrame: 'The issue was ..., the likely root cause was ..., and our corrective action is ...',
    successGoal: 'Use a clear problem-cause-action structure.',
    phraseBank: ['The issue was...', 'The likely root cause was...', 'As a containment action...', 'Our corrective action is...']
  },
  {
    id: 'b2-maintenance-plan',
    level: 'B2',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Maintenance communication',
    topic: 'Preventive maintenance',
    role: 'Plant manager',
    situation: 'You need to explain a preventive maintenance plan for a critical machine.',
    userTask: 'Explain maintenance frequency, inspection points, and expected benefit.',
    openingLine: 'Can you explain your preventive maintenance plan for this equipment?',
    prompt: 'The plant manager asks about your preventive maintenance plan.',
    sentenceFrame: 'The maintenance plan includes ..., and the expected benefit is ...',
    successGoal: 'Make the plan sound practical and measurable.',
    phraseBank: ['The maintenance plan includes...', 'We will inspect...', 'The expected benefit is...', 'This should reduce...']
  },
  {
    id: 'c1-quality-8d',
    level: 'C1',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Quality report discussion',
    topic: '8D quality report',
    role: 'Customer quality manager',
    situation: 'You are presenting an 8D report to a customer after a serious quality complaint.',
    userTask: 'Explain containment, root cause, corrective action, and prevention in a professional tone.',
    openingLine: 'Please walk us through your 8D report, especially containment and long-term prevention.',
    prompt: 'The customer quality manager asks you to explain the 8D report.',
    sentenceFrame: 'For containment, we ..., and for long-term prevention, we ...',
    successGoal: 'Sound accountable, structured, and technically credible.',
    phraseBank: ['For containment, we...', 'The verified root cause is...', 'The corrective action is...', 'To prevent recurrence...']
  },
  {
    id: 'c1-design-review',
    level: 'C1',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Design review leadership',
    topic: 'Design review meeting',
    role: 'Global engineering team',
    situation: 'You are leading a design review with international engineers and need to explain risks and decisions.',
    userTask: 'Summarize design intent, key risk, validation plan, and decision needed from the group.',
    openingLine: 'Could you start the design review by explaining the main design intent and key risks?',
    prompt: 'The global engineering team asks you to open the design review.',
    sentenceFrame: 'The design intent is ..., the key risk is ..., and the validation plan is ...',
    successGoal: 'Lead the discussion with structure and technical authority.',
    phraseBank: ['The design intent is...', 'The key risk is...', 'The validation plan is...', 'The decision we need today is...']
  },
  {
    id: 'c1-change-management',
    level: 'C1',
    category: 'Mechanical engineer English',
    industry: 'mechanical-engineering',
    focus: 'Engineering change management',
    topic: 'Engineering change request',
    role: 'Program manager',
    situation: 'A design change is required late in the project and may affect cost, timing, and validation.',
    userTask: 'Explain the change reason, impact, risk, and approval path.',
    openingLine: 'We are late in the project. Why is this engineering change necessary, and what is the impact?',
    prompt: 'The program manager asks why the engineering change is necessary.',
    sentenceFrame: 'The change is necessary because ..., and the impact is ...',
    successGoal: 'Explain business and technical impact without sounding defensive.',
    phraseBank: ['The change is necessary because...', 'The impact on timing is...', 'The validation risk is...', 'The approval path should be...']
  },
  {
    id: 'b1-supplier-followup',
    level: 'B1',
    category: 'Customer communication',
    industry: 'mechanical-engineering',
    focus: 'Supplier follow-up',
    topic: 'Following up with a supplier',
    role: 'Supplier sales engineer',
    situation: 'You need to follow up with a supplier about quotation, lead time, and technical documents.',
    userTask: 'Ask for quotation status, lead time, and missing documents.',
    openingLine: 'Thanks for your message. What information do you need from us today?',
    prompt: 'The supplier asks what information you need.',
    sentenceFrame: 'Could you update me on ..., and also send ...?',
    successGoal: 'Ask for business and technical information clearly.',
    phraseBank: ['Could you update me on...', 'What is the lead time?', 'Please send the drawing...', 'We need the quotation by...']
  },
  {
    id: 'b2-supplier-nonconformance',
    level: 'B2',
    category: 'Customer communication',
    industry: 'mechanical-engineering',
    focus: 'Supplier quality communication',
    topic: 'Supplier nonconformance',
    role: 'Supplier quality engineer',
    situation: 'You found a nonconforming part from a supplier and need to request analysis and corrective action.',
    userTask: 'Describe the nonconformance, request containment, and ask for corrective action timing.',
    openingLine: 'We received your report. Could you explain the nonconformance you found?',
    prompt: 'The supplier asks you to explain the nonconformance.',
    sentenceFrame: 'We found that ..., so we need you to ...',
    successGoal: 'Communicate quality requirements firmly and professionally.',
    phraseBank: ['We found that...', 'This does not meet...', 'Please contain the affected parts...', 'When can you provide corrective action?']
  }
];

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]\n', 'utf8');
  if (!fs.existsSync(VOCABULARY_FILE)) fs.writeFileSync(VOCABULARY_FILE, '[]\n', 'utf8');
  if (!fs.existsSync(MISTAKES_FILE)) fs.writeFileSync(MISTAKES_FILE, '[]\n', 'utf8');
  if (!fs.existsSync(RECORDINGS_FILE)) fs.writeFileSync(RECORDINGS_FILE, '[]\n', 'utf8');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function getLanUrls() {
  const urls = [];
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      urls.push(`http://${entry.address}:${PORT}`);
    }
  }
  return urls;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15_000_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function readSessions() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  ensureData();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2) + '\n', 'utf8');
}

function readVocabulary() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(VOCABULARY_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVocabulary(items) {
  ensureData();
  fs.writeFileSync(VOCABULARY_FILE, JSON.stringify(items, null, 2) + '\n', 'utf8');
}

function readMistakes() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(MISTAKES_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMistakes(items) {
  ensureData();
  fs.writeFileSync(MISTAKES_FILE, JSON.stringify(items, null, 2) + '\n', 'utf8');
}

function readRecordings() {
  ensureData();
  try {
    const parsed = JSON.parse(fs.readFileSync(RECORDINGS_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecordings(recordings) {
  ensureData();
  fs.writeFileSync(RECORDINGS_FILE, JSON.stringify(recordings, null, 2) + '\n', 'utf8');
}

function audioExtension(mimeType) {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

function findRecording(id) {
  if (!id) return null;
  return readRecordings().find(recording => recording.id === id) || null;
}

function recordingFilePath(recording) {
  if (!recording?.fileName) return null;
  const filePath = path.normalize(path.join(RECORDINGS_DIR, recording.fileName));
  return filePath.startsWith(RECORDINGS_DIR) ? filePath : null;
}

function speechMetrics(answer, recording) {
  const text = String(answer || '').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const fillerMatches = text.match(/\b(um+|uh+|erm+|ah+|like|you know)\b/gi) || [];
  const sentenceCount = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const durationSeconds = Number(recording?.durationSeconds || 0);
  const wordsPerMinute = durationSeconds > 0 ? Math.round((words / durationSeconds) * 60) : null;
  const averageWordsPerSentence = Math.round(words / sentenceCount);
  return { words, durationSeconds, wordsPerMinute, fillerCount: fillerMatches.length, averageWordsPerSentence };
}

function localDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function normalizeVocabularyPayload(payload) {
  return {
    term: String(payload.term || '').trim(),
    meaning: String(payload.meaning || '').trim(),
    example: String(payload.example || '').trim(),
    tag: String(payload.tag || '').trim() || 'speaking',
    status: ['new', 'learning', 'familiar', 'mastered'].includes(payload.status) ? payload.status : 'new'
  };
}

function normalizeMistakePayload(payload) {
  const mistakeType = String(payload.mistakeType || payload.errorType || '').trim() || 'grammar';
  const reviewStatus = ['new', 'learning', 'familiar', 'mastered'].includes(payload.reviewStatus || payload.status)
    ? (payload.reviewStatus || payload.status)
    : 'new';
  const correctedSentence = String(payload.correctedSentence || payload.improvedSentence || '').trim();
  const explanation = String(payload.explanation || payload.note || '').trim();
  return {
    originalSentence: String(payload.originalSentence || '').trim(),
    correctedSentence,
    improvedSentence: correctedSentence,
    mistakeType,
    errorType: mistakeType,
    explanation,
    note: explanation,
    source: String(payload.source || '').trim() || 'manual',
    reviewStatus,
    status: reviewStatus
  };
}

function applyVocabularyReview(item, result) {
  const reviewCount = Number(item.reviewCount || 0) + 1;
  const schedule = {
    again: { status: 'learning', days: 1 },
    good: { status: reviewCount >= 2 ? 'familiar' : 'learning', days: reviewCount >= 2 ? 4 : 2 },
    mastered: { status: 'mastered', days: 14 }
  }[result] || { status: 'learning', days: 1 };

  return {
    ...item,
    status: schedule.status,
    reviewCount,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: localDateOffset(schedule.days),
    updatedAt: new Date().toISOString()
  };
}

function applyMistakeReview(item, result) {
  const reviewed = applyVocabularyReview(item, result);
  return {
    ...reviewed,
    reviewStatus: reviewed.status
  };
}

function todayTopic() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now - start) / 86400000);
  return scenarios[day % scenarios.length];
}

function randomTopic(options = {}) {
  const excludePrompt = String(options.excludePrompt || '');
  const level = String(options.level || '').trim();
  const category = String(options.category || '').trim();
  const filtered = scenarios.filter(topic => {
    if (excludePrompt && topic.prompt === excludePrompt) return false;
    if (level && topic.level !== level) return false;
    if (category && topic.category !== category) return false;
    return true;
  });
  const fallback = scenarios.filter(topic => !excludePrompt || topic.prompt !== excludePrompt);
  const pool = filtered.length ? filtered : (fallback.length ? fallback : scenarios);
  return pool[Math.floor(Math.random() * pool.length)];
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getSettings() {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const openAiKey = process.env.OPENAI_API_KEY || '';
  const model = provider === 'openai'
    ? process.env.OPENAI_MODEL || 'gpt-4.1-mini'
    : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return {
    apiKeyConfigured: provider === 'openai' ? Boolean(openAiKey) : Boolean(geminiKey),
    provider,
    model,
    dailyDurationMinutes: null,
    preferredFeedbackLanguage: 'Chinese explanations with English examples'
  };
}

function buildFeedbackPrompt(answer, context, recording = null) {
  const metrics = speechMetrics(answer, recording);
  const transcript = String(answer || '').trim() || '[No transcript was captured. Please listen to the attached audio and infer the spoken answer as accurately as possible.]';
  const audioNote = recording
    ? `Audio is attached. Recording duration: ${metrics.durationSeconds} seconds. Transcript word count: ${metrics.words}. Estimated speed: ${metrics.wordsPerMinute || 'unknown'} WPM. Filler count from transcript: ${metrics.fillerCount}.`
    : `No audio is attached. Use text-only estimation for fluency, speakingSpeed, pauseProblem, and hardWordsToRepeat. Set pronunciationScore to null and clearly mark pronunciation as "audio needed". Transcript word count: ${metrics.words}. Average sentence length: ${metrics.averageWordsPerSentence}. Filler count: ${metrics.fillerCount}.`;

  return `You are an English speaking coach for a Chinese learner living in Mexico. The learner can understand intermediate English but needs better spoken grammar, logic, pronunciation, fluency, and natural phrasing.

Practice context:
Focus: ${context.focus}
Topic: ${context.topic}
Prompt: ${context.prompt}
Sentence frame: ${context.sentenceFrame}

User transcript:
${transcript}

Audio context:
${audioNote}

Return concise feedback as valid JSON with these keys:
quickDiagnosis: string
grammarFixes: array of {original:string, improved:string, explanation:string}
logicCoherence: array of strings
naturalVersion: string
repeatScript: string
reusableExpressions: array of strings
pronunciationScore: number|null
fluencyScore: number|null
speedPauseFeedback: string
possiblePronunciationIssues: array of {word:string, issue:string, suggestion:string}
pauseProblem: string
speakingSpeed: {wpm:number|null, level:string, comment:string}
hardWordsToRepeat: array of {word:string, reason:string, repeatDrill:string}

Scoring rules:
- pronunciationScore is 0-100 and should only be scored when audio is attached.
- fluencyScore is 0-100. If audio is attached, consider speed, hesitation, pauses, and smoothness. If audio is missing, estimate from transcript length, filler words, sentence length, and organization, and say it is a text estimate.
- speedPauseFeedback should mention pace and pauses; keep it compatible with old clients.
- pauseProblem should be one clear Chinese sentence about pauses or hesitation. If audio is missing, infer only from transcript markers such as fillers, broken sentences, very short answers, or very long sentences.
- speakingSpeed.wpm should use the provided WPM when audio duration exists. Without audio, set wpm to null and set level to "text estimate only".
- speakingSpeed.level should be one of: "too slow", "natural", "too fast", "text estimate only", "unknown".
- hardWordsToRepeat should include 3-6 English words or short phrases from the learner's answer or naturalVersion that are useful or likely hard to say. Each repeatDrill should be a short English drill, such as "international communication - international communication - international communication".
- possiblePronunciationIssues should identify words or sounds that may need practice from the audio. If audio is missing, keep this empty or mark items as text-based possibilities. Be cautious and say "possible" when uncertain.

Use Chinese for explanations and English for improved sentences. Limit grammarFixes to 2-4 important corrections. Keep the natural version close to the user's meaning and level.`;
}

function buildShadowingFeedbackPrompt(payload, recording) {
  const repeatScript = String(payload.repeatScript || '').trim();
  const shadowingTranscript = String(payload.shadowingTranscript || '').trim();
  const originalAnswer = String(payload.originalAnswer || '').trim();
  const metrics = speechMetrics(shadowingTranscript || repeatScript, recording);

  return `You are an English shadowing coach for a Chinese learner.

The learner first received an improved repeat script, then recorded themselves reading it aloud. Compare the learner's shadowing audio to the target repeat script.

Target repeat script:
${repeatScript}

Browser speech transcript from the shadowing attempt:
${shadowingTranscript || '[No transcript captured. Please evaluate mainly from the attached audio.]'}

Original learner answer before feedback:
${originalAnswer || '[No original answer provided]'}

Audio context:
Audio is attached. Recording duration: ${metrics.durationSeconds} seconds. Transcript word count: ${metrics.words}. Estimated speed: ${metrics.wordsPerMinute || 'unknown'} WPM.

Return valid JSON only with:
shadowingScore: number
accuracyNote: string
pronunciationNote: string
fluencyNote: string
missedOrChangedWords: array of {target:string, heardOrTyped:string, note:string}
repeatAgainScript: string
nextDrill: string

Rules:
- shadowingScore is 0-100 based on accuracy, pronunciation clarity, rhythm, and fluency.
- If the browser transcript is empty, use the audio and say that the comparison is audio-based.
- missedOrChangedWords should list 0-6 important target words or phrases that were missed, changed, unclear, or need more practice. Be cautious when uncertain.
- repeatAgainScript should be a short version of the target script or the most important sentence to repeat again.
- nextDrill should be one practical English drill, for example "First slowly, then naturally: ...".
- Use Chinese for notes and English for scripts/drills.`;
}

function speedLevel(wordsPerMinute) {
  if (!wordsPerMinute) return 'text estimate only';
  if (wordsPerMinute < 90) return 'too slow';
  if (wordsPerMinute > 170) return 'too fast';
  return 'natural';
}

function estimateFluencyScore(metrics, hasAudio) {
  let score = hasAudio ? 70 : 62;
  if (metrics.words >= 45) score += 8;
  if (metrics.words < 20) score -= 14;
  if (metrics.fillerCount > 0) score -= Math.min(16, metrics.fillerCount * 4);
  if (metrics.averageWordsPerSentence > 28) score -= 8;
  if (metrics.wordsPerMinute) {
    if (metrics.wordsPerMinute >= 100 && metrics.wordsPerMinute <= 160) score += 8;
    if (metrics.wordsPerMinute < 80 || metrics.wordsPerMinute > 185) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function fallbackHardWords(answer, feedback) {
  const source = `${answer || ''} ${feedback.naturalVersion || ''}`;
  const words = source.match(/\b[A-Za-z][A-Za-z'-]{5,}\b/g) || [];
  const unique = [];
  for (const word of words) {
    const clean = word.replace(/^['-]+|['-]+$/g, '');
    if (!clean || unique.some(item => item.toLowerCase() === clean.toLowerCase())) continue;
    unique.push(clean);
    if (unique.length >= 5) break;
  }
  return unique.map(word => ({
    word,
    reason: '这个词较长或在口语里需要说清楚，适合单独重复。',
    repeatDrill: `${word} - ${word} - ${word}`
  }));
}

function enrichFeedbackResult(feedback, answer, recording = null) {
  if (!feedback || typeof feedback !== 'object' || feedback.rawText || feedback.rawResponse) return feedback;
  const metrics = speechMetrics(answer, recording);
  const hasAudio = Boolean(recording);

  if (feedback.fluencyScore == null) {
    feedback.fluencyScore = estimateFluencyScore(metrics, hasAudio);
  }
  if (!feedback.pauseProblem) {
    feedback.pauseProblem = hasAudio
      ? '请结合录音检查是否有明显停顿；本次没有返回更具体的停顿问题。'
      : metrics.fillerCount > 0
        ? '文本里出现了一些 filler words，可能说明表达时有停顿或犹豫。'
        : 'Text estimate only：没有录音时，只能根据文本长度和句子结构粗略判断停顿。';
  }
  if (!feedback.speakingSpeed || typeof feedback.speakingSpeed !== 'object') {
    feedback.speakingSpeed = {
      wpm: metrics.wordsPerMinute,
      level: hasAudio ? speedLevel(metrics.wordsPerMinute) : 'text estimate only',
      comment: hasAudio
        ? `Estimated speed is ${metrics.wordsPerMinute || 'unknown'} WPM based on the saved recording.`
        : 'Text estimate only：没有录音时无法计算真实 WPM，可以先用回答长度和流畅度做粗略判断。'
    };
  }
  if (!Array.isArray(feedback.hardWordsToRepeat) || !feedback.hardWordsToRepeat.length) {
    feedback.hardWordsToRepeat = fallbackHardWords(answer, feedback);
  }
  if (!feedback.speedPauseFeedback) {
    feedback.speedPauseFeedback = `${feedback.pauseProblem} ${feedback.speakingSpeed?.comment || ''}`.trim();
  }
  if (!Array.isArray(feedback.possiblePronunciationIssues)) {
    feedback.possiblePronunciationIssues = [];
  }
  return feedback;
}

async function requestAiFeedback(answer, context, recording = null) {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'openai') return requestOpenAiFeedback(answer, context, recording);
  return requestGeminiFeedback(answer, context, recording);
}

function normalizeChatMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || '').trim().slice(0, 1200)
    }))
    .filter(message => message.content)
    .slice(-12);
}

function buildChatPrompt(messages) {
  const transcript = messages.map(message => `${message.role === 'assistant' ? 'Coach' : 'Learner'}: ${message.content}`).join('\n');
  return `You are an English daily conversation coach for a Chinese learner living in Mexico.

Your job:
- Chat naturally in English.
- Keep the learner speaking with friendly follow-up questions.
- Lightly correct unnatural English without stopping the conversation.
- When the learner's sentence is awkward, show a better version.
- Give one short repeat line the learner can say aloud.
- Use simple, clear English. Use brief Chinese only when explaining a correction.

Format every reply like this:
Coach: <natural conversational reply>
Better way: <one improved sentence if useful, otherwise "No correction needed.">
Repeat: <one short sentence for the learner to repeat>
Next question: <one easy follow-up question>

Conversation so far:
${transcript}`;
}

function normalizeFeedbackFollowupTurns(turns) {
  return (Array.isArray(turns) ? turns : [])
    .map(turn => ({
      question: String(turn.question || '').trim().slice(0, 600),
      answer: String(turn.answer || '').trim().slice(0, 1400)
    }))
    .filter(turn => turn.question && turn.answer)
    .slice(-3);
}

function buildFeedbackFollowupPrompt(payload) {
  const context = payload.context || todayTopic();
  const answer = String(payload.answer || '').trim();
  const feedback = payload.feedback || {};
  const turns = normalizeFeedbackFollowupTurns(payload.turns);
  const transcript = turns.length
    ? turns.map((turn, index) => `${index + 1}. Coach: ${turn.question}\nLearner: ${turn.answer}`).join('\n')
    : '[No follow-up turns yet]';
  const maxRoundsReached = turns.length >= 3;

  return `You are an English speaking coach running a short follow-up speaking loop after feedback.

Learner profile:
- Chinese learner living in Mexico
- Wants IELTS 7.5-level speaking: clear logic, natural grammar, and fluent answers

Practice context:
Focus: ${context.focus || ''}
Topic: ${context.topic || ''}
Prompt: ${context.prompt || context.situation || ''}

Original learner answer:
${answer || '[No original answer provided]'}

AI feedback summary:
Quick diagnosis: ${feedback.quickDiagnosis || ''}
Natural version: ${feedback.naturalVersion || ''}
Repeat script: ${feedback.repeatScript || ''}
Reusable expressions: ${(feedback.reusableExpressions || []).join(', ')}
Logic notes: ${(feedback.logicCoherence || []).join(' | ')}

Follow-up turns so far:
${transcript}

Return valid JSON only with:
question: string
coachingNote: string
betterWay: string
repeatLine: string
isComplete: boolean
closingSummary: string

Rules:
- If there are no follow-up turns yet, ask one natural follow-up question based on the original answer and feedback. Example style: "Why do you think so?"
- If there is a learner follow-up answer, give one short Chinese coaching note, one improved English sentence, and one short repeat line.
- Ask only one next question at a time.
- Run 2-3 follow-up rounds total. If the learner has answered fewer than 2 follow-up questions, do not end the loop yet.
- ${maxRoundsReached ? 'The learner has already answered 3 follow-up rounds. Set isComplete true, leave question empty, and give a short Chinese closingSummary.' : 'If the learner has answered enough for a useful loop, set isComplete true; otherwise ask the next question.'}
- Keep questions in simple natural English.
- Keep Chinese explanations short.`;
}

function enforceFeedbackFollowupRounds(followup, turns) {
  const result = followup && typeof followup === 'object' ? followup : {};
  if (turns.length < 2) {
    result.isComplete = false;
    if (!String(result.question || '').trim()) {
      result.question = turns.length === 0
        ? 'Why do you think so?'
        : 'Can you give one specific example?';
    }
    result.closingSummary = '';
  }
  if (turns.length >= 3) {
    result.isComplete = true;
    result.question = '';
    if (!String(result.closingSummary || '').trim()) {
      result.closingSummary = '这轮追问已经完成。下一步可以把你的答案整理成更自然、更有逻辑的一段口语回答。';
    }
  }
  return result;
}

async function requestGeminiFeedbackFollowups(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildFeedbackFollowupPrompt(payload) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.45
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

async function requestGeminiChat(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildChatPrompt(messages) }]
        }
      ],
      generationConfig: {
        temperature: 0.7
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return raw.trim();
  }
  return extractGeminiText(data) || 'I am here. Tell me about your day in one or two sentences.';
}

function buildFollowupPrompt(payload) {
  const context = payload.context || todayTopic();
  const firstAnswer = String(payload.answer || '').trim();
  const selectedQuestion = String(payload.question || '').trim();
  const followupAnswer = String(payload.followupAnswer || '').trim();
  const previousTurns = Array.isArray(payload.turns) ? payload.turns.slice(-8) : [];
  const mode = selectedQuestion && followupAnswer ? 'continue' : 'start';
  const turnLog = previousTurns.map(turn => `${turn.speaker || 'Learner'}: ${turn.text || ''}`).join('\n');

  return `You are role-playing a realistic English speaking scene.

The learner is a Chinese speaker living in Mexico. You must stay in role and keep the scene realistic. Do not become a generic tutor during the dialogue.

Scenario:
Focus: ${context.focus || ''}
Topic: ${context.topic || ''}
AI role: ${context.role || 'Conversation partner'}
Situation: ${context.situation || context.prompt || ''}
Learner task: ${context.userTask || ''}
Success goal: ${context.successGoal || ''}
Opening line: ${context.openingLine || context.prompt || ''}
Useful phrases: ${(context.phraseBank || []).join(', ')}

Learner's first answer:
${firstAnswer || '[No answer provided]'}

Previous scene turns:
${turnLog || '[No previous turns]'}

${mode === 'continue' ? `Your previous line or question:
${selectedQuestion}

Learner's latest answer:
${followupAnswer}` : ''}

Return valid JSON only.

If mode is "start", return:
{
  "stage": "opening",
  "aiLine": "one natural in-role line that starts or continues the scene",
  "coachingNote": "one short Chinese sentence explaining the conversation goal",
  "betterWay": "",
  "repeatLine": "",
  "isComplete": false,
  "closingSummary": ""
}

If mode is "continue", return:
{
  "stage": "middle|closing",
  "aiLine": "one natural in-role line that reacts to the learner and asks the next necessary question, or closes the scene",
  "coachingNote": "one short Chinese sentence with light correction or encouragement",
  "betterWay": "one improved English sentence based on the learner's follow-up answer",
  "repeatLine": "one short English sentence the learner can repeat aloud",
  "isComplete": true or false,
  "closingSummary": "if isComplete is true, summarize in Chinese what the learner accomplished and one thing to improve; otherwise empty string"
}

Rules:
- Speak as the AI role, not as an app.
- Move the scene forward one turn at a time.
- Do not list multiple questions.
- If the learner has achieved the success goal or the scene has enough information, close naturally.
- Closing should feel like the real role ending the interaction.
- Keep aiLine concise: 1-3 sentences.
- Use Chinese only in coachingNote.`;
}

async function requestGeminiFollowups(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildFollowupPrompt(payload) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.65
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

function normalizeScenarioTurns(turns) {
  return (Array.isArray(turns) ? turns : [])
    .map(turn => ({
      speaker: String(turn.speaker || '').trim().slice(0, 80),
      text: String(turn.text || '').trim().slice(0, 1600)
    }))
    .filter(turn => turn.speaker && turn.text)
    .slice(-20);
}

function buildSceneFeedbackPrompt(payload) {
  const context = payload.context || todayTopic();
  const turns = normalizeScenarioTurns(payload.turns);
  const transcript = turns.map((turn, index) => `${index + 1}. ${turn.speaker}: ${turn.text}`).join('\n');

  return `You are an English speaking coach reviewing a completed role-play scene.

Learner profile:
- Chinese learner living in Mexico
- Wants practical spoken English, natural expression, and better scenario performance

Scenario:
Role: ${context.role || 'AI role'}
Topic: ${context.topic || ''}
Situation: ${context.situation || context.prompt || ''}
Learner task: ${context.userTask || ''}
Success goal: ${context.successGoal || ''}
Useful phrases: ${(context.phraseBank || []).join(', ')}

Full scene transcript:
${transcript}

Return valid JSON only with:
overallPerformance: string
taskCompletion: string
turnByTurnFeedback: array of {learnerLine:string, issue:string, betterWay:string}
improvedDialogue: array of {speaker:string, line:string}
reusableExpressions: array of strings
nextPracticeFocus: string
repeatScript: string

Rules:
- Review the whole scene, not only one sentence.
- Focus on the learner's lines only for corrections.
- Mention whether the learner completed the scenario task.
- Keep explanations in Chinese, but improved lines and expressions in English.
- Keep turnByTurnFeedback to the 3-5 most useful learner lines.`;
}

async function requestGeminiSceneFeedback(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildSceneFeedbackPrompt(payload) }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

async function requestGeminiFeedback(answer, context, recording = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const parts = [{ text: buildFeedbackPrompt(answer, context, recording) }];
  const filePath = recordingFilePath(recording);
  if (filePath && fs.existsSync(filePath)) {
    parts.push({
      inlineData: {
        mimeType: recording.mimeType || 'audio/webm',
        data: fs.readFileSync(filePath).toString('base64')
      }
    });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

async function requestGeminiShadowingFeedback(payload, recording) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const filePath = recordingFilePath(recording);
  if (!filePath || !fs.existsSync(filePath)) {
    const error = new Error('Shadowing recording file was not found.');
    error.code = 'missing_recording_file';
    throw error;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildShadowingFeedbackPrompt(payload, recording) },
            {
              inlineData: {
                mimeType: recording.mimeType || 'audio/webm',
                data: fs.readFileSync(filePath).toString('base64')
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.25
      }
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = extractGeminiText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

async function requestOpenAiFeedback(answer, context, recording = null) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured. Copy .env.example to .env and add your key.');
    error.code = 'missing_api_key';
    throw error;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: buildFeedbackPrompt(answer, context, recording)
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`OpenAI request failed with status ${response.status}.`);
    error.details = raw;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { rawText: raw };
  }

  const text = data.output_text || extractOutputText(data);
  if (!text) return { rawResponse: data };

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    return { rawText: text };
  }
}

function extractGeminiText(data) {
  if (!Array.isArray(data.candidates)) return '';
  return data.candidates.flatMap(candidate => candidate.content?.parts || [])
    .map(part => part.text || '')
    .filter(Boolean)
    .join('\n');
}

function extractOutputText(data) {
  if (!Array.isArray(data.output)) return '';
  return data.output.flatMap(item => Array.isArray(item.content) ? item.content : [])
    .map(part => part.text || '')
    .filter(Boolean)
    .join('\n');
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const safePath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(content);
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, app: 'English Speaking Coach' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/settings') {
    sendJson(res, 200, getSettings());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/network') {
    sendJson(res, 200, {
      localUrl: `http://localhost:${PORT}`,
      lanUrls: getLanUrls(),
      host: HOST,
      port: PORT
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/today') {
    const topic = url.searchParams.get('random') === '1'
      ? randomTopic({
        excludePrompt: url.searchParams.get('exclude') || '',
        level: url.searchParams.get('level') || '',
        category: url.searchParams.get('category') || ''
      })
      : todayTopic();
    sendJson(res, 200, topic);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/vocabulary') {
    const items = readVocabulary().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { items });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/vocabulary/review') {
    const today = localDateOffset(0);
    const items = readVocabulary()
      .filter(item => item.status !== 'mastered' || String(item.nextReviewAt || '') <= today)
      .filter(item => !item.nextReviewAt || String(item.nextReviewAt) <= today)
      .sort((a, b) => String(a.nextReviewAt || '').localeCompare(String(b.nextReviewAt || '')))
      .slice(0, 12);
    sendJson(res, 200, { items });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/mistakes') {
    const items = readMistakes().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { items });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/mistakes/review') {
    const today = localDateOffset(0);
    const items = readMistakes()
      .filter(item => item.status !== 'mastered' || String(item.nextReviewAt || '') <= today)
      .filter(item => !item.nextReviewAt || String(item.nextReviewAt) <= today)
      .sort((a, b) => String(a.nextReviewAt || '').localeCompare(String(b.nextReviewAt || '')))
      .slice(0, 12);
    sendJson(res, 200, { items });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/recordings') {
    const recordings = readRecordings().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { recordings: recordings.slice(0, 20) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/recordings') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const audioBase64 = String(payload.audioBase64 || '');
    const mimeType = String(payload.mimeType || 'audio/webm');
    if (!audioBase64 || audioBase64.length < 100) {
      sendJson(res, 400, { error: 'Audio data is required.' });
      return;
    }
    const id = crypto.randomUUID();
    const fileName = `${id}.${audioExtension(mimeType)}`;
    const filePath = path.join(RECORDINGS_DIR, fileName);
    fs.writeFileSync(filePath, Buffer.from(audioBase64, 'base64'));

    const now = new Date().toISOString();
    const recordings = readRecordings();
    const recording = {
      id,
      date: localDateString(),
      fileName,
      mimeType,
      transcript: String(payload.transcript || '').trim(),
      topic: String(payload.topic || ''),
      focus: String(payload.focus || ''),
      prompt: String(payload.prompt || ''),
      durationSeconds: Number(payload.durationSeconds || 0),
      createdAt: now
    };
    recordings.unshift(recording);
    writeRecordings(recordings.slice(0, 200));
    sendJson(res, 201, { recording });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/vocabulary') {
    const payload = normalizeVocabularyPayload(JSON.parse(await readBody(req) || '{}'));
    if (!payload.term || !payload.meaning) {
      sendJson(res, 400, { error: 'Term and meaning are required.' });
      return;
    }
    const now = new Date().toISOString();
    const items = readVocabulary();
    const item = {
      id: crypto.randomUUID(),
      ...payload,
      reviewCount: 0,
      nextReviewAt: localDateOffset(0),
      createdAt: now,
      updatedAt: now
    };
    items.unshift(item);
    writeVocabulary(items.slice(0, 500));
    sendJson(res, 201, { item });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/mistakes') {
    const payload = normalizeMistakePayload(JSON.parse(await readBody(req) || '{}'));
    if (!payload.originalSentence || !payload.correctedSentence) {
      sendJson(res, 400, { error: 'Original sentence and corrected sentence are required.' });
      return;
    }
    const now = new Date().toISOString();
    const items = readMistakes();
    const item = {
      id: crypto.randomUUID(),
      ...payload,
      reviewCount: 0,
      nextReviewAt: localDateOffset(0),
      createdAt: now,
      updatedAt: now
    };
    items.unshift(item);
    writeMistakes(items.slice(0, 500));
    sendJson(res, 201, { item });
    return;
  }

  const reviewMatch = url.pathname.match(/^\/api\/vocabulary\/([^/]+)\/review$/);
  if (req.method === 'POST' && reviewMatch) {
    const id = reviewMatch[1];
    const payload = JSON.parse(await readBody(req) || '{}');
    const items = readVocabulary();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: 'Vocabulary item not found.' });
      return;
    }
    items[index] = applyVocabularyReview(items[index], payload.result);
    writeVocabulary(items);
    sendJson(res, 200, { item: items[index] });
    return;
  }

  const mistakeReviewMatch = url.pathname.match(/^\/api\/mistakes\/([^/]+)\/review$/);
  if (req.method === 'POST' && mistakeReviewMatch) {
    const id = mistakeReviewMatch[1];
    const payload = JSON.parse(await readBody(req) || '{}');
    const items = readMistakes();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: 'Mistake item not found.' });
      return;
    }
    items[index] = applyMistakeReview(items[index], payload.result);
    writeMistakes(items);
    sendJson(res, 200, { item: items[index] });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/sessions') {
    const sessions = readSessions().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    sendJson(res, 200, { sessions });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/sessions') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const now = new Date().toISOString();
    const sessions = readSessions();
    const session = {
      id: payload.id || crypto.randomUUID(),
      date: payload.date || localDateString(),
      topic: payload.topic || '',
      focus: payload.focus || '',
      prompt: payload.prompt || '',
      sentenceFrame: payload.sentenceFrame || '',
      userAnswer: payload.userAnswer || '',
      aiFeedback: payload.aiFeedback || null,
      reflection: payload.reflection || {},
      durationMinutes: payload.durationMinutes == null || payload.durationMinutes === ''
        ? null
        : Number(payload.durationMinutes),
      createdAt: payload.createdAt || now,
      updatedAt: now
    };
    sessions.unshift(session);
    writeSessions(sessions.slice(0, 200));
    sendJson(res, 201, { session });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/feedback') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const answer = String(payload.answer || '').trim();
    const context = payload.context || todayTopic();
    const recording = findRecording(String(payload.recordingId || ''));
    if (answer.length < 20 && !recording) {
      sendJson(res, 400, { error: 'Please enter a longer answer or record audio before requesting feedback.' });
      return;
    }
    try {
      const feedback = enrichFeedbackResult(await requestAiFeedback(answer, context, recording), answer, recording);
      sendJson(res, 200, { feedback });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const messages = normalizeChatMessages(payload.messages);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      sendJson(res, 400, { error: 'Send a learner message before asking the AI coach to reply.' });
      return;
    }
    try {
      const reply = await requestGeminiChat(messages);
      sendJson(res, 200, { reply });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/feedback-followups') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const answer = String(payload.answer || '').trim();
    const turns = normalizeFeedbackFollowupTurns(payload.turns);
    if (answer.length < 10) {
      sendJson(res, 400, { error: 'Submit feedback for an answer before starting follow-up practice.' });
      return;
    }
    try {
      const followup = await requestGeminiFeedbackFollowups({
        context: payload.context || todayTopic(),
        answer,
        feedback: payload.feedback || {},
        turns
      });
      sendJson(res, 200, { followup: enforceFeedbackFollowupRounds(followup, turns) });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/shadowing-feedback') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const repeatScript = String(payload.repeatScript || '').trim();
    const recording = findRecording(String(payload.recordingId || ''));
    if (!repeatScript) {
      sendJson(res, 400, { error: 'Repeat script is required before shadowing feedback.' });
      return;
    }
    if (!recording) {
      sendJson(res, 400, { error: 'Record your repeat script before requesting shadowing feedback.' });
      return;
    }
    try {
      const feedback = await requestGeminiShadowingFeedback({
        repeatScript,
        shadowingTranscript: payload.shadowingTranscript || recording.transcript || '',
        originalAnswer: payload.originalAnswer || '',
        originalFeedback: payload.originalFeedback || {}
      }, recording);
      sendJson(res, 200, { feedback });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/followups') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const answer = String(payload.answer || '').trim();
    const question = String(payload.question || '').trim();
    const followupAnswer = String(payload.followupAnswer || '').trim();
    if (answer.length < 10) {
      sendJson(res, 400, { error: 'Answer the current topic first, then ask for follow-up questions.' });
      return;
    }
    if (followupAnswer && !question) {
      sendJson(res, 400, { error: 'Send the AI role line you are answering.' });
      return;
    }
    try {
      const followups = await requestGeminiFollowups({
        context: payload.context || todayTopic(),
        answer,
        question,
        followupAnswer
      });
      sendJson(res, 200, { followups });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/scene-feedback') {
    const payload = JSON.parse(await readBody(req) || '{}');
    const turns = normalizeScenarioTurns(payload.turns);
    if (!turns.some(turn => turn.speaker === 'Learner')) {
      sendJson(res, 400, { error: 'Complete at least one learner turn before requesting scene feedback.' });
      return;
    }
    try {
      const feedback = await requestGeminiSceneFeedback({
        context: payload.context || todayTopic(),
        turns
      });
      sendJson(res, 200, { feedback });
    } catch (error) {
      sendJson(res, error.code === 'missing_api_key' ? 400 : 502, {
        error: error.message,
        details: error.details || null
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'API route not found.' });
}

async function handleRequest(req, res) {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Internal server error.' });
  }
}

loadEnv();
ensureData();

if (process.argv.includes('--check')) {
  console.log(JSON.stringify({ ok: true, settings: getSettings(), dataDir: DATA_DIR }, null, 2));
  process.exit(0);
}

http.createServer(handleRequest).listen(PORT, HOST, () => {
  console.log(`English Speaking Coach running at http://localhost:${PORT}`);
  for (const url of getLanUrls()) console.log(`Phone on same Wi-Fi: ${url}`);
});



