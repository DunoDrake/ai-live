#!/usr/bin/env node
// Read-only live viewer for OMP and Claude Code sessions.
// Reads ~/.omp/agent/sessions/**/*.jsonl and ~/.claude/projects/**/*.jsonl, never writes to them.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OMP_SESSIONS_ROOT = process.env.OMP_SESSIONS_DIR || path.join(os.homedir(), ".omp", "agent", "sessions");
const CLAUDE_CODE_SESSIONS_ROOT = process.env.CLAUDE_CODE_SESSIONS_DIR || path.join(os.homedir(), ".claude", "projects");
const SESSION_ROOTS = [
	{ root: OMP_SESSIONS_ROOT, source: "omp" },
	{ root: CLAUDE_CODE_SESSIONS_ROOT, source: "claude-code" },
];
const PORT = Number(process.env.PORT || 4873);
const ACTIVE_WINDOW_MS = 25000;
const EVENT_LIMIT = 60;
const SNAPSHOT_EVENTS = 60;
const TRACE_LIMIT = 80;

const cache = new Map();

function newState(file, source) {
	return {
		file, source, offset: 0, remainder: "",
		id: "", title: "", cwd: "", model: "", thinking: "", startedAt: "", lastAt: 0,
		ended: false, userCount: 0, assistantTurns: 0, lastUser: "", lastAssistant: "",
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
		context: null, compactions: 0, toolCounts: {}, pending: {},
		todo: null, todoVisibility: "", tasks: {}, errors: 0, seenResponses: new Set(),
		events: [], eventIds: new Set(), calls: {}, lastRole: "",
		trace: [], traceIds: new Set(),
	};
}

function textOf(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content.filter((part) => part && part.type === "text").map((part) => part.text).join("\n");
}

function clip(text, max) {
	const flat = String(text || "").replace(/\s+/g, " ").trim();
	return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
}

function pushEvent(state, event) {
	if (state.eventIds.has(event.id)) return false;
	state.eventIds.add(event.id);
	state.events.push(event);
	if (state.events.length > EVENT_LIMIT) {
		const dropped = state.events.shift();
		state.eventIds.delete(dropped.id);
		delete state.calls[dropped.id];
	}
	return true;
}

function pushTrace(state, trace) {
	if (state.traceIds.has(trace.id)) return;
	state.traceIds.add(trace.id);
	state.trace.push(trace);
	if (state.trace.length > TRACE_LIMIT) {
		const dropped = state.trace.shift();
		state.traceIds.delete(dropped.id);
	}
}

function traceMessage(state, entry, kind, label) {
	pushTrace(state, { id: kind + "-" + entry.id, kind, label: clip(label, 120), at: Date.parse(entry.timestamp) });
}

function recordAssistantEvents(state, entry) {
	const at = Date.parse(entry.timestamp);
	const parts = entry.message.content || [];
	const calls = parts.filter((part) => part.type === "toolCall");
	for (const part of calls) {
		const event = {
			id: part.id, kind: "call", tool: part.name, label: clip(part.intent || "", 90),
			at, state: "running", ms: null, lane: part.name === "task" ? "sub" : "tool",
		};
		if (pushEvent(state, event)) state.calls[part.id] = event;
	}
	if (!calls.length) {
		const text = clip(textOf(parts), 90);
		if (text) pushEvent(state, { id: "a-" + entry.id, kind: "reply", label: text, at });
	}
	state.lastRole = calls.length ? "assistantCall" : "assistantText";
}

function applyAssistant(state, entry) {
	const message = entry.message;
	state.assistantTurns += 1;
	const usage = message.usage;
	const isRepeat = message.responseId && state.seenResponses.has(message.responseId);
	if (message.responseId) state.seenResponses.add(message.responseId);
	if (usage && !isRepeat) {
		state.usage.input += usage.input || 0;
		state.usage.output += usage.output || 0;
		state.usage.cacheRead += usage.cacheRead || 0;
		state.usage.cacheWrite += usage.cacheWrite || 0;
		state.usage.cost += (usage.cost && usage.cost.total) || 0;
	}
	if (message.contextSnapshot) state.context = message.contextSnapshot.promptTokens;
	const text = clip(textOf(message.content), 600);
	if (text) state.lastAssistant = text;
	for (const part of message.content || []) {
		if (part.type !== "toolCall") continue;
		state.toolCounts[part.name] = (state.toolCounts[part.name] || 0) + 1;
		if (part.name === "task") state.tasks[part.id] = { id: part.id, status: "running", label: clip(taskLabel(part.arguments), 120) };
	}
	recordAssistantEvents(state, entry);
}

function taskLabel(args) {
	if (!args) return "subagent";
	const first = Array.isArray(args.tasks) && args.tasks[0];
	return (first && (first.name || first.task)) || args.i || "subagent";
}

function applyTodoResult(state, message, entry) {
	const details = message.details;
	if (!details || !Array.isArray(details.phases)) return;
	state.todo = details.phases;
	const tasks = details.phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
	pushTrace(state, {
		id: "todo-" + entry.id, kind: "todo", label: tasks + " tasks across " + details.phases.length + " phases",
		at: Date.parse(entry.timestamp), toolCallId: message.toolCallId,
	});
}

function applyToolResult(state, entry) {
	const message = entry.message;
	const started = state.pending[message.toolCallId];
	delete state.pending[message.toolCallId];
	const endedAt = Date.parse(entry.timestamp);
	const isError = message.isError === true;
	const ms = started ? endedAt - started.startedAt : null;
	if (isError) state.errors += 1;
	if (state.tasks[message.toolCallId]) state.tasks[message.toolCallId].status = isError ? "failed" : "done";
	if (message.toolName === "todo" && !isError) applyTodoResult(state, message, entry);
	const call = state.calls[message.toolCallId];
	if (call) { call.state = isError ? "error" : "done"; call.ms = ms; }
	pushEvent(state, {
		id: "r-" + message.toolCallId, kind: "result", tool: message.toolName, at: endedAt, ms,
		error: isError, lane: call ? call.lane : "tool",
	});
	pushTrace(state, {
		id: "tool-end-" + message.toolCallId, kind: isError ? "tool-error" : "tool-end",
		label: message.toolName || (started && started.tool) || "tool", at: endedAt, ms,
		toolCallId: message.toolCallId,
	});
	state.lastRole = "toolResult";
}

function applyCustom(state, entry) {
	const data = entry.data;
	if (entry.customType === "tool_execution_start") {
		const startedAt = Date.parse(data.startedAt);
		state.pending[data.toolCallId] = {
			tool: data.toolName, intent: data.intent || "", startedAt,
			args: clip(JSON.stringify(data.args || {}), 160),
		};
		pushTrace(state, {
			id: "tool-start-" + data.toolCallId, kind: "tool-start", tool: data.toolName,
			label: clip(data.intent || data.toolName || "tool", 120), at: startedAt, toolCallId: data.toolCallId,
		});
	} else if (entry.customType === "todo_hud_state") {
		state.todoVisibility = data.visibility || "";
		traceMessage(state, entry, "todo-visibility", "Todo " + (data.visibility || "changed"));
	} else if (entry.customType === "session_exit") {
		state.ended = true;
		traceMessage(state, entry, "session-end", "Session ended");
	}
}

function applyMessage(state, entry) {
	const role = entry.message && entry.message.role;
	if (role === "user") {
		state.userCount += 1; state.ended = false; state.lastRole = "user";
		state.lastUser = clip(textOf(entry.message.content), 300);
		pushEvent(state, { id: "u-" + entry.id, kind: "user", label: clip(state.lastUser, 90), at: Date.parse(entry.timestamp) });
		traceMessage(state, entry, "prompt", state.lastUser);
	} else if (role === "assistant") {
		applyAssistant(state, entry);
		const parts = Array.isArray(entry.message.content) ? entry.message.content : [];
		if (!parts.some((part) => part.type === "toolCall")) traceMessage(state, entry, "reply", textOf(entry.message.content));
	} else if (role === "toolResult") applyToolResult(state, entry);
}

function applyEntry(state, entry) {
	const stamp = Date.parse(entry.timestamp || "");
	if (stamp) state.lastAt = Math.max(state.lastAt, stamp);
	switch (entry.type) {
		case "session":
			state.id = entry.id; state.cwd = entry.cwd; state.startedAt = entry.timestamp;
			state.title = entry.title || state.title; traceMessage(state, entry, "session-start", state.title || "Session started"); break;
		case "title": case "title_change": state.title = entry.title || state.title; break;
		case "model_change": state.model = entry.model; traceMessage(state, entry, "model", entry.model || "Model changed"); break;
		case "thinking_level_change": state.thinking = entry.thinkingLevel; traceMessage(state, entry, "thinking", entry.thinkingLevel || "Thinking changed"); break;
		case "compaction": state.compactions += 1; traceMessage(state, entry, "compaction", "Context compacted"); break;
		case "custom": applyCustom(state, entry); break;
		case "message": applyMessage(state, entry); break;
		default: break;
	}
}

// --- Claude Code transcript format (~/.claude/projects/**/*.jsonl) -------
// Flat entries: {type:"user"|"assistant"|..., uuid, parentUuid, timestamp, cwd,
// sessionId, message:{role, model, content, usage}}. No session/title entry like
// OMP; title falls back to the first user message, usage fields use Anthropic's
// own names (input_tokens, cache_read_input_tokens, ...).
function ccTextOf(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	return content.filter((part) => part && part.type === "text").map((part) => part.text).join("\n");
}

function ccApplyAssistant(state, entry) {
	const message = entry.message || {};
	state.assistantTurns += 1;
	state.model = message.model || state.model;
	const usage = message.usage;
	if (usage) {
		state.usage.input += usage.input_tokens || 0;
		state.usage.output += usage.output_tokens || 0;
		state.usage.cacheRead += usage.cache_read_input_tokens || 0;
		state.usage.cacheWrite += usage.cache_creation_input_tokens || 0;
	}
	const parts = Array.isArray(message.content) ? message.content : [];
	const calls = parts.filter((part) => part.type === "tool_use");
	const at = Date.parse(entry.timestamp);
	for (const part of calls) {
		const event = {
			id: part.id, kind: "call", tool: part.name, label: clip(part.name || "", 90),
			at, state: "running", ms: null, lane: "tool",
		};
		if (pushEvent(state, event)) state.calls[part.id] = event;
		state.toolCounts[part.name] = (state.toolCounts[part.name] || 0) + 1;
		state.pending[part.id] = { tool: part.name, intent: "", startedAt: at };
	}
	const text = clip(ccTextOf(parts), 600);
	if (!calls.length && text) {
		state.lastAssistant = text;
		pushEvent(state, { id: "a-" + entry.uuid, kind: "reply", label: clip(text, 90), at });
	}
	pushTrace(state, { id: "cc-asst-" + entry.uuid, kind: calls.length ? "tool-start" : "reply", label: clip(calls.length ? calls[0].name : text, 120), at });
	state.lastRole = calls.length ? "assistantCall" : "assistantText";
}

function ccApplyUser(state, entry) {
	const message = entry.message || {};
	const content = message.content;
	const at = Date.parse(entry.timestamp);
	if (typeof content === "string") {
		state.userCount += 1; state.ended = false; state.lastRole = "user";
		state.lastUser = clip(content, 300);
		if (!state.title) state.title = clip(content, 80);
		pushEvent(state, { id: "u-" + entry.uuid, kind: "user", label: clip(state.lastUser, 90), at });
		pushTrace(state, { id: "cc-user-" + entry.uuid, kind: "prompt", label: clip(state.lastUser, 120), at });
		return;
	}
	if (!Array.isArray(content)) return;
	for (const part of content) {
		if (part.type !== "tool_result") continue;
		const started = state.pending[part.tool_use_id];
		delete state.pending[part.tool_use_id];
		const isError = part.is_error === true;
		if (isError) state.errors += 1;
		const call = state.calls[part.tool_use_id];
		const ms = started ? at - started.startedAt : null;
		if (call) { call.state = isError ? "error" : "done"; call.ms = ms; }
		pushEvent(state, {
			id: "r-" + part.tool_use_id, kind: "result", tool: call ? call.tool : "tool", at, ms,
			error: isError, lane: "tool",
		});
		pushTrace(state, {
			id: "cc-tool-end-" + part.tool_use_id, kind: isError ? "tool-error" : "tool-end",
			label: call ? call.tool : "tool", at, ms, toolCallId: part.tool_use_id,
		});
	}
	state.lastRole = "toolResult";
}

function ccApplyEntry(state, entry) {
	const stamp = Date.parse(entry.timestamp || "");
	if (stamp) state.lastAt = Math.max(state.lastAt, stamp);
	if (!state.id && entry.sessionId) state.id = entry.sessionId;
	if (!state.cwd && entry.cwd) state.cwd = entry.cwd;
	if (entry.type === "custom-title" && entry.customTitle) state.title = entry.customTitle;
	else if (entry.type === "assistant") ccApplyAssistant(state, entry);
	else if (entry.type === "user") ccApplyUser(state, entry);
	else if (entry.type === "system" && entry.subtype === "stop_hook_summary") state.lastRole = "toolResult";
}

function readNewLines(state) {
	const size = fs.statSync(state.file).size;
	if (size < state.offset) Object.assign(state, newState(state.file, state.source));
	if (size === state.offset) return;
	const fd = fs.openSync(state.file, "r");
	const buffer = Buffer.alloc(size - state.offset);
	fs.readSync(fd, buffer, 0, buffer.length, state.offset);
	fs.closeSync(fd);
	state.offset = size;
	const lines = (state.remainder + buffer.toString("utf8")).split("\n");
	state.remainder = lines.pop();
	const apply = state.source === "claude-code" ? ccApplyEntry : applyEntry;
	for (const line of lines) {
		if (!line) continue;
		try { apply(state, JSON.parse(line)); } catch { /* skip malformed line */ }
	}
}

function loadState(file, source) {
	let state = cache.get(file);
	if (!state) { state = newState(file, source); cache.set(file, state); }
	readNewLines(state);
	return state;
}

function safeReaddir(dir) {
	try { return fs.readdirSync(dir); } catch { return []; }
}

function listSessions() {
	const found = [];
	for (const { root, source } of SESSION_ROOTS) {
		for (const dir of safeReaddir(root)) {
			const full = path.join(root, dir);
			if (!fs.statSync(full).isDirectory()) continue;
			for (const name of safeReaddir(full)) {
				if (!name.endsWith(".jsonl") || name.startsWith("__")) continue;
				const file = path.join(full, name);
				found.push({ file, source, mtime: fs.statSync(file).mtimeMs, dir });
			}
		}
	}
	return found.sort((left, right) => right.mtime - left.mtime);
}

function planProgress(cwd) {
	const dir = path.join(cwd || "", "docs", "sessions");
	const plans = [];
	for (const name of safeReaddir(dir)) {
		if (!name.endsWith("-plan.md")) continue;
		const text = fs.readFileSync(path.join(dir, name), "utf8");
		const count = (mark) => (text.match(new RegExp("^\\s*- \\[" + mark + "\\]", "gm")) || []).length;
		plans.push({ name, pending: count(" "), done: count("x"), blocked: count("!") });
	}
	return plans;
}

function status(state, now) {
	if (state.ended) return "ended";
	if (Object.keys(state.pending).length) return "working";
	return now - Math.max(state.lastAt, fs.statSync(state.file).mtimeMs) < ACTIVE_WINDOW_MS ? "working" : "idle";
}

function snapshot(file, source) {
	const state = loadState(file, source);
	const now = Date.now();
	const pending = Object.entries(state.pending).map(([id, item]) => ({ id, ...item, ms: now - item.startedAt }));
	return {
		now, status: status(state, now), source: state.source, id: state.id, title: state.title, cwd: state.cwd, model: state.model,
		thinking: state.thinking, startedAt: state.startedAt, lastAt: state.lastAt,
		userCount: state.userCount, assistantTurns: state.assistantTurns, lastUser: state.lastUser,
		lastAssistant: state.lastAssistant, usage: state.usage, context: state.context,
		compactions: state.compactions, errors: state.errors, toolCounts: state.toolCounts,
		pending, todo: state.todo, todoVisibility: state.todoVisibility, lastRole: state.lastRole,
		events: state.events.slice(-SNAPSHOT_EVENTS), trace: state.trace.slice(-TRACE_LIMIT),
		tasks: Object.values(state.tasks).slice(-12), plans: planProgress(state.cwd),
	};
}

function sendJson(res, code, body) {
	res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
	res.end(JSON.stringify(body));
}

function resolveRequestedFile(requested) {
	const full = path.resolve(requested);
	if (!full.endsWith(".jsonl") || !fs.existsSync(full)) return null;
	for (const { root, source } of SESSION_ROOTS) {
		const prefix = path.resolve(root) + path.sep;
		if (full.startsWith(prefix)) return { file: full, source };
	}
	return null;
}

function handleApi(url, res) {
	if (url.pathname === "/api/sessions") {
		const rows = listSessions().slice(0, 30).map((item) => {
			const state = loadState(item.file, item.source);
			return { file: item.file, source: item.source, title: state.title || "(untitled)", cwd: state.cwd, mtime: item.mtime, status: status(state, Date.now()) };
		});
		return sendJson(res, 200, rows);
	}
	const requested = url.searchParams.get("file");
	const resolved = requested ? resolveRequestedFile(requested) : (({ file, source }) => file ? { file, source } : null)(listSessions()[0] || {});
	if (!resolved) return sendJson(res, 404, { error: "no session found" });
	return sendJson(res, 200, { file: resolved.file, source: resolved.source, ...snapshot(resolved.file, resolved.source) });
}

http.createServer((req, res) => {
	const url = new URL(req.url, "http://localhost");
	if (url.pathname.startsWith("/api/")) return handleApi(url, res);
	res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
	res.end(fs.readFileSync(path.join(HERE, "index.html")));
}).listen(PORT, "127.0.0.1", () => console.log("AI Live viewer: http://127.0.0.1:" + PORT));
