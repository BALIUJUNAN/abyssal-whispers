
// validateGameData.cjs — Orchestrator: delegates to sub-validators.
var ref = require('./referenceValidator.cjs');
var cond = require('./conditionValidator.cjs');
var eff = require('./effectValidator.cjs');

function validateGameData(base, ch2plus, meta) {
  return [].concat(
    ref.validateReferences(base, ch2plus, meta),
    cond.validateConditions(base, ch2plus),
    eff.validateEffects(base, ch2plus)
  );
}

try{module.exports={validateGameData};}catch(e){}
