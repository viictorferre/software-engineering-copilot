import assert from "node:assert/strict";
import test from "node:test";
import {
  addAnonymousResponse,
  calculateSurveyStats,
  createSurveyFromDraft,
  duplicateSurvey,
  loadSurveys,
  saveSurveys,
  updateSurveyFromDraft,
} from "../src/survey-core.js";

function idFactory() {
  let index = 0;
  return (prefix) => `${prefix}-${++index}`;
}

function sampleSurvey(factory = idFactory()) {
  return createSurveyFromDraft(
    {
      title: "Course pulse",
      description: "Quick class survey",
      questions: [
        {
          text: "How was the session?",
          options: ["Great", "Ok", "Confusing"],
        },
      ],
    },
    factory,
  );
}

test("creates a survey from a valid draft", () => {
  const survey = sampleSurvey();

  assert.equal(survey.title, "Course pulse");
  assert.equal(survey.questions.length, 1);
  assert.equal(survey.questions[0].options.length, 3);
  assert.deepEqual(survey.responses, []);
});

test("duplicates a survey without carrying responses", () => {
  const ids = idFactory();
  const survey = sampleSurvey(ids);
  const answered = addAnonymousResponse(
    survey,
    { [survey.questions[0].id]: survey.questions[0].options[0].id },
    ids,
  );
  const duplicated = duplicateSurvey(answered, ids);

  assert.match(duplicated.title, /Copy of/);
  assert.equal(duplicated.responses.length, 0);
  assert.notEqual(duplicated.id, answered.id);
});

test("stores anonymous responses and calculates percentages", () => {
  const survey = sampleSurvey();
  const firstOption = survey.questions[0].options[0].id;
  const secondOption = survey.questions[0].options[1].id;
  const answeredOnce = addAnonymousResponse(survey, { [survey.questions[0].id]: firstOption }, idFactory());
  const answeredTwice = addAnonymousResponse(answeredOnce, { [survey.questions[0].id]: secondOption }, idFactory());
  const stats = calculateSurveyStats(answeredTwice);

  assert.equal(stats.responseCount, 2);
  assert.equal(stats.questions[0].options[0].percentage, 50);
  assert.equal(stats.questions[0].options[1].percentage, 50);
});

test("updates survey text while preserving the survey id", () => {
  const survey = sampleSurvey();
  const updated = updateSurveyFromDraft(
    survey,
    {
      title: "Updated pulse",
      description: "Edited",
      questions: [{ text: "Updated question?", options: ["Yes", "No"] }],
    },
    idFactory(),
  );

  assert.equal(updated.id, survey.id);
  assert.equal(updated.title, "Updated pulse");
  assert.equal(updated.questions[0].id, survey.questions[0].id);
});

test("persists surveys using the provided storage adapter", () => {
  const storage = new Map();
  const adapter = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const survey = sampleSurvey();

  saveSurveys([survey], adapter);

  assert.equal(loadSurveys(adapter)[0].title, "Course pulse");
});

test("rejects invalid survey drafts with appropriate error messages", () => {
  const factory = idFactory();

  // Missing title
  assert.throws(
    () =>
      createSurveyFromDraft(
        {
          title: "",
          description: "No title",
          questions: [{ text: "Question?", options: ["Yes", "No"] }],
        },
        factory,
      ),
    (err) => err.message.includes("Add a survey title."),
  );

  // No questions
  assert.throws(
    () =>
      createSurveyFromDraft(
        {
          title: "Survey",
          description: "No questions",
          questions: [],
        },
        factory,
      ),
    (err) => err.message.includes("Add at least one question."),
  );

  // Question without text
  assert.throws(
    () =>
      createSurveyFromDraft(
        {
          title: "Survey",
          description: "Bad question",
          questions: [{ text: "", options: ["Yes", "No"] }],
        },
        factory,
      ),
    (err) => err.message.includes("Question 1 needs text."),
  );

  // Question with insufficient options
  assert.throws(
    () =>
      createSurveyFromDraft(
        {
          title: "Survey",
          description: "Only one option",
          questions: [{ text: "Question?", options: ["Yes"] }],
        },
        factory,
      ),
    (err) => err.message.includes("at least two options"),
  );
});
