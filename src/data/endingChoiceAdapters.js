// src/data/endingChoiceAdapters.js - Wire chapter-five decision events to endings.
//
// The chapter data contains narrative events for the final ritual, the
// fisher's answer, Nyarlathotep's offer and the escape boat, but those events
// were migrated with empty `choices` arrays.  The ending definitions still
// expect the corresponding player-decision flags.  This adapter restores the
// missing interaction layer without duplicating the large event records.

var ENDING_EVENT_CHOICES = {
  evt_ch5_final_ritual_begin: [
    {
      id: 'final_self_sacrifice',
      label: '由自己承担封印的代价',
      text: '你走进仪式中心，明确告诉其他人：代价由你承担。封印记住了这句话。',
      effects: {
        add_flag: ['has_complete_seal_ritual', 'player_chose_self_sacrifice_in_final'],
      },
    },
    {
      id: 'final_hilda_choice',
      label: '把真相告诉希尔达，让她自己选择',
      text: '你没有替希尔达决定。你说出全部真相，然后退到仪式圈外。',
      effects: {
        add_flag: [
          'has_complete_seal_ritual',
          'player_told_full_truth_to_hilda',
          'player_did_not_manipulate_hilda_sacrifice',
        ],
      },
    },
    {
      id: 'final_interrupt_ritual',
      label: '揭穿骗局并打断仪式',
      text: '你把证据摊在祭坛上。第十三声钟响之前，仪式出现了迟疑。',
      effects: {
        add_flag: [
          'morning_star_truth_exposed',
          'nyarlathotep_deception_proven',
          'player_did_not_join_ritual',
          'player_did_not_kill_isabella',
        ],
      },
    },
    {
      id: 'final_join_ritual',
      label: '接受伊莎贝拉的启示',
      text: '你踏入她画出的圆环。钟声改变了方向，封印的光开始向外流。',
      effects: {
        add_flag: ['player_joined_isabella_ritual', 'player_joined_heretical_ritual'],
      },
    },
    {
      id: 'final_follow_thirteenth_bell',
      label: '把第十三声钟当作封印指令',
      text: '你按照钟声调整了仪式。第十三声落下时，你才看见那不是修复的节拍。',
      effects: {
        add_flag: ['player_misjudged_bell_meaning'],
      },
    },
  ],
  evt_ch5_fisher_answer: [
    {
      id: 'accept_fisher_choice',
      label: '听完真相，尊重他的选择',
      text: '你没有伸手去拿他的血。老费舍自己作出了决定。',
      effects: {
        add_flag: ['player_understood_hybrid_truth', 'player_did_not_massacre_hybrids'],
      },
    },
    {
      id: 'force_fisher_blood',
      label: '强迫他交出钥匙之血',
      text: '你把真相变成了工具。老费舍看着你，像在看另一个陌生人。',
      effects: {
        add_flag: ['player_forced_blood_extraction'],
        humanity: -15,
      },
    },
  ],
  evt_ch5_escape_boat: [
    {
      id: 'take_escape_boat',
      label: '登船离开沃切斯特',
      text: '你解开缆绳。船离开码头时，雾在身后重新合拢。',
      effects: {
        add_flag: ['evt_ch5_escape_boat_route_confirmed', 'player_left_city'],
      },
    },
    {
      id: 'refuse_escape_boat',
      label: '留下，继续调查',
      text: '你把缆绳重新系紧。至少今天，你还不会离开。',
      effects: {
        add_flag: ['player_refused_escape'],
      },
    },
  ],
  evt_ch5_nyarlathotep_offer: [
    {
      id: 'reject_false_revelation',
      label: '拒绝它给出的答案',
      text: '你承认自己仍有不知道的事。那个声音第一次停顿了。',
      effects: {
        add_flag: ['nyarlathotep_deception_proven'],
      },
    },
    {
      id: 'accept_false_revelation',
      label: '接受这份启示',
      text: '答案进入你的意识。它过于完整，因此不再允许怀疑。',
      effects: {
        add_flag: ['player_san_extremely_low_accepted_false_revelation'],
        san: -8,
      },
    },
  ],
};

export function injectEndingChoices(GD) {
  if (!GD || !Array.isArray(GD.events)) return GD;
  if (GD._endingChoicesInjected) return GD;

  for (var eventId in ENDING_EVENT_CHOICES) {
    var event = GD.events.find(function (entry) {
      return entry && entry.id === eventId;
    });
    // Preserve future authored choices.  This adapter only repairs migrated
    // chapter records whose choice arrays are still empty.
    if (event && (!Array.isArray(event.choices) || event.choices.length === 0)) {
      event.choices = ENDING_EVENT_CHOICES[eventId].map(function (choice) {
        return {
          ...choice,
          effects: { ...(choice.effects || {}) },
        };
      });
    }
  }

  GD._endingChoicesInjected = true;
  return GD;
}

export { ENDING_EVENT_CHOICES };
