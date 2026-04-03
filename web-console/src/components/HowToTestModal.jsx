import { useState } from 'react';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * HowToTestModal - Modal showing instructions for testing agents
 * Includes Postman, curl, and Hallucinate tabs
 */
const HowToTestModal = ({ onClose, proxyUrl }) => {
  const [activeTab, setActiveTab] = useState('postman');
  const [activeScenario, setActiveScenario] = useState('types');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const copySnippet = (button) => {
    const pre = button.parentElement.querySelector('pre');
    if (pre) {
      copyToClipboard(pre.textContent);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[16px] w-[680px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-serif text-[21px] font-normal text-on-surface mb-[5px]">
                How to test your agent
              </h2>
              <p className="text-[13px] text-muted mb-[14px]">
                Your proxy URL is ready. Here's how to point your tool at it and see live repairs.
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-transparent border-0 cursor-pointer text-[18px] text-muted mt-1 p-0.5 hover:text-on-surface"
            >
              ✕
            </button>
          </div>

          {/* Proxy URL Box */}
          <div className="bg-surface-container-low border border-outline rounded-[8px] p-3 mb-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted mb-1">
              Your invari proxy URL
            </div>
            <div className="font-mono text-[12px] text-green font-semibold break-all">
              {proxyUrl || 'https://proxy.invari.ai/agents/YOUR-AGENT-ID/v1'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => copyToClipboard(proxyUrl || 'https://proxy.invari.ai/agents/YOUR-AGENT-ID/v1')}
                className="px-3 py-[5px] bg-on-surface text-white border-0 rounded-[6px] text-[11px] font-semibold font-mono cursor-pointer transition-opacity hover:opacity-85"
              >
                Copy URL
              </button>
              <span className="text-[11px] text-muted">
                Replace your API base URL with this. Nothing else changes.
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-outline px-7">
          <button
            onClick={() => setActiveTab('postman')}
            className={`text-[13px] px-4 py-3 cursor-pointer border-b-2 transition-all flex items-center gap-[7px] whitespace-nowrap ${
              activeTab === 'postman'
                ? 'text-green border-green font-semibold'
                : 'text-muted border-transparent hover:text-on-surface'
            }`}
          >
            <svg className="w-[13px] h-[13px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="10" cy="10" r="7"/>
              <path d="M10 7v3l2 2"/>
            </svg>
            Postman
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`text-[13px] px-4 py-3 cursor-pointer border-b-2 transition-all flex items-center gap-[7px] whitespace-nowrap ${
              activeTab === 'curl'
                ? 'text-green border-green font-semibold'
                : 'text-muted border-transparent hover:text-on-surface'
            }`}
          >
            <svg className="w-[13px] h-[13px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 8l3 3-3 3M11 14h5"/>
            </svg>
            curl
          </button>
          <button
            onClick={() => setActiveTab('hallucinate')}
            className={`text-[13px] px-4 py-3 cursor-pointer border-b-2 transition-all flex items-center gap-[7px] whitespace-nowrap ${
              activeTab === 'hallucinate'
                ? 'text-amber border-amber font-semibold'
                : 'text-muted border-transparent hover:text-on-surface'
            }`}
          >
            <svg className="w-[13px] h-[13px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3a7 7 0 100 14A7 7 0 0010 3z"/>
              <path d="M10 8v2l1.5 1.5"/>
              <path d="M7 6.5C7.5 5.5 8.7 5 10 5"/>
            </svg>
            ⚡ Hallucinate
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {activeTab === 'postman' && <PostmanTab copySnippet={copySnippet} />}
          {activeTab === 'curl' && <CurlTab copySnippet={copySnippet} />}
          {activeTab === 'hallucinate' && (
            <HallucinateTab
              activeScenario={activeScenario}
              setActiveScenario={setActiveScenario}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Postman Tab Component
const PostmanTab = ({ copySnippet }) => (
  <div>
    <StepRow num="1" title="Open your existing Postman collection">
      <p className="text-[13px] text-muted leading-[1.65]">
        Open the collection you already use to test your API. If you don't have one, create a new collection with a single request to any endpoint.
      </p>
    </StepRow>

    <StepRow num="2" title="Find your base URL variable">
      <p className="text-[13px] text-muted leading-[1.65]">
        Go to your Collection → Variables tab. Find the variable that holds your API base URL — often called <strong className="text-on-surface font-semibold">baseUrl</strong>, <strong className="text-on-surface font-semibold">host</strong>, or <strong className="text-on-surface font-semibold">API_URL</strong>.
      </p>
    </StepRow>

    <StepRow num="3" title="Replace the base URL with your invari proxy URL">
      <p className="text-[13px] text-muted leading-[1.65]">
        Paste your invari proxy URL as the Current Value of that variable. The Initial Value can stay as your real API.
      </p>
      <CodeSnippet copySnippet={copySnippet}>
        <span className="text-[#6a9955]"># Change this variable in Postman</span>{'\n'}
        <span className="text-[#9cdcfe]">CURRENT_VALUE</span>  <span className="text-[#6a9955]">(before)</span>  <span className="text-[#ce9178]">https://api.yourapp.com/v1</span>{'\n'}
        <span className="text-[#9cdcfe]">CURRENT_VALUE</span>  <span className="text-[#6a9955]">(after)</span>   <span className="text-[#ce9178]">https://proxy.invari.ai/agents/YOUR-ID/v1</span>
      </CodeSnippet>
    </StepRow>

    <StepRow num="4" title="Send any request">
      <p className="text-[13px] text-muted leading-[1.65]">
        Hit Send on any request in the collection. invari is now intercepting it. Your request goes: <strong className="text-on-surface font-semibold">Postman → invari proxy → your API</strong>.
      </p>
    </StepRow>

    <StepRow num="5" title="Check the response headers">
      <p className="text-[13px] text-muted leading-[1.65]">
        In the Postman response panel, click <strong className="text-on-surface font-semibold">Headers</strong>. Look for invari's response headers — they tell you what happened:
      </p>
      <CodeSnippet copySnippet={copySnippet}>
        <span className="text-[#9cdcfe]">x-invari-status</span>:      <span className="text-[#ce9178]">repaired</span>{'\n'}
        <span className="text-[#9cdcfe]">x-invari-confidence</span>:  <span className="text-[#b5cea8]">0.945</span>{'\n'}
        <span className="text-[#9cdcfe]">x-invari-overhead-ms</span>: <span className="text-[#b5cea8]">22</span>{'\n'}
        <span className="text-[#9cdcfe]">x-invari-repairs</span>:     <span className="text-[#b5cea8]">2</span>
      </CodeSnippet>
    </StepRow>

    <StepRow num="6" title="Open Live Traffic in the portal" isLast>
      <p className="text-[13px] text-muted leading-[1.65]">
        Go to your agent → <strong className="text-on-surface font-semibold">Live Traffic</strong> tab. You'll see the request appear within seconds with its full repair detail — original payload, repaired payload, and confidence score.
      </p>
    </StepRow>

    <TipBox>
      When you're done testing, just change the Postman variable back to your real base URL. invari only intercepts traffic routed through your proxy URL.
    </TipBox>
  </div>
);

// curl Tab Component
const CurlTab = ({ copySnippet }) => (
  <div>
    <StepRow num="1" title="Take your existing curl command">
      <p className="text-[13px] text-muted leading-[1.65] mb-2">
        Whatever curl command you currently use to test your API. Here's a typical example:
      </p>
      <CodeSnippet copySnippet={copySnippet}>
        <span className="text-[#6a9955]"># Before invari</span>{'\n'}
        curl -i -X POST <span className="text-[#ce9178]">https://api.yourapp.com/v1/patients</span>   -H <span className="text-[#ce9178]">"Content-Type: application/json"</span>   -d <span className="text-[#ce9178]">'{'{'}{'\n'}
        {'  '}"firstName": "Emily",{'\n'}
        {'  '}"nhsNumber": "9876543210",{'\n'}
        {'  '}"dateOfBirth": "tomorrow"{'\n'}
        {'}'}'</span>
      </CodeSnippet>
    </StepRow>

    <StepRow num="2" title="Change only the base URL — nothing else" isLast>
      <CodeSnippet copySnippet={copySnippet}>
        <span className="text-[#6a9955]"># After invari — one change</span>{'\n'}
        curl -i -X POST <span className="text-[#ce9178]">https://proxy.invari.ai/agents/YOUR-ID/v1/patients</span>   -H <span className="text-[#ce9178]">"Content-Type: application/json"</span>   -d <span className="text-[#ce9178]">'{'{'}{'\n'}
        {'  '}"firstName": "Emily",{'\n'}
        {'  '}"nhsNumber": "9876543210",{'\n'}
        {'  '}"dateOfBirth": "tomorrow"{'\n'}
        {'}'}'</span>
      </CodeSnippet>
    </StepRow>
  </div>
);

// Hallucinate Tab Component
const HallucinateTab = ({ activeScenario, setActiveScenario }) => (
  <div>
    {/* Intro Banner */}
    <div className="bg-gradient-to-br from-[#1b1c1a] to-[#2a2b29] rounded-[10px] p-[18px_20px] mb-5 flex items-start gap-[14px]">
      <div className="text-[22px] flex-shrink-0">⚡</div>
      <div>
        <div className="font-serif text-[16px] text-white mb-1">
          Send a hallucinated request. Watch invari fix it.
        </div>
        <div className="text-[13px] text-white/60 leading-[1.6]">
          These are real mistakes AI agents make every day — wrong types, natural language dates, misnamed fields, garbage values. Copy any payload below into your tool and send it through your proxy. invari will repair what it can and block what it can't.
        </div>
      </div>
    </div>

    {/* Scenario Picker */}
    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted mb-[10px]">
      Choose a hallucination scenario
    </div>
    <div className="grid grid-cols-3 gap-2 mb-5">
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          onClick={() => setActiveScenario(scenario.id)}
          className={`flex flex-col items-start gap-0.5 p-[12px_14px] border-[1.5px] rounded-[9px] bg-surface cursor-pointer text-left transition-all ${
            activeScenario === scenario.id
              ? 'border-amber bg-amber-dim'
              : 'border-outline hover:border-amber hover:bg-amber-dim'
          }`}
        >
          <span className="text-[15px]">{scenario.emoji}</span>
          <strong className="text-[12.5px] text-on-surface">{scenario.title}</strong>
          <span className="text-[11px] text-muted">{scenario.subtitle}</span>
        </button>
      ))}
    </div>

    {/* Active Scenario Content */}
    {scenarios.find(s => s.id === activeScenario)?.content}
  </div>
);

// Helper Components
const StepRow = ({ num, title, children, isLast }) => (
  <div className={`flex gap-[14px] ${!isLast ? 'mb-5' : ''}`}>
    <div className="w-[22px] h-[22px] rounded-full bg-on-surface text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-[1px]">
      {num}
    </div>
    <div className="flex-1">
      <h4 className="text-[13.5px] font-bold mb-1">{title}</h4>
      {children}
    </div>
  </div>
);

const CodeSnippet = ({ children, copySnippet }) => (
  <div className="bg-[#1e1e1e] rounded-[8px] p-[12px_14px] font-mono text-[11.5px] leading-[1.8] text-[#d4d4d4] my-2 relative overflow-hidden">
    <button
      onClick={(e) => copySnippet(e.target)}
      className="absolute top-2 right-[10px] bg-transparent border border-[#444] text-[#777] px-[9px] py-[2px] rounded text-[10px] font-mono cursor-pointer transition-all hover:text-[#ccc] hover:border-[#666]"
    >
      Copy
    </button>
    <pre className="whitespace-pre overflow-x-auto">{children}</pre>
  </div>
);

const TipBox = ({ children }) => (
  <div className="bg-green-bg border-l-[3px] border-green rounded-r-[6px] p-[11px_14px] text-[13px] leading-[1.65] text-[#065f46] mt-4 flex gap-[10px]">
    <svg className="w-[14px] h-[14px] flex-shrink-0 mt-[2px] opacity-70" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 5v4m0 3h.01"/>
    </svg>
    <div>{children}</div>
  </div>
);

const DiffBlock = ({ before, after, status, confidence, reason }) => (
  <div>
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start my-[10px]">
      <div className="rounded-[8px] overflow-hidden">
        <div className="px-3 py-[7px] bg-[#fee2e2] text-red font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
          Before
        </div>
        <div className="bg-[#1e1e1e] p-[12px_14px] font-mono text-[11.5px] leading-[1.9] text-[#d4d4d4]">
          <pre>{before}</pre>
        </div>
      </div>
      <div className="flex items-center justify-center pt-[14px] text-muted text-[18px] font-light">
        →
      </div>
      <div className="rounded-[8px] overflow-hidden">
        <div className={`px-3 py-[7px] font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
          status === 'blocked' ? 'bg-[#fee2e2] text-red' : 'bg-green-dim text-green'
        }`}>
          {status === 'blocked' ? 'Blocked' : 'After'}
        </div>
        <div className="bg-[#1e1e1e] p-[12px_14px] font-mono text-[11.5px] leading-[1.9] text-[#d4d4d4]">
          <pre>{after || '❌ Request blocked'}</pre>
        </div>
      </div>
    </div>
    <div className="bg-surface-container-low border border-outline rounded-[8px] p-[13px_16px] mt-[10px] text-[13px] leading-[1.7] flex gap-[10px] items-start">
      <svg className="w-[14px] h-[14px] flex-shrink-0 mt-[2px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="10" r="8"/>
        <path d="M10 6v4m0 4h.01"/>
      </svg>
      <div>
        {status === 'repaired' ? (
          <>
            <strong>invari repaired this request</strong> with confidence{' '}
            <span className="font-mono text-[11px] font-bold bg-green-dim text-green px-2 py-0.5 rounded-full inline-block">
              {confidence}
            </span>
          </>
        ) : (
          <>
            <strong>invari blocked this request.</strong> {reason}
          </>
        )}
      </div>
    </div>
  </div>
);

// Scenario Data
const scenarios = [
  {
    id: 'types',
    emoji: '🔢',
    title: 'Wrong types',
    subtitle: 'Strings where numbers expected',
    content: (
      <div>
        <p className="text-[13px] text-muted mb-3">AI agents often return strings when the API expects numbers, or vice versa.</p>
        <DiffBlock
          before={`{\n  "amount": "100.50",\n  "quantity": "5"\n}`}
          after={`{\n  "amount": 100.50,\n  "quantity": 5\n}`}
          status="repaired"
          confidence="0.98"
        />
      </div>
    ),
  },
  {
    id: 'dates',
    emoji: '📅',
    title: 'Natural language dates',
    subtitle: '"tomorrow", "next Friday"',
    content: (
      <div>
        <p className="text-[13px] text-muted mb-3">LLMs love to generate human-readable dates that APIs can't parse.</p>
        <DiffBlock
          before={`{\n  "dateOfBirth": "tomorrow",\n  "appointmentDate": "next Friday"\n}`}
          after={`{\n  "dateOfBirth": "2026-04-04",\n  "appointmentDate": "2026-04-09"\n}`}
          status="repaired"
          confidence="0.92"
        />
      </div>
    ),
  },
  {
    id: 'fields',
    emoji: '📛',
    title: 'Wrong field names',
    subtitle: 'snake_case vs camelCase drift',
    content: (
      <div>
        <p className="text-[13px] text-muted mb-3">Field naming conventions shift between snake_case and camelCase.</p>
        <DiffBlock
          before={`{\n  "customer_name": "John Doe",\n  "phone_number": "+1-555-0100"\n}`}
          after={`{\n  "customerName": "John Doe",\n  "phoneNumber": "+1-555-0100"\n}`}
          status="repaired"
          confidence="0.95"
        />
      </div>
    ),
  },
  {
    id: 'units',
    emoji: '⚖️',
    title: 'Wrong units',
    subtitle: '"500mg", "11 stone", "5ft 10"',
    content: (
      <div>
        <p className="text-[13px] text-muted mb-3">AI agents mix unit systems and include units in numeric fields.</p>
        <DiffBlock
          before={`{\n  "weight": "11 stone",\n  "height": "5ft 10in",\n  "dosage": "500mg"\n}`}
          after={`{\n  "weight": 69.85,\n  "height": 177.8,\n  "dosage": 500\n}`}
          status="repaired"
          confidence="0.89"
        />
      </div>
    ),
  },
  {
    id: 'enums',
    emoji: '📋',
    title: 'Enum mismatch',
    subtitle: '"twice a day" vs "twice_daily"',
    content: (
      <div>
        <p className="text-[13px] text-muted mb-3">Natural language values where specific enum constants are required.</p>
        <DiffBlock
          before={`{\n  "frequency": "twice a day",\n  "priority": "very high"\n}`}
          after={`{\n  "frequency": "twice_daily",\n  "priority": "high"\n}`}
          status="repaired"
          confidence="0.91"
        />
      </div>
    ),
  },
  {
    id: 'block',
    emoji: '🚫',
    title: 'Force a block',
    subtitle: 'Ambiguous values invari rejects',
    content: (
      <div>
        <p className="text-[13px] text-muted mb-3">Some hallucinations are too ambiguous to repair safely. invari blocks these.</p>
        <DiffBlock
          before={`{\n  "patientId": "maybe 12345 or 67890",\n  "diagnosis": "unknown"\n}`}
          after={null}
          status="blocked"
          reason="Ambiguous field values cannot be safely repaired"
        />
      </div>
    ),
  },
];

export default HowToTestModal;
