import {
  addAnonymousResponse,
  calculateSurveyStats,
  cloneDraft,
  createDefaultSurveys,
  createSurveyFromDraft,
  draftFromSurvey,
  duplicateSurvey,
  emptyDraft,
  loadSurveys,
  saveSurveys,
  updateSurveyFromDraft,
} from "./survey-core.js";

const app = document.querySelector("#app");
const initialSurveys = loadSurveys() ?? createDefaultSurveys();

const state = {
  surveys: initialSurveys,
  activeSurveyId: initialSurveys[0]?.id ?? null,
  view: "respond",
  editorDraft: emptyDraft(),
  editingSurveyId: null,
  history: [],
  toast: {
    type: "success",
    message: "Survey data loaded and ready.",
  },
};

saveSurveys(state.surveys);

const icons = {
  add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h10v10H8z"/><path d="M6 16H4V4h12v2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14 7 3 3"/></svg>',
  results: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-4 16-4-6z"/><path d="m12 14 8-10"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 1 1 0 12h-1"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function snapshot() {
  return {
    surveys: structuredClone(state.surveys),
    activeSurveyId: state.activeSurveyId,
    view: state.view,
    editorDraft: cloneDraft(state.editorDraft),
    editingSurveyId: state.editingSurveyId,
  };
}

function withHistory(label, action, message) {
  state.history = [{ label, snapshot: snapshot() }, ...state.history].slice(0, 8);

  try {
    action();
    saveSurveys(state.surveys);
    state.toast = { type: "success", message, undoable: true };
  } catch (error) {
    state.history.shift();
    state.toast = { type: "error", message: error.message };
  }

  render();
}

function getActiveSurvey() {
  return state.surveys.find((survey) => survey.id === state.activeSurveyId) ?? state.surveys[0] ?? null;
}

function totals() {
  const responseCount = state.surveys.reduce(
    (sum, survey) => sum + (survey.responses?.length ?? 0),
    0,
  );
  const questionCount = state.surveys.reduce(
    (sum, survey) => sum + (survey.questions?.length ?? 0),
    0,
  );

  return {
    surveys: state.surveys.length,
    responses: responseCount,
    questions: questionCount,
  };
}

function buttonIcon(name, label) {
  return `${icons[name] ?? ""}<span>${label}</span>`;
}

function render() {
  const activeSurvey = getActiveSurvey();
  const summary = totals();

  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div>
            <p class="eyebrow">Survey App</p>
            <h1>PulseBoard</h1>
          </div>
        </div>
        <button class="ghost-button" type="button" data-action="undo" ${state.history.length ? "" : "disabled"}>
          ${buttonIcon("undo", "Undo")}
        </button>
      </header>

      ${renderToast()}

      <section class="summary-grid" aria-label="Survey summary">
        ${renderMetric("Surveys", summary.surveys)}
        ${renderMetric("Questions", summary.questions)}
        ${renderMetric("Anonymous responses", summary.responses)}
      </section>

      <nav class="tabs" aria-label="Application views">
        ${renderTab("respond", "Respond")}
        ${renderTab("results", "Results")}
        ${renderTab("admin", "Admin")}
      </nav>

      <section class="workspace">
        <aside class="survey-rail" aria-label="Available surveys">
          <div class="rail-heading">
            <h2>Surveys</h2>
            <button class="icon-button" type="button" data-action="new-survey" title="New survey" aria-label="New survey">
              ${icons.add}
            </button>
          </div>
          <div class="survey-list">
            ${state.surveys.map((survey) => renderSurveyCard(survey, activeSurvey?.id === survey.id)).join("")}
          </div>
        </aside>

        <section class="workspace-panel" aria-live="polite">
          ${renderCurrentView(activeSurvey)}
        </section>
      </section>
    </main>
  `;
}

function renderToast() {
  if (!state.toast) {
    return "";
  }

  return `
    <div class="toast ${state.toast.type === "error" ? "toast-error" : ""}" role="status">
      <span>${escapeHtml(state.toast.message)}</span>
      ${
        state.toast.undoable
          ? `<button type="button" data-action="undo">${buttonIcon("undo", "Undo")}</button>`
          : ""
      }
    </div>
  `;
}

function renderMetric(label, value) {
  return `
    <article class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderTab(view, label) {
  return `
    <button type="button" class="tab ${state.view === view ? "is-active" : ""}" data-action="set-view" data-view="${view}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderSurveyCard(survey, isActive) {
  const stats = calculateSurveyStats(survey);

  return `
    <article class="survey-card ${isActive ? "is-active" : ""}">
      <button type="button" class="survey-picker" data-action="select-survey" data-survey-id="${survey.id}">
        <span>${escapeHtml(survey.title)}</span>
        <small>${stats.responseCount} responses</small>
      </button>
      <div class="card-actions">
        <button type="button" data-action="edit-survey" data-survey-id="${survey.id}" title="Edit survey" aria-label="Edit ${escapeHtml(survey.title)}">
          ${icons.edit}
        </button>
        <button type="button" data-action="duplicate-survey" data-survey-id="${survey.id}" title="Duplicate survey" aria-label="Duplicate ${escapeHtml(survey.title)}">
          ${icons.copy}
        </button>
        <button type="button" data-action="show-results" data-survey-id="${survey.id}" title="Show results" aria-label="Show results for ${escapeHtml(survey.title)}">
          ${icons.results}
        </button>
      </div>
    </article>
  `;
}

function renderCurrentView(activeSurvey) {
  if (!activeSurvey) {
    return renderAdminView();
  }

  if (state.view === "results") {
    return renderResultsView(activeSurvey);
  }

  if (state.view === "admin") {
    return renderAdminView();
  }

  return renderRespondView(activeSurvey);
}

function renderRespondView(survey) {
  return `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Anonymous response</p>
        <h2>${escapeHtml(survey.title)}</h2>
        <p>${escapeHtml(survey.description || "No description provided.")}</p>
      </div>
      <span class="privacy-pill">No name or email collected</span>
    </div>

    <form class="response-form" data-response-form>
      ${survey.questions.map((question, index) => renderResponseQuestion(question, index)).join("")}
      <div class="form-actions">
        <button class="primary-button" type="button" data-action="submit-response">
          ${buttonIcon("send", "Submit response")}
        </button>
        <button class="secondary-button" type="reset" data-action="reset-response">Reset choices</button>
      </div>
    </form>
  `;
}

function renderResponseQuestion(question, index) {
  return `
    <fieldset class="question-block">
      <legend>${index + 1}. ${escapeHtml(question.text)}</legend>
      <div class="option-grid">
        ${question.options
          .map(
            (option) => `
              <label class="option-tile">
                <input type="radio" name="${question.id}" value="${option.id}" />
                <span>${escapeHtml(option.text)}</span>
              </label>
            `,
          )
          .join("")}
      </div>
    </fieldset>
  `;
}

function renderResultsView(survey) {
  const stats = calculateSurveyStats(survey);

  return `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Statistical results</p>
        <h2>${escapeHtml(survey.title)}</h2>
        <p>${stats.responseCount} anonymous responses collected.</p>
      </div>
      <button class="secondary-button" type="button" data-action="duplicate-survey" data-survey-id="${survey.id}">
        ${buttonIcon("copy", "Duplicate")}
      </button>
    </div>
    <div class="results-stack">
      ${stats.questions.map((question) => renderResultQuestion(question, stats.responseCount)).join("")}
    </div>
  `;
}

function renderResultQuestion(question, responseCount) {
  return `
    <section class="result-block">
      <h3>${escapeHtml(question.text)}</h3>
      ${question.options.map((option) => renderResultBar(option, responseCount)).join("")}
    </section>
  `;
}

function renderResultBar(option, responseCount) {
  const width = responseCount ? option.percentage : 0;

  return `
    <div class="result-row">
      <div class="result-label">
        <span>${escapeHtml(option.text)}</span>
        <strong>${option.count} (${option.percentage}%)</strong>
      </div>
      <div class="bar-track" aria-hidden="true">
        <span style="width: ${width}%"></span>
      </div>
    </div>
  `;
}

function renderAdminView() {
  const draft = state.editorDraft;
  const isEditing = Boolean(state.editingSurveyId);

  return `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Administrator tools</p>
        <h2>${isEditing ? "Edit survey" : "Create survey"}</h2>
        <p>${isEditing ? "Modify the duplicated or selected survey." : "Build questions and options for a new anonymous survey."}</p>
      </div>
    </div>
    <form class="admin-form" data-editor-form>
      <label>
        Survey title
        <input name="title" value="${escapeHtml(draft.title)}" placeholder="Example: Sprint retrospective" />
      </label>
      <label>
        Description
        <textarea name="description" rows="3" placeholder="What is this survey about?">${escapeHtml(draft.description)}</textarea>
      </label>

      <div class="question-editor-list">
        ${draft.questions.map((question, index) => renderEditorQuestion(question, index)).join("")}
      </div>

      <div class="form-actions wrap">
        <button class="secondary-button" type="button" data-action="add-question">
          ${buttonIcon("add", "Add question")}
        </button>
        <button class="primary-button" type="button" data-action="${isEditing ? "save-survey" : "create-survey"}">
          ${buttonIcon(isEditing ? "edit" : "add", isEditing ? "Save changes" : "Create survey")}
        </button>
        <button class="secondary-button" type="button" data-action="clear-editor">Clear</button>
      </div>
    </form>
  `;
}

function renderEditorQuestion(question, index) {
  return `
    <section class="editor-question" data-question-index="${index}">
      <div class="editor-question-header">
        <h3>Question ${index + 1}</h3>
        ${
          state.editorDraft.questions.length > 1
            ? `<button class="icon-button" type="button" data-action="remove-question" data-question-index="${index}" title="Remove question" aria-label="Remove question ${index + 1}">${icons.x}</button>`
            : ""
        }
      </div>
      <label>
        Question text
        <input name="question-${index}" value="${escapeHtml(question.text)}" placeholder="Ask something clear" />
      </label>
      <label>
        Options
        <textarea name="options-${index}" rows="4" placeholder="One option per line">${escapeHtml(question.options.join("\n"))}</textarea>
      </label>
    </section>
  `;
}

function collectEditorDraft() {
  const form = app.querySelector("[data-editor-form]");

  if (!form) {
    return cloneDraft(state.editorDraft);
  }

  const formData = new FormData(form);
  const questions = [...form.querySelectorAll("[data-question-index]")].map((section) => {
    const index = section.dataset.questionIndex;
    const rawOptions = formData.get(`options-${index}`) ?? "";

    return {
      text: formData.get(`question-${index}`) ?? "",
      options: String(rawOptions)
        .split(/\n|,/)
        .map((option) => option.trim())
        .filter(Boolean),
    };
  });

  return {
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    questions,
  };
}

function collectResponseAnswers(survey) {
  const form = app.querySelector("[data-response-form]");
  const formData = new FormData(form);
  const answers = {};

  survey.questions.forEach((question) => {
    const value = formData.get(question.id);

    if (value) {
      answers[question.id] = value;
    }
  });

  return answers;
}

function setView(view) {
  state.view = view;
  state.toast = null;
  render();
}

function selectSurvey(surveyId, view = state.view) {
  state.activeSurveyId = surveyId;
  state.view = view;
  state.toast = null;
  render();
}

function editSurvey(surveyId) {
  const survey = state.surveys.find((item) => item.id === surveyId);

  if (!survey) {
    return;
  }

  state.activeSurveyId = surveyId;
  state.editorDraft = draftFromSurvey(survey);
  state.editingSurveyId = surveyId;
  state.view = "admin";
  state.toast = { type: "success", message: "Survey loaded in the editor." };
  render();
}

function undo() {
  const previous = state.history.shift();

  if (!previous) {
    return;
  }

  Object.assign(state, previous.snapshot, {
    toast: { type: "success", message: `Undone: ${previous.label}.` },
  });
  saveSurveys(state.surveys);
  render();
}

app.addEventListener("submit", (event) => {
  event.preventDefault();
});

app.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");

  if (!actionTarget) {
    return;
  }

  const { action, surveyId, view, questionIndex } = actionTarget.dataset;
  const activeSurvey = getActiveSurvey();

  if (action === "set-view") {
    setView(view);
  }

  if (action === "select-survey") {
    selectSurvey(surveyId);
  }

  if (action === "show-results") {
    selectSurvey(surveyId, "results");
  }

  if (action === "new-survey") {
    state.editorDraft = emptyDraft();
    state.editingSurveyId = null;
    setView("admin");
  }

  if (action === "add-question") {
    state.editorDraft = collectEditorDraft();
    state.editorDraft.questions.push({ text: "", options: ["Yes", "No", "Not sure"] });
    render();
  }

  if (action === "remove-question") {
    state.editorDraft = collectEditorDraft();
    state.editorDraft.questions.splice(Number(questionIndex), 1);
    render();
  }

  if (action === "clear-editor") {
    state.editorDraft = emptyDraft();
    state.editingSurveyId = null;
    state.toast = null;
    render();
  }

  if (action === "create-survey") {
    const draft = collectEditorDraft();
    withHistory(
      "create survey",
      () => {
        const survey = createSurveyFromDraft(draft);
        state.surveys = [survey, ...state.surveys];
        state.activeSurveyId = survey.id;
        state.editorDraft = emptyDraft();
        state.editingSurveyId = null;
        state.view = "respond";
      },
      "Survey created and saved.",
    );
  }

  if (action === "save-survey") {
    const draft = collectEditorDraft();
    withHistory(
      "edit survey",
      () => {
        state.surveys = state.surveys.map((survey) =>
          survey.id === state.editingSurveyId
            ? updateSurveyFromDraft(survey, draft)
            : survey,
        );
        state.activeSurveyId = state.editingSurveyId;
        state.editorDraft = emptyDraft();
        state.editingSurveyId = null;
        state.view = "respond";
      },
      "Survey changes saved.",
    );
  }

  if (action === "edit-survey") {
    editSurvey(surveyId);
  }

  if (action === "duplicate-survey" && surveyId) {
    const source = state.surveys.find((survey) => survey.id === surveyId);

    if (!source) {
      return;
    }

    withHistory(
      "duplicate survey",
      () => {
        const duplicated = duplicateSurvey(source);
        state.surveys = [duplicated, ...state.surveys];
        state.activeSurveyId = duplicated.id;
        state.editorDraft = draftFromSurvey(duplicated);
        state.editingSurveyId = duplicated.id;
        state.view = "admin";
      },
      "Survey duplicated and opened for editing.",
    );
  }

  if (action === "submit-response" && activeSurvey) {
    const answers = collectResponseAnswers(activeSurvey);
    withHistory(
      "submit anonymous response",
      () => {
        state.surveys = state.surveys.map((survey) =>
          survey.id === activeSurvey.id ? addAnonymousResponse(survey, answers) : survey,
        );
      },
      "Anonymous response saved.",
    );
  }

  if (action === "reset-response") {
    state.toast = { type: "success", message: "Choices cleared." };
    render();
  }

  if (action === "undo") {
    undo();
  }
});

render();
