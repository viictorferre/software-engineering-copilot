export const STORAGE_KEY = "pulseboard-surveys-v1";

const timestamp = () => new Date().toISOString();

export function createId(prefix = "id") {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function emptyDraft() {
  return {
    title: "",
    description: "",
    questions: [
      {
        text: "",
        options: ["Yes", "No", "Not sure"],
      },
    ],
  };
}

export function cloneDraft(draft) {
  return {
    title: draft.title ?? "",
    description: draft.description ?? "",
    questions: (draft.questions ?? []).map((question) => ({
      text: question.text ?? "",
      options: [...(question.options ?? [])],
    })),
  };
}

function normalizeOptions(options) {
  return [...new Set((options ?? []).map((option) => option.trim()).filter(Boolean))];
}

export function validateDraft(draft) {
  const errors = [];
  const questions = draft.questions ?? [];

  if (!draft.title?.trim()) {
    errors.push("Add a survey title.");
  }

  if (!questions.length) {
    errors.push("Add at least one question.");
  }

  questions.forEach((question, index) => {
    if (!question.text?.trim()) {
      errors.push(`Question ${index + 1} needs text.`);
    }

    if (normalizeOptions(question.options).length < 2) {
      errors.push(`Question ${index + 1} needs at least two options.`);
    }
  });

  return errors;
}

export function createSurveyFromDraft(draft, idFactory = createId) {
  const errors = validateDraft(draft);

  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  const now = timestamp();

  return {
    id: idFactory("survey"),
    title: draft.title.trim(),
    description: draft.description?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
    questions: draft.questions.map((question) => ({
      id: idFactory("question"),
      text: question.text.trim(),
      options: normalizeOptions(question.options).map((option) => ({
        id: idFactory("option"),
        text: option,
      })),
    })),
    responses: [],
  };
}

export function draftFromSurvey(survey) {
  return {
    title: survey.title,
    description: survey.description,
    questions: survey.questions.map((question) => ({
      text: question.text,
      options: question.options.map((option) => option.text),
    })),
  };
}

export function updateSurveyFromDraft(survey, draft, idFactory = createId) {
  const errors = validateDraft(draft);

  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  return {
    ...survey,
    title: draft.title.trim(),
    description: draft.description?.trim() ?? "",
    updatedAt: timestamp(),
    questions: draft.questions.map((question, questionIndex) => {
      const previousQuestion = survey.questions[questionIndex];

      return {
        id: previousQuestion?.id ?? idFactory("question"),
        text: question.text.trim(),
        options: normalizeOptions(question.options).map((option, optionIndex) => ({
          id: previousQuestion?.options?.[optionIndex]?.id ?? idFactory("option"),
          text: option,
        })),
      };
    }),
  };
}

export function duplicateSurvey(survey, idFactory = createId) {
  const duplicated = createSurveyFromDraft(
    {
      title: `Copy of ${survey.title}`,
      description: survey.description,
      questions: survey.questions.map((question) => ({
        text: question.text,
        options: question.options.map((option) => option.text),
      })),
    },
    idFactory,
  );

  return {
    ...duplicated,
    description:
      duplicated.description || "Duplicated survey ready for small modifications.",
  };
}

export function addAnonymousResponse(survey, answers, idFactory = createId) {
  const missingQuestion = survey.questions.find((question) => !answers[question.id]);

  if (missingQuestion) {
    throw new Error(`Answer "${missingQuestion.text}" before submitting.`);
  }

  const invalidAnswer = survey.questions.find((question) => {
    const allowedOptions = new Set(question.options.map((option) => option.id));
    return !allowedOptions.has(answers[question.id]);
  });

  if (invalidAnswer) {
    throw new Error(`Choose a valid option for "${invalidAnswer.text}".`);
  }

  return {
    ...survey,
    responses: [
      ...(survey.responses ?? []),
      {
        id: idFactory("response"),
        submittedAt: timestamp(),
        answers: { ...answers },
      },
    ],
  };
}

export function calculateSurveyStats(survey) {
  const responses = survey.responses ?? [];

  return {
    responseCount: responses.length,
    questions: survey.questions.map((question) => {
      const counts = new Map(question.options.map((option) => [option.id, 0]));

      responses.forEach((response) => {
        const optionId = response.answers?.[question.id];

        if (counts.has(optionId)) {
          counts.set(optionId, counts.get(optionId) + 1);
        }
      });

      return {
        id: question.id,
        text: question.text,
        options: question.options.map((option) => {
          const count = counts.get(option.id) ?? 0;
          const percentage = responses.length ? Math.round((count / responses.length) * 100) : 0;

          return {
            ...option,
            count,
            percentage,
          };
        }),
      };
    }),
  };
}

export function createDefaultSurveys() {
  const id = (() => {
    let index = 0;
    return (prefix) => `${prefix}-sample-${++index}`;
  })();

  const classFeedback = createSurveyFromDraft(
    {
      title: "Class feedback pulse",
      description: "A short anonymous survey about today's learning session.",
      questions: [
        {
          text: "How useful was today's class?",
          options: ["Very useful", "Useful", "Needs clearer examples"],
        },
        {
          text: "Which activity helped you the most?",
          options: ["Live demo", "Pair work", "Teacher explanation"],
        },
      ],
    },
    id,
  );

  const projectCheckIn = createSurveyFromDraft(
    {
      title: "Team project check-in",
      description: "Anonymous pulse survey for tracking project confidence.",
      questions: [
        {
          text: "How confident are you about the current sprint?",
          options: ["Confident", "Some blockers", "Need help"],
        },
        {
          text: "What should the team improve next?",
          options: ["Planning", "Testing", "Communication"],
        },
      ],
    },
    id,
  );

  const seededClassSurvey = addAnonymousResponse(
    addAnonymousResponse(classFeedback, {
      [classFeedback.questions[0].id]: classFeedback.questions[0].options[0].id,
      [classFeedback.questions[1].id]: classFeedback.questions[1].options[0].id,
    }, id),
    {
      [classFeedback.questions[0].id]: classFeedback.questions[0].options[1].id,
      [classFeedback.questions[1].id]: classFeedback.questions[1].options[1].id,
    },
    id,
  );

  return [seededClassSurvey, projectCheckIn];
}

export function loadSurveys(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSurveys(surveys, storage = globalThis.localStorage) {
  storage?.setItem(STORAGE_KEY, JSON.stringify(surveys));
}
