// src/utils/trustGates.js - NPC trust gate logic (extracted from appHelpers.js)

import { hasClueId } from './clueNameMap.js';

export function checkTrustGate(nextTrust, s, npcName) {
  const visited = s.visitedAreas || [];
  const clues = s.clues || [];
  const chains = s.completedChains || [];
  const day = s.day || 1;
  const harborVisits = s.behaviorTracking?.harbor_visits || 0;
  const hasChain = (id) => chains.includes(id);
  const hasClue = (id) => hasClueId(clues, id);
  const hasAnyClueFrom = (ids) => ids.some((id) => hasClue(id));
  const harborClues = ['clue_1_1', 'clue_1_2', 'clue_1_3'];
  const morrisClues = ['clue_m_1', 'clue_m_2', 'clue_m_3'];
  const heresyClues = ['clue_h_1', 'clue_h_2', 'clue_h_3'];

  // 伊莱亚斯·沃德 — 退休教授，神秘学家
  if (npcName === '伊莱亚斯·沃德') {
    if (nextTrust === 3) {
      if (
        !visited.includes('lighthouse') &&
        !visited.includes('catacombs_entrance') &&
        clues.length < 1
      )
        return '你需要先去探索灯塔或墓穴入口，或找到一些线索，他才会愿意深谈。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom([...morrisClues, ...heresyClues]) && day < 5)
        return '他对你还不够了解。试着调查莫里斯家族或教堂的秘密，或者等到第5天。';
      return null;
    }
    if (nextTrust === 5) {
      if (chains.length < 1 && !(s.discoveredConclusions?.length > 0))
        return '他需要看到你真正触及了真相的证据。完成一条线索链或达成一个结论。';
      return null;
    }
  }

  // 玛莎·格雷 — 码头酒吧老板娘
  if (npcName === '玛莎·格雷') {
    if (nextTrust === 3) {
      if (!visited.includes('harbor_district'))
        return '你还没去过码头区。去看看她丈夫曾经工作的地方吧。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom(harborClues) && harborVisits < 2)
        return '你需要在码头区找到更多线索（失踪者名单、潮汐时刻表、酒馆传闻），或者多去几次码头。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_harbor'))
        return '你还没有解开港口失踪案的真相。完成这条线索链，她才会告诉你最后的秘密。';
      return null;
    }
  }

  // 约书亚·布莱克 — 前海军陆战队员
  if (npcName === '约书亚·布莱克') {
    if (nextTrust === 3) {
      if (!visited.includes('lighthouse') && harborVisits < 2)
        return '他只信任见过灯塔的人。去灯塔看看，或者多去几次码头。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom([...harborClues, 'clue_2_1', 'clue_2_2']) && day < 4)
        return '他需要你带来灯塔或码头的情报。继续调查吧。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_harbor') && !visited.includes('deep_catacombs'))
        return '他想知道你是否真的见过深渊。完成港口失踪案，或深入地下墓穴。';
      return null;
    }
  }

  // 希尔达·莫里斯 — 莫里斯家族继承人
  if (npcName === '希尔达·莫里斯') {
    if (nextTrust === 3) {
      if (!visited.includes('voxchester_manor')) return '你还没有去过沃切斯特庄园。去她的家看看。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom(morrisClues)) return '你需要在庄园里找到关于莫里斯家族的秘密线索。';
      return null;
    }
    if (nextTrust === 5) {
      const morrisSurfaceCount = morrisClues.filter((id) => hasClue(id)).length;
      if (morrisSurfaceCount < 2)
        return '她需要看到你确实调查过庄园。再找到至少两条莫里斯家族的表层线索。';
      return null;
    }
  }

  // 汤米·陈 — 杂货店老板，业余摄影师
  if (npcName === '汤米·陈') {
    if (nextTrust === 3) {
      if (clues.length < 2) return '他对你还不够信任。多收集一些线索再来。';
      return null;
    }
    if (nextTrust === 4) {
      if (visited.length < 3) return '他想看看你是不是认真在调查。多探索几个区域。';
      return null;
    }
    if (nextTrust === 5) {
      if (chains.length < 1) return '他需要你完成一条线索链，才会把最重要的照片给你看。';
      return null;
    }
  }

  // 伊莎贝拉·韦伯 — 教堂执事，秘密异端研究者
  if (npcName === '伊莎贝拉·韦伯') {
    if (nextTrust === 3) {
      if (!hasClue('clue_h_1') && !hasClue('clue_h_2'))
        return '你还没有注意到教堂的异常。去听听那十三声钟响。';
      return null;
    }
    if (nextTrust === 4) {
      if (!hasAnyClueFrom(heresyClues) && day < 4)
        return '你需要深入调查教堂的秘密。找找异端仪式的线索。';
      return null;
    }
    if (nextTrust === 5) {
      const heresySurfaceCount = heresyClues.filter((id) => hasClue(id)).length;
      if (heresySurfaceCount < 2 && !hasClue('clue_h_5'))
        return '她只会向真正追查过钟声的人坦白。再找到至少两条教堂线索。';
      return null;
    }
  }

  // 老费舍 — 老渔夫，深潜者混血后裔
  if (npcName === '老费舍') {
    if (nextTrust === 3) {
      if (!visited.includes('harbor_district')) return '他只在码头附近活动。去码头区找他。';
      return null;
    }
    if (nextTrust === 4) {
      if (harborVisits < 2 && day < 4) return '他需要看到你对码头的执着。多去几次，或者等到第4天。';
      return null;
    }
    if (nextTrust === 5) {
      if (!hasChain('chain_harbor') && !visited.includes('lighthouse'))
        return '他想知道你是否了解海的秘密。完成港口失踪案，或亲眼看看灯塔。';
      return null;
    }
  }

  // 埃德加·洛夫克拉夫特 — 作家
  if (npcName === '埃德加·洛夫克拉夫特') {
    if (nextTrust === 3) {
      if (clues.length < 1) return '他是一个作家，需要素材。带一些线索来，他会更愿意交谈。';
      return null;
    }
    if (nextTrust === 4) {
      if (clues.length < 3) return '他需要更多故事素材。收集更多线索。';
      return null;
    }
    if (nextTrust === 5) {
      if (chains.length < 1 && !(s.discoveredConclusions?.length > 0))
        return '他需要一个完整的故事。完成一条线索链或达成一个结论。';
      return null;
    }
  }

  return null;
}
