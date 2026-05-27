# PulseBoard Survey App

PulseBoard is a small survey application built for the Software Engineering Copilot activity. I chose the **Survey App** specification from `UserStories_App_d'Enquestes-ENG.pdf`.

## Submission

- **Code inside the GitHub repository:** the application source code is included in this repository (`index.html`, `src/`, and `tests/`).
- **README with used prompts:** see the [Used Prompts](#used-prompts) section.
- **README with screen shots of the result:** see the [Screenshots Of The Result](#screenshots-of-the-result) section.
- **README with lessons learned on the use of Copilot:** see the [Lessons Learned On The Use Of Copilot](#lessons-learned-on-the-use-of-copilot) section.

## Selected Functional Requirements

The app covers the four user stories from the chosen specification:

- **US-01:** administrators can create surveys with questions and options.
- **US-02:** users can answer surveys anonymously.
- **US-03:** administrators can duplicate an existing survey and modify the copy.
- **US-04:** users can view statistical results and response trends.

All main actions are available from the main interface, show confirmation messages, support undo, and persist data with `localStorage`.

## Technology

- HTML
- CSS
- JavaScript ES modules
- Browser `localStorage`
- Node test runner for core logic tests

I used plain JavaScript because the brief allowed React, JavaScript, or the technology used in the final project, and this version can run without installing third-party dependencies.

## How To Run

From the repository folder:

```bash
python -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173
```

## How To Test

```bash
node --test tests/*.test.mjs
```

## Used Prompts

These are the prompts used progressively with GitHub Copilot while refining the application:

1. "Read the Survey App user stories and create a simple web app that satisfies the four requirements: create surveys, answer anonymously, duplicate surveys, and view statistics."
2. "Scaffold a clean JavaScript project with an `index.html`, CSS file, and a main JavaScript entry point. Keep it easy to run without a backend."
3. "Add a survey domain module with functions to create surveys from drafts, duplicate surveys, add anonymous responses, calculate statistics, and persist data."
4. "Build the administrator interface so the user can create a survey with a title, description, questions, and multiple options."
5. "Add anonymous response mode. Do not collect name, email, or any personal identifier. Require all questions to be answered before saving."
6. "Add a statistics view with counts and percentages for each answer option, using visual bars."
7. "Add undo support for create, edit, duplicate, and submit response actions. Show a confirmation message after each saved action."
8. "Improve the interface so all workflows are available from the main screen and visually clear for screenshots."
9. "Add unit tests for creation, duplication, anonymous responses, statistics, updating, and persistence."
10. "Write the README with the GitHub link, prompts used, screenshots, and lessons learned."

## Screenshots Of The Result

### Anonymous Response View

![Anonymous response view](docs/screenshots/respond.png)

### Results View

![Results view](docs/screenshots/results.png)

### Administrator View

![Administrator view](docs/screenshots/admin.png)

### Created Survey Results

![Created survey results](docs/screenshots/refined-results.png)

## Lessons Learned On The Use Of Copilot

- **Specificity improves output quality**: Copilot generates significantly better code when prompts include exact user stories and acceptance criteria rather than vague descriptions. This reduces the need for corrections and clarifications.
- **Iterative development beats monolithic requests**: Breaking development into smaller, focused prompts yields better results than requesting the entire project at once. This approach also improves code organization and makes reviewing changes easier.
- **Feature-by-feature implementation aids maintainability**: Implementing one feature at a time results in cleaner commit history and easier debugging. It is easier to trace which feature introduced a bug when features are isolated.
- **Edge cases require developer verification**: While Copilot excels at generating boilerplate and common patterns quickly, developers must manually verify edge cases such as empty inputs, ID uniqueness, data persistence, and constraint violations that automated code generation may overlook.
- **Test-driven validation accelerates development**: Clear acceptance criteria make it straightforward to request comprehensive tests that validate expected behavior. Good tests catch both functional errors and edge cases early.
- **Visual and UX verification is irreplaceable**: Generated code may be logically correct but have poor layout, responsive design issues, or usability problems. Manual testing on different screen sizes and user workflows is essential for production-ready applications.
