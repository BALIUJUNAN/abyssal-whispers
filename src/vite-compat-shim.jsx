// src/vite-compat-shim.jsx — Vite compatibility shim
// Imports source modules and exposes their exports on globalThis.
// This bridges the gap between build.py's flat global-scope concatenation
// and Vite's ESM module isolation.
//
// PROGRESS: Slice handlers (PR13-14) now have explicit imports and are
// removed from this shim. Remaining modules are still used as globals by
// component files, reducers, systems, and utility modules.
//
// TODO: Continue adding explicit imports to remaining modules (reducers,
// systems, etc.) until this shim can be reduced to only the minimal set
// of truly shared globals (GD, React, ctx, errorTracker, audioManager).

// ── Utility modules ──
import * as _reducersUtils from './reducers/utils.js';
import * as _clueNameMap from './utils/clueNameMap.js';
import * as _gameHelpers from './utils/gameHelpers.js';
import * as _trustGates from './utils/trustGates.js';
import * as _npcMemory from './utils/npcMemory.js';
import * as _errorTracker from './utils/errorTracker.js';
import * as _appHelpers from './utils/appHelpers.js';
import * as _buildEventPool from './utils/buildEventPool.js';

// ── State modules ──
import * as _gameConstants from './state/gameConstants.js';
import * as _initialState from './state/initialState.js';
import * as _transientKeys from './state/transientKeys.js';
import * as _uiStore from './state/uiStore.js';
import * as _gameStore from './state/gameStore.js';

// ── Engine modules ──
import * as _worldTime from './engine/WorldTimeSystem.js';
import * as _sanReducer from './reducers/sanReducer.js';
import * as _eventEngine from './engine/EventEngine.js';
import * as _pollutionMgr from './engine/PollutionManager.js';
import * as _saveManager from './engine/SaveManager.js';

// ── Systems ──
import * as _worldDecay from './systems/worldDecay.js';
import * as _resourceNarrative from './systems/resourceNarrative.js';
import * as _metaCorruption from './systems/metaCorruption.js';
import * as _npcDialogue from './systems/npcDialogue.js';
import * as _fearProfile from './systems/fearProfile.js';
import * as _fearLens from './systems/fearLens.js';
import * as _sanVisualCorruption from './systems/sanVisualCorruption.js';

// ── Reducers ──
import * as _extendedEvents from './reducers/extendedEvents.js';
import * as _eventReducer from './reducers/eventReducer.js';
import * as _miscReducer from './reducers/miscReducer.js';
import * as _effectReducer from './reducers/effectReducer.js';
import * as _endingReducer from './reducers/endingReducer.js';
import * as _objectiveReducer from './reducers/objectiveReducer.js';
import * as _saveMigration from './reducers/saveMigration.js';
import * as _achievementReducer from './reducers/achievementReducer.js';
import * as _loopReducer from './reducers/loopReducer.js';
import * as _chapterReducer from './reducers/chapterReducer.js';
import * as _conclusionReducer from './reducers/conclusionReducer.js';
import * as _npcReducer from './reducers/npcReducer.js';
import * as _deathSystem from './reducers/deathSystem.js';
import * as _prologueReducer from './reducers/prologueReducer.js';
import * as _ugcReducer from './reducers/ugcReducer.js';

// Slice handlers: removed (PR13-14 added explicit imports to all slice files)
// _coreSlice, _exploreSlice, _npcSlice, _dailySlice, _darkSlice, _uiSlice

// ── Runtime ──
import * as _effectExecutor from './runtime/effectExecutor.js';
import * as _audioManager from './managers/AudioManager.js';

// ── Data modules ──
import * as _eventsMissing600 from './data/events_missing_600.js';
import * as _eventsOmens600 from './data/events_omens_600.js';
import * as _extendedEventsIndex from './data/extended_events_index.js';
import * as _behaviorEndings from './data/behavior_endings.js';
import * as _endingMissing600 from './data/ending_missing_600.js';
import * as _eventsDeathEcho from './data/events_death_echo.js';
import * as _prologueEvents from './data/prologue_events.js';
import * as _descriptionTemplates from './data/descriptionTemplates.js';
import * as _mapConstants from './data/mapConstants.js';
import * as _townHotspots from './data/townHotspots.js';
import * as _ugcSchema from './data/ugcSchema.js';

// ── Registry ──
import * as _registryUtils from './data/registry/registryUtils.js';
import * as _npcRegistry from './data/registry/npcRegistry.js';
import * as _areaRegistry from './data/registry/areaRegistry.js';
import * as _itemRegistry from './data/registry/itemRegistry.js';

// ── Assign all exports to globalThis ──
// NOTE: 'produce' is already set by main.vite.jsx (window.produce = produce),
// so we no longer import/assign it here.
const MODULES = [
  _reducersUtils, _clueNameMap, _gameHelpers, _trustGates, _npcMemory,
  _errorTracker, _appHelpers, _buildEventPool,
  _gameConstants, _initialState, _transientKeys, _uiStore, _gameStore,
  _worldTime, _sanReducer, _eventEngine, _pollutionMgr, _saveManager,
  _worldDecay, _resourceNarrative, _metaCorruption, _npcDialogue,
  _extendedEvents, _eventReducer, _miscReducer, _effectReducer, _endingReducer,
  _objectiveReducer, _saveMigration, _achievementReducer, _loopReducer,
  _chapterReducer, _conclusionReducer, _npcReducer, _deathSystem,
  _prologueReducer, _ugcReducer,
  _effectExecutor, _audioManager,
  _eventsMissing600, _eventsOmens600, _extendedEventsIndex, _behaviorEndings,
  _endingMissing600, _eventsDeathEcho, _prologueEvents, _descriptionTemplates,
  _mapConstants, _townHotspots, _ugcSchema,
  _registryUtils, _npcRegistry, _areaRegistry, _itemRegistry,
];

for (const mod of MODULES) {
  for (const [key, value] of Object.entries(mod)) {
    if (!(key in globalThis)) {
      globalThis[key] = value;
    }
  }
}

// audioManager singleton
if (!('audioManager' in globalThis) && _audioManager.audioManager) {
  globalThis.audioManager = _audioManager.audioManager;
}

console.log('[Vite] Compatibility shim loaded —', MODULES.length, 'modules on globalThis');
