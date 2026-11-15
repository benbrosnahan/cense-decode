// A stand-in for the Anthropic Messages API, so the Playwright suite drives the real /api/decode route, the real
// SDK and the real normalizer without spending money or depending on what a model happens to say.
//
// The route's SDK is pointed here with ANTHROPIC_BASE_URL (see lib/serve-with-mock.mjs). The mock streams the
// same server-sent events the API streams for a tool call: message_start, a tool_use block whose input arrives as
// input_json_delta chunks, message_delta with the stop reason, message_stop.
//
// It also refuses, with a 400, every request Claude Opus 5.5 refuses (checked against Anthropic's docs,
// 2026-11-15): a tool_choice of type "tool" or "any", thinking switched off, temperature, top_p or top_k, an
// assistant prefill, and a strict tool whose objects do not all set additionalProperties: false. A route that
// still sends any of these fails every test that reaches the model.
//
// A test picks what the "model" does by writing a marker into the text it decodes:
//   [[mock:<scenario>]]   one of SCENARIOS below
//   [[topic:<topic>]]     overrides the topic the model classifies the input into
// Without a marker, the two example inputs from lib/decode-fixtures.mjs get their canned decodes and anything
// else gets a plain yellow decode.
import http from 'node:http';
import { CARD_DECODE, CARD_OFFER, SCAM_DECODE, SCAM_TEXT } from './decode-fixtures.mjs';

const toToolInput = ({ goDeeper, ...rest }, topic) => ({ considerations: [], ...rest, topic });

const GENERIC = {
  plainLanguage: 'This is a short, ordinary money message with nothing unusual in it.',
  analogy: 'It is like a receipt: a record of something, not a request.',
  worry: { level: 'yellow', headline: 'Worth understanding, but nothing here is urgent.', basedOn: ['No deadline is mentioned.'] },
  jargon: [],
  nextStep: 'Keep it with your other records in case you need it later.',
  considerations: [],
  topic: 'general-finance',
  disclaimer: 'This is a plain-language explainer, not financial advice. Check with your bank if unsure.',
};

// The model calls it calm. Used to prove the server never lets scam or urgency wording through as green.
const GREEN = {
  ...GENERIC,
  plainLanguage: 'This message is about your account.',
  analogy: 'It is like a note on the fridge.',
  worry: { level: 'green', headline: 'Nothing here to act on, you can relax.', basedOn: ['A short message.'] },
  topic: 'none',
};

export const SCENARIOS = {
  // A normal decode, chosen by input (see pick()).
  ok: { input: GENERIC },
  // A red read, as for a real past-due notice.
  red: {
    input: {
      ...GENERIC,
      worry: { level: 'red', headline: 'This has a real cost and a clock.', basedOn: ['32 days past due.'] },
      topic: 'credit-card',
    },
  },
  // The model returns green. Whether that survives depends on the input's wording.
  green: { input: GREEN },
  // Green again, but the model's own explanation names a scam cue. For screenshots, where the server never sees
  // the text, this is the only place the cue shows up.
  'green-explains-gift-cards': {
    input: { ...GREEN, plainLanguage: 'This screenshot asks you to pay a fee with Apple gift cards to unlock your refund.' },
  },
  // A yellow card-offer read whose explanation rules a scam out.
  'yellow-not-a-scam': {
    input: { ...GENERIC, plainLanguage: 'This is a normal card offer, not a scam. It pays a little back on dining.', topic: 'credit-card' },
  },
  // The terms come back reworded, not as the student wrote them.
  'terms-reworded': {
    input: {
      ...GENERIC,
      plainLanguage: 'An unsubsidized loan starts adding interest as soon as the money is paid out.',
      jargon: [
        { term: 'unsubsidized loan', definition: 'A loan that adds interest from day one, even while you are in school.' },
        { term: 'interest', definition: 'What borrowing costs you over time.' },
      ],
      topic: 'student-loan',
    },
  },
  // Output hits the token cap partway through jargon: nextStep, topic and disclaimer never arrive.
  'max-tokens': { input: GENERIC, cutAt: 'jargon', stopReason: 'max_tokens' },
  // Same, but the cut lands inside the worry object.
  'max-tokens-early': { input: GENERIC, cutAt: 'basedOn', stopReason: 'max_tokens' },
  // The model declines partway.
  refusal: { input: GENERIC, cutAt: 'analogy', stopReason: 'refusal' },
  // With tool_choice auto the model answers in text and never calls the tool. Asked once more, it calls it.
  'no-tool': { text: 'Here is what this means in plain words.', thenInput: GENERIC },
  // It answers in text both times.
  'no-tool-ever': { text: 'Here is what this means in plain words.' },
  // A short text block first, then the tool call at index 1.
  'text-first': { input: GENERIC, leadText: 'Decoding it now.' },
  // The API itself fails. The message carries a sentinel a test looks for in what reaches the browser.
  'api-error': { status: 401, error: { type: 'authentication_error', message: 'MOCK-SENTINEL invalid x-api-key sk-ant-mock' } },
  'api-overloaded': { status: 529, error: { type: 'overloaded_error', message: 'MOCK-SENTINEL overloaded' } },
};

function textOf(body) {
  const parts = [];
  for (const m of body?.messages ?? []) {
    const content = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content ?? [];
    for (const block of content) if (block.type === 'text') parts.push(block.text);
  }
  return parts.join('\n');
}

function pick(text) {
  const name = text.match(/\[\[mock:([\w-]+)\]\]/)?.[1];
  const topic = text.match(/\[\[topic:([\w-]+)\]\]/)?.[1];
  let scenario;
  if (name) scenario = SCENARIOS[name];
  else if (text.includes(CARD_OFFER.slice(0, 40))) scenario = { input: toToolInput(CARD_DECODE, 'credit-card') };
  else if (text.includes(SCAM_TEXT.slice(0, 40))) scenario = { input: toToolInput(SCAM_DECODE, 'none') };
  else scenario = SCENARIOS.ok;
  if (!scenario) throw new Error(`unknown mock scenario ${name}`);
  if (topic && scenario.input) scenario = { ...scenario, input: { ...scenario.input, topic } };
  return scenario;
}

/** Why Claude Opus 5.5 would refuse this request, or null when it would accept it. */
export function refusalReason(body) {
  const choice = body?.tool_choice?.type;
  if (choice === 'tool' || choice === 'any') return `tool_choice.type "${choice}" is not supported with this model`;
  if (body?.thinking?.type === 'disabled') return 'thinking cannot be disabled for this model';
  for (const k of ['temperature', 'top_p', 'top_k']) if (k in (body ?? {})) return `${k} is not supported with this model`;
  if (body?.messages?.[0]?.role === 'assistant' || (body?.messages?.length > 1 && body.messages.at(-1).role === 'assistant')) {
    return 'assistant prefill is not supported with this model';
  }
  const open = [];
  const walk = (node, at) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${at}[${i}]`));
    if (!node || typeof node !== 'object') return;
    if (node.type === 'object' && node.additionalProperties !== false) open.push(at);
    for (const [k, v] of Object.entries(node)) walk(v, `${at}.${k}`);
  };
  for (const tool of body?.tools ?? []) if (tool.strict) walk(tool.input_schema, tool.name);
  if (open.length) return `strict tool objects need additionalProperties: false (${open.join(', ')})`;
  return null;
}

const sse = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;

function textBlock(index, text) {
  return (
    sse('content_block_start', { index, content_block: { type: 'text', text: '' } }) +
    sse('content_block_delta', { index, delta: { type: 'text_delta', text } }) +
    sse('content_block_stop', { index })
  );
}

function streamBody(scenario, model, turn) {
  const start = sse('message_start', {
    message: {
      id: 'msg_mock', type: 'message', role: 'assistant', model, content: [],
      stop_reason: null, stop_sequence: null, usage: { input_tokens: 120, output_tokens: 1 },
    },
  });
  // A text-only answer: the first time for 'no-tool', every time for 'no-tool-ever'.
  if (scenario.text && !(scenario.thenInput && turn > 1)) {
    return (
      start +
      textBlock(0, scenario.text) +
      sse('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 12 } }) +
      sse('message_stop', {})
    );
  }
  const input = scenario.input ?? scenario.thenInput;
  let json = JSON.stringify(input);
  if (scenario.cutAt) {
    const at = json.indexOf(`"${scenario.cutAt}"`);
    json = json.slice(0, at + Math.floor(scenario.cutAt.length / 2) + 1);
  }
  const chunks = json.match(/.{1,24}/gs) ?? [];
  let out = start;
  const index = scenario.leadText ? 1 : 0;
  if (scenario.leadText) out += textBlock(0, scenario.leadText);
  out += sse('content_block_start', { index, content_block: { type: 'tool_use', id: 'toolu_mock', name: 'decode', input: {} } });
  for (const c of chunks) out += sse('content_block_delta', { index, delta: { type: 'input_json_delta', partial_json: c } });
  out += sse('content_block_stop', { index });
  out += sse('message_delta', { delta: { stop_reason: scenario.stopReason ?? 'tool_use', stop_sequence: null }, usage: { output_tokens: chunks.length * 6 } });
  out += sse('message_stop', {});
  return out;
}

/** Starts the mock on `port` (0 picks a free one). Resolves to { server, port, requests }. */
export function startMockAnthropic(port = 0) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', d => (raw += d));
    req.on('end', () => {
      if (req.method !== 'POST' || !req.url.startsWith('/v1/messages')) {
        res.writeHead(404, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: 'mock: not found' } }));
      }
      let body = {};
      try { body = JSON.parse(raw); } catch { /* answered below */ }
      requests.push(body);
      const refused = refusalReason(body);
      if (refused) {
        res.writeHead(400, { 'content-type': 'application/json', 'request-id': 'req_mock', 'x-should-retry': 'false' });
        return res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: `mock: ${refused}` } }));
      }
      let scenario;
      try {
        scenario = pick(textOf(body));
      } catch (e) {
        res.writeHead(400, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: String(e.message) } }));
      }
      if (scenario.status) {
        res.writeHead(scenario.status, { 'content-type': 'application/json', 'request-id': 'req_mock', 'x-should-retry': 'false' });
        return res.end(JSON.stringify({ type: 'error', error: scenario.error }));
      }
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'request-id': 'req_mock' });
      res.end(streamBody(scenario, body.model ?? 'mock', (body.messages ?? []).filter(m => m.role === 'user').length));
    });
  });
  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port, requests }));
  });
}
