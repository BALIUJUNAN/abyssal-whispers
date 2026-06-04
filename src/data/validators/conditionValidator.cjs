
// Condition Validator — ending condition syntax + parseability
function validateConditions(base, ch2plus) {
  var errors = [];
  var error = function(r,m,c){errors.push({level:'error',rule:r,message:m,context:c});};
  var endings = [].concat(base.endings||[]).concat((ch2plus||{}).endings||[]);

  // E07: conditions parseable
  endings.forEach(function(end){
    var conds = [].concat(end.required_conditions||[]).concat(end.blocking_conditions||[]);
    conds.forEach(function(cond){
      if(typeof cond!=='string'){error('E07','Non-string condition in '+end.id);return;}
      var depth=0;
      for(var i=0;i<cond.length;i++){
        if(cond[i]==='(')depth++;
        if(cond[i]===')')depth--;
        if(depth<0){error('E07','Unbalanced parens in '+end.id+': '+cond);break;}
      }
      if(depth!==0)error('E07','Unbalanced parens in '+end.id+': '+cond);
      if(cond.trim().length===0)error('E07','Empty condition in '+end.id);
    });
  });

  return errors;
}
try{module.exports={validateConditions};}catch(e){}
