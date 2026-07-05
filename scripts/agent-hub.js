#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const hubDir = path.join(rootDir, '.agent-hub');
const tasksDir = path.join(hubDir, 'tasks');
const stateDir = path.join(hubDir, 'state');
const templatePath = path.join(hubDir, 'templates', 'task.md');
const tasksPath = path.join(stateDir, 'tasks.json');
const messagesPath = path.join(hubDir, 'messages.jsonl');

const allowedTypes = new Set([
  'analysis',
  'plan',
  'implementation',
  'review',
  'verify',
  'question',
  'handoff',
  'status',
]);

function ensureHub() {
  fs.mkdirSync(tasksDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  if (!fs.existsSync(tasksPath)) {
    writeJson(tasksPath, { schemaVersion: 1, tasks: [] });
  }
  if (!fs.existsSync(messagesPath)) {
    fs.writeFileSync(messagesPath, '', 'utf8');
  }
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return fallback;
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseOptions(args) {
  const values = [];
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      values.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }

  return { values, options };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'task';
}

function timestampId(title) {
  const now = new Date();
  const stamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-')
    .replace('Z', '');
  return `${stamp}-${slugify(title)}`;
}

function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

function loadState() {
  return readJson(tasksPath, { schemaVersion: 1, tasks: [] });
}

function saveState(state) {
  writeJson(tasksPath, state);
}

function findTask(state, taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  return task;
}

function appendMessage({ taskId, from, type, message }) {
  if (!allowedTypes.has(type)) {
    throw new Error(`Invalid note type "${type}". Allowed: ${Array.from(allowedTypes).join(', ')}`);
  }

  const record = {
    timestamp: new Date().toISOString(),
    taskId,
    from,
    type,
    message,
  };

  fs.appendFileSync(messagesPath, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

function readMessages(taskId) {
  if (!fs.existsSync(messagesPath)) return [];
  return fs.readFileSync(messagesPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((record) => record.taskId === taskId);
}

function updateTaskFilePhase(task, phase) {
  if (!task.file || !fs.existsSync(task.file)) return;
  const raw = fs.readFileSync(task.file, 'utf8');
  const updated = raw.replace(/## Current Phase\r?\n\r?\n`[^`]+`/, `## Current Phase\n\n\`${phase}\``);
  fs.writeFileSync(task.file, updated, 'utf8');
}

function commandNew(args) {
  const { values, options } = parseOptions(args);
  const title = values[0];
  if (!title) {
    throw new Error('Usage: agent-hub new "Task title" --goal "Goal" [--owner codex] [--implementer antigravity]');
  }

  const goal = options.goal || title;
  const owner = options.owner || 'codex';
  const implementer = options.implementer || 'antigravity';
  const taskId = timestampId(title);
  const taskFile = path.join(tasksDir, `${taskId}.md`);
  const template = fs.readFileSync(templatePath, 'utf8');

  const body = renderTemplate(template, {
    title,
    taskId,
    goal,
    owner,
    implementer,
  });

  fs.writeFileSync(taskFile, body, 'utf8');

  const state = loadState();
  const task = {
    id: taskId,
    title,
    phase: 'intake',
    owner,
    implementer,
    reviewer: 'codex',
    file: taskFile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.tasks.push(task);
  saveState(state);

  appendMessage({
    taskId,
    from: owner,
    type: 'status',
    message: `Task created. Implementer: ${implementer}. Goal: ${goal}`,
  });

  console.log(`Created task ${taskId}`);
  console.log(taskFile);
}

function commandList() {
  const state = loadState();
  if (state.tasks.length === 0) {
    console.log('No tasks yet.');
    return;
  }

  for (const task of state.tasks) {
    console.log(`${task.id}  [${task.phase}]  owner=${task.owner}  implementer=${task.implementer}  ${task.title}`);
  }
}

function commandStatus(args) {
  const taskId = args[0];
  if (!taskId) {
    commandList();
    return;
  }

  const state = loadState();
  const task = findTask(state, taskId);
  console.log(JSON.stringify(task, null, 2));
}

function commandPhase(args) {
  const { values, options } = parseOptions(args);
  const [taskId, phase] = values;
  if (!taskId || !phase) {
    throw new Error('Usage: agent-hub phase <taskId> <phase> [--owner name]');
  }

  const state = loadState();
  const task = findTask(state, taskId);
  task.phase = phase;
  if (options.owner) task.owner = options.owner;
  task.updatedAt = new Date().toISOString();
  saveState(state);
  updateTaskFilePhase(task, phase);

  appendMessage({
    taskId,
    from: options.owner || task.owner,
    type: 'status',
    message: `Phase changed to ${phase}. Current owner: ${task.owner}.`,
  });

  console.log(`Updated ${taskId} to phase ${phase}`);
}

function commandNote(args) {
  const { values, options } = parseOptions(args);
  const taskId = values[0];
  const from = options.from;
  const type = options.type || 'status';
  const message = options.message;

  if (!taskId || !from || !message) {
    throw new Error('Usage: agent-hub note <taskId> --from <agent> --type <type> --message "Text"');
  }

  const state = loadState();
  findTask(state, taskId);
  const record = appendMessage({ taskId, from, type, message });
  console.log(`Recorded ${record.type} note from ${record.from} for ${taskId}`);
}

function commandBrief(args) {
  const taskId = args[0];
  if (!taskId) {
    throw new Error('Usage: agent-hub brief <taskId>');
  }

  const state = loadState();
  const task = findTask(state, taskId);
  const body = fs.existsSync(task.file) ? fs.readFileSync(task.file, 'utf8') : '(task file missing)';
  const messages = readMessages(taskId);

  console.log(body.trimEnd());
  console.log('\n--- Recent Messages ---');
  if (messages.length === 0) {
    console.log('No messages yet.');
    return;
  }

  for (const record of messages.slice(-12)) {
    console.log(`[${record.timestamp}] ${record.from}/${record.type}: ${record.message}`);
  }
}

function commandHelp() {
  console.log(`Agent Hub

Usage:
  node scripts/agent-hub.js new "Title" --goal "Goal" [--owner codex] [--implementer antigravity]
  node scripts/agent-hub.js list
  node scripts/agent-hub.js status [taskId]
  node scripts/agent-hub.js phase <taskId> <phase> [--owner antigravity]
  node scripts/agent-hub.js note <taskId> --from <agent> --type <type> --message "Text"
  node scripts/agent-hub.js brief <taskId>
`);
}

function main() {
  ensureHub();
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'new':
      commandNew(args);
      break;
    case 'list':
      commandList(args);
      break;
    case 'status':
      commandStatus(args);
      break;
    case 'phase':
      commandPhase(args);
      break;
    case 'note':
      commandNote(args);
      break;
    case 'brief':
      commandBrief(args);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      commandHelp();
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
