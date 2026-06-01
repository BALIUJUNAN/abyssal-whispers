// src/utils/npcMemory.js - NPC loop memory data and logic (extracted from appHelpers.js)

// === NPC Memory Lines (extracted from TALK_NPC in app.jsx to avoid per-call allocation) ===
const NPC_MEMORY_LINES={
  '玛莎·格雷':{
    t1:['又来了……我是说，欢迎光临。','你上次来过。对吧？','你看起来很面熟。'],
    t2:['你这次又住几天？','别点啤酒了。你上次没喝完。','你是不是……每个月都来一次？'],
    t3:['这是第四次了。我不再问你了。','你要的房间一直空着。我没有给别人。','有些客人会回来。你是最执着的一个。'],
    t4:['（她没有说话，只是把一杯没动过的酒推到你面前。）','（她看了你一眼，然后把你上次坐的椅子拉了出来。）']
  },
  '老费舍':{
    t1:['你……又来了？','我好像在哪见过你。不是在岸上。','海会记住所有回来的人。'],
    t2:['你身上的盐味更重了。','你比上次看起来更像一个水手了。','又是你。鱼都不惊讶了。'],
    t3:['我不数了。反正你还会回来。','你是不是已经知道海底有什么了？','每次你来，潮汐都退得更早一些。'],
    t4:['（他把你带到了码头尽头，指着水面。水面上映着你很多个倒影。）','（他把一个贝壳递给你。贝壳里传来你的声音——上一次的你。）']
  },
  '希尔达·莫里斯':{
    t1:['你看起来……像是来过这个庄园。','走廊里的画像今天换了表情。你注意到了吗？','我们以前见过？你的步伐很熟悉。'],
    t2:['你认识去书房的路。不用我带了。','你上次走的时候，有一扇窗户自己关上了。','你是不是知道地下室的秘密？你的眼神说你知道。'],
    t3:['你是我见过的最执着的访客。或者说，最执着的回来者。','我把族谱放在了你知道的地方。不用谢。','你是唯一一个看过诅咒之后还回来的人。'],
    t4:['（她站在门口等你。好像她一直知道你会在这个时间出现。）','（桌上已经放好了茶。两杯。你还没有敲门。）']
  },
  '伊莎贝拉·韦伯':{
    t1:['你的眼神让我想起了一个梦。','教堂的蜡烛今天自己亮了。有人要来。','你……你不是第一次来这里。'],
    t2:['你已经听过十三声钟响了。你还在。','你比大多数人都更接近真相。也更接近危险。','你上次问我的问题，我在你走之后想了很久。'],
    t3:['我不再劝你离开了。因为我知道你不会听。','你每次来，圣坛上的十字架都会转一个角度。','你是被选中的。不是被神选中的——是被这个地方。'],
    t4:['（她跪在圣坛前。你进来的时候，她没有抬头。她说："我知道你来了。坐下吧。"）','（她翻开了一本你从未见过的书。书的第一页写着你的名字。）']
  },
  '约书亚·布莱克':{
    t1:['你……你看起来像是见过战场。或者见过比战场更糟的东西。','我在你身上闻到了重复的味道。','你又来了。我认得你的伤疤。'],
    t2:['你走路的姿势变了。比上次更谨慎。','你上次差点死在那条巷子里。你以为我不知道？','你是不是在循环什么东西？你的眼神像困兽。'],
    t3:['你是唯一一个让我觉得"回来"是一件可怕的事情的人。','我不问了。你告诉我该怎么做。','你这次要杀谁？或者，你要救谁？'],
    t4:['（他坐在角落里擦枪。你进来的时候，他把枪放在了桌上——不是对着你，是给你。）','（他什么都没说。但他的眼神里有一种东西——不是恐惧，是认命。）']
  },
  '伊莱亚斯·沃德':{
    t1:['你的存在本身就是一个悖论。你知道吗？','我在研究轮回理论。你的案例……很有趣。','你让我想起了一篇论文。关于时间的回文结构。'],
    t2:['你的记忆保留率高于理论值。我们需要谈谈。','你已经读过了那些书。我能从你的沉默中听出来。','你来了。很好。我有一些新的发现需要验证。'],
    t3:['你不再是一个调查者了。你是一个现象。','我把你的名字写进了研究笔记。不是作为案例——是作为合作者。','你是唯一一个能告诉我"上一次"发生了什么的人。'],
    t4:['（他桌上放着一份手稿。标题是《论沃切斯特的第十三次钟声》。作者栏是空白的——但笔迹是你的。）','（他把你带到了一面镜子前。镜子里的你穿着不同年代的衣服。他问："你看到了几个自己？"）']
  }
};

/**
 * Handle NPC memory tier logic for loop >= 3. Returns lines to narrate or null.
 * Also mutates state for loop 10+ behavior memory.
 */
function handleNpcMemoryTier(s, npc, narr){
  const loop = s.loopCount;
  if(loop < 3) return;
  const npcLines = NPC_MEMORY_LINES[npc.name];
  if(!npcLines) return;
  let tier, probability;
  if(loop>=10){ tier='t4'; probability=1.0; }
  else if(loop>=8){ tier='t3'; probability=0.6; }
  else if(loop>=5){ tier='t2'; probability=0.4; }
  else{ tier='t1'; probability=0.25; }
  if(npcLines[tier] && Math.random()<probability){
    narr('system', npc.name+'突然说："'+pick(npcLines[tier])+'"');
  }
  // Loop 10+：NPC 行为变化（信任回响）
  if(loop>=10 && npcLines.t4){
    const behaviorMemory=s._npcBehaviorMemory||{};
    if(!behaviorMemory[npc.name]){
      if(!s._npcBehaviorMemory)s._npcBehaviorMemory={};
      s._npcBehaviorMemory={...s._npcBehaviorMemory,[npc.name]:true};
      const currentTrust=s.npcTrust[npc.name]||0;
      if(currentTrust<3){
        s.npcTrust={...s.npcTrust,[npc.name]:Math.min(3,currentTrust+1)};
        narr('system','（'+npc.name+'看着你，像是在确认什么。信任度悄然提升。）',{isSpecial:true});
      }
    }
  }
}


