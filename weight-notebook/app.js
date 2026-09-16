const API_BASE = "./api";
const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);

const demoRecords = [
  { id: "d1", sessionId: "demo-5", exercise: "Bench press", equipment: "Barbell", weight: 135, reps: 8, setNumber: 1, performedAt: "2026-09-12T17:30:00.000Z" },
  { id: "d2", sessionId: "demo-5", exercise: "Bench press", equipment: "Barbell", weight: 135, reps: 8, setNumber: 2, performedAt: "2026-09-12T17:30:00.000Z" },
  { id: "d3", sessionId: "demo-5", exercise: "Bench press", equipment: "Barbell", weight: 135, reps: 7, setNumber: 3, performedAt: "2026-09-12T17:30:00.000Z" },
  { id: "d4", sessionId: "demo-4", exercise: "Dumbbell row", equipment: "Dumbbell", weight: 60, reps: 10, setNumber: 1, performedAt: "2026-09-12T17:50:00.000Z" },
  { id: "d5", sessionId: "demo-3", exercise: "Back squat", equipment: "Barbell", weight: 225, reps: 5, setNumber: 1, performedAt: "2026-09-09T16:20:00.000Z" },
  { id: "d6", sessionId: "demo-2", exercise: "Bench press", equipment: "Barbell", weight: 130, reps: 8, setNumber: 1, performedAt: "2026-09-05T17:30:00.000Z" },
  { id: "d7", sessionId: "demo-1", exercise: "Bench press", equipment: "Barbell", weight: 125, reps: 10, setNumber: 1, performedAt: "2026-08-29T17:30:00.000Z" }
];

const state = {
  authenticated: false,
  equipment: "Barbell",
  historyPeriod: "8 weeks",
  records: []
};

const elements = {
  appShell: document.querySelector(".app-shell"),
  appStatus: document.querySelector("#appStatus"),
  cancelLock: document.querySelector("#cancelLock"),
  chartDesc: document.querySelector("#chartDesc"),
  chartLabels: document.querySelector("#chartLabels"),
  chartMarks: document.querySelector("#chartMarks"),
  chartWrap: document.querySelector("#chartWrap"),
  exerciseSelect: document.querySelector("#exerciseSelect"),
  exerciseSuggestions: document.querySelector("#exerciseSuggestions"),
  historyRows: document.querySelector("#historyRows"),
  historyTab: document.querySelector("#historyTab"),
  historyView: document.querySelector("#historyView"),
  lastDate: document.querySelector("#lastDate"),
  lastEmpty: document.querySelector("#lastEmpty"),
  lastSets: document.querySelector("#lastSets"),
  bestLine: document.querySelector("#bestLine"),
  bestSet: document.querySelector("#bestSet"),
  lockButton: document.querySelector("#lockButton"),
  lockDialog: document.querySelector("#lockDialog"),
  lockError: document.querySelector("#lockError"),
  lockForm: document.querySelector("#lockForm"),
  passwordInput: document.querySelector("#passwordInput"),
  saveButton: document.querySelector("#saveButton"),
  saveMessage: document.querySelector("#saveMessage"),
  sessionNote: document.querySelector("#sessionNote"),
  setList: document.querySelector("#setList"),
  todayTab: document.querySelector("#todayTab"),
  todayView: document.querySelector("#todayView")
};

function normalizeExercise(value) {
  return value.trim().replace(/\s+/g, " ");
}

function formatWeight(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, "");
}

function formatDate(value, includeYear = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {})
  }).format(new Date(value));
}

function groupSessions(records = state.records) {
  const grouped = new Map();
  for (const record of records) {
    if (!grouped.has(record.sessionId)) {
      grouped.set(record.sessionId, {
        sessionId: record.sessionId,
        exercise: record.exercise,
        equipment: record.equipment,
        performedAt: record.performedAt,
        sets: []
      });
    }
    grouped.get(record.sessionId).sets.push(record);
  }
  return [...grouped.values()]
    .map(session => ({ ...session, sets: session.sets.sort((a, b) => a.setNumber - b.setNumber) }))
    .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt));
}

function sessionsForExercise(exercise) {
  const key = normalizeExercise(exercise).toLocaleLowerCase();
  return groupSessions().filter(session => session.exercise.toLocaleLowerCase() === key);
}

function getLastSession() {
  return sessionsForExercise(elements.exerciseSelect.value)[0] || null;
}

function setEquipment(equipment) {
  state.equipment = equipment;
  document.querySelectorAll("[data-equipment]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.equipment === equipment));
  });
}

function createSetRow(number, previousSet) {
  const row = document.createElement("div");
  row.className = "set-row";

  const setNumber = document.createElement("span");
  setNumber.className = "set-number";
  setNumber.textContent = String(number);

  const previous = document.createElement("span");
  previous.className = "previous";
  previous.textContent = previousSet ? `${formatWeight(previousSet.weight)} × ${previousSet.reps}` : "—";

  const weightLabel = document.createElement("label");
  weightLabel.className = "sr-only";
  weightLabel.htmlFor = `weight${number}`;
  weightLabel.textContent = `Set ${number} weight in pounds`;

  const weight = document.createElement("input");
  weight.className = "set-input weight-input";
  weight.id = `weight${number}`;
  weight.type = "number";
  weight.inputMode = "decimal";
  weight.min = "0";
  weight.step = "2.5";
  weight.placeholder = previousSet ? formatWeight(previousSet.weight) : "0";

  const repsLabel = document.createElement("label");
  repsLabel.className = "sr-only";
  repsLabel.htmlFor = `reps${number}`;
  repsLabel.textContent = `Set ${number} repetitions`;

  const reps = document.createElement("input");
  reps.className = "set-input reps-input";
  reps.id = `reps${number}`;
  reps.type = "number";
  reps.inputMode = "numeric";
  reps.min = "1";
  reps.step = "1";
  reps.placeholder = previousSet ? String(previousSet.reps) : "0";

  const complete = document.createElement("button");
  complete.className = "complete-button";
  complete.type = "button";
  complete.textContent = "✓";
  complete.setAttribute("aria-label", `Mark set ${number} complete`);
  complete.setAttribute("aria-pressed", "false");

  const markComplete = value => {
    row.classList.toggle("is-complete", value);
    complete.setAttribute("aria-pressed", String(value));
    complete.setAttribute("aria-label", `Mark set ${number} ${value ? "incomplete" : "complete"}`);
  };

  complete.addEventListener("click", () => {
    const next = !row.classList.contains("is-complete");
    if (next && (!weight.value || !reps.value)) {
      (weight.value ? reps : weight).focus();
      elements.saveMessage.textContent = "Add weight and reps before finishing the set.";
      return;
    }
    markComplete(next);
    elements.saveMessage.textContent = "";
  });

  const completeWhenFilled = () => {
    if (weight.value && reps.value) markComplete(true);
    elements.saveMessage.textContent = "";
  };
  weight.addEventListener("change", completeWhenFilled);
  reps.addEventListener("change", completeWhenFilled);
  reps.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      completeWhenFilled();
      const nextRow = row.nextElementSibling;
      if (nextRow?.classList.contains("set-row")) nextRow.querySelector(".weight-input").focus();
    }
  });

  row.append(setNumber, previous, weightLabel, weight, repsLabel, reps, complete);
  elements.setList.append(row);
  return row;
}

function resetSetRows(focus = false) {
  elements.setList.querySelectorAll(".set-row").forEach(row => row.remove());
  const last = getLastSession();
  const count = Math.max(last?.sets.length || 0, 3);
  for (let index = 0; index < count; index += 1) {
    createSetRow(index + 1, last?.sets[index] || last?.sets.at(-1));
  }
  if (focus) elements.setList.querySelector(".weight-input")?.focus();
}

function renderLastSession() {
  const last = getLastSession();
  elements.lastSets.replaceChildren();
  elements.lastEmpty.hidden = Boolean(last);
  elements.bestLine.hidden = !last;

  if (!last) {
    elements.lastDate.textContent = "—";
    elements.bestSet.textContent = "";
    return;
  }

  elements.lastDate.textContent = formatDate(last.performedAt);
  last.sets.forEach((set, index) => {
    const row = document.createElement("tr");
    const number = document.createElement("td");
    const result = document.createElement("td");
    number.textContent = String(index + 1);
    result.textContent = `${formatWeight(set.weight)} lb × ${set.reps}`;
    row.append(number, result);
    elements.lastSets.append(row);
  });

  const best = last.sets.reduce((current, set) => Number(set.weight) > Number(current.weight) ? set : current);
  elements.bestSet.textContent = `${formatWeight(best.weight)} lb × ${best.reps}`;
}

function renderChart() {
  const sessions = sessionsForExercise(elements.exerciseSelect.value).slice(0, 8).reverse();
  const topSets = sessions.map(session => ({
    performedAt: session.performedAt,
    weight: Math.max(...session.sets.map(set => Number(set.weight)))
  }));
  elements.chartMarks.replaceChildren();

  if (!topSets.length) {
    elements.chartDesc.textContent = "No recent top sets yet.";
    elements.chartWrap.setAttribute("aria-label", "No recent top sets yet");
    elements.chartLabels.firstElementChild.textContent = "—";
    elements.chartLabels.lastElementChild.textContent = "—";
    return;
  }

  const weights = topSets.map(set => set.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const spread = Math.max(max - min, 10);
  const points = topSets.map((set, index) => {
    const x = topSets.length === 1 ? 150 : 10 + (280 * index / (topSets.length - 1));
    const y = 120 - ((set.weight - min) / spread) * 78;
    return { x, y, ...set };
  });

  const svgNamespace = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(svgNamespace, "polyline");
  line.setAttribute("points", points.map(point => `${point.x},${point.y}`).join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#b84b40");
  line.setAttribute("stroke-width", "3");
  line.setAttribute("vector-effect", "non-scaling-stroke");
  elements.chartMarks.append(line);

  points.forEach(point => {
    const circle = document.createElementNS(svgNamespace, "circle");
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "#f7f4ec");
    circle.setAttribute("stroke", "#b84b40");
    circle.setAttribute("stroke-width", "2");
    circle.setAttribute("vector-effect", "non-scaling-stroke");
    elements.chartMarks.append(circle);
  });

  const exercise = normalizeExercise(elements.exerciseSelect.value);
  const description = `${exercise} top sets range from ${formatWeight(min)} to ${formatWeight(max)} pounds across ${topSets.length} sessions.`;
  elements.chartDesc.textContent = description;
  elements.chartWrap.setAttribute("aria-label", description);
  elements.chartLabels.firstElementChild.textContent = formatDate(topSets[0].performedAt);
  elements.chartLabels.lastElementChild.textContent = formatDate(topSets.at(-1).performedAt);
}

function filteredHistorySessions() {
  const sessions = groupSessions();
  if (state.historyPeriod === "All") return sessions;
  const cutoff = Date.now() - (56 * 24 * 60 * 60 * 1000);
  return sessions.filter(session => new Date(session.performedAt).getTime() >= cutoff);
}

function renderHistory() {
  const sessions = filteredHistorySessions();
  elements.historyRows.replaceChildren();
  if (!sessions.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "history-empty";
    cell.colSpan = 4;
    cell.textContent = "No lifts logged yet.";
    row.append(cell);
    elements.historyRows.append(row);
    return;
  }

  sessions.forEach(session => {
    const row = document.createElement("tr");
    const topSet = session.sets.reduce((current, set) => Number(set.weight) > Number(current.weight) ? set : current);
    const values = [
      formatDate(session.performedAt),
      session.exercise,
      `${formatWeight(topSet.weight)} × ${topSet.reps}`,
      String(session.sets.length)
    ];
    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    elements.historyRows.append(row);
  });
}

function updateSuggestions() {
  const existing = new Set([...elements.exerciseSuggestions.options].map(option => option.value.toLocaleLowerCase()));
  for (const session of groupSessions()) {
    if (existing.has(session.exercise.toLocaleLowerCase())) continue;
    const option = document.createElement("option");
    option.value = session.exercise;
    elements.exerciseSuggestions.append(option);
    existing.add(session.exercise.toLocaleLowerCase());
  }
}

function renderExercise(resetRows = true) {
  const last = getLastSession();
  if (last) setEquipment(last.equipment);
  renderLastSession();
  renderChart();
  if (resetRows) resetSetRows();
}

function renderAll() {
  updateSuggestions();
  renderExercise();
  renderHistory();
  const sessions = groupSessions();
  elements.sessionNote.textContent = `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`;
}

function selectTab(tab) {
  const isToday = tab === "today";
  elements.todayTab.setAttribute("aria-selected", String(isToday));
  elements.historyTab.setAttribute("aria-selected", String(!isToday));
  elements.todayView.hidden = !isToday;
  elements.historyView.hidden = isToday;
  elements.sessionNote.textContent = isToday
    ? `${groupSessions().length} ${groupSessions().length === 1 ? "session" : "sessions"}`
    : state.historyPeriod;
}

function setLocked(locked, message = "") {
  elements.appShell.inert = locked;
  elements.lockError.textContent = message;
  elements.passwordInput.value = "";
  if (locked && !elements.lockDialog.open) elements.lockDialog.showModal();
  if (!locked && elements.lockDialog.open) elements.lockDialog.close();
  if (locked) window.setTimeout(() => elements.passwordInput.focus(), 0);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    headers: options.body ? { "content-type": "application/json", ...options.headers } : options.headers,
    ...options
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || "Liftbook could not complete that request.");
    error.status = response.status;
    throw error;
  }
  return body;
}

async function loadRecords() {
  if (isLocalPreview) {
    state.records = [...demoRecords];
  } else {
    const body = await api("/lifts");
    state.records = body.sets || [];
  }
  renderAll();
}

function readCompletedSets() {
  return [...elements.setList.querySelectorAll(".set-row.is-complete")].map(row => ({
    weight: Number(row.querySelector(".weight-input").value),
    reps: Number(row.querySelector(".reps-input").value)
  })).filter(set => Number.isFinite(set.weight) && set.weight > 0 && Number.isInteger(set.reps) && set.reps > 0);
}

async function createLiftEntry(entry) {
  const exercise = normalizeExercise(entry.exercise);
  if (!exercise) throw new Error("Add an exercise name first.");
  if (!(["Barbell", "Dumbbell"].includes(entry.equipment))) throw new Error("Choose barbell or dumbbell.");
  if (!Array.isArray(entry.sets) || !entry.sets.length) throw new Error("Finish at least one set first.");

  const normalizedSets = entry.sets.map(set => ({ weight: Number(set.weight), reps: Number(set.reps) }));
  if (normalizedSets.some(set => !Number.isFinite(set.weight) || set.weight <= 0 || !Number.isInteger(set.reps) || set.reps <= 0)) {
    throw new Error("Each finished set needs a valid weight and rep count.");
  }

  if (isLocalPreview) {
    const sessionId = crypto.randomUUID();
    const performedAt = new Date().toISOString();
    normalizedSets.forEach((set, index) => state.records.unshift({
      id: crypto.randomUUID(), sessionId, exercise, equipment: entry.equipment,
      weight: set.weight, reps: set.reps, setNumber: index + 1, performedAt
    }));
  } else {
    await api("/lifts", {
      method: "POST",
      body: JSON.stringify({ exercise, equipment: entry.equipment, sets: normalizedSets })
    });
    await loadRecords();
  }

  if (isLocalPreview) renderAll();
  return { exercise, equipment: entry.equipment, setCount: normalizedSets.length };
}

async function saveCurrentExercise() {
  elements.saveMessage.textContent = "";
  const sets = readCompletedSets();
  if (!sets.length) {
    elements.saveMessage.textContent = "Finish at least one set first.";
    return;
  }

  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "Saving…";
  try {
    const result = await createLiftEntry({
      exercise: elements.exerciseSelect.value,
      equipment: state.equipment,
      sets
    });
    elements.saveMessage.textContent = `${result.setCount} ${result.setCount === 1 ? "set" : "sets"} saved.`;
    resetSetRows(true);
  } catch (error) {
    if (error.status === 401) {
      state.authenticated = false;
      setLocked(true, "Your session expired. Enter the password again.");
    } else {
      elements.saveMessage.textContent = error.message;
    }
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = "Save exercise";
  }
}

async function unlock(password) {
  if (isLocalPreview) {
    if (password !== "lift") throw new Error("For the local preview, use “lift”.");
  } else {
    await api("/session", { method: "POST", body: JSON.stringify({ password }) });
  }
  state.authenticated = true;
  setLocked(false);
  await loadRecords();
}

async function lock() {
  if (!isLocalPreview) {
    try { await api("/session", { method: "DELETE" }); } catch { /* Lock locally even if the request fails. */ }
  }
  state.authenticated = false;
  state.records = [];
  selectTab("today");
  setLocked(true);
}

async function initialize() {
  const today = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
  document.querySelector(".brand .date").textContent = today.replace(",", " ·");
  elements.appShell.classList.add("loading-state");

  if (isLocalPreview) {
    state.authenticated = true;
    await loadRecords();
    elements.appStatus.textContent = "Local preview · changes reset when the page reloads";
    elements.appShell.classList.remove("loading-state");
    return;
  }

  try {
    const session = await api("/session");
    if (session.authenticated) {
      state.authenticated = true;
      await loadRecords();
      setLocked(false);
    } else {
      setLocked(true);
    }
  } catch (error) {
    setLocked(true, error.message);
  } finally {
    elements.appShell.classList.remove("loading-state");
  }
}

document.querySelector("#addSetButton").addEventListener("click", () => {
  const rows = elements.setList.querySelectorAll(".set-row");
  const last = getLastSession();
  const row = createSetRow(rows.length + 1, last?.sets[rows.length] || last?.sets.at(-1));
  row.querySelector(".weight-input").focus();
});

document.querySelectorAll("[data-equipment]").forEach(button => {
  button.addEventListener("click", () => setEquipment(button.dataset.equipment));
});

document.querySelectorAll("[aria-label='History period'] button").forEach(button => {
  button.addEventListener("click", () => {
    state.historyPeriod = button.textContent.trim() === "ALL" ? "All" : "8 weeks";
    button.parentElement.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    renderHistory();
    elements.sessionNote.textContent = state.historyPeriod;
  });
});

elements.exerciseSelect.addEventListener("change", () => renderExercise());
elements.exerciseSelect.addEventListener("blur", () => renderExercise());
elements.saveButton.addEventListener("click", saveCurrentExercise);
elements.todayTab.addEventListener("click", () => selectTab("today"));
elements.historyTab.addEventListener("click", () => selectTab("history"));
elements.lockButton.addEventListener("click", lock);
elements.lockDialog.addEventListener("cancel", event => event.preventDefault());
elements.cancelLock.addEventListener("click", () => {
  if (state.authenticated) setLocked(false);
});

elements.lockForm.addEventListener("submit", async event => {
  event.preventDefault();
  const submit = elements.lockForm.querySelector("button[type='submit']");
  submit.disabled = true;
  submit.textContent = "Unlocking…";
  elements.lockError.textContent = "";
  try {
    await unlock(elements.passwordInput.value);
  } catch (error) {
    elements.lockError.textContent = error.message;
    elements.passwordInput.select();
  } finally {
    submit.disabled = false;
    submit.textContent = "Unlock";
  }
});

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  const tools = [
    {
      name: "log_lift_entry",
      title: "Log lift entry",
      description: "Save one barbell or dumbbell exercise with its completed weight and rep sets.",
      inputSchema: {
        type: "object",
        properties: {
          exercise: { type: "string", minLength: 1, maxLength: 100 },
          equipment: { type: "string", enum: ["Barbell", "Dumbbell"] },
          sets: {
            type: "array", minItems: 1, maxItems: 20,
            items: {
              type: "object",
              properties: { weight: { type: "number", exclusiveMinimum: 0 }, reps: { type: "integer", minimum: 1, maximum: 1000 } },
              required: ["weight", "reps"], additionalProperties: false
            }
          }
        },
        required: ["exercise", "equipment", "sets"], additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!state.authenticated) throw new Error("Liftbook must be unlocked first.");
        const result = await createLiftEntry(input);
        elements.exerciseSelect.value = result.exercise;
        renderAll();
        return result;
      }
    },
    {
      name: "read_lift_history",
      title: "Read lift history",
      description: "Read saved sessions, optionally filtered to one exercise.",
      inputSchema: {
        type: "object",
        properties: { exercise: { type: "string", minLength: 1, maxLength: 100 } },
        additionalProperties: false
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (!state.authenticated) throw new Error("Liftbook must be unlocked first.");
        const sessions = input.exercise ? sessionsForExercise(input.exercise) : groupSessions();
        return { sessions: sessions.slice(0, 50) };
      }
    }
  ];

  tools.forEach(tool => {
    try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch { /* Unsupported implementation. */ }
  });
}

registerWebMcpTools();
initialize();
