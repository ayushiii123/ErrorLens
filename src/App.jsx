import { useState } from 'react'
import './App.css'

const samples = {
  JavaScript: "TypeError: Cannot read properties of undefined (reading 'name')",
  Python: "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
  TypeScript: "TS2322: Type 'string' is not assignable to type 'number'.",
  Java: 'NullPointerException: Cannot invoke "String.length()" because "name" is null',
  'C#': "CS0103: The name 'userName' does not exist in the current context",
  Go: 'panic: runtime error: invalid memory address or nil pointer dereference',
}

function explainError(message) {
  const text = message.toLowerCase()
  if (!message.trim()) return null
  if (/undefined|null|none|nullpointer|nil pointer|cannot read|not defined|does not exist/.test(text)) return {
    type: /referenceerror|not defined|does not exist/.test(text) ? 'Reference error' : 'Null / undefined value',
    happened: 'Your code tried to use a value that is missing. The value is either undefined, null, or was never created in the current scope.',
    why: 'This often happens when data has not loaded yet, a property name is misspelled, or a function returned no value.',
    fix: 'Check that the value exists before using it. Trace where it is assigned, and handle the empty case explicitly.',
    before: "console.log(user.name) // user may be missing",
    after: "if (user) {\n  console.log(user.name)\n}",
  }
  if (/typeerror|unsupported operand|cannot convert|not a function|is not callable/.test(text)) return {
    type: 'Type error',
    happened: 'An operation received a value of a type it cannot work with. For example, a number and a string may have been used together.',
    why: 'Programming languages expect certain kinds of values for each operation. Data from forms and APIs is often text even when it looks numeric.',
    fix: 'Inspect the values and convert them to compatible types before combining them. Add a small check so unexpected input is handled clearly.',
    before: "const total = 5 + '3'",
    after: "const total = 5 + Number('3') // 8",
  }
  if (/syntaxerror|syntax error|unexpected token|expected .* before|invalid syntax|unterminated/.test(text)) return {
    type: 'Syntax error',
    happened: 'The parser could not understand part of the code, so it stopped before the program could run.',
    why: 'A missing bracket, quote, comma, or keyword can make the structure invalid. The reported line is often near the actual typo.',
    fix: 'Check the reported line and the one just above it. Match every opening bracket and quote, then format the file to spot uneven structure.',
    before: "const greeting = 'Hello\nconsole.log(greeting)",
    after: "const greeting = 'Hello'\nconsole.log(greeting)",
  }
  if (/cannot find module|module not found|no module named|cannot resolve|modulenotfound/.test(text)) return {
    type: 'Module not found',
    happened: 'Your project tried to import a file or package that it could not locate.',
    why: 'The package may not be installed, the import path may be misspelled, or the file name capitalization may differ.',
    fix: 'Verify the import path and file name first. If it is a third-party package, install it in this project and restart the dev server.',
    before: "import formatDate from './utils/formateDate'",
    after: "import formatDate from './utils/formatDate'",
  }
  if (/index out of range|indexerror|out of bounds|array index/.test(text)) return {
    type: 'Index out of range',
    happened: 'Your code tried to access an item at a position that does not exist in the list or array.',
    why: 'Indexes usually start at 0, and the last position is one less than the collection length. Empty collections have no valid indexes.',
    fix: 'Check the collection length before accessing an item. Use a loop boundary that stops before the length, and consider whether the collection can be empty.',
    before: 'const first = items[0] // items may be empty',
    after: 'const first = items.length > 0 ? items[0] : null',
  }
  if (/ts\d+|assignable to type|type .* is not assignable|incompatible types/.test(text)) return {
    type: 'Type mismatch',
    happened: 'A value does not match the type expected by this variable, function, or operation.',
    why: 'The code and its type annotations disagree. This can happen when a value is inferred differently than expected or input has not been converted.',
    fix: 'Follow the error to the assignment or function call. Convert the value when appropriate, or update the declared type if it should accept this value.',
    before: 'let count: number = "3"',
    after: 'let count: number = Number("3")',
  }
  return {
    type: 'Something went wrong',
    happened: 'Your program encountered an error and could not continue as expected. The message below is the best clue to where it started.',
    why: 'Errors can come from unexpected input, a missing value, or an operation that did not complete. Read the first line and look for a file and line number.',
    fix: 'Start with the first relevant line in the stack trace. Check the values used there, then reproduce the problem with the smallest input possible.',
    before: '// Add a check before the operation\nrunTask(input)',
    after: '// Handle missing or unexpected input\nif (input != null) {\n  runTask(input)\n}',
  }
}

function createErrorDna(message, analysis) {
  const lower = message.toLowerCase()
  const triggerText = (message.split(/\r?\n/).find((line) => line.trim()) || message).trim()
  let risk = 'Medium'
  let riskDescription = 'This may interrupt a feature or affect a user flow. Check the surrounding inputs and add a guard before the affected operation.'
  if (/delete|drop table|credential|secret|token|permission denied|unauthorized|production|data loss|out of memory|stack overflow|infinite loop/.test(lower)) {
    risk = 'High'
    riskDescription = 'The message hints at a security, data, availability, or production impact. Review the affected operation before retrying it with real users or data.'
  } else if (/syntax error|syntaxerror|module not found|cannot find module|no module named|type mismatch/.test(analysis.type.toLowerCase())) {
    risk = 'Low'
    riskDescription = 'This usually stops the affected code from compiling or loading, but is unlikely to damage data. Fix the reported issue and run the flow again.'
  }
  if (/permission|unauthorized|credential|secret|token/.test(lower)) {
    risk = 'High'
    riskDescription = 'Access or sensitive credentials may be involved. Verify permissions and avoid exposing secrets while investigating.'
  }
  const trigger = triggerText.length > 110 ? `${triggerText.slice(0, 107)}…` : triggerText
  return [
    { label: 'Error type', value: analysis.type, detail: 'The kind of failure the message most closely matches.' },
    { label: 'Trigger', value: trigger, detail: 'The message or operation that surfaced the problem.' },
    { label: 'Root cause', value: analysis.why, detail: 'The likely underlying reason based on this error and its context.' },
    { label: 'Risk level', value: risk, detail: riskDescription, risk: risk.toLowerCase() },
  ]
}

function ErrorDna({ dna }) {
  return <section className="error-dna" aria-label="Error DNA breakdown"><div className="dna-heading"><div><span className="mini-label">A CLOSER LOOK</span><h3>Your error DNA</h3><p>Follow the clues from symptom to impact.</p></div><span className="dna-mark">✳</span></div><div className="dna-flow">{dna.map((step, index) => <article className={`dna-step ${step.risk ? `risk-${step.risk}` : ''}`} key={`${step.label}-${index}`}><div className="dna-rail"><span className="dna-node">{String(index + 1).padStart(2, '0')}</span>{index < dna.length - 1 && <span className="dna-connector"/>}</div><div className="dna-content"><div className="dna-step-head"><span className="dna-label">{step.label}</span>{step.risk && <span className={`risk-badge ${step.risk}`}>{step.value} risk</span>}</div><strong>{step.risk ? step.value : step.label === 'Error type' ? step.value : ''}</strong>{step.label === 'Trigger' && <code>{step.value}</code>}{step.label === 'Root cause' && <p className="dna-value">{step.value}</p>}<p>{step.detail}</p></div></article>)}</div><div className="dna-footer"><span className="dna-pulse"/> Risk is an estimate based on the message text, not a security or production assessment.</div></section>
}

function createButterflyEffect(message, analysis) {
  const text = message.toLowerCase()
  let category = 'general'
  let impact = 'feature'
  let cause = 'A small assumption in the current operation may not hold for every input.'
  let ripple = 'When that assumption breaks, the current operation may stop before later work can finish.'
  if (/syntax|unexpected token|invalid syntax|unterminated/.test(text) || /syntax/i.test(analysis.type)) {
    category = 'syntax'; impact = 'flow'
    cause = 'A small punctuation or structure mistake can keep the parser from recognizing the program.'
    ripple = 'If the code cannot be parsed, the affected module cannot start, so dependent screens and actions may never load.'
  } else if (/module not found|cannot find module|no module named|cannot resolve/.test(text) || /module/i.test(analysis.type)) {
    category = 'module'; impact = 'flow'
    cause = 'A misspelled path or missing dependency prevents the expected code from being loaded.'
    ripple = 'The import fails before the feature is ready; anything that depends on that module may also fail to initialize.'
  } else if (/validation|invalid input|schema|constraint|required field/.test(text)) {
    category = 'validation'; impact = 'feature'
    cause = 'An input was accepted without a complete check against the values the next step expects.'
    ripple = 'Unexpected data can travel to a later operation, where it may be rejected or leave the feature in an incomplete state.'
  } else if (/undefined|null|none|nil|nullpointer|cannot read|not defined|does not exist/.test(text) || /undefined|reference|null/i.test(analysis.type)) {
    category = 'missing'; impact = /unhandled|fatal|crash|startup|application|dashboard|render|screen/i.test(text) ? 'flow' : 'feature'
    cause = 'A value was used before its presence was checked or before it became available.'
    ripple = 'The missing value reaches a property read or function call, interrupting that operation and any feature waiting for its result.'
  } else if (/typeerror|unsupported operand|cannot convert|assignable|incompatible types/.test(text) || /type/i.test(analysis.type)) {
    category = 'type'; impact = 'function'
    cause = 'A value reaches an operation in a different form than the operation expects.'
    ripple = 'The operation can reject the value or produce an unintended result, which may then affect the feature using that result.'
  } else if (/indexerror|out of range|out of bounds|array index/.test(text) || /index/i.test(analysis.type)) {
    category = 'bounds'; impact = 'feature'
    cause = 'The code assumes an item exists at an index that may not be available.'
    ripple = 'An empty or shorter collection breaks the read, which can stop the feature that depends on that item.'
  }
  const ok = [
    { title: 'Input arrives', detail: 'A user action or caller provides data to the program.' },
    { title: category === 'syntax' ? 'Code parses' : category === 'module' ? 'Dependency loads' : 'Check passes', detail: category === 'syntax' ? 'The program structure is valid, so execution can begin.' : category === 'module' ? 'The expected module is available to the feature.' : 'The input and expected state agree before the next operation.' },
    { title: category === 'module' ? 'Feature initializes' : 'Operation succeeds', detail: 'The program continues with values and dependencies in the expected shape.' },
    { title: 'Result is ready', detail: 'The operation returns a usable result for the next step.' },
    { title: 'User flow continues', detail: 'The interface can present the result and let the user continue.' },
  ]
  const bug = [
    { title: 'Input arrives', detail: 'The same user action begins the flow.' },
    { title: category === 'missing' ? 'Presence check skipped' : category === 'validation' ? 'Input check missed a case' : category === 'syntax' ? 'Parser meets a typo' : category === 'module' ? 'Dependency cannot resolve' : category === 'type' ? 'Unexpected value shape' : category === 'bounds' ? 'Index has no item' : 'Assumption does not hold', detail: cause },
    { title: category === 'missing' ? 'Undefined value used' : category === 'type' ? 'Operation rejects value' : category === 'bounds' ? 'Item read fails' : category === 'syntax' ? 'Module does not parse' : category === 'module' ? 'Feature cannot initialize' : category === 'validation' ? 'Unexpected data moves on' : 'Error is raised', detail: `The analyzed message is consistent with this point in the path: ${message.split(/\r?\n/)[0].slice(0, 95)}` },
    { title: 'Downstream work stops', detail: ripple },
    { title: 'User sees an incomplete flow', detail: 'This is a plausible teaching example of the ripple effect, not a live observation of your code.' },
  ]
  return { category, impact, cause, ripple, paths: { clear: ok, bug } }
}

function BugButterfly({ effect }) {
  const [open, setOpen] = useState(false)
  const [pathName, setPathName] = useState('bug')
  const [stepIndex, setStepIndex] = useState(2)
  const steps = effect.paths[pathName]
  const selected = steps[Math.min(stepIndex, steps.length - 1)]
  const impactLevels = ['local', 'function', 'feature', 'flow']
  const impactIndex = impactLevels.indexOf(effect.impact)
  return <section className={`butterfly-card ${open ? 'is-open' : ''}`} aria-label="Bug Butterfly Effect"><div className="butterfly-card-head"><div className="butterfly-emblem">✿</div><div className="butterfly-title"><span className="mini-label">TRACE THE RIPPLE</span><h3>Bug Butterfly Effect</h3><p>See how one small mistake can change the steps that follow.</p></div><button className="butterfly-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide effect' : 'Show butterfly effect'}<span>{open ? '−' : '＋'}</span></button></div>
    {open && <div className="butterfly-content"><div className="butterfly-disclaimer"><span>i</span> Educational static visualization. Your code was not executed, and these downstream effects are examples, not real-time results.</div><div className="butterfly-path-tabs" role="tablist" aria-label="Compare program paths"><button role="tab" aria-selected={pathName === 'clear'} className={pathName === 'clear' ? 'active clear-path-tab' : ''} onClick={() => { setPathName('clear'); setStepIndex(0) }}><span>✓</span> Without the bug</button><button role="tab" aria-selected={pathName === 'bug'} className={pathName === 'bug' ? 'active bug-path-tab' : ''} onClick={() => { setPathName('bug'); setStepIndex(0) }}><span>↯</span> With the bug</button></div><div className={`butterfly-flow ${pathName === 'bug' ? 'bug-flow' : 'clear-flow'}`}>{steps.map((step, index) => <button key={`${pathName}-${step.title}`} className={`butterfly-step ${stepIndex === index ? 'selected' : ''} ${index < stepIndex ? 'passed' : ''}`} onClick={() => setStepIndex(index)} aria-current={stepIndex === index ? 'step' : undefined}><span className="butterfly-node">{index === steps.length - 1 && pathName === 'clear' ? '✓' : index === steps.length - 1 ? '!' : String(index + 1).padStart(2, '0')}</span><span className="butterfly-step-title">{step.title}</span></button>)}</div><div className="butterfly-detail"><span className={`butterfly-detail-mark ${pathName}`}>{pathName === 'clear' ? '✓' : '↯'}</span><div><span className="mini-label">{pathName === 'clear' ? 'EXPECTED PATH' : 'POSSIBLE DOWNSTREAM EFFECT'}</span><h4>{selected.title}</h4><p>{selected.detail}</p></div></div><div className="impact-meter"><div className="impact-heading"><div><span className="mini-label">ESTIMATED SCOPE</span><h4>Impact meter</h4></div><span className={`impact-current impact-${effect.impact}`}>{effect.impact} impact</span></div><div className="impact-levels">{impactLevels.map((level, index) => <div className={`impact-level ${index <= impactIndex ? 'reached' : ''} ${index === impactIndex ? 'current' : ''}`} key={level}><span className="impact-level-dot"/><span>{level} impact</span></div>)}</div><p className="impact-explanation">The mistake begins locally, then may affect the <strong>{effect.impact}</strong> level in this example. {effect.ripple}</p></div><div className="butterfly-cause"><span>SMALL MISTAKE</span><p>{effect.cause}</p><span className="cause-arrow">↓</span><span>DOWNSTREAM RIPPLE</span><p>{effect.ripple}</p></div></div>}
  </section>
}

function createBugFingerprint(message, analysis, language) {
  const text = message.toLowerCase()
  const category = /null|undefined|none|nil|not defined/.test(text) ? 'Missing value' : /type|operand|assignable/.test(text) ? 'Type mismatch' : /syntax|unexpected token|invalid syntax/.test(text) ? 'Parsing' : /module not found|cannot find module|no module named/.test(text) ? 'Dependency / import' : /indexerror|out of range|out of bounds/.test(text) ? 'Collection bounds' : 'Runtime / unknown'
  const trigger = (message.split(/\r?\n/).find((line) => line.trim()) || message).trim().slice(0, 100)
  const normalized = message.toLowerCase().replace(/(['"`])[^'"`]*\1/g, '<value>').replace(/\b\d+\b/g, '#').replace(/\s+/g, ' ').trim()
  const location = message.match(/(?:line\s+|:)(\d+)(?::\d+)?/i)
  const context = `${language}${location ? ` · around line ${location[1]}` : /\bat\s+\S+/.test(message) ? ' · stack trace present' : ' · message only'}`
  return { type: analysis.type, trigger, category, context, key: `${analysis.type.toLowerCase()}|${normalized}` }
}

function createTimeline(message, analysis) {
  const lower = message.toLowerCase()
  const isMissing = /undefined|null|none|nil|nullpointer|cannot read|not defined|does not exist/.test(lower)
  const isType = /type|operand|assignable/.test(lower)
  const isIndex = /indexerror|out of range|out of bounds|array index/.test(lower)
  const key = isMissing ? 'user' : isType ? 'value' : isIndex ? 'items' : 'input'
  const initial = isMissing ? 'undefined' : isType ? '"42" (text)' : isIndex ? '[] (empty list)' : 'provided value'
  const errorStep = isMissing ? 'Read user.name while user is undefined' : isType ? 'Combine or assign values with incompatible types' : isIndex ? 'Read an item outside the available indexes' : `Encounter: ${message.split(/\r?\n/)[0].slice(0, 75)}`
  const fixedValue = isMissing ? '{ name: "Alex" }' : isType ? '42 (number)' : isIndex ? '[first item]' : 'validated input'
  const actionName = isMissing ? 'user record' : isType ? 'amount' : isIndex ? 'items' : 'input'
  const snapshot = (name, value, note) => ({ name, value, note })
  return [
    { title: 'User action', icon: '01', description: 'An action starts the path toward the failing code.', state: [snapshot('action', 'submit / run', 'A user or caller starts the operation.'), snapshot('input', actionName, 'The value that enters the affected flow.')] },
    { title: 'State change', icon: '02', description: 'Data reaches the code in a state the operation may not expect.', state: [snapshot(key, initial, isMissing ? 'The referenced value is not available yet.' : isType ? 'The value representation does not match the expected type.' : isIndex ? 'The collection has no item at the requested index.' : 'The input state is not yet confirmed.'), snapshot('flow', 'operation pending', 'Execution is approaching the relevant operation.')] },
    { title: 'Trigger error', icon: '03', description: 'The operation meets the unexpected state and the error appears.', state: [snapshot('operation', errorStep, 'The reported message points to this failure path.'), snapshot(key, initial, 'This is the value at the moment the path breaks.')] },
    { title: 'Investigation', icon: '04', description: 'A debugger would inspect the value and the line that uses it.', state: [snapshot(key, initial, `This value is the main clue behind “${analysis.type}”.`), snapshot('root cause', analysis.why, 'Likely explanation inferred from the message.')] },
    { title: 'Fix', icon: '05', description: 'A guard, validation, or conversion changes the path.', state: [snapshot('check', isMissing ? 'if (user)' : isType ? 'Number(value)' : isIndex ? 'items.length > 0' : 'validate(input)', 'An illustrative safeguard based on this error category.'), snapshot(key, fixedValue, 'Example value after the illustrative safeguard.')] },
    { title: 'After fix', icon: '06', description: 'With the example state handled, the operation can continue safely.', state: [snapshot(key, fixedValue, 'Illustrative state used to explain the changed path.'), snapshot('result', isMissing ? 'name is available' : isType ? 'compatible number value' : isIndex ? 'item available after check' : 'operation can continue', 'Expected path if the proposed assumptions hold.')] },
  ]
}

function BugTimeMachine({ analysis, message, language, similar, openPrevious, navigate, dark, setDark, session, initials, profileOpen, setProfileOpen, logout }) {
  const [stepIndex, setStepIndex] = useState(2)
  const [overrides, setOverrides] = useState({})
  const [simulation, setSimulation] = useState('')
  if (!analysis) return <main className={dark ? 'app-shell dark' : 'app-shell'}><header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); navigate('analyzer') }}><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a><div className="topbar-right"><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button></div></header><section className="time-machine-wrap"><div className="time-machine-empty"><span className="empty-icon"><Icon name="sparkle" size={22}/></span><h1>Nothing to rewind <span>yet.</span></h1><p>Analyze an error first, then Bug Time Machine can map out its likely path.</p><button className="analyze-button" onClick={() => navigate('analyzer')}>Analyze an error <span className="button-arrow">→</span></button></div></section></main>
  const steps = createTimeline(message, analysis)
  const fingerprint = createBugFingerprint(message, analysis, language)
  const step = steps[stepIndex]

  function simulate() {
    const variable = step.state.find((item) => !['operation', 'root cause', 'check', 'result', 'action', 'flow'].includes(item.name)) || step.state[0]
    const value = overrides[`${stepIndex}:${variable.name}`] ?? variable.value
    const stillMissing = /undefined|null|missing|empty|\[\]/i.test(value)
    setSimulation(stillMissing
      ? `With ${variable.name} set to “${value}”, the illustrated error path could still occur. Try a valid value or add a guard before using it.`
      : `With ${variable.name} set to “${value}”, this simplified path may move past the illustrated trigger. This is a static teaching example; it does not execute or verify your code.`)
  }

  return <main className={dark ? 'app-shell dark' : 'app-shell'}><header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); navigate('analyzer') }}><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a><div className="topbar-right"><button className="history-nav-link" onClick={() => navigate('analyzer')}>Analyzer</button>{session && <button className="history-nav-link" onClick={() => navigate('history')}>Error history</button>}<button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button>{session ? <ProfileMenu session={session} initials={initials} open={profileOpen} setOpen={setProfileOpen} logout={logout} navigate={navigate}/> : <div className="guest-nav"><button onClick={() => navigate('login')}>Sign in</button><button className="guest-register" onClick={() => navigate('register')}>Create account</button></div>}</div></header>
    <section className="time-machine-wrap"><div className="time-machine-heading"><div><span className="eyebrow"><span className="eyebrow-dot"/> TRACE THE MOMENT IT BROKE</span><h1>Bug Time <span>Machine.</span></h1><p>Walk through the state changes behind this error, one moment at a time.</p></div><button className="history-back" onClick={() => navigate('analyzer')}>← Back to analysis</button></div>
      {similar && <div className="similar-bug-banner"><span className="similar-icon">↻</span><p><strong>A similar bug was encountered before.</strong><br/>You can revisit the earlier analysis saved in your local history.</p><button onClick={() => openPrevious(similar)}>Open previous analysis →</button></div>}
      <div className="fingerprint-card"><div className="fingerprint-heading"><span className="fingerprint-mark">⌘</span><div><span className="mini-label">LOCAL BUG FINGERPRINT</span><h2>{fingerprint.type}</h2></div><span className="fingerprint-local">{session ? 'MATCHED AGAINST YOUR HISTORY' : 'LOCAL TO THIS ANALYSIS'}</span></div><div className="fingerprint-tags"><span><small>TRIGGER</small>{fingerprint.trigger}</span><span><small>CATEGORY</small>{fingerprint.category}</span><span><small>CONTEXT</small>{fingerprint.context}</span></div></div>
      <div className="timeline-card"><div className="timeline-intro"><div><span className="mini-label">THE DEBUGGING TRACE</span><h2>From action to after-fix</h2><p>Select a moment to inspect its state snapshot.</p></div><span className="timeline-static">STATIC MODEL</span></div><div className="timeline-track">{steps.map((item, index) => <button key={item.title} className={`timeline-stop ${stepIndex === index ? 'selected' : ''} ${index < stepIndex ? 'visited' : ''}`} onClick={() => { setStepIndex(index); setSimulation('') }} aria-current={stepIndex === index ? 'step' : undefined} aria-pressed={stepIndex === index}><span className="timeline-node">{item.icon}</span><span className="timeline-title">{item.title}</span></button>)}</div><div className="timeline-detail" aria-live="polite"><div className="step-summary"><span className="step-summary-icon">{step.icon}</span><div><span className="mini-label">MOMENT {step.icon} / 06</span><h3>{step.title}</h3><p>{step.description}</p></div><button className="rewind-button" disabled={stepIndex === 0} onClick={() => { setStepIndex(Math.max(0, stepIndex - 1)); setSimulation('') }}>↶ Rewind</button></div>
        <div className="snapshot-simulation-grid"><section className="snapshot-panel"><div className="snapshot-heading"><span>STATE SNAPSHOT</span><small>illustrative values</small></div>{step.state.map((item) => { const editKey = `${stepIndex}:${item.name}`; return <div className="snapshot-variable" key={item.name}><div><code>{item.name}</code><p>{item.note}</p></div><label><span>VALUE</span><input value={overrides[editKey] ?? item.value} onChange={(event) => { setOverrides({ ...overrides, [editKey]: event.target.value }); setSimulation('') }} aria-label={`${item.name} value at ${step.title}`}/></label></div> })}</section><section className="simulation-panel"><span className="mini-label">WHAT IF?</span><h3>Change the state</h3><p>Edit a value in the snapshot, then see how the simplified path could change.</p><button className="analyze-button" onClick={simulate}>Simulate <span className="button-arrow">→</span></button>{simulation && <div className="simulation-result" role="status"><span>✳</span><p>{simulation}</p></div>}</section></div>
        <div className="simulation-caveat"><span>i</span> Educational static simulation only. The application does not execute or test your code.</div>
      </div></div>
    </section><footer className="footer"><span>Made for the moments when code gets confusing.</span><span><span className="footer-mark">✳</span> Keep learning, one error at a time.</span></footer></main>
}

function createLearning(message, analysis) {
  const text = message.toLowerCase()
  let concept
  if (/undefined|null|none|nullpointer|nil pointer|cannot read|not defined|does not exist/.test(text)) concept = {
    beginner: 'Something your code wanted to use was missing. A value may not have arrived yet, or a name may point to nothing.',
    developer: 'A read or call happened before the referenced value was initialized or validated. Trace the assignment path and inspect the value at the failing line.',
    expert: 'The failure is consistent with an invalid reference at dereference time. Inspect control-flow guarantees, async data boundaries, and the contract that should establish non-nullability.',
    mistake: 'Assuming a value exists because it is usually present, without checking the empty or loading case.',
    prevent: 'Validate inputs at the boundary and model optional data explicitly. Add a guard or a test for the missing-value path.',
    question: 'What is the safest first step when a value may be missing?', options: ['Check or validate it before reading its properties', 'Convert every missing value to the string "null"', 'Retry the same property access until it works', 'Disable the error handler'], correct: 0,
  }
  else if (/typeerror|unsupported operand|cannot convert|not a function|is not callable|assignable to type|incompatible types/.test(text) || /type mismatch/i.test(analysis.type)) concept = {
    beginner: 'Two values do not fit together for the operation being attempted. For example, text that looks like a number is still text.',
    developer: 'The runtime value does not satisfy the operation or function contract. Inspect actual values at the boundary and normalize them before use.',
    expert: 'There is a mismatch between the value’s runtime representation and the operation’s type contract. Trace inference, deserialization, and conversion boundaries; preserve invariants rather than casting blindly.',
    mistake: 'Assuming values from a form, file, or API already have the type their contents appear to represent.',
    prevent: 'Parse and validate external data once at the boundary, then keep the internal type consistent. Add tests for unexpected input types.',
    question: 'What should you do when an operation receives an unexpected type?', options: ['Inspect the value and validate or convert it at the boundary', 'Silence the error with an unchecked cast', 'Delete the type annotation', 'Repeat the operation with the same value'], correct: 0,
  }
  else if (/syntaxerror|syntax error|unexpected token|invalid syntax|unterminated/.test(text)) concept = {
    beginner: 'The computer could not parse the code’s structure. A quote, bracket, comma, or keyword may be missing or out of place.',
    developer: 'Parsing failed before execution. Start at the reported location, then inspect preceding delimiters because parser positions can point after the original typo.',
    expert: 'The source does not satisfy the language grammar. Use the parser location as a search boundary, check tokenization and delimiter balance, then reduce to a minimal reproducer.',
    mistake: 'Only checking the exact character highlighted, even though the unmatched token may be on the line above.',
    prevent: 'Use editor syntax highlighting and formatting, and make small edits so the first invalid structure is easy to spot.',
    question: 'Where is a good place to look when a syntax error points at an unexpected token?', options: ['At the reported spot and just before it for an unmatched delimiter', 'Only at the end of the entire file', 'In package installation settings', 'At unrelated runtime variable values'], correct: 0,
  }
  else if (/cannot find module|module not found|no module named|cannot resolve/.test(text)) concept = {
    beginner: 'Your project tried to load code from a path or package it could not find.',
    developer: 'Module resolution failed. Verify the import specifier, case-sensitive path, export entry, and whether the dependency is installed in this workspace.',
    expert: 'The resolver could not map the specifier to a loadable module under the active resolution conditions. Check package exports, aliases, workspace boundaries, and filesystem casing.',
    mistake: 'Treating an import path as correct without checking its exact spelling and capitalization against the file on disk.',
    prevent: 'Use editor auto-imports, keep paths consistent, and verify dependency installation and package exports after moving files.',
    question: 'What is the best first check for a module-not-found error?', options: ['Verify the exact import path and that the dependency or file exists', 'Change all imports to absolute URLs', 'Clear every type definition', 'Add a random delay before importing'], correct: 0,
  }
  else if (/index out of range|indexerror|out of bounds|array index/.test(text)) concept = {
    beginner: 'The code asked for a list item at a position that is not there. The list may be shorter or empty.',
    developer: 'An index escaped the collection’s valid range. Check the collection length, loop bounds, and whether mutations changed its size.',
    expert: 'The index invariant (0 ≤ i < length) was violated. Trace index derivation and collection mutation; account for empty collections and off-by-one boundaries.',
    mistake: 'Using the collection length itself as the final valid index; the last valid index is usually length minus one.',
    prevent: 'Use safe iteration constructs and test empty, one-item, and boundary-sized collections.',
    question: 'For a zero-based list of length n, which indexes are valid?', options: ['0 through n − 1', '1 through n', '0 through n', 'Any integer if the list is not empty'], correct: 0,
  }
  else concept = {
    beginner: 'The program hit a situation it did not know how to handle. The first useful clue is usually the earliest error line and where it points.',
    developer: 'The available message is not specific enough to identify one cause. Follow the first relevant stack frame and inspect the values and operation there.',
    expert: 'The current signal is underdetermined. Correlate the first application frame with runtime state, then minimize inputs to isolate the failing invariant.',
    mistake: 'Trying several unrelated changes before narrowing down the first failing operation and reproducing it reliably.',
    prevent: 'Capture useful context in logs, make a small reproducer, and verify assumptions at system boundaries.',
    question: 'What is the most useful next step for an unfamiliar error?', options: ['Find the first relevant stack frame and inspect its inputs', 'Change several unrelated files at once', 'Ignore the error if it happens once', 'Remove all logging and retry'], correct: 0,
  }
  return {
    levels: { beginner: concept.beginner, developer: concept.developer, expert: concept.expert },
    why: analysis.why,
    mistake: concept.mistake,
    prevent: concept.prevent,
    quiz: { question: concept.question, options: concept.options, correct: concept.correct, feedback: 'This action addresses the underlying clue instead of hiding the symptom.' },
  }
}

function LearningMode({ learning }) {
  const [level, setLevel] = useState('beginner')
  const [answer, setAnswer] = useState(null)
  const quiz = learning.quiz
  const answeredCorrectly = answer === quiz.correct
  return <section className="learning-section" aria-label="Debugging learning mode"><div className="learning-heading"><div><span className="mini-label">LEARN THE PATTERN</span><h3>Debugging learning mode</h3><p>Choose how deep you want to go. Your analysis stays right here.</p></div><span className="learning-spark">✳</span></div><div className="learning-tabs" role="tablist" aria-label="Explanation level">{['beginner', 'developer', 'expert'].map((item) => <button key={item} role="tab" aria-selected={level === item} className={level === item ? 'active' : ''} onClick={() => setLevel(item)}>{item}</button>)}</div><div className="level-explanation" role="tabpanel"><span className="level-caption">{level === 'beginner' ? 'IN PLAIN WORDS' : level === 'developer' ? 'IN PRACTICE' : 'UNDER THE HOOD'}</span><p>{learning.levels[level]}</p></div><div className="learning-topics"><article><span className="topic-icon why-icon">?</span><div><h4>Why this happened</h4><p>{learning.why}</p></div></article><article><span className="topic-icon mistake-icon">↗</span><div><h4>Common mistake</h4><p>{learning.mistake}</p></div></article><article><span className="topic-icon prevent-icon">✓</span><div><h4>How to prevent it</h4><p>{learning.prevent}</p></div></article></div><div className="quiz-card"><div className="quiz-heading"><span className="quiz-count">QUICK CHECK · ONE SHOT</span><span className="quiz-mark">01 / 01</span></div><h4>{quiz.question}</h4><div className="quiz-options">{quiz.options.map((option, index) => <button key={option} disabled={answer !== null} className={`quiz-option ${answer === index ? (answeredCorrectly ? 'correct' : 'incorrect') : answer !== null && index === quiz.correct ? 'revealed-correct' : ''}`} onClick={() => setAnswer(index)}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{answer !== null && index === quiz.correct && <span className="option-check">✓</span>}</button>)}</div>{answer !== null && <div className={`quiz-feedback ${answeredCorrectly ? 'feedback-correct' : 'feedback-incorrect'}`} role="status"><strong>{answeredCorrectly ? 'That’s right.' : 'Not quite.'}</strong><span>{answeredCorrectly ? quiz.feedback : `The best answer is ${String.fromCharCode(65 + quiz.correct)}. ${quiz.feedback}`}</span></div>}</div></section>
}

function Icon({ name, size = 20 }) {
  const paths = {
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1.5a7 7 0 0 1 14 0V21Z"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const USERS_KEY = 'error-lenses-demo-users'
const SESSION_KEY = 'error-lenses-demo-session'

async function passwordDigest(password) {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') } catch { return [] }
}

function readSession() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const session = JSON.parse(storage.getItem(SESSION_KEY) || 'null')
      if (session?.email) return session
    } catch { /* Ignore invalid demo data. */ }
  }
  return null
}

function historyKey(email) {
  return `error-lenses-history:${encodeURIComponent(email.toLowerCase())}`
}

function readHistory(email) {
  if (!email) return []
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey(email)) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch { return [] }
}

function historyCategory(item) {
  const text = `${item.type || ''} ${item.error || ''}`.toLowerCase()
  if (/validation|invalid input|invalid .* value|schema|constraint|must be|required field/.test(text)) return 'Validation error'
  if (/syntax|unexpected token|invalid syntax|unterminated/.test(text)) return 'Syntax error'
  if (/undefined|null|none|nil|nullpointer|not defined|reference error/.test(text)) return 'Undefined value error'
  if (/type error|type mismatch|assignable|unsupported operand|cannot convert/.test(text)) return 'Type error'
  if (/module not found|cannot find module|no module named|cannot resolve/.test(text)) return 'Import / dependency error'
  if (/index out of range|indexerror|out of bounds|array index/.test(text)) return 'Index / bounds error'
  return 'Other runtime error'
}

const challengeBank = {
  'Type error': { prompt: 'An API returns "24" as text, but a calculation expects a number. What is a good first step?', options: ['Validate and convert the value at the input boundary', 'Silence the error with an unchecked cast', 'Retry the calculation without changing the value', 'Remove the calculation'], correct: 0, explain: 'Boundary validation and conversion make the runtime value match the operation’s expected type.' },
  'Validation error': { prompt: 'A form value fails validation. What should the program do before using it?', options: ['Check it against the expected rules and explain what needs correction', 'Skip validation on the next submit', 'Assume every non-empty value is valid', 'Hide the error message'], correct: 0, explain: 'Validation should check the expected constraints before the value enters the next step.' },
  'Syntax error': { prompt: 'A parser reports an unexpected token near a function call. What should you inspect first?', options: ['The reported line and nearby quotes, commas, and brackets', 'The API response time', 'The database row count', 'The browser storage quota'], correct: 0, explain: 'A missing or unmatched delimiter often makes the parser fail at or just after the actual typo.' },
  'Undefined value error': { prompt: 'A user record may not have loaded yet. What is the safest way to read its name?', options: ['Check the record exists before reading the name', 'Keep retrying the property access immediately', 'Convert undefined to a random name', 'Disable the error boundary'], correct: 0, explain: 'A guard handles the not-yet-loaded or missing-value path before dereferencing the record.' },
  'Import / dependency error': { prompt: 'An import cannot be resolved. Which check is most useful first?', options: ['Confirm the exact path, spelling, case, and package installation', 'Change unrelated variable names', 'Add a delay before the import', 'Ignore the resolver message'], correct: 0, explain: 'Module resolution depends on a correct path or an installed dependency available to the project.' },
  'Index / bounds error': { prompt: 'A list has 3 items and uses zero-based indexes. What is the last valid index?', options: ['2', '3', '4', '-1'], correct: 0, explain: 'With zero-based indexing, a list of length 3 has valid indexes 0, 1, and 2.' },
  'Other runtime error': { prompt: 'You see an unfamiliar runtime error. What is a useful first debugging move?', options: ['Inspect the first relevant stack frame and the values used there', 'Change several unrelated files at once', 'Ignore the error and continue', 'Remove all diagnostic messages'], correct: 0, explain: 'The first relevant frame and its inputs usually provide a focused starting point for investigation.' },
}

function profileFromHistory(history) {
  const categories = ['Type error', 'Validation error', 'Syntax error', 'Undefined value error', 'Import / dependency error', 'Index / bounds error', 'Other runtime error']
  const counts = Object.fromEntries(categories.map((category) => [category, 0]))
  history.forEach((item) => { counts[historyCategory(item)] += 1 })
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const mostCommon = history.length ? ordered[0][0] : null
  const strongest = mostCommon
  const areaToImprove = ordered.filter(([, count]) => count === 0).map(([category]) => category)[0] || ordered.at(-1)?.[0]
  let personality = 'Curious Explorer'
  if (history.length >= 5 && ordered[0][1] / history.length >= 0.6) personality = 'Pattern Investigator'
  else if (Object.values(counts).filter(Boolean).length >= 3) personality = 'Debug Detective'
  else if (history.length >= 4) personality = 'Steady Fixer'
  let improved = null
  if (history.length >= 6) {
    const midpoint = Math.ceil(history.length / 2)
    const recent = history.slice(0, midpoint)
    const earlier = history.slice(midpoint)
    const earlierCounts = Object.fromEntries(categories.map((category) => [category, earlier.filter((item) => historyCategory(item) === category).length]))
    const recentCounts = Object.fromEntries(categories.map((category) => [category, recent.filter((item) => historyCategory(item) === category).length]))
    const candidates = categories.filter((category) => earlierCounts[category] > recentCounts[category] && earlierCounts[category] >= 2)
    if (candidates.length) {
      const category = candidates.sort((a, b) => (earlierCounts[b] - recentCounts[b]) - (earlierCounts[a] - recentCounts[a]))[0]
      improved = { category, earlier: earlierCounts[category], recent: recentCounts[category] }
    }
  }
  const patterns = {
    'Type error': 'You often investigate how values move between text, numbers, and other types. Checking values at input boundaries can prevent the same mismatch from reaching the operation.',
    'Validation error': 'Validation-related entries show up often in your history. A useful habit is to check user or API input against clear rules before the rest of the code relies on it.',
    'Syntax error': 'Your history includes several parser clues. Small edits and checking the line just before the highlighted token can make syntax issues easier to isolate.',
    'Undefined value error': 'Missing or not-yet-loaded values are a recurring theme in your history. Look for async boundaries and make the empty state explicit before reading a property.',
    'Import / dependency error': 'Your saved analyses often involve loading code. Exact file names, letter casing, package installation, and export paths are good first checks.',
    'Index / bounds error': 'Collection boundaries appear often in your history. Test empty and one-item collections, and check loops for off-by-one conditions.',
    'Other runtime error': 'Your history contains a mix of runtime clues. Start at the first relevant stack frame and reduce the issue to a small, repeatable example.',
  }
  return { counts, total: history.length, mostCommon, strongest, areaToImprove, personality, improved, pattern: mostCommon ? patterns[mostCommon] : 'Analyze a few errors while signed in and this section will look for recurring categories in your local history.' }
}

function ProfileMenu({ session: activeSession, initials: avatarLetters, open, setOpen, logout: signOut, navigate }) {
  return <div className="profile-wrap"><button className="profile-trigger" onClick={() => setOpen(!open)} aria-expanded={open}><span className="profile-avatar">{avatarLetters}</span><span className="profile-name">{activeSession.name}</span><span className="profile-caret">⌄</span></button>{open && <><button className="menu-dismiss" aria-label="Close profile menu" onClick={() => setOpen(false)}/><div className="profile-menu"><div className="profile-menu-user"><strong>{activeSession.name}</strong><span>{activeSession.email}</span></div><button onClick={() => { setOpen(false); navigate('dashboard') }}><Icon name="user" size={15}/> Personal dashboard</button><button onClick={() => { setOpen(false); navigate('history') }}><span>◷</span> Error history</button><button onClick={() => { setOpen(false); navigate('regression') }}><span>↔</span> Regression guard</button><button onClick={() => { setOpen(false); navigate('timemachine') }}><span>◷</span> Bug Time Machine</button><button onClick={() => { setOpen(false); navigate('personality') }}><span>✦</span> Bug Personality</button><button onClick={signOut} className="logout-item"><span>↗</span> Sign out</button></div></>}</div>
}

function compareCode(beforeCode, afterCode) {
  const before = beforeCode.split(/\r?\n/)
  const after = afterCode.split(/\r?\n/)
  const rows = before.length <= 300 && after.length <= 300 ? before.length : Math.min(before.length, 300)
  const oldLines = before.slice(0, rows)
  const newLines = after.slice(0, Math.min(after.length, 300))
  const table = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0))
  for (let i = oldLines.length - 1; i >= 0; i -= 1) for (let j = newLines.length - 1; j >= 0; j -= 1) table[i][j] = oldLines[i] === newLines[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
  const changes = []
  let i = 0; let j = 0
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) { changes.push({ kind: 'same', text: oldLines[i] }); i += 1; j += 1 }
    else if (j < newLines.length && (i === oldLines.length || table[i][j + 1] >= table[i + 1][j])) { changes.push({ kind: 'added', text: newLines[j] }); j += 1 }
    else { changes.push({ kind: 'removed', text: oldLines[i] }); i += 1 }
  }
  if (before.length > 300 || after.length > 300) changes.push({ kind: 'note', text: 'Showing a comparison of the first 300 lines only.' })
  const removed = changes.filter((change) => change.kind === 'removed').length
  const added = changes.filter((change) => change.kind === 'added').length
  const guardPattern = /\?\.|\?\?|\bif\s*\(|\bassert\b|\btry\b|\bcatch\b|\bNumber\s*\(|\bparse(Int|Float)\s*\(|\.length\s*>\s*0|\btypeof\b|\bArray\.isArray\b/
  const beforeSignals = guardPattern.test(beforeCode)
  const afterSignals = guardPattern.test(afterCode)
  let status
  let explanation
  if (!beforeCode.trim() || !afterCode.trim()) {
    status = 'needs review'
    explanation = 'Both versions are needed for a useful comparison. Add the before-fix and after-fix code, then compare again.'
  } else if (beforeCode.trim() === afterCode.trim()) {
    status = 'issues still present'
    explanation = 'The code blocks are identical, so this comparison did not find a change that could address the original problem.'
  } else if (added > 0 && (afterSignals || !beforeSignals)) {
    status = 'likely fixed'
    explanation = `The after version changes ${removed} ${removed === 1 ? 'line' : 'lines'} and adds ${added} ${added === 1 ? 'line' : 'lines'}.${afterSignals ? ' It also includes a guard, validation, conversion, or error-handling pattern.' : ' The change removes or replaces code from the before version.'} This is only a static signal; review the behavior in context.`
  } else {
    status = 'needs review'
    explanation = `The comparison found ${removed} removed and ${added} added ${added === 1 ? 'line' : 'lines'}, but could not confidently recognize a fix pattern. Review the changed logic and edge cases.`
  }
  return { status, explanation, changes, removed, added }
}

function RegressionPage({ dark, setDark, navigate, session, initials, profileOpen, setProfileOpen, logout }) {
  const [beforeCode, setBeforeCode] = useState('')
  const [afterCode, setAfterCode] = useState('')
  const [comparison, setComparison] = useState(null)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState('')

  function compare() {
    if (!beforeCode.trim() || !afterCode.trim()) { setNotice('Add both code versions to compare them.'); setComparison(null); return }
    setNotice('')
    setCopied(false)
    setComparison(compareCode(beforeCode, afterCode))
  }

  function reset() { setBeforeCode(''); setAfterCode(''); setComparison(null); setCopied(false); setNotice('') }
  async function copyResult() {
    if (!comparison) return
    const text = `Regression Guard — static comparison\nResult: ${comparison.status}\n${comparison.explanation}\n\nAdded: ${comparison.added} line(s)\nRemoved: ${comparison.removed} line(s)\n\nThis code was not executed or tested.`
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
    catch { setNotice('Clipboard access is unavailable. You can select and copy the comparison summary.') }
  }

  const statusIcon = comparison?.status === 'likely fixed' ? '✓' : comparison?.status === 'issues still present' ? '!' : '?'
  return <main className={dark ? 'app-shell dark' : 'app-shell'}><header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); navigate('analyzer') }}><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a><div className="topbar-right"><button className="history-nav-link" onClick={() => navigate('analyzer')}>Analyzer</button><button className="history-nav-link" onClick={() => navigate('timemachine')}>Bug Time Machine</button><button className="history-nav-link" onClick={() => navigate('personality')}>Bug Personality</button><button className="history-nav-link" onClick={() => navigate(session ? 'history' : 'login')}>Error history</button>{session ? <ProfileMenu session={session} initials={initials} open={profileOpen} setOpen={setProfileOpen} logout={logout} navigate={navigate}/> : <div className="guest-nav"><button onClick={() => navigate('login')}>Sign in</button><button className="guest-register" onClick={() => navigate('register')}>Create account</button></div>}<button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button></div></header>
    <section className="regression-wrap"><div className="regression-heading"><div><span className="eyebrow"><span className="eyebrow-dot"/> STATIC CODE REVIEW</span><h1>Regression <span>Guard.</span></h1><p>Compare before and after. Spot what changed and get a quick static signal.</p></div><button className="history-back" onClick={() => navigate('analyzer')}>← Back to analyzer</button></div><div className="static-notice"><span>i</span><p><strong>Static comparison only.</strong> Your code is not run, tested, or checked against the original error. Review the changes and verify them in your own environment.</p></div>
      <div className="regression-editors"><label className="regression-editor"><span className="editor-title"><span className="editor-dot before-dot"/> BEFORE FIX <small>Original code</small></span><textarea value={beforeCode} onChange={(event) => setBeforeCode(event.target.value)} placeholder={'Paste the code before your fix…\n\nfunction readUser(user) {\n  return user.name\n}'} spellCheck="false"/></label><label className="regression-editor"><span className="editor-title"><span className="editor-dot after-dot"/> AFTER FIX <small>Updated code</small></span><textarea value={afterCode} onChange={(event) => setAfterCode(event.target.value)} placeholder={'Paste the code after your fix…\n\nfunction readUser(user) {\n  if (!user) return null\n  return user.name\n}'} spellCheck="false"/></label></div>
      <div className="regression-actions"><button className="analyze-button" onClick={compare}>Compare fix <span className="button-arrow">→</span></button><button className="reset-regression" onClick={reset}>Reset</button>{notice && <span className="regression-notice" role="status">{notice}</span>}</div>
      {comparison && <section className="comparison-result"><div className={`comparison-status status-${comparison.status.replaceAll(' ', '-')}`}><span className="status-icon">{statusIcon}</span><div><span className="mini-label">STATIC COMPARISON RESULT</span><h2>{comparison.status}</h2></div></div><p className="comparison-explanation">{comparison.explanation}</p><div className="comparison-caveat">This is a text-based heuristic. No code was executed or tested.</div><div className="diff-heading"><div><span className="mini-label">LINE-BY-LINE OVERVIEW</span><h3>What changed</h3></div><div className="diff-counts"><span className="added-count">+{comparison.added}</span><span className="removed-count">−{comparison.removed}</span></div></div><div className="diff-list">{comparison.changes.map((change, index) => <div className={`diff-line diff-${change.kind}`} key={`${index}-${change.text}`}><span>{change.kind === 'added' ? '+' : change.kind === 'removed' ? '−' : change.kind === 'note' ? 'i' : ' '}</span><code>{change.text || ' '}</code></div>)}</div><div className="diff-footer"><span>Added lines are green · removed lines are red</span><button className="copy-button" onClick={copyResult}><Icon name={copied ? 'check' : 'copy'} size={15}/>{copied ? 'Copied!' : 'Copy result'}</button></div></section>}
    </section><footer className="footer"><span>Made for the moments when code gets confusing.</span><span><span className="footer-mark">✳</span> Keep learning, one error at a time.</span></footer></main>
}

function HistoryPage({ session, dark, setDark, openAnalysis, navigate, logout, profileOpen, setProfileOpen }) {
  const [history, setHistory] = useState(() => readHistory(session.email))
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [languageFilter, setLanguageFilter] = useState('All languages')
  const initials = (session.name || session.email).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const types = [...new Set(history.map((item) => item.type))]
  const languages = [...new Set(history.map((item) => item.language))]
  const filtered = history.filter((item) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [item.error, item.type, item.summary, item.language].some((value) => value.toLowerCase().includes(query))
    return matchesSearch && (typeFilter === 'All types' || item.type === typeFilter) && (languageFilter === 'All languages' || item.language === languageFilter)
  })

  function deleteHistory() {
    if (!history.length || !window.confirm('Delete all of your saved error analyses? This cannot be undone.')) return
    localStorage.removeItem(historyKey(session.email))
    setHistory([])
  }

  return <main className={dark ? 'app-shell dark' : 'app-shell'}><header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); navigate('analyzer') }}><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a><div className="topbar-right"><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button><ProfileMenu session={session} initials={initials} open={profileOpen} setOpen={setProfileOpen} logout={logout} navigate={navigate}/></div></header>
    <section className="history-wrap"><div className="history-heading"><div><span className="eyebrow"><span className="eyebrow-dot"/> YOUR PERSONAL SPACE</span><h1>Error <span>history.</span></h1><p>Every explanation you’ve explored, saved in one place.</p></div><div className="history-heading-actions"><button className="history-back" onClick={() => navigate('dashboard')}>← Dashboard</button><button className="analyze-button" onClick={() => navigate('analyzer')}>Analyze an error <span className="button-arrow">→</span></button></div></div>
      <div className="history-toolbar"><label className="history-search"><span>⌕</span><input aria-label="Search error history" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search errors, types, or languages…"/></label><div className="history-filters"><label><span>TYPE</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>All types</option>{types.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>LANGUAGE</span><select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}><option>All languages</option>{languages.map((language) => <option key={language}>{language}</option>)}</select></label></div></div>
      <div className="history-list-head"><span>{filtered.length} {filtered.length === 1 ? 'analysis' : 'analyses'}</span><button className="delete-history" disabled={!history.length} onClick={deleteHistory}>Delete history <span>×</span></button></div>
      {filtered.length ? <div className="history-list">{filtered.map((item) => <article className="history-item" key={item.id}><div className="history-item-main"><div className="history-item-type"><span className="history-type-icon"><Icon name="sparkle" size={15}/></span><span>{item.type}</span></div><p>{item.summary}</p><code className="history-error">{item.error}</code><div className="history-meta"><span>{new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span><i/><span>{item.language}</span></div></div><button className="reopen-button" onClick={() => openAnalysis(item)}>Open analysis <span>→</span></button></article>)}</div> : <div className="history-empty"><span className="empty-icon"><Icon name="sparkle" size={22}/></span><h2>{history.length ? 'No matches this time.' : 'Your history starts here.'}</h2><p>{history.length ? 'Try a different search or clear one of the filters.' : 'Analyze an error while signed in and we’ll save the explanation here.'}</p>{history.length === 0 && <button className="analyze-button" onClick={() => navigate('analyzer')}>Analyze your first error <span className="button-arrow">→</span></button>}</div>}
    </section><footer className="footer"><span>Made for the moments when code gets confusing.</span><span><span className="footer-mark">✳</span> Keep learning, one error at a time.</span></footer></main>
}

function BugPersonalityPage({ session, dark, setDark, navigate, logout, profileOpen, setProfileOpen }) {
  const history = readHistory(session.email)
  const profile = profileFromHistory(history)
  const [started, setStarted] = useState(false)
  const [answer, setAnswer] = useState(null)
  const scoreKey = `error-lenses-challenge-score:${encodeURIComponent(session.email.toLowerCase())}`
  const [score, setScore] = useState(() => Number(localStorage.getItem(scoreKey)) || 0)
  const challenge = challengeBank[profile.mostCommon] || challengeBank['Other runtime error']
  const initials = (session.name || session.email).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  function chooseAnswer(index) {
    if (answer !== null) return
    setAnswer(index)
    if (index === challenge.correct) {
      const next = score + 1
      setScore(next)
      try { localStorage.setItem(scoreKey, String(next)) } catch { /* The session score still updates in memory. */ }
    }
  }

  return <main className={dark ? 'app-shell dark' : 'app-shell'}><header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); navigate('analyzer') }}><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a><div className="topbar-right"><button className="history-nav-link" onClick={() => navigate('analyzer')}>Analyzer</button><button className="history-nav-link" onClick={() => navigate('history')}>Error history</button><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button><ProfileMenu session={session} initials={initials} open={profileOpen} setOpen={setProfileOpen} logout={logout} navigate={navigate}/></div></header>
    <section className="personality-wrap"><div className="personality-heading"><div><span className="eyebrow"><span className="eyebrow-dot"/> YOUR DEBUGGING STORY</span><h1>Bug <span>Personality.</span></h1><p>A friendly look at the patterns in your saved analyses.</p></div><div className="profile-source">BASED ON YOUR ERROR LENSES HISTORY</div></div>
      <div className="profile-disclaimer"><span>i</span><p>This is an educational profile calculated from your local history. It is not scientifically validated, and it is not AI-generated or a measure of your overall programming ability.</p></div>
      <div className="personality-hero"><div className="personality-orbit orbit-left"/><div className="personality-orbit orbit-right"/><div className="personality-avatar"><span>✳</span><i>{initials}</i></div><div className="personality-copy"><span className="mini-label">YOUR DEBUGGING STYLE</span><h2>{profile.personality}</h2><p>{profile.total ? `You’ve explored ${profile.total} ${profile.total === 1 ? 'analysis' : 'analyses'} across ${Object.values(profile.counts).filter(Boolean).length} ${Object.values(profile.counts).filter(Boolean).length === 1 ? 'category' : 'categories'}.` : 'Your profile will take shape as you analyze errors while signed in.'}</p></div><div className="personality-total"><strong>{profile.total}</strong><span>SAVED<br/>ANALYSES</span></div></div>
      <div className="personality-stats"><article className="personality-stat common-stat"><span className="stat-icon">⌕</span><small>MOST COMMON CATEGORY</small><strong>{profile.mostCommon || 'Not enough history'}</strong><p>{profile.mostCommon ? `${profile.counts[profile.mostCommon]} ${profile.counts[profile.mostCommon] === 1 ? 'analysis' : 'analyses'} in this category` : 'Analyze an error to begin'}</p></article><article className="personality-stat strength-stat"><span className="stat-icon">✦</span><small>STRONGEST DEBUGGING AREA</small><strong>{profile.strongest || 'Not enough history'}</strong><p>{profile.strongest ? 'Your most explored category; this reflects activity, not measured skill.' : 'Your saved activity will appear here'}</p></article><article className="personality-stat improve-stat"><span className="stat-icon">↗</span><small>AREA TO IMPROVE</small><strong>{profile.total ? profile.areaToImprove : 'Not enough history'}</strong><p>{profile.total ? 'Least represented in your history, and a useful topic to explore next.' : 'Analyze an error to begin'}</p></article><article className="personality-stat progress-stat"><span className="stat-icon">⌁</span><small>MOST IMPROVED CATEGORY</small><strong>{profile.improved?.category || (profile.total >= 6 ? 'No clear trend yet' : 'Need more history')}</strong><p>{profile.improved ? `Appeared less in the recent half: ${profile.improved.earlier} → ${profile.improved.recent} analyses.` : profile.total >= 6 ? 'Recent and earlier activity do not show a declining repeat pattern.' : 'Available after at least 6 saved analyses.'}</p></article></div>
      <div className="personality-content-grid"><section className="pattern-card"><div className="section-heading"><div><span className="mini-label">A SMALL REFLECTION</span><h3>Debugging Pattern</h3></div><span className="pattern-mark">✳</span></div><p className="pattern-insight">{profile.pattern}</p><div className="category-bars"><span className="bars-title">CATEGORIES IN YOUR HISTORY</span>{Object.entries(profile.counts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([category, count]) => <div className="category-bar-row" key={category}><span>{category}</span><div><i style={{ width: `${Math.max(8, (count / Math.max(1, profile.total)) * 100)}%` }}/></div><strong>{count}</strong></div>)}{!profile.total && <p className="empty-pattern">Saved error categories will appear here after your first analysis.</p>}</div></section>
        <section className="challenge-card"><div className="challenge-topline"><span className="mini-label">A TINY PRACTICE ROUND</span><span className="challenge-score"><b>{score}</b> POINTS</span></div><div className="challenge-icon">{profile.mostCommon ? '✳' : '＋'}</div><h3>Personal Challenges</h3><p className="challenge-desc">{profile.mostCommon ? `A quick question inspired by your most common category: ${profile.mostCommon.toLowerCase()}.` : 'Analyze an error while signed in to unlock a challenge based on your history.'}</p>{profile.total && !started && <button className="analyze-button challenge-start" onClick={() => setStarted(true)}>Start challenge <span className="button-arrow">→</span></button>}{started && <div className="challenge-question"><strong>{challenge.prompt}</strong><div className="challenge-options">{challenge.options.map((option, index) => <button key={option} disabled={answer !== null} className={`challenge-option ${answer === index ? (index === challenge.correct ? 'right-answer' : 'wrong-answer') : answer !== null && index === challenge.correct ? 'right-reveal' : ''}`} onClick={() => chooseAnswer(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{answer !== null && <div className={`challenge-feedback ${answer === challenge.correct ? 'right-feedback' : 'wrong-feedback'}`} role="status"><strong>{answer === challenge.correct ? '+1 point · Nice work!' : 'Keep practicing.'}</strong><p>{answer === challenge.correct ? challenge.explain : `The best answer is ${String.fromCharCode(65 + challenge.correct)}. ${challenge.explain}`}</p></div>}{answer !== null && <button className="challenge-again" onClick={() => { setStarted(false); setAnswer(null) }}>Try another round ↗</button>}</div>}</section></div>
    </section><footer className="footer"><span>Made for the moments when code gets confusing.</span><span><span className="footer-mark">✳</span> Keep learning, one error at a time.</span></footer></main>
}

function AuthPage({ mode, onNavigate, onLogin, dark, setDark }) {
  const register = mode === 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    const cleanEmail = email.trim().toLowerCase()
    if (register && name.trim().length < 2) return setMessage('Please enter your name (at least 2 characters).')
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setMessage('Enter a valid email address.')
    if (password.length < 8) return setMessage('Use a password with at least 8 characters.')
    if (register && password !== confirm) return setMessage('Those passwords do not match. Try again.')
    setBusy(true)
    try {
      const users = readUsers()
      if (register) {
        if (users.some((user) => user.email === cleanEmail)) { setMessage('An account with this email already exists. Try signing in.'); return }
        users.push({ name: name.trim(), email: cleanEmail, passwordHash: await passwordDigest(password), joinedAt: new Date().toISOString() })
        localStorage.setItem(USERS_KEY, JSON.stringify(users))
        onLogin({ name: name.trim(), email: cleanEmail }, remember)
      } else {
        const user = users.find((entry) => entry.email === cleanEmail)
        if (!user || user.passwordHash !== await passwordDigest(password)) { setMessage('That email and password combination was not found. Check your details or create an account.'); return }
        onLogin({ name: user.name, email: user.email }, remember)
      }
    } catch {
      setMessage('Demo sign-in could not save data in this browser. Check your browser storage settings.')
    } finally { setBusy(false) }
  }

  return <main className={dark ? 'app-shell dark auth-shell' : 'app-shell auth-shell'}>
    <header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); onNavigate('login') }}><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a><div className="topbar-right">{register && <button className="nav-text-button" onClick={() => onNavigate('login')}>Sign in</button>}<button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button></div></header>
    <section className="auth-layout"><div className="auth-intro"><span className="eyebrow"><span className="eyebrow-dot"/> A CALMER WAY TO DEBUG</span><h1>Your next<br/><span>aha moment</span><br/>starts here.</h1><p>Save your space, keep learning, and make sense of the errors that used to slow you down.</p><div className="auth-promise"><span><Icon name="check" size={14}/></span> Your code stays yours. Always.</div><div className="auth-blob"/></div>
      <div className="auth-card"><div className="auth-card-head"><div className="auth-icon"><Icon name="user" size={20}/></div><span className="step-label">{register ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</span><h2>{register ? 'Create your account' : 'Good to see you again.'}</h2><p>{register ? 'A little space to make debugging feel simpler.' : 'Sign in to pick up where you left off.'}</p></div>
        <form className="auth-form" onSubmit={submit} noValidate>
          {register && <label className="field-label">Your name<div className="field-input"><Icon name="user" size={16}/><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan"/></div></label>}
          <label className="field-label">Email address<div className="field-input"><span className="field-at">@</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/></div></label>
          <label className="field-label">Password<div className="field-input"><span className="field-lock">⌑</span><input type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters"/><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name="eye" size={16}/></button></div></label>
          {register && <label className="field-label">Confirm password<div className="field-input"><span className="field-lock">⌑</span><input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type your password again"/><button type="button" className="show-password" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}><Icon name="eye" size={16}/></button></div></label>}
          <label className="remember-row"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/><span className="custom-check"><Icon name="check" size={12}/></span><span>{register ? 'Keep me signed in on this device' : 'Remember me on this device'}</span></label>
          {message && <p className="auth-message" role="alert">{message}</p>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}<span>→</span></button>
        </form><div className="auth-switch">{register ? 'Already have an account?' : 'New to Error Lenses?'} <button onClick={() => onNavigate(register ? 'login' : 'register')}>{register ? 'Sign in' : 'Create an account'}</button></div>
        <div className="demo-note"><span className="lock-dot"/> Frontend demo · account details stay in this browser</div>
      </div></section><footer className="footer auth-footer"><span>Made for the moments when code gets confusing.</span><span><span className="footer-mark">✳</span> Keep learning, one error at a time.</span></footer>
  </main>
}

function App() {
  const [language, setLanguage] = useState('JavaScript')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [dark, setDark] = useState(false)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState('')
  const [session, setSession] = useState(() => readSession())
  const [page, setPage] = useState(() => session ? 'dashboard' : 'login')
  const [profileOpen, setProfileOpen] = useState(false)

  function login(profile, remember) {
    const value = { name: profile.name, email: profile.email }
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(value))
    setSession(value)
    setPage('dashboard')
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setProfileOpen(false)
    setPage('login')
  }

  if (page === 'login' || page === 'register') return <AuthPage mode={page} onNavigate={setPage} onLogin={login} dark={dark} setDark={setDark}/>

  if (!session) return <AuthPage mode="login" onNavigate={setPage} onLogin={login} dark={dark} setDark={setDark}/>

  if (page === 'personality') {
    if (!session) return <AuthPage mode="login" onNavigate={setPage} onLogin={login} dark={dark} setDark={setDark}/>
    return <BugPersonalityPage session={session} dark={dark} setDark={setDark} navigate={setPage} logout={logout} profileOpen={profileOpen} setProfileOpen={setProfileOpen}/>
  }

  if (page === 'regression') {
    const initials = session ? (session.name || session.email).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : ''
    return <RegressionPage dark={dark} setDark={setDark} navigate={setPage} session={session} initials={initials} profileOpen={profileOpen} setProfileOpen={setProfileOpen} logout={logout}/>
  }

  if (page === 'timemachine') {
    const currentFingerprint = result ? (result.fingerprint || createBugFingerprint(error, result, language)) : null
    const similar = session && currentFingerprint ? readHistory(session.email).find((item) => {
      if (!item.result || item.result.analysisId === result.analysisId) return false
      const fingerprint = item.result.fingerprint || createBugFingerprint(item.error, item.result, item.language)
      return fingerprint.key === currentFingerprint.key
    }) : null
    function openPrevious(item) {
      setError(item.error)
      setLanguage(item.language)
      setResult({ ...item.result, dna: item.result.dna || createErrorDna(item.error, item.result), learning: item.result.learning || createLearning(item.error, item.result), fingerprint: item.result.fingerprint || createBugFingerprint(item.error, item.result, item.language), butterfly: item.result.butterfly || createButterflyEffect(item.error, item.result) })
      setPage('analyzer')
    }
    const initials = session ? (session.name || session.email).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : ''
    return <BugTimeMachine analysis={result} message={error} language={language} similar={similar} openPrevious={openPrevious} navigate={setPage} dark={dark} setDark={setDark} session={session} initials={initials} profileOpen={profileOpen} setProfileOpen={setProfileOpen} logout={logout}/>
  }

  if (page === 'history') {
    if (!session) return <AuthPage mode="login" onNavigate={setPage} onLogin={login} dark={dark} setDark={setDark}/>
    function reopenAnalysis(item) {
      setError(item.error)
      setLanguage(item.language)
      setResult({ ...item.result, dna: item.result.dna || createErrorDna(item.error, item.result), learning: item.result.learning || createLearning(item.error, item.result), fingerprint: item.result.fingerprint || createBugFingerprint(item.error, item.result, item.language), butterfly: item.result.butterfly || createButterflyEffect(item.error, item.result) })
      setNotice('')
      setPage('analyzer')
    }
    return <HistoryPage session={session} dark={dark} setDark={setDark} openAnalysis={reopenAnalysis} navigate={setPage} logout={logout} profileOpen={profileOpen} setProfileOpen={setProfileOpen}/>
  }

  if (page === 'dashboard') {
    if (!session) return <AuthPage mode="login" onNavigate={setPage} onLogin={login} dark={dark} setDark={setDark}/>
    const initials = (session.name || session.email).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    return <main className={dark ? 'app-shell dark' : 'app-shell'}><header className="topbar"><a className="brand" href="#top" onClick={(event) => { event.preventDefault(); setPage('analyzer') }}><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a><div className="topbar-right"><button className="history-nav-link" onClick={() => setPage('history')}>Error history</button><button className="history-nav-link" onClick={() => setPage('regression')}>Regression guard</button><button className="history-nav-link" onClick={() => setPage('personality')}>Bug Personality</button><button className="history-nav-link" onClick={() => setPage('timemachine')}>Bug Time Machine</button><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button><ProfileMenu session={session} initials={initials} open={profileOpen} setOpen={setProfileOpen} logout={logout} navigate={setPage}/></div></header><section className="dashboard-wrap"><div className="dashboard-greeting"><span className="eyebrow"><span className="eyebrow-dot"/> YOUR PERSONAL SPACE</span><h1>Hey, <span>{session.name.split(' ')[0]}.</span></h1><p>A little progress goes a long way. What would you like to work on?</p></div><div className="dashboard-grid"><article className="dashboard-card primary-dash"><span className="dash-card-icon"><Icon name="sparkle" size={21}/></span><span className="step-label">READY WHEN YOU ARE</span><h2>Make sense of an error</h2><p>Get a plain-language explanation and a friendly next step for the error you’re looking at.</p><button className="analyze-button" onClick={() => setPage('analyzer')}>Open Error Lenses <span className="button-arrow">→</span></button></article><article className="dashboard-card"><span className="dash-card-icon green-dash"><Icon name="check" size={21}/></span><span className="step-label">YOUR ACCOUNT</span><h2>You’re all set.</h2><p>Your demo profile is saved in this browser. Your password is never shown or stored in readable form.</p><div className="account-chip"><span className="account-avatar">{initials}</span><span><strong>{session.name}</strong><small>{session.email}</small></span></div></article></div><div className="dashboard-tip"><span>✳</span><p><strong>A small debugging reminder</strong><br/>Read the first useful line, check the values nearby, and change one thing at a time.</p></div></section><footer className="footer"><span>Made for the moments when code gets confusing.</span><span><span className="footer-mark">✳</span> Keep learning, one error at a time.</span></footer></main>
  }

  function analyze() {
    if (!error.trim()) {
      setNotice('Paste an error message first, and we’ll take a look.')
      return
    }
    setNotice('')
    setCopied(false)
    const analysis = explainError(error)
    analysis.dna = createErrorDna(error, analysis)
    analysis.learning = createLearning(error, analysis)
    analysis.fingerprint = createBugFingerprint(error, analysis, language)
    analysis.butterfly = createButterflyEffect(error, analysis)
    analysis.analysisId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    setResult(analysis)
    if (session) {
      const entry = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, error: error.trim(), type: analysis.type, language, summary: analysis.happened, result: analysis, createdAt: new Date().toISOString() }
      const nextHistory = [entry, ...readHistory(session.email)]
      try { localStorage.setItem(historyKey(session.email), JSON.stringify(nextHistory)) } catch { setNotice('Analysis ready, but this browser could not save it to history.') }
    }
  }

  async function copyFix() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.after)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setNotice('Clipboard access is unavailable. You can select and copy the example below.')
    }
  }

  function clearAll() {
    setError('')
    setResult(null)
    setNotice('')
    setCopied(false)
  }

  function loadSample() {
    setError(samples[language])
    setResult(null)
    setNotice('')
  }

  const initials = session ? (session.name || session.email).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : ''

  return (
    <main className={dark ? 'app-shell dark' : 'app-shell'}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Error Lenses home"><span className="brand-mark"><Icon name="sparkle" size={21}/></span><span>Error<span className="brand-light">Lenses</span></span></a>
        <div className="topbar-right"><span className="topbar-note">A clearer view of your errors</span><button className="history-nav-link" onClick={() => setPage('regression')}>Regression guard</button><button className="history-nav-link" onClick={() => setPage('personality')}>Bug Personality</button><button className="history-nav-link" onClick={() => setPage('timemachine')}>Bug Time Machine</button>{session ? <><button className="history-nav-link" onClick={() => setPage('history')}>Error history</button><ProfileMenu session={session} initials={initials} open={profileOpen} setOpen={setProfileOpen} logout={logout} navigate={setPage}/></> : <div className="guest-nav"><button onClick={() => setPage('login')}>Sign in</button><button className="guest-register" onClick={() => setPage('register')}>Create account</button></div>}<button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={dark ? 'sun' : 'moon'} size={18}/></button></div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span className="eyebrow-dot"/> YOUR FRIENDLY DEBUGGING COMPANION</div>
        <h1>Errors, meet <span>understanding.</span></h1>
        <p className="hero-copy">Paste an error message. Get a clear explanation and a path forward.<br className="desktop-break"/> No jargon, just the next step.</p>
      </section>

      <section className="workspace" aria-label="Error analyzer">
        <div className="input-card">
          <div className="card-head"><div><span className="step-label">01 <span>—</span> THE ERROR</span><h2>What went wrong?</h2><p>Paste the message that has you stuck.</p></div><div className="language-control"><label htmlFor="language">LANGUAGE</label><select id="language" value={language} onChange={(event) => setLanguage(event.target.value)}>{Object.keys(samples).map((item) => <option key={item}>{item}</option>)}</select></div></div>
          <div className="editor-wrap"><div className="editor-gutter"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div><textarea aria-label="Paste your error message" value={error} onChange={(event) => setError(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') analyze() }} placeholder={'Paste your error message here…\n\nFor example: TypeError: Cannot read properties of undefined'} spellCheck="false" /></div>
          <div className="input-footer"><button className="sample-link" onClick={loadSample}><span className="sample-icon">✳</span> Try a sample error <Icon name="arrow" size={14}/></button><span className="shortcut"><kbd>⌘</kbd><kbd>↵</kbd> to analyze</span></div>
          <div className="action-row"><button className="analyze-button" onClick={analyze}><Icon name="sparkle" size={18}/> Analyze error <span className="button-arrow">→</span></button><span className="private-note"><span className="lock-dot"/> Your error stays in your browser</span></div>
          {notice && <p className="notice" role="status">{notice}</p>}
        </div>

        {result ? <section className="result-card" aria-live="polite">
          <div className="result-top"><div className="result-title"><span className="result-check"><Icon name="check" size={17}/></span><div><span className="step-label">02 <span>—</span> THE BREAKDOWN</span><h2>Let’s make sense of it.</h2></div></div><button className="clear-button" onClick={clearAll}>Clear result <span>×</span></button></div>
          <div className="type-banner"><span className="type-icon"><Icon name="sparkle" size={16}/></span><div><span className="mini-label">ERROR TYPE</span><strong>{result.type}</strong></div><span className="language-pill">{language}</span></div>
          <ErrorDna dna={result.dna || createErrorDna(error, result)}/>
          <BugButterfly effect={result.butterfly || createButterflyEffect(error, result)}/>
          <div className="explanation-grid"><article className="explanation-item"><span className="number">01</span><div><h3>What happened</h3><p>{result.happened}</p></div></article><article className="explanation-item"><span className="number">02</span><div><h3>Why it happened</h3><p>{result.why}</p></div></article><article className="explanation-item"><span className="number">03</span><div><h3>How to fix it</h3><p>{result.fix}</p></div></article></div>
          <div className="code-section"><div className="code-heading"><div><span className="mini-label">A SMALL EXAMPLE</span><h3>See the difference</h3></div><span className="code-language">{language}</span></div><div className="code-block"><div className="code-example"><span className="code-label">BEFORE</span><pre>{result.before}</pre></div><div className="code-example fix-example"><span className="code-label">AFTER</span><pre>{result.after}</pre></div></div><div className="copy-row"><span>Use this as a starting point, then adapt it to your code.</span><button className={copied ? 'copy-button copied' : 'copy-button'} onClick={copyFix}><Icon name={copied ? 'check' : 'copy'} size={15}/>{copied ? 'Copied!' : 'Copy fix'}</button></div></div>
          <LearningMode key={result.analysisId || `${language}-${error}`} learning={result.learning || createLearning(error, result)}/>
        </section> : <section className="empty-result"><span className="empty-orbit orbit-a"/><span className="empty-orbit orbit-b"/><span className="empty-icon"><Icon name="sparkle" size={22}/></span><span className="empty-label">YOUR CLEAR VIEW</span><p>Your explanation will show up here.<br/>We’ll take it one step at a time.</p><div className="empty-rule"><span/></div></section>}
      </section>
      <footer className="footer"><span>Made for the moments when code gets confusing.</span><span><span className="footer-mark">✳</span> Keep learning, one error at a time.</span></footer>
    </main>
  )
}

export default App
