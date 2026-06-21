// src/utils/glmClient.js — GLM-4.7 Flash API Client
// OpenAI-compatible endpoint via Z.ai / Zhipu AI.
// Offline-first: all calls are optional. Fallback to static text on failure.
// Usage:
//   import { glmChat, isGlmAvailable } from './glmClient.js';
//   const reply = await glmChat('你好', { system: '你是NPC' });
//   if (!reply.ok) { /* fallback */ }

// ── Configuration ──────────────────────────────────────

var GLM_BASE_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
var GLM_MODEL = 'glm-4.7-flash';
var GLM_TIMEOUT_MS = 15000;
var GLM_MAX_TOKENS = 512;

// 内置 API Key（测试版）— 正式版改为用户自行填写
var BUILTIN_API_KEY = 'd3b38ed607e147d883142cefd32f1c2d.x7SJpcZcMBPb3SPH';

// ── Settings Storage Key ───────────────────────────────

var LLM_SETTINGS_KEY = 'abyssal_whispers_llm';

/**
 * Load LLM settings from localStorage.
 * @returns {{ enabled: boolean, apiKey: string, baseUrl: string, model: string }}
 */
export function loadLlmSettings() {
  try {
    var stored = localStorage.getItem(LLM_SETTINGS_KEY);
    if (stored) {
      var parsed = JSON.parse(stored);
      // 用户自定义 key 优先；未填写时 fallback 到内置 key
      var _key = parsed.apiKey || BUILTIN_API_KEY;
      return {
        enabled: !!parsed.enabled || !parsed.apiKey, // 无用户 key 时自动启用内置
        apiKey: _key,
        baseUrl: parsed.baseUrl || GLM_BASE_URL,
        model: parsed.model || GLM_MODEL,
      };
    }
  } catch (e) { /* ignore */ }
  // 无存储设置 → 默认启用内置 key
  return { enabled: true, apiKey: BUILTIN_API_KEY, baseUrl: GLM_BASE_URL, model: GLM_MODEL };
}

/**
 * Save LLM settings to localStorage.
 */
export function saveLlmSettings(settings) {
  try {
    localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify({
      enabled: !!settings.enabled,
      apiKey: settings.apiKey || '',
      baseUrl: settings.baseUrl || GLM_BASE_URL,
      model: settings.model || GLM_MODEL,
    }));
  } catch (e) { /* ignore */ }
}

/**
 * Check if GLM is configured and enabled.
 * @returns {boolean}
 */
export function isGlmAvailable() {
  var s = loadLlmSettings();
  // 有用户 key 或内置 key 均可用
  return s.enabled && (s.apiKey.length > 10 || BUILTIN_API_KEY.length > 10);
}

// ── Rate Limiter ───────────────────────────────────────

var _lastCallTime = 0;
var _minIntervalMs = 2000;

function _canCallNow() {
  var now = Date.now();
  if (now - _lastCallTime < _minIntervalMs) return false;
  _lastCallTime = now;
  return true;
}

// ── Cache ──────────────────────────────────────────────

var _responseCache = new Map();
var CACHE_MAX_SIZE = 50;

function _cacheKey(messages) {
  var sys = '';
  var usr = '';
  for (var i = 0; i < messages.length; i++) {
    if (messages[i].role === 'system') sys = messages[i].content;
    if (messages[i].role === 'user') usr = messages[i].content;
  }
  return sys.slice(0, 80) + '||' + usr.slice(0, 120);
}

function _getCached(key) {
  var entry = _responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > 5 * 60 * 1000) {
    _responseCache.delete(key);
    return null;
  }
  return entry.text;
}

function _setCache(key, text) {
  if (_responseCache.size >= CACHE_MAX_SIZE) {
    var firstKey = _responseCache.keys().next().value;
    _responseCache.delete(firstKey);
  }
  _responseCache.set(key, { text: text, time: Date.now() });
}

// ── Main API ───────────────────────────────────────────

/**
 * Send a chat completion request to GLM-4.7 Flash.
 *
 * @param {string} userMessage - User message content
 * @param {object} [opts]
 * @param {string} [opts.system]       - System prompt
 * @param {Array}  [opts.history]      - Previous messages [{role, content}]
 * @param {number} [opts.maxTokens]    - Max response tokens (default 512)
 * @param {number} [opts.temperature]  - Temperature 0-1 (default 0.8)
 * @param {boolean} [opts.noCache]     - Skip cache
 * @param {AbortSignal} [opts.signal]  - External abort signal (for component unmount)
 * @returns {Promise<{ ok: boolean, text: string, error: string|null, cached: boolean }>}
 */
export async function glmChat(userMessage, opts) {
  var options = opts || {};

  // Guard: not enabled
  var settings = loadLlmSettings();
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, text: '', error: 'LLM not enabled', cached: false };
  }

  // Guard: rate limit (immediate reject, no queuing)
  if (!_canCallNow()) {
    return { ok: false, text: '', error: 'Rate limited', cached: false };
  }

  return _doFetch(userMessage, options);
}

/**
 * Clear the response cache.
 */
export function clearGlmCache() {
  _responseCache.clear();
}

/**
 * Get current LLM status for UI display.
 * @returns {{ enabled: boolean, configured: boolean, model: string }}
 */
export function getGlmStatus() {
  var s = loadLlmSettings();
  return {
    enabled: s.enabled,
    configured: s.apiKey.length > 10,
    model: s.model || GLM_MODEL,
  };
}

// ── Queue (for batch requests like death summary) ────────

var _queue = [];
var _queueProcessing = false;

function _processQueue() {
  if (_queueProcessing) return;
  if (_queue.length === 0) return;
  _queueProcessing = true;
  _processNext();
}

function _processNext() {
  if (_queue.length === 0) {
    _queueProcessing = false;
    return;
  }
  var task = _queue.shift();
  var waitMs = 0;
  var now = Date.now();
  if (now - _lastCallTime < _minIntervalMs) {
    waitMs = _minIntervalMs - (now - _lastCallTime);
  }
  setTimeout(function () {
    _lastCallTime = Date.now();
    _doFetch(task.userMessage, task.options).then(function (result) {
      task.resolve(result);
      _processNext();
    });
  }, waitMs);
}

/**
 * Internal fetch — shared by glmChat and glmChatQueued.
 * Handles message building, cache check, fetch with timeout.
 * Does NOT check rate limit (caller is responsible).
 */
async function _doFetch(userMessage, options) {
  options = options || {};
  var settings = loadLlmSettings();
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, text: '', error: 'LLM not enabled', cached: false };
  }

  // Build messages
  var messages = [];
  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }
  if (options.history && Array.isArray(options.history)) {
    for (var i = 0; i < options.history.length; i++) {
      var h = options.history[i];
      if (h && h.role && h.content) {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }
  messages.push({ role: 'user', content: userMessage });

  // Check cache
  if (!options.noCache) {
    var cKey = _cacheKey(messages);
    var cached = _getCached(cKey);
    if (cached !== null) {
      return { ok: true, text: cached, error: null, cached: true };
    }
  }

  // Fetch with timeout
  var controller = null;
  var timeoutId = null;

  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timeoutId = setTimeout(function () { controller.abort(); }, GLM_TIMEOUT_MS);
    }

    // Chain external abort signal (component unmount) with internal timeout
    if (options.signal) {
      options.signal.addEventListener('abort', function () {
        if (controller) controller.abort();
      }, { once: true });
    }

    var response = await fetch(settings.baseUrl || GLM_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + settings.apiKey,
      },
      body: JSON.stringify({
        model: settings.model || GLM_MODEL,
        messages: messages,
        max_tokens: options.maxTokens || GLM_MAX_TOKENS,
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.8,
        stream: false,
      }),
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      var errBody = '';
      try { errBody = await response.text(); } catch (e) { /* ignore */ }
      return {
        ok: false,
        text: '',
        error: 'HTTP ' + response.status + ': ' + errBody.slice(0, 200),
        cached: false,
      };
    }

    var data = await response.json();
    var reply = '';
    if (data.choices && data.choices.length > 0) {
      reply = (data.choices[0].message && data.choices[0].message.content) || '';
    }
    reply = reply.trim();

    // Cache result
    if (!options.noCache && reply) {
      var ck = _cacheKey(messages);
      _setCache(ck, reply);
    }

    return { ok: true, text: reply, error: null, cached: false };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    var errMsg = err && err.name === 'AbortError'
      ? 'Request timeout (' + GLM_TIMEOUT_MS + 'ms)'
      : (err && err.message) || 'Network error';
    return { ok: false, text: '', error: errMsg, cached: false };
  }
}

/**
 * Queued version of glmChat — serializes requests through a FIFO queue
 * with rate-limit intervals between each call.
 * Use for batch scenarios (e.g. death summary 4 sections + afterglow).
 *
 * Each queued call returns a Promise that resolves when that specific
 * request is actually sent and responded to. Calls are serialized:
 * only one in-flight request at a time, with _minIntervalMs gaps.
 *
 * @param {string} userMessage
 * @param {object} [opts] — same as glmChat
 * @returns {Promise<{ ok, text, error, cached }>}
 */
export function glmChatQueued(userMessage, opts) {
  return new Promise(function (resolve) {
    _queue.push({ userMessage: userMessage, options: opts || {}, resolve: resolve });
    _processQueue();
  });
}

/**
 * Clear the queue (e.g. on component unmount or new game).
 * Pending tasks resolve immediately with a rate-limit error.
 */
export function clearGlmQueue() {
  var pending = _queue.splice(0);
  _queueProcessing = false;
  for (var i = 0; i < pending.length; i++) {
    pending[i].resolve({ ok: false, text: '', error: 'Queue cleared', cached: false });
  }
}
