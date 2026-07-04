// src/systems/npc/probeThreadSystem.js — Dialogue probe/investigation thread system
// Extracted from npcSlice.js NPC_RESPONSE case (probe_* branches).

import { pick } from '../../reducers/utils.js';
import { getNpcTrust, setNpcTrust } from '../../utils/appHelpers.js';
import { hasClueId, resolveClueName } from '../../utils/clueNameMap.js';
import { propagateTrustChange, propagateFactionStanding } from '../../systems/npcRelationshipSystem.js';
import { NPC_THREAD_QUESTIONS } from '../../data/npcContextualLines.js';

export function _executeProbeThread(s, npc, trust, choice, c, ctx) {
  // Parse: probe_{threadId} or probe_{threadId}_{branch}
  var _raw = choice.slice(6);
  var _threadId = _raw;
  var _branch = null;
  // Match against known thread IDs to separate id from branch suffix
  var _probeThreads = NPC_THREAD_QUESTIONS[npc.name] || [];
  for (var _pi = 0; _pi < _probeThreads.length; _pi++) {
    var _tid = _probeThreads[_pi].id;
    if (_raw === _tid) { _threadId = _tid; break; }
    if (_raw.startsWith(_tid + '_')) { _threadId = _tid; _branch = _raw.slice(_tid.length + 1); break; }
  }
  var _threads = _probeThreads;
  var _thread = _threads.find(function (t) { return t.id === _threadId; });
  if (_thread) {
    var _threadState = (s.npcThreads || {})[npc.name + '_' + _threadId] || { depth: 0, flags: [] };
    var _nextDepth = _threadState.depth + 1;
    var _responseText = '';
    var _clueAwarded = null;
    var _trustAward = 0;
    var _flagsToSet = [];
    var _resolved = false;

    // Check trust gate for next depth
    var _nextTrustReq = _nextDepth === 1 ? (_thread.trustReq || 2) : (_nextDepth === 2 ? (_thread.depth2 && _thread.depth2.trustReq || 3) : (_thread.depth3 && _thread.depth3.trustReq || 4));

    if (trust < _nextTrustReq) {
      _responseText = npc.name + '似乎不想再深入这个话题了。';
    } else if (_nextDepth === 1) {
      // Depth 1: always linear (no branching yet)
      _responseText = _thread.depth1 ? _thread.depth1.text || _thread.depth1.response || '' : '';
    } else if (_nextDepth === 2) {
      // Depth 2: if player just chose a branch, show branch-specific depth3 outcome
      if (_branch && _thread.branches && _thread.branches[_branch]) {
        var _brData = _thread.branches[_branch];
        if (_brData.depth3) {
          _responseText = _brData.depth3.text || '';
          _clueAwarded = _brData.depth3.clue || null;
          _trustAward = _brData.depth3.trustGain || 0;
          _flagsToSet = _brData.depth3.flags || [];
          _resolved = true;
        }
      } else {
        // No branch chosen yet: show depth2 text
        _responseText = _d2.text || _d2.response || '';
        if (_d2.clue && !hasClueId(s.clues, _d2.clue)) _clueAwarded = _d2.clue;
      }
    } else if (_nextDepth >= 3) {
      // Depth 3: show branch-specific outcome (using stored branch) or default
      var _activeBranch = _branch || _threadState.branch;
      if (_activeBranch && _thread.branches && _thread.branches[_activeBranch]) {
        var _br3 = _thread.branches[_activeBranch];
        _responseText = _br3.depth3 ? (_br3.depth3.text || '') : '';
        _clueAwarded = _br3.depth3 ? (_br3.depth3.clue || null) : null;
        _trustAward = _br3.depth3 ? (_br3.depth3.trustGain || 0) : 0;
        _flagsToSet = _br3.depth3 ? (_br3.depth3.flags || []) : [];
      } else {
        _responseText = _d3.text || _d3.response || '';
        _clueAwarded = _d3.clue || null;
        _trustAward = _d3.trustGain || 0;
      }
      _resolved = true;
    }

    // Deduct AP for probe action
    if (_nextDepth >= 1 && _nextDepth <= 2) {
      s.ap = Math.max(0, s.ap - 1);
    }

    // Update thread state
    if (!s.npcThreads) s.npcThreads = {};
    s.npcThreads[npc.name + '_' + _threadId] = {
      depth: _resolved ? 3 : _nextDepth,
      branch: _threadState.branch,
      flags: _threadState.flags.concat(_flagsToSet),
      resolved: _resolved,
    };

    // Narrate response
    if (_responseText) c.narr('system', npc.name + '："' + _responseText + '"');

    // Award clue
    if (_clueAwarded && !hasClueId(s.clues, _clueAwarded)) {
      var _clueName = resolveClueName(_clueAwarded) || _clueAwarded;
      s.clues.push({ id: _clueAwarded, name: _clueName });
      c.narr('system', '【线索获得】' + _clueName, { isSpecial: true });
      if (c.effects) c.effects.push({ type: 'AUDIO_PLAY', id: 'clue_found' });
    }

    // Award trust
    if (_trustAward > 0) {
      var _newTrust = Math.min(5, trust + _trustAward);
      setNpcTrust(s, npc.name, _newTrust);
      propagateTrustChange(npc.name, _trustAward, s, c);
      propagateFactionStanding(npc.name, _trustAward, s);
      c.narr('system', npc.name + '对你的信任加深了。（' + trust + '→' + _newTrust + '）');
    }

    // Set flags
    for (var fi = 0; fi < _flagsToSet.length; fi++) {
      if (!s._dialogueFlags) s._dialogueFlags = [];
      if (s._dialogueFlags.indexOf(_flagsToSet[fi]) < 0) {
        s._dialogueFlags.push(_flagsToSet[fi]);
      }
    }
  }
}
