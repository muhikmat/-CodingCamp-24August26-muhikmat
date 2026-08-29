# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement the dashboard as three static files (`index.html`, `css/style.css`, `js/app.js`) with no build step or external dependencies. Each step builds on the previous, starting with the HTML skeleton and progressing through each module until all widgets are wired together and the app is fully operational.

---

## Tasks

- [x] 1. Create the HTML skeleton and CSS foundation
  - [x] 1.1 Create `index.html` with semantic markup for all four widget sections
    - Include a `<div id="greeting-widget">`, `<div id="focus-timer">`, `<div id="todo-list">`, and `<div id="quick-links">` inside a centered `.container`
    - Add all required input fields, buttons, and placeholder elements for each widget as described in the design
    - Link `css/style.css` in `<head>` and `js/app.js` at the bottom of `<body>` with `defer`
    - _Requirements: 15.1, 15.2, 16.1, 16.2, 16.3_
  - [x] 1.2 Create `css/style.css` with responsive grid layout and base typography
    - Implement the CSS grid container: ≥2 columns at viewport ≥768px, single column below 768px
    - Apply `max-width: 1280px` centered container for viewports ≥768px
    - Set minimum body font size of 14px throughout
    - Style visual separation between the four widget sections (borders, padding, or background color)
    - Add placeholder text styles for empty widget states
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 2. Implement `StorageManager` module
  - [x] 2.1 Write the `StorageManager` IIFE in `js/app.js`
    - Implement `KEYS` constants (`dashboard_tasks`, `dashboard_links`)
    - Implement `load(key)`: reads from `localStorage`, JSON-parses, validates `Array.isArray`, returns `[]` on missing key, returns `null` and sets internal `parseError` flag on parse failure or non-array result
    - Implement `save(key, value)`: JSON-serializes and writes to `localStorage` inside a try/catch; returns `{ ok: true }` on success, `{ ok: false, error }` on failure — never throws
    - _Requirements: 9.1, 9.4, 9.5, 13.1, 13.4, 13.5, 14.1, 14.2_
  - [ ]* 2.2 Write property test for `StorageManager.load` — malformed data always returns null without throwing
    - **Property 11: Malformed storage data always yields null, never throws**
    - **Validates: Requirements 14.2, 9.5, 13.4**
    - Tag: `// Feature: todo-life-dashboard, Property 11: Malformed storage data always yields null, never throws`
    - Use fast-check to generate arbitrary non-JSON-array strings (objects, primitives, invalid JSON)

- [x] 3. Implement `GreetingWidget` module
  - [x] 3.1 Write the `GreetingWidget` IIFE in `js/app.js`
    - Implement `_getGreeting(hour)`: pure function returning "Good Morning" [5–11], "Good Afternoon" [12–16], "Good Evening" [17–20], "Good Night" [21–23, 0–4], "Hello" for any value outside [0, 23]
    - Implement `_tick()`: reads `new Date()`, formats locale-aware time via `toLocaleTimeString()`, formats date via `toLocaleDateString()` with `{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }`, calls `_getGreeting(hour)`, updates DOM
    - Implement `init()`: calls `_tick()` immediately, then sets a 1-second `setInterval` on `_tick`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [ ]* 3.2 Write property test for `_getGreeting` — greeting bands are exhaustive and non-overlapping
    - **Property 1: Greeting bands are exhaustive and non-overlapping**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**
    - Tag: `// Feature: todo-life-dashboard, Property 1: Greeting bands are exhaustive and non-overlapping`
    - Use fast-check to generate integers in [0, 23] and edge values (NaN, -1, 24) and assert correct return value

- [x] 4. Implement `FocusTimer` module
  - [x] 4.1 Write the `FocusTimer` IIFE in `js/app.js`
    - Implement `_formatTime(seconds)`: pure function returning zero-padded `MM:SS` string for any integer in [0, 1500]
    - Implement internal state: `remainingSeconds = 1500`, `state = 'idle'`, `intervalId = null`
    - Implement `_start()`, `_stop()`, `_reset()`, `_tick()` following the state machine (Idle → Running → Paused/Finished → Idle)
    - Implement `_updateUI()`: formats display, enables/disables Start/Stop/Reset buttons per state, shows finished alert banner when `state === 'finished'`
    - Guard `_start()` with `state !== 'running'` check before calling `setInterval` to prevent duplicate intervals
    - Implement `init()`: renders initial "25:00", attaches click listeners to Start, Stop, Reset buttons
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [ ]* 4.2 Write property test for `_formatTime` — timer format is a lossless round-trip
    - **Property 2: Timer format is a lossless round-trip**
    - **Validates: Requirements 3.1, 4.1, 4.2, 4.3, 4.4**
    - Tag: `// Feature: todo-life-dashboard, Property 2: Timer format is a lossless round-trip`
    - Use fast-check to generate integers in [0, 1500] and assert `MM:SS` can be parsed back to the original seconds value

- [x] 5. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement `TodoList` module
  - [x] 6.1 Write the `TodoList` IIFE in `js/app.js` — core data layer
    - Implement `_validateInput(text)`: pure function returning `{ valid: true }` for strings with at least one non-whitespace character and trimmed length ≤ 500, `{ valid: false, error: '...' }` otherwise
    - Implement `_addTask(text)`: validates input, generates ID via `Date.now().toString(36) + Math.random().toString(36).slice(2)`, appends task object `{ id, text: text.trim(), completed: false }`, calls `StorageManager.save`; on save failure, reverts the push and shows error banner
    - Implement `_deleteTask(id)`: removes task by ID, calls `StorageManager.save`; if task was in `editingId`, clears `editingId` first
    - Implement `_toggleComplete(id)`: flips `completed`, calls `StorageManager.save`; on save failure, reverts the flip and shows error banner
    - _Requirements: 5.2, 5.3, 5.5, 5.6, 7.2, 7.3, 7.4, 7.5, 8.2, 8.3, 8.4_
  - [ ]* 6.2 Write property test for `_validateInput` — valid task text is always accepted
    - **Property 3: Valid task text is always accepted**
    - **Validates: Requirements 5.2**
    - Tag: `// Feature: todo-life-dashboard, Property 3: Valid task text is always accepted`
    - Use fast-check to generate strings with at least one non-whitespace character and trimmed length 1–500; assert `_addTask` grows the list by exactly 1
  - [ ]* 6.3 Write property test for `_validateInput` — whitespace-only input is always rejected
    - **Property 4: Whitespace-only input is always rejected**
    - **Validates: Requirements 5.5, 6.7**
    - Tag: `// Feature: todo-life-dashboard, Property 4: Whitespace-only input is always rejected`
    - Use fast-check to generate strings composed only of space/tab/CR/LF characters; assert `_addTask` and `_saveEdit` do not mutate the task list and do not call `StorageManager.save`
  - [ ]* 6.4 Write property test for `_validateInput` — over-length input is always rejected
    - **Property 5: Over-length task input is always rejected**
    - **Validates: Requirements 5.6**
    - Tag: `// Feature: todo-life-dashboard, Property 5: Over-length task input is always rejected`
    - Use fast-check to generate strings with length > 500; assert `_addTask` does not mutate the task list
  - [x] 6.5 Write the `TodoList` IIFE — edit and render layer
    - Implement `_startEdit(id)`: sets `editingId`, if another task was editing cancels that edit first (restores read-only without saving), calls `_render()`
    - Implement `_saveEdit(id, newText)`: validates new text; on valid, updates task text to `newText.trim()`, clears `editingId`, calls `StorageManager.save`, reverts on failure; on invalid (whitespace-only), keeps edit input open and focused with error indicator
    - Implement `_cancelEdit(id)`: clears `editingId`, calls `_render()` to restore original text
    - Implement `_renderTask(task)`: creates DOM row with checkbox, text span (or edit input when `id === editingId`), Edit/Save/Cancel, and Delete buttons; attaches per-task event listeners inline
    - Implement `_render()`: clears list container, re-renders all tasks via `_renderTask`, shows placeholder text when list is empty
    - Implement `init()`: loads tasks from `StorageManager`, if `null` shows load-error notification, initializes with `[]`, calls `_render()`; attaches Add button and Enter-key listener to the add-task input; clears input field on successful add
    - _Requirements: 5.1, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 9.1, 9.2, 9.3, 9.5, 15.7_
  - [ ]* 6.6 Write property test for task collection serialization — round-trip consistency
    - **Property 6: Task collection serialization is a round-trip**
    - **Validates: Requirements 9.4**
    - Tag: `// Feature: todo-life-dashboard, Property 6: Task collection serialization is a round-trip`
    - Use fast-check to generate arrays of valid Task objects; assert `JSON.parse(JSON.stringify(tasks))` is element-wise identical
  - [ ]* 6.7 Write property test for completion toggle — toggle twice restores original value
    - **Property 7: Completion toggle is a round-trip**
    - **Validates: Requirements 7.2, 7.3**
    - Tag: `// Feature: todo-life-dashboard, Property 7: Completion toggle is a round-trip`
    - Use fast-check to generate tasks with arbitrary `completed` values; assert double-toggle restores original `completed` and leaves `id` and `text` unchanged
  - [ ]* 6.8 Write property test for task deletion — removes exactly the targeted task
    - **Property 8: Deletion removes exactly the targeted task**
    - **Validates: Requirements 8.2**
    - Tag: `// Feature: todo-life-dashboard, Property 8: Deletion removes exactly the targeted task`
    - Use fast-check to generate non-empty task arrays; assert deleting one ID removes exactly that task, reduces length by 1, and preserves all others in original order

- [x] 7. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement `QuickLinks` module
  - [x] 8.1 Write the `QuickLinks` IIFE in `js/app.js` — core data layer
    - Implement `_normalizeUrl(url)`: pure function; if `url` already starts with `http://` or `https://`, return unchanged; otherwise prepend `https://`
    - Implement `_validateInputs(label, url)`: pure function returning `{ valid: boolean, labelError?, urlError? }`; label must have at least one non-whitespace character; url must have at least one non-whitespace character
    - Implement `_addLink(label, url)`: validates both inputs, normalizes URL, generates ID, appends `{ id, label: label.trim(), url: normalized }`, calls `StorageManager.save`; on save failure, reverts push and does not render the new button (per Req 10.7); shows error banner on failure
    - Implement `_deleteLink(id)`: removes link by ID, calls `StorageManager.save`; on save failure, restores the deleted link and shows error banner (per Req 12.4)
    - _Requirements: 10.2, 10.3, 10.4, 10.6, 10.7, 12.2, 12.3, 12.4_
  - [ ]* 8.2 Write property test for `_normalizeUrl` — URL normalization always produces an absolute URL
    - **Property 9: URL normalization always produces an absolute URL**
    - **Validates: Requirements 10.3**
    - Tag: `// Feature: todo-life-dashboard, Property 9: URL normalization always produces an absolute URL`
    - Use fast-check to generate arbitrary URL strings; assert result starts with `http://` or `https://`; assert already-prefixed URLs are returned unchanged
  - [x] 8.3 Write the `QuickLinks` IIFE — open and render layer
    - Implement `_openLink(url)`: calls `window.open(url, '_blank', 'noopener,noreferrer')`; if return value is `null`, shows notification about popup blocker
    - Implement `_renderLink(link)`: creates a button element with `link.label` as text and a Delete control; attaches click listener on the button to call `_openLink(link.url)` and on Delete to call `_deleteLink(link.id)`
    - Implement `_render()`: clears links container, re-renders all links via `_renderLink`, shows placeholder when empty
    - Implement `init()`: loads links from `StorageManager`, if `null` shows load-error notification and initializes with `[]`, calls `_render()`; attaches Add button listener; on successful add clears both label and URL input fields
    - _Requirements: 10.1, 10.5, 10.6, 11.1, 11.2, 12.1, 13.1, 13.2, 13.3, 13.4, 15.7_
  - [ ]* 8.4 Write property test for link collection serialization — round-trip consistency
    - **Property 10: Link collection serialization is a round-trip**
    - **Validates: Requirements 13.5, 13.6**
    - Tag: `// Feature: todo-life-dashboard, Property 10: Link collection serialization is a round-trip`
    - Use fast-check to generate arrays of valid Link objects; assert `JSON.parse(JSON.stringify(links))` is element-wise identical preserving `label` and `url`

- [x] 9. Implement `App.init()` and wire all modules together
  - [x] 9.1 Write the `App` bootstrap object and `DOMContentLoaded` listener in `js/app.js`
    - Implement `App.init()`: calls `StorageManager` setup (no-op, constants are always available), then calls `GreetingWidget.init()`, `FocusTimer.init()`, `TodoList.init()`, `QuickLinks.init()` in order
    - Add `document.addEventListener('DOMContentLoaded', App.init)` at the bottom of `js/app.js`
    - Verify all modules reference only DOM elements that exist in `index.html` (IDs must match between HTML and JS)
    - _Requirements: 16.3, 16.4_
  - [ ]* 9.2 Write unit tests for `App.init()` integration
    - Use jsdom to simulate `DOMContentLoaded` and verify all four widgets mount without console errors
    - Verify that a missing `localStorage` key (first visit) results in empty lists with no error notifications
    - _Requirements: 9.3, 13.3, 16.3_

- [x] 10. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP; the core application is fully functional without any test sub-tasks
- Setting up the test framework (fast-check + Vitest with jsdom) is a prerequisite only if optional test tasks are executed; no setup is required for the core implementation
- Each task references specific requirements for traceability
- All property tests must run a minimum of 100 iterations and be tagged with `// Feature: todo-life-dashboard, Property N: <title>`
- Modules are plain IIFE closures inside `js/app.js`; pure functions (`_getGreeting`, `_formatTime`, `_normalizeUrl`, `_validateInput`, `_validateInputs`) should be re-exported or accessed via a thin test wrapper when running in Vitest/jsdom
- Checkpoints at Tasks 5 and 7 ensure incremental validation before proceeding to dependent modules

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5"] },
    { "id": 6, "tasks": ["6.6", "6.7", "6.8", "8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4", "9.1"] },
    { "id": 9, "tasks": ["9.2"] }
  ]
}
```
