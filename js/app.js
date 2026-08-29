/**
 * Life Dashboard — js/app.js
 *
 * All application logic lives in this single file, organised as IIFE module
 * closures that communicate through well-defined public interfaces.
 *
 * Module load order (each IIFE is self-contained):
 *   1. StorageManager  — localStorage read / write / error handling
 *   2. ThemeManager    — [CHALLENGE] Light / Dark mode toggle + persistence
 *   3. GreetingWidget  — time display, date display, greeting logic
 *                        [CHALLENGE] Custom name in greeting
 *   4. FocusTimer      — Pomodoro countdown state machine
 *                        [CHALLENGE] Change Pomodoro duration
 *   5. TodoList        — task CRUD, inline editing, persistence
 *                        [CHALLENGE] Prevent duplicate tasks
 *                        [CHALLENGE] Sort tasks
 *   6. QuickLinks      — link CRUD, URL normalisation, persistence
 *   7. App             — bootstrap: calls each module's init() on DOMContentLoaded
 */

/* ==========================================================================
   1. StorageManager
   ========================================================================== */
const StorageManager = (function () {
  'use strict';

  const KEYS = {
    TASKS:            'dashboard_tasks',
    LINKS:            'dashboard_links',
    THEME:            'dashboard_theme',       // 'light' | 'dark'
    USERNAME:         'dashboard_username',    // string
    POMODORO_DURATION:'dashboard_pomodoro_duration', // number (minutes)
  };

  let _parseError = false;

  function load(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      _parseError = true;
      return null;
    }

    if (!Array.isArray(parsed)) {
      _parseError = true;
      return null;
    }

    return parsed;
  }

  /**
   * Load a plain (non-array) value from localStorage.
   * Returns null when the key is absent.
   * Never throws.
   */
  function loadValue(key) {
    try {
      return localStorage.getItem(key); // returns null if absent
    } catch (_err) {
      return null;
    }
  }

  function save(key, value) {
    try {
      const serialised = JSON.stringify(value);
      localStorage.setItem(key, serialised);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  /**
   * Save a plain string value directly (no JSON wrapping).
   * Returns { ok: true } on success, { ok: false } on failure.
   */
  function saveValue(key, value) {
    try {
      localStorage.setItem(key, value);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  function hasParseError() { return _parseError; }
  function clearParseError() { _parseError = false; }

  return { KEYS, load, loadValue, save, saveValue, hasParseError, clearParseError };
})();


/* ==========================================================================
   2. ThemeManager  [CHALLENGE: Light / Dark mode]
   Responsibilities:
     - Apply the saved theme on load (no flash)
     - Toggle between light and dark on button click
     - Persist preference to localStorage
   ========================================================================== */
const ThemeManager = (function () {
  'use strict';

  /** @type {'light'|'dark'} */
  let _current = 'light';

  /** Update the <html> data-theme attribute and the toggle button icon. */
  function _apply(theme) {
    _current = theme;
    document.documentElement.setAttribute('data-theme', theme);

    const iconEl = document.querySelector('#theme-toggle .theme-icon');
    if (iconEl) {
      iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  /** Toggle between light and dark and persist the choice. */
  function _toggle() {
    const next = _current === 'light' ? 'dark' : 'light';
    _apply(next);
    StorageManager.saveValue(StorageManager.KEYS.THEME, next);
  }

  function init() {
    // Load persisted preference (falls back to 'light').
    const saved = StorageManager.loadValue(StorageManager.KEYS.THEME);
    _apply(saved === 'dark' ? 'dark' : 'light');

    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', _toggle);
  }

  return { init };
})();


/* ==========================================================================
   3. GreetingWidget
   [CHALLENGE] Custom name in greeting — saves name to localStorage and
   displays "Good Morning, <Name>!" when a name is set.
   ========================================================================== */
const GreetingWidget = (function () {
  'use strict';

  /** Currently saved username (empty string = not set). */
  let _username = '';

  function _getGreeting(hour) {
    if (
      typeof hour !== 'number' ||
      !Number.isFinite(hour) ||
      !Number.isInteger(hour) ||
      hour < 0 ||
      hour > 23
    ) {
      return 'Hello';
    }
    if (hour >= 5  && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 16) return 'Good Afternoon';
    if (hour >= 17 && hour <= 20) return 'Good Evening';
    return 'Good Night';
  }

  function _tick() {
    const now = new Date();

    const timeString = now.toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const dateString = now.toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    // Build greeting — append name if set.
    const base = _getGreeting(now.getHours());
    const greeting = _username ? base + ', ' + _username + '!' : base;

    const messageEl = document.getElementById('greeting-message');
    const timeEl    = document.getElementById('greeting-time');
    const dateEl    = document.getElementById('greeting-date');

    if (messageEl) messageEl.textContent = greeting;
    if (timeEl)    timeEl.textContent    = timeString;
    if (dateEl)    dateEl.textContent    = dateString;
  }

  /** Persist and apply a new username. */
  function _saveName(name) {
    const trimmed = name.trim();
    _username = trimmed;
    StorageManager.saveValue(StorageManager.KEYS.USERNAME, trimmed);

    // Update input field to reflect trimmed value.
    const inputEl = document.getElementById('username-input');
    if (inputEl) inputEl.value = trimmed;

    // Re-tick immediately so the greeting updates at once.
    _tick();
  }

  function init() {
    // Load saved username.
    const saved = StorageManager.loadValue(StorageManager.KEYS.USERNAME);
    _username = saved ? saved : '';

    // Pre-fill the name input.
    const inputEl = document.getElementById('username-input');
    if (inputEl) inputEl.value = _username;

    // Wire Save button.
    const saveBtn = document.getElementById('username-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        if (inputEl) _saveName(inputEl.value);
      });
    }

    // Allow pressing Enter in the name input to save.
    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); _saveName(inputEl.value); }
      });
    }

    _tick();
    setInterval(_tick, 1000);
  }

  return { init, _getGreeting };
})();


/* ==========================================================================
   4. FocusTimer
   [CHALLENGE] Change Pomodoro time — user can set a custom duration (1–120
   minutes) before starting.  The new duration is persisted and restored on
   page reload.
   ========================================================================== */
const FocusTimer = (function () {
  'use strict';

  const DEFAULT_MINUTES = 25;

  /** Duration chosen by the user (in minutes). Persisted. */
  let _durationMinutes = DEFAULT_MINUTES;

  let remainingSeconds = _durationMinutes * 60;
  let state      = 'idle';
  let intervalId = null;

  // ── Pure helpers ──────────────────────────────────────────────────────────

  function _formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  // ── Duration management ───────────────────────────────────────────────────

  /**
   * Validate and apply a new duration.
   * Only allowed when the timer is idle (not running / paused).
   */
  function _setDuration() {
    if (state === 'running' || state === 'paused') {
      _showDurationError('Stop or reset the timer before changing the duration.');
      return;
    }

    const inputEl = document.getElementById('timer-duration-input');
    const raw = inputEl ? inputEl.value : '';
    const parsed = parseInt(raw, 10);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 120) {
      _showDurationError('Enter a number between 1 and 120.');
      return;
    }

    _clearDurationError();
    _durationMinutes  = parsed;
    remainingSeconds  = _durationMinutes * 60;
    state             = 'idle';

    // Persist new duration.
    StorageManager.saveValue(
      StorageManager.KEYS.POMODORO_DURATION,
      String(_durationMinutes)
    );

    // Hide any finished alert that was visible.
    const alertEl = document.getElementById('timer-alert');
    if (alertEl) alertEl.classList.add('hidden');

    _updateUI();
  }

  function _showDurationError(msg) {
    const el = document.getElementById('timer-duration-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }

  function _clearDurationError() {
    const el = document.getElementById('timer-duration-error');
    if (el) { el.textContent = ''; el.classList.add('hidden'); }
  }

  // ── State machine ─────────────────────────────────────────────────────────

  function _start() {
    if (state === 'running' || state === 'finished') return;
    state = 'running';
    intervalId = setInterval(_tick, 1000);
    _updateUI();
  }

  function _stop() {
    if (state !== 'running') return;
    clearInterval(intervalId);
    intervalId = null;
    state = 'paused';
    _updateUI();
  }

  function _reset() {
    clearInterval(intervalId);
    intervalId       = null;
    remainingSeconds = _durationMinutes * 60;
    state            = 'idle';

    const alertEl = document.getElementById('timer-alert');
    if (alertEl) alertEl.classList.add('hidden');

    _updateUI();
  }

  function _tick() {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      clearInterval(intervalId);
      intervalId = null;
      state = 'finished';
    }

    _updateUI();
  }

  // ── View ──────────────────────────────────────────────────────────────────

  function _updateUI() {
    const displayEl = document.getElementById('timer-display');
    const startBtn  = document.getElementById('timer-start');
    const stopBtn   = document.getElementById('timer-stop');
    const resetBtn  = document.getElementById('timer-reset');
    const alertEl   = document.getElementById('timer-alert');

    if (displayEl) displayEl.textContent = _formatTime(remainingSeconds);

    // disabled property — true means disabled.
    const cfg = {
      idle:     { start: false, stop: true,  reset: false },
      running:  { start: true,  stop: false, reset: false },
      paused:   { start: false, stop: true,  reset: false },
      finished: { start: true,  stop: true,  reset: false },
    }[state];

    if (startBtn) startBtn.disabled = cfg.start;
    if (stopBtn)  stopBtn.disabled  = cfg.stop;
    if (resetBtn) resetBtn.disabled = cfg.reset;

    if (alertEl) {
      state === 'finished'
        ? alertEl.classList.remove('hidden')
        : alertEl.classList.add('hidden');
    }

    // Keep the duration input in sync with current duration when idle.
    if (state === 'idle') {
      const durInput = document.getElementById('timer-duration-input');
      if (durInput) durInput.value = _durationMinutes;
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  function init() {
    // Restore saved duration.
    const saved = StorageManager.loadValue(StorageManager.KEYS.POMODORO_DURATION);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 120) {
        _durationMinutes = parsed;
        remainingSeconds = _durationMinutes * 60;
      }
    }

    // Pre-fill duration input.
    const durInput = document.getElementById('timer-duration-input');
    if (durInput) durInput.value = _durationMinutes;

    _updateUI();

    // Control buttons.
    const startBtn = document.getElementById('timer-start');
    const stopBtn  = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');
    if (startBtn) startBtn.addEventListener('click', _start);
    if (stopBtn)  stopBtn.addEventListener('click', _stop);
    if (resetBtn) resetBtn.addEventListener('click', _reset);

    // Duration Set button.
    const setBtn = document.getElementById('timer-duration-set');
    if (setBtn) setBtn.addEventListener('click', _setDuration);

    // Allow Enter key in duration input.
    if (durInput) {
      durInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); _setDuration(); }
      });
      durInput.addEventListener('input', _clearDurationError);
    }

    // Dismiss session-complete alert.
    const alertClose = document.getElementById('timer-alert-close');
    if (alertClose) {
      alertClose.addEventListener('click', function () {
        const alertEl = document.getElementById('timer-alert');
        if (alertEl) alertEl.classList.add('hidden');
      });
    }
  }

  return { init, _formatTime, _start, _stop, _reset, _tick, _updateUI };
})();


/* ==========================================================================
   5. TodoList
   [CHALLENGE] Prevent duplicate tasks — case-insensitive check before adding.
   [CHALLENGE] Sort tasks — sort display by name A→Z, Z→A, active-first,
               completed-first, or default (insertion order).
   ========================================================================== */
const TodoList = (function () {
  'use strict';

  /** @type {Array<{id: string, text: string, completed: boolean}>} */
  let _tasks = [];

  /** @type {string|null} */
  let _editingId = null;

  /**
   * Current sort mode.
   * Values: 'default' | 'az' | 'za' | 'active-first' | 'completed-first'
   * @type {string}
   */
  let _sortMode = 'default';

  let _errorBannerBound = false;

  // ── ID generation ─────────────────────────────────────────────────────────

  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ── Pure helpers ──────────────────────────────────────────────────────────

  function _validateInput(text) {
    if (typeof text !== 'string' || text.trim().length === 0) {
      return { valid: false, error: 'Task cannot be empty.' };
    }
    if (text.trim().length > 500) {
      return { valid: false, error: 'Task is too long (max 500 characters).' };
    }
    return { valid: true };
  }

  /**
   * [CHALLENGE] Prevent duplicate tasks
   * Returns true if a task with the same text already exists (case-insensitive).
   * @param {string} text
   * @returns {boolean}
   */
  function _isDuplicate(text) {
    const normalised = text.trim().toLowerCase();
    return _tasks.some(function (t) {
      return t.text.toLowerCase() === normalised;
    });
  }

  /**
   * [CHALLENGE] Sort tasks
   * Returns a sorted copy of _tasks according to the current _sortMode.
   * The original _tasks array (insertion order) is never mutated by sorting.
   * @returns {Array}
   */
  function _getSortedTasks() {
    const copy = _tasks.slice(); // shallow copy preserves originals

    switch (_sortMode) {
      case 'az':
        copy.sort(function (a, b) {
          return a.text.toLowerCase().localeCompare(b.text.toLowerCase());
        });
        break;
      case 'za':
        copy.sort(function (a, b) {
          return b.text.toLowerCase().localeCompare(a.text.toLowerCase());
        });
        break;
      case 'active-first':
        copy.sort(function (a, b) {
          // incomplete (active) first → completed = 1, active = 0
          return (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
        });
        break;
      case 'completed-first':
        copy.sort(function (a, b) {
          return (b.completed ? 1 : 0) - (a.completed ? 1 : 0);
        });
        break;
      default: // 'default' — insertion order, no sort needed
        break;
    }

    return copy;
  }

  // ── Error / notification UI helpers ──────────────────────────────────────

  function _showGlobalError(message) {
    const banner  = document.getElementById('error-banner');
    const msgEl   = document.getElementById('error-banner-message');
    if (msgEl)  msgEl.textContent = message;
    if (banner) banner.classList.remove('hidden');

    if (!_errorBannerBound) {
      const closeBtn = document.getElementById('error-banner-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          const b = document.getElementById('error-banner');
          if (b) b.classList.add('hidden');
        });
        _errorBannerBound = true;
      }
    }
  }

  function _showInputError(message) {
    const errorEl = document.getElementById('todo-input-error');
    const inputEl = document.getElementById('todo-input');
    if (errorEl) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
    if (inputEl) inputEl.classList.add('input-invalid');
  }

  function _clearInputError() {
    const errorEl = document.getElementById('todo-input-error');
    const inputEl = document.getElementById('todo-input');
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
    if (inputEl) inputEl.classList.remove('input-invalid');
  }

  function _showNotification(message) {
    const section = document.getElementById('todo-list');
    if (!section) return;

    const note = document.createElement('div');
    note.className = 'notification';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'banner-close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.innerHTML = '&#x2715;';

    const dismiss = function () { if (note.parentNode) note.parentNode.removeChild(note); };
    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 8000);

    note.appendChild(msgSpan);
    note.appendChild(closeBtn);
    section.insertBefore(note, section.firstChild);
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  function _persist() {
    const result = StorageManager.save(StorageManager.KEYS.TASKS, _tasks);
    return result.ok;
  }

  // ── Data-layer mutations ──────────────────────────────────────────────────

  function _addTask(text) {
    const validation = _validateInput(text);
    if (!validation.valid) {
      _showInputError(validation.error);
      return;
    }

    // [CHALLENGE] Prevent duplicate tasks.
    if (_isDuplicate(text)) {
      _showInputError('This task already exists.');
      return;
    }

    const task = {
      id: _generateId(),
      text: text.trim(),
      completed: false,
    };

    _tasks.push(task);

    if (!_persist()) {
      _tasks.pop();
      _showGlobalError('Your changes could not be saved. Storage may be full.');
      return;
    }

    const inputEl = document.getElementById('todo-input');
    if (inputEl) inputEl.value = '';
    _clearInputError();
    _render();
  }

  function _deleteTask(id) {
    if (_editingId === id) _editingId = null;

    const index = _tasks.findIndex(function (t) { return t.id === id; });
    if (index === -1) return;

    const removed = _tasks.splice(index, 1)[0];

    if (!_persist()) {
      _tasks.splice(index, 0, removed);
      _showGlobalError('Your changes could not be saved. Storage may be full.');
      return;
    }

    _render();
  }

  function _toggleComplete(id) {
    const task = _tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    const original = task.completed;
    task.completed = !task.completed;

    if (!_persist()) {
      task.completed = original;
      _showGlobalError('Your changes could not be saved. Storage may be full.');
      return;
    }

    _render();
  }

  // ── Edit state-machine ────────────────────────────────────────────────────

  function _startEdit(id) {
    if (_editingId !== null && _editingId !== id) _editingId = null;
    _editingId = id;
    _render();

    const li = document.querySelector('[data-id="' + id + '"]');
    if (li) {
      const editInput = li.querySelector('.todo-edit-input');
      if (editInput) editInput.focus();
    }
  }

  function _saveEdit(id, newText) {
    const validation = _validateInput(newText);

    if (!validation.valid) {
      const li = document.querySelector('[data-id="' + id + '"]');
      if (li) {
        const editInput = li.querySelector('.todo-edit-input');
        if (editInput) { editInput.classList.add('input-invalid'); editInput.focus(); }
      }
      return;
    }

    const task = _tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    const originalText = task.text;
    task.text = newText.trim();

    if (!_persist()) {
      task.text = originalText;
      _showGlobalError('Your changes could not be saved. Storage may be full.');
      return;
    }

    _editingId = null;
    _render();
  }

  function _cancelEdit(id) { // eslint-disable-line no-unused-vars
    _editingId = null;
    _render();
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  function _renderTask(task) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (task.completed ? ' completed' : '');
    li.setAttribute('data-id', task.id);

    const checkbox = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked   = task.completed;
    checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as ' + (task.completed ? 'incomplete' : 'complete'));

    if (_editingId === task.id) {
      checkbox.disabled = true;
    } else {
      checkbox.addEventListener('change', function () { _toggleComplete(task.id); });
    }

    li.appendChild(checkbox);

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    if (_editingId === task.id) {
      const editInput = document.createElement('input');
      editInput.type      = 'text';
      editInput.className = 'todo-edit-input';
      editInput.value     = task.text;
      editInput.maxLength = 500;
      editInput.setAttribute('aria-label', 'Edit task text');

      editInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter')  { e.preventDefault(); _saveEdit(task.id, editInput.value); }
        if (e.key === 'Escape') { e.preventDefault(); _cancelEdit(task.id); }
      });
      editInput.addEventListener('input', function () { editInput.classList.remove('input-invalid'); });

      li.appendChild(editInput);

      const saveBtn = document.createElement('button');
      saveBtn.className   = 'btn-icon';
      saveBtn.title       = 'Save';
      saveBtn.setAttribute('aria-label', 'Save edit');
      saveBtn.textContent = '✅';
      saveBtn.addEventListener('click', function () { _saveEdit(task.id, editInput.value); });

      const cancelBtn = document.createElement('button');
      cancelBtn.className   = 'btn-icon';
      cancelBtn.title       = 'Cancel';
      cancelBtn.setAttribute('aria-label', 'Cancel edit');
      cancelBtn.textContent = '✖️';
      cancelBtn.addEventListener('click', function () { _cancelEdit(task.id); });

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);

    } else {
      const textSpan = document.createElement('span');
      textSpan.className   = 'todo-text';
      textSpan.textContent = task.text;
      li.appendChild(textSpan);

      const editBtn = document.createElement('button');
      editBtn.className   = 'btn-icon';
      editBtn.title       = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', function () { _startEdit(task.id); });

      const deleteBtn = document.createElement('button');
      deleteBtn.className   = 'btn-icon btn-danger';
      deleteBtn.title       = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.textContent = '🗑️';
      deleteBtn.addEventListener('click', function () { _deleteTask(task.id); });

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
    }

    li.appendChild(actions);
    return li;
  }

  /**
   * Full list re-render.
   * Renders tasks in the order returned by _getSortedTasks().
   */
  function _render() {
    const listEl        = document.getElementById('todo-items');
    const placeholderEl = document.getElementById('todo-placeholder');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (_tasks.length === 0) {
      if (placeholderEl) placeholderEl.classList.remove('hidden');
      return;
    }

    if (placeholderEl) placeholderEl.classList.add('hidden');

    // [CHALLENGE] Sort tasks — use sorted copy for display.
    const sorted = _getSortedTasks();
    sorted.forEach(function (task) {
      listEl.appendChild(_renderTask(task));
    });

    if (_editingId !== null) {
      const editingLi = listEl.querySelector('[data-id="' + _editingId + '"]');
      if (editingLi) {
        const editInput = editingLi.querySelector('.todo-edit-input');
        if (editInput) editInput.focus();
      }
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  function init() {
    _tasks = StorageManager.load(StorageManager.KEYS.TASKS);

    if (StorageManager.hasParseError()) {
      _showNotification('Previous tasks could not be loaded. Starting fresh.');
      _tasks = [];
      StorageManager.clearParseError();
    }

    if (_tasks === null) _tasks = [];

    _render();

    const todoInput = document.getElementById('todo-input');
    const addBtn    = document.getElementById('todo-add');

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        if (todoInput) _addTask(todoInput.value);
      });
    }

    if (todoInput) {
      todoInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); _addTask(todoInput.value); }
      });
      todoInput.addEventListener('input', _clearInputError);
    }

    // [CHALLENGE] Sort tasks — wire sort dropdown.
    const sortSelect = document.getElementById('todo-sort');
    if (sortSelect) {
      sortSelect.value = _sortMode;
      sortSelect.addEventListener('change', function () {
        _sortMode = sortSelect.value;
        _render();
      });
    }

    if (!_errorBannerBound) {
      const closeBtn = document.getElementById('error-banner-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          const banner = document.getElementById('error-banner');
          if (banner) banner.classList.add('hidden');
        });
        _errorBannerBound = true;
      }
    }
  }

  return {
    init,
    _validateInput,
    _isDuplicate,
    _addTask,
    _deleteTask,
    _toggleComplete,
    _startEdit,
    _saveEdit,
    _cancelEdit,
    _render,
    _renderTask,
  };
})();


/* ==========================================================================
   6. QuickLinks
   ========================================================================== */
const QuickLinks = (function () {
  'use strict';

  /** @type {Array<{id: string, label: string, url: string}>} */
  let _links = [];

  function _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function _normalizeUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
  }

  function _validateInputs(label, url) {
    const labelEmpty = typeof label !== 'string' || label.trim().length === 0;
    const urlEmpty   = typeof url   !== 'string' || url.trim().length   === 0;

    if (labelEmpty || urlEmpty) {
      const result = { valid: false };
      if (labelEmpty) result.labelError = 'Label is required.';
      if (urlEmpty)   result.urlError   = 'URL is required.';
      return result;
    }

    return { valid: true };
  }

  function _showLinkError(message, markLabel, markUrl) {
    const errorEl = document.getElementById('link-error');
    const labelEl = document.getElementById('link-label-input');
    const urlEl   = document.getElementById('link-url-input');

    if (errorEl) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
    if (markLabel && labelEl) labelEl.classList.add('input-invalid');
    if (markUrl   && urlEl)   urlEl.classList.add('input-invalid');
  }

  function _clearLinkError() {
    const errorEl = document.getElementById('link-error');
    const labelEl = document.getElementById('link-label-input');
    const urlEl   = document.getElementById('link-url-input');

    if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
    if (labelEl) labelEl.classList.remove('input-invalid');
    if (urlEl)   urlEl.classList.remove('input-invalid');
  }

  function _showGlobalError(message) {
    const banner = document.getElementById('error-banner');
    const msgEl  = document.getElementById('error-banner-message');
    if (msgEl)  msgEl.textContent = message;
    if (banner) banner.classList.remove('hidden');
  }

  function _showNotification(message, isError) {
    const section = document.getElementById('quick-links');
    if (!section) return;

    const note = document.createElement('div');
    note.className = 'notification' + (isError ? ' notification-error' : '');
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'banner-close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.innerHTML = '&#x2715;';

    const dismiss = function () { if (note.parentNode) note.parentNode.removeChild(note); };
    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 8000);

    note.appendChild(msgSpan);
    note.appendChild(closeBtn);
    section.insertBefore(note, section.firstChild);
  }

  function _persist() {
    const result = StorageManager.save(StorageManager.KEYS.LINKS, _links);
    return result.ok;
  }

  function _addLink(label, url) {
    const validation = _validateInputs(label, url);

    if (!validation.valid) {
      const parts = [];
      if (validation.labelError) parts.push(validation.labelError);
      if (validation.urlError)   parts.push(validation.urlError);
      _showLinkError(parts.join(' '), !!validation.labelError, !!validation.urlError);
      return;
    }

    const link = {
      id:    _generateId(),
      label: label.trim(),
      url:   _normalizeUrl(url.trim()),
    };

    _links.push(link);

    if (!_persist()) {
      _links.pop();
      _showGlobalError('Your changes could not be saved. Storage may be full.');
      return;
    }

    const labelInput = document.getElementById('link-label-input');
    const urlInput   = document.getElementById('link-url-input');
    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';
    _clearLinkError();
    _render();
  }

  function _deleteLink(id) {
    const index = _links.findIndex(function (l) { return l.id === id; });
    if (index === -1) return;

    const removed = _links.splice(index, 1)[0];

    if (!_persist()) {
      _links.splice(index, 0, removed);
      _showGlobalError('Your changes could not be saved. Storage may be full.');
      return;
    }

    _render();
  }

  function _openLink(url) {
    const tab = window.open(url, '_blank', 'noopener,noreferrer');
    if (tab === null) {
      _showNotification('Could not open the link. Please allow popups for this page.', false);
    }
  }

  function _renderLink(link) {
    const entry = document.createElement('div');
    entry.className = 'link-entry';
    entry.setAttribute('data-id', link.id);

    const linkBtn = document.createElement('button');
    linkBtn.className   = 'link-btn';
    linkBtn.title       = link.url;
    linkBtn.textContent = link.label;
    linkBtn.addEventListener('click', function () { _openLink(link.url); });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'link-delete';
    deleteBtn.setAttribute('aria-label', 'Delete ' + link.label);
    deleteBtn.textContent = '\u2715';
    deleteBtn.addEventListener('click', function () { _deleteLink(link.id); });

    entry.appendChild(linkBtn);
    entry.appendChild(deleteBtn);
    return entry;
  }

  function _render() {
    const containerEl   = document.getElementById('link-items');
    const placeholderEl = document.getElementById('link-placeholder');
    if (!containerEl) return;

    containerEl.innerHTML = '';

    if (_links.length === 0) {
      if (placeholderEl) placeholderEl.classList.remove('hidden');
      return;
    }

    if (placeholderEl) placeholderEl.classList.add('hidden');
    _links.forEach(function (link) { containerEl.appendChild(_renderLink(link)); });
  }

  function init() {
    _links = StorageManager.load(StorageManager.KEYS.LINKS);

    if (StorageManager.hasParseError()) {
      _showNotification('Previous links could not be loaded. Starting fresh.');
      _links = [];
      StorageManager.clearParseError();
    }

    if (_links === null) _links = [];

    _render();

    const labelInput = document.getElementById('link-label-input');
    const urlInput   = document.getElementById('link-url-input');
    const addBtn     = document.getElementById('link-add');

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        _addLink(
          labelInput ? labelInput.value : '',
          urlInput   ? urlInput.value   : ''
        );
      });
    }

    if (labelInput) labelInput.addEventListener('input', _clearLinkError);
    if (urlInput)   urlInput.addEventListener('input', _clearLinkError);
  }

  return {
    init,
    _normalizeUrl,
    _validateInputs,
    _addLink,
    _deleteLink,
    _openLink,
    _render,
    _renderLink,
  };
})();


/* ==========================================================================
   7. App — bootstrap
   ========================================================================== */
const App = (function () {
  'use strict';

  function init() {
    ThemeManager.init();     // Apply theme first to avoid flash
    GreetingWidget.init();
    FocusTimer.init();
    TodoList.init();
    QuickLinks.init();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
