import { createServer } from 'node:http';

/**
 * A stand-in for Anthropic that records whether it was called at all.
 *
 * This is the instrument behind the phase's first acceptance criterion — "with
 * `aiEnabled: false`, zero outbound calls to Anthropic; prove it with a test
 * that fails if one is made." Pointing `ANTHROPIC_BASE_URL` at this server
 * means any request the SDK makes lands here and is counted, whatever code
 * path produced it. A test then asserts the count is zero.
 *
 * A zero-hit assertion is only worth anything if the counter can go up, so the
 * same server answers a real request convincingly enough for the LLM path to
 * succeed end to end. One test proves nothing arrives when the flag is off;
 * the next proves something does when it is on.
 *
 * Tests drive it over HTTP because it lives in the rig's process, not theirs:
 *
 *   GET  /__hits    → { count, requests: [{ method, path, model }] }
 *   POST /__reset   → clear the log
 *   POST /__mode    → { mode: 'ok' | 'error' | 'hang' | 'refusal' }
 */

const ANALYSIS = {
  summary: 'A summary written by the language model rather than picked from the note.',
  actions: ['ring the dentist', 'send the reading list'],
  tags: ['supervision', 'admin'],
};

export function startAnthropicRecorder(port) {
  const requests = [];
  let mode = 'ok';

  const server = createServer((request, response) => {
    const url = new URL(request.url, `http://localhost:${port}`);

    if (url.pathname === '/__hits') {
      return json(response, 200, { count: requests.length, requests });
    }

    if (url.pathname === '/__reset') {
      requests.length = 0;
      mode = 'ok';
      return json(response, 200, { ok: true });
    }

    if (url.pathname === '/__mode') {
      return readBody(request, (body) => {
        mode = body?.mode ?? 'ok';
        json(response, 200, { mode });
      });
    }

    // Anything else is the SDK talking to what it believes is Anthropic.
    readBody(request, (body) => {
      requests.push({
        method: request.method,
        path: url.pathname,
        model: body?.model ?? null,
      });

      if (mode === 'hang') return; // never answers — the SDK's timeout has to save us
      if (mode === 'error') return json(response, 500, { type: 'error', error: { type: 'api_error' } });

      json(response, 200, {
        id: 'msg_recorder',
        type: 'message',
        role: 'assistant',
        model: body?.model ?? 'claude-sonnet-5',
        content: [{ type: 'text', text: JSON.stringify(ANALYSIS) }],
        // A refusal arrives as a normal 200 with no content, which is exactly
        // why the engine checks stop_reason before reading the response.
        stop_reason: mode === 'refusal' ? 'refusal' : 'end_turn',
        stop_details: mode === 'refusal' ? { type: 'refusal', category: 'cyber' } : null,
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 34 },
      });
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

function readBody(request, done) {
  let raw = '';
  request.on('data', (chunk) => (raw += chunk));
  request.on('end', () => {
    try {
      done(raw ? JSON.parse(raw) : undefined);
    } catch {
      done(undefined);
    }
  });
}

function json(response, statusCode, body) {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

export { ANALYSIS };
