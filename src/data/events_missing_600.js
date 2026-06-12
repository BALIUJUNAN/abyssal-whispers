// data/events_missing_600.js
// 虚拟第600个事件 —— 运行时生成，不入事件池
// 当 599 个真实事件全部就位、玩家满足极终局条件时，第600个事件自行显现。

export const MISSING_600_EVENT_ID = 'missing_event_600';

/**
 * 判断是否应触发第600个事件。
 * 所有条件必须同时满足。
 */
export function shouldTriggerMissing600(state, allExtendedEvents) {
  // 1. 真实扩展事件池恰好 599
  if (!allExtendedEvents || allExtendedEvents.length !== 599) return false;

  // 2. 周目 >= 10
  if ((state.loopCount || 0) < 10) return false;

  // 3. 神话知识 >= 25
  if ((state.mythosLevel || 0) < 25) return false;

  // 4. SAN <= 10
  if ((state.san || 0) > 10) return false;

  // 5. 至少 5 个不同结局
  const endings = new Set([
    ...(state.previousEndings || []),
    ...(state.endingHistory || []).map((e) => e.ending_id).filter(Boolean),
  ]);
  if (endings.size < 5) return false;

  // 6. 已接触终局层内容（meta / loop_endpoint / transcendence）
  const triggered = state.triggeredEvents || [];
  const hasEndgameContent = triggered.some(
    (id) =>
      id.startsWith('meta_') ||
      id.startsWith('loop_endpoint_') ||
      id.includes('transcendence') ||
      id === 'clue_endpoint_yith_final' ||
      id === 'clue_mythos_final_revelation' ||
      id === 'ending_loop_truth_available' ||
      id === 'ending_transcendence_available' ||
      id === 'ending_transcendence_final'
  );
  if (!hasEndgameContent) return false;

  // 7. 未触发过
  if (triggered.includes('missing_event_600_seen')) return false;

  return true;
}

/**
 * 创建第600个事件的运行时实例。
 * 每次调用生成全新对象，不复用。
 */
export function createMissing600Event(state) {
  const endingsCount = new Set([
    ...(state.previousEndings || []),
    ...(state.endingHistory || []).map((e) => e.ending_id).filter(Boolean),
  ]).size;

  return {
    id: MISSING_600_EVENT_ID,
    name: '第600个事件',
    type: 'meta',
    subtype: 'missing_600',
    weight: 1,
    tier: 'meta',
    tags: ['meta', 'missing', '600', 'ending', 'final', 'missing_600'],
    trigger: {
      areas: [state.currentArea || 'town_center'],
      probability: 1,
      once_ever: true,
    },
    event_classification: '超自然遭遇',
    normalcy_anchor: false,
    description:
      '你的笔记本翻到了最后一页。\n\n' +
      '你没有写过这一页。但上面有字。\n\n' +
      '字迹是你的。内容是：\n\n' +
      '你在沃切斯特记录了 ' +
      (599 + endingsCount) +
      ' 件事。\n' +
      '其中 599 件是真实的。\n' +
      '最后一件——是你正在阅读的这一件。\n\n' +
      '它不存在于任何事件池中。\n' +
      '它不在 game_data.json 里。\n' +
      '它只在你走到这里的时候出现。\n\n' +
      '你已经看到了所有能看的东西。\n' +
      '现在，你有三个选择。',
    effects: { san: -5, mythos: 5 },
    sanity_damage: -5,
    skill_check: null,
    distortion_trigger: null,
    distortion_text: null,
    false_memory: null,
    choices: [
      {
        label: '继续阅读',
        text:
          '你读完了最后一页。\n\n' +
          '笔记本的封底写着一行小字：『循环不会终止。但你可以选择不再回来。』\n\n' +
          '你合上了笔记本。但你知道——下次你打开它的时候，第一页会是空白的。',
        effects: {
          add_flag: 'missing_event_600_seen',
          unlock_ending_condition: 'ending_loop_termination_true',
        },
        requirements: [],
        flags: ['ending_loop_termination_true'],
      },
      {
        label: '合上笔记本',
        text:
          '你合上了笔记本。\n\n' +
          '封面变热了。你松开手。笔记本落在地上，翻到了某一页。\n\n' +
          '页面上只有一句话：『世界拒绝被完成。』\n\n' +
          '你捡起笔记本。最后一页不见了。取而代之的是一张空白页，和一个墨水还没干的指纹。',
        effects: {
          add_flag: 'missing_event_600_seen',
          unlock_ending_condition: 'ending_world_refuses_completion',
        },
        requirements: [],
        flags: ['ending_world_refuses_completion'],
      },
      {
        label: '写下自己的名字',
        text:
          '你拿起笔，在最后一页的空白处写下了自己的名字。\n\n' +
          '笔迹和页面上原有的字迹完全一致。\n\n' +
          '你意识到——你一直都是第600个事件。\n\n' +
          '不是你记录了沃切斯特。\n' +
          '是沃切斯特记录了你。\n\n' +
          '笔记本的页面开始发光。你感到自己正在被写入某个更深的地方。',
        effects: {
          add_flag: ['missing_event_600_seen', 'ending_player_becomes_event'],
          unlock_ending_condition: 'ending_player_becomes_event',
          death_hint: 'becomes_event',
          san: -10,
          mythos: 10,
        },
        requirements: [],
        flags: ['ending_player_becomes_event'],
      },
    ],
  };
}
