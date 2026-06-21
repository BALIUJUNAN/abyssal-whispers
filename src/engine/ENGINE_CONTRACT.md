# src/engine/ — The Runtime Contract

## Rule: The engine RUNS data. It never PRODUCES data.

```
src/engine/  = npm package (independent, zero game imports)
src/runtime/ = UI integration layer (eventBus → side effects)
src/reducers/ = state transitions (Immer drafts, action handlers)
src/data/    = game content (events, npcs, areas, items)
src/systems/ = game mechanics (text corruption, NPC dialogue, world decay)
```

## Allowed imports (engine/ can import FROM):
- `../reducers/utils.js` — pure math (clamp, pick, rand, d100)
- `zod` — schema validation
- Node built-ins (fs, path — SaveManager only)

## Forbidden imports (engine/ must NEVER import FROM):
- `../reducers/*.js` (except utils.js)
- `../reducers/slices/*.js`
- `../systems/*.js`
- `../data/*.js` or `../data/*.json`
- `../components/*.jsx`
- `../state/*.js`
- `../managers/*.js`
- `../runtime/*.js`

## Dependency Injection Pattern
When an engine function needs game-specific knowledge (e.g. SAN stage lookup, fear tags),
it receives a function parameter, NOT an import:

```js
// WRONG — engine imports from reducers or reaches for window globals
import { getSanStageFromGD } from '../reducers/sanReducer.js';
export function applyTextHallucination(text, san) {
  const stage = getSanStageFromGD(san); // COUPLING
}

// ALSO WRONG — window.GD fallback
function _defaultGetStage(san) {
  return window.GD.systems.sanity.san_stages...; // COUPLING
}

// RIGHT — caller injects the lookup
export function applyTextHallucination(text, san, getStage) {
  const stage = getStage(san); // INJECTED
}
```

## File responsibilities

| File | Responsibility | Game knowledge? |
|------|---------------|-----------------|
| EventEngine.js | Event selection, weight calculation, trigger checks | NO — receives events + fear tags as data |
| PollutionManager.js | Text corruption, fake messages, choice delays | NO — receives stage getter |
| WorldTimeSystem.js | Phase calculation, seal state machine, weather | NO — reads GD via ctx |
| SaveManager.js | localStorage abstraction, slot CRUD, import/export | NO — receives validator |
| commands.js | Typed command factory functions | NO |
| combineSlices.js | Slice composition framework | NO |
| eventBus.js | Pub/sub event bus | NO |
| engineCore.js | Pure JS simulation core | NO |

## Moved out of engine/

| File | New location | Reason |
|------|-------------|--------|
| gameReducer.js | `src/reducers/gameReducer.js` | Imports from reducers/slices/* (game business logic) |
| eventSideEffects.js | `src/runtime/eventSideEffects.js` | Imports from managers/, state/, systems/ (UI integration) |

## Enforcement
Run `npm run lint:engine` to verify zero violations.
