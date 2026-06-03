import { DESC } from './descriptionTemplates.js';
// 资源压力与生存抉择事件 - 61 events (55 + 6 §2补充)
// Directions: 食物抉择(15), 光源衰竭(12), 药品短缺(10), 安全屋入侵(10), 极端环境(8), 生存任务链(6)
export const events = [
  // =============================================
  // 食物抉择 (15) - food <= 2, humanity中等
  // =============================================
  {
    id: "resource_food_001", name: "垃圾桶里的食物", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "survival"],
    trigger: { areas: ["town_center"], food_lte: 2, probability: 0.25, once_per_run: true },
    description: "你路过一个垃圾桶。里面有半块面包。面包有点发霉，但还能吃。\n你环顾四周。没有人看到你。\n你的胃在叫。你已经很久没吃东西了。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "捡起来吃掉", text: "你把面包上的霉斑刮掉，塞进了嘴里。味道不好，但你的胃安静了下来。", effects: { food: 1, san: -1, add_run_memory: { text: "从垃圾桶里捡了食物。" } } },
      { label: "继续走", text: "你加快了脚步。胃还在叫。但你的尊严还在。", effects: { add_run_memory: { text: "忍住饥饿，没有吃垃圾桶里的食物。" } } }
    ]
  },
  {
    id: "resource_food_002", name: "渔民的鱼干", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "harbor"],
    trigger: { areas: ["harbor_district"], food_lte: 2, probability: 0.2, once_per_run: true },
    description: "码头边晾着一排鱼干。没有人看守。\n你闻到了鱼干的咸香味。你的胃在叫。\n但这些鱼干是渔民的财产。如果你拿了——\n你看了看四周。远处有一个渔民在补网。他没有看你。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "拿两条鱼干", text: "你快速拿了两条鱼干，塞进口袋，离开了。", effects: { food: 2, humanity: -3, add_run_memory: { text: "偷了渔民的鱼干。" } } },
      { label: "找渔民买", text: "你走过去，用身上仅有的钱买了两条鱼干。", effects: { food: 2, add_run_memory: { text: "用钱买了鱼干。" } } },
      { label: "忍住", text: "你转身走了。背后是鱼干的香味。前面是未知的黑暗。", effects: { san: -1, add_run_memory: { text: "忍住饥饿，没有偷鱼干。" } } }
    ]
  },
  {
    id: "resource_food_003", name: "玛莎的施舍", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "food", "npc", "martha"],
    trigger: { areas: ["harbor_district"], food_lte: 1, probability: 0.2, once_per_run: true, npc_alive: ["玛莎·格雷"] },
    description: "你走进酒吧。玛莎看到你，叹了口气。\n「你又没吃东西。」\n她从后厨端出一碗汤。汤很稀，但里面有土豆和一点鱼肉。\n「吃吧，」她说，「别客气。」\n你犹豫了。你不想欠她太多。",
    effects: {},
    event_classification: "NPC互动", normalcy_anchor: true,
    choices: [
      { label: "接受", text: "你坐下来喝完了汤。味道很好。你的胃安静了下来。", effects: { food: 1, san: 1, npc_trust: { "玛莎·格雷": 1 }, add_run_memory: { text: "接受了玛莎的施舍。" } } },
      { label: "拒绝", text: "「我没事。」玛莎看了你一眼。她不信。但她没有坚持。", effects: { san: -1, add_run_memory: { text: "拒绝了玛莎的施舍。" } } }
    ]
  },
  {
    id: "resource_food_004", name: "野猫的猎物", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "animal"],
    trigger: { areas: ["town_center", "harbor_district"], food_lte: 2, probability: 0.15, once_per_run: true },
    description: "一只野猫叼着一只老鼠从你面前跑过。\n它停下来，看着你。老鼠还活着，在猫嘴里挣扎。\n猫的眼睛在月光下闪着绿光。\n它似乎在考虑要不要把猎物让给你。或者——它在考虑你是不是下一个猎物。",
    effects: {},
    event_classification: "轻微异常", normalcy_anchor: false,
    choices: [
      { label: "和猫对视", text: "你和猫对视了几秒钟。猫转身跑了，带走了它的猎物。", effects: { add_run_memory: { text: "和野猫对视。" } } },
      { label: "试图抢夺", text: "你朝猫走了一步。猫发出了嘶嘶声，弓起了背。", effects: { hp: -1, add_run_memory: { text: "试图从野猫嘴里抢食物，被抓伤了。" } } }
    ]
  },
  {
    id: "resource_food_005", name: "偷窃的诱惑", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "theft"],
    trigger: { areas: ["town_center"], food_lte: 1, probability: 0.2, once_per_run: true },
    description: "你路过一家杂货店。门没锁。\n你推开门。店主不在。货架上摆着食物——面包、罐头、水果。\n你的手在发抖。不是因为冷——是因为饥饿。\n你只需要拿一点。一点就够了。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "偷一些食物", text: "你快速拿了几个面包和一罐肉，塞进外套里，离开了。", effects: { food: 3, humanity: -8, add_run_memory: { text: "从杂货店偷了食物。" } } },
      { label: "离开", text: "你关上了门。走了。胃在叫。但你的良心没有。", effects: { humanity: 3, add_run_memory: { text: "忍住饥饿，没有偷杂货店的食物。" } } }
    ]
  },
  {
    id: "resource_food_006", name: "分享的抉择", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "share"],
    trigger: { areas: ["harbor_district"], food_lte: 2, probability: 0.15, once_per_run: true },
    description: "你在码头边遇到一个孩子。他比你更瘦。\n他看着你手里的食物。你看着他的眼睛。\n你还有最后一点食物。如果分给他，你今天就要饿着了。\n但如果不分——他大概撑不到明天。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "分一半给他", text: "你把食物分成两半。一半给了他，一半留给自己。", effects: { food: -1, humanity: 5, add_run_memory: { text: "把食物分给了饥饿的孩子。" } } },
      { label: "全部给他", text: "你把所有食物都给了他。他没有说谢谢，只是抱着食物跑了。", effects: { food: -2, humanity: 8, add_run_memory: { text: "把所有食物都给了饥饿的孩子。" } } },
      { label: "走开", text: "你加快了脚步。背后的目光像针一样扎着你。", effects: { humanity: -3, add_run_memory: { text: "无视了饥饿的孩子。" } } }
    ]
  },
  {
    id: "resource_food_007", name: "钓鱼", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "fishing"],
    trigger: { areas: ["harbor_district"], food_lte: 2, probability: 0.2, once_per_run: true },
    description: "你坐在码头边。海面很平静。\n你有一些绳子和一个弯钉。如果你花点时间，也许能钓到什么。\n但你知道——在沃切斯特的海里，你钓上来的东西可能不是鱼。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "试着钓鱼", text: "你把钩子放进了水里。等了很久。钓上来一条小鱼。不大，但够吃一顿。", effects: { food: 1, add_run_memory: { text: "在码头钓到了一条小鱼。" } } },
      { label: "不钓了", text: "你收起了绳子。水下的东西不值得冒险。", effects: { add_run_memory: { text: "决定不在沃切斯特的海里钓鱼。" } } }
    ]
  },
  {
    id: "resource_food_008", name: "汤米的零食", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "npc", "tommy"],
    trigger: { areas: ["town_center"], food_lte: 2, probability: 0.2, once_per_run: true, npc_alive: ["汤米·陈"] },
    description: "你走进汤米的店铺。他看到你，从柜台下面拿出一个小包裹。\n「我猜你又没吃东西，」他说，「这是我老婆做的包子。还热着。」\n他把包裹推到你面前。\n「不用钱。就当是我请你。」",
    effects: { food: 2, npc_trust: { "汤米·陈": 1 }, add_run_memory: { text: "汤米给了你一些食物。" } },
    event_classification: "NPC互动", normalcy_anchor: true,
    choices: []
  },
  {
    id: "resource_food_009", name: "饥饿的幻觉", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "hallucination"],
    trigger: { areas: ["town_center"], food_lte: 0, probability: 0.25, once_per_run: true },
    description: "你已经很久没吃东西了。你的视线开始模糊。\n你看到了一桌丰盛的饭菜——就在街角。烤鸡、面包、热汤。\n你走过去。饭菜消失了。只剩下空荡荡的地面。\n你的胃在叫。你的头在痛。你知道这是幻觉。但你的身体不知道。",
    effects: { san: -2, hp: -1 },
    event_classification: "轻微异常", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_food_010", name: "交换", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "trade"],
    trigger: { areas: ["town_center"], food_lte: 2, probability: 0.2, once_per_run: true },
    description: "一个人拦住了你。他手里拿着一些食物。\n「我有吃的，」他说，「但我需要一些东西来换。」\n他看着你手里的手电筒。\n「用你的手电筒换。我需要光。」",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "交换", text: "你把手电筒给了他。他给了你一些食物和一瓶水。", effects: { food: 3, remove_item: { item_id: "flashlight" }, add_run_memory: { text: "用手电筒换了食物。" } } },
      { label: "拒绝", text: "「我需要手电筒。」他耸了耸肩，走了。", effects: { add_run_memory: { text: "拒绝了用手电筒换食物的交易。" } } }
    ]
  },
  {
    id: "resource_food_011", name: "垃圾堆里的罐头", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "scavenge"],
    trigger: { areas: ["harbor_district"], food_lte: 2, probability: 0.2, once_per_run: true },
    description: "你在码头的垃圾堆里找到了一个罐头。标签已经模糊了，但你能看出是肉罐头。\n罐头有点凹陷，但没有生锈。你摇了摇——里面有东西。\n你不确定这个罐头还能不能吃。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "打开吃掉", text: "你用匕首撬开了罐头。里面的肉看起来还正常。你吃了一半。", effects: { food: 2, san: -1, add_run_memory: { text: "吃了垃圾堆里的罐头。" } } },
      { label: "扔掉", text: "你把罐头扔回了垃圾堆。不值得冒险。", effects: { add_run_memory: { text: "扔掉了可疑的罐头。" } } }
    ]
  },
  {
    id: "resource_food_012", name: "面包店的香气", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "bakery"],
    trigger: { areas: ["town_center"], food_lte: 2, probability: 0.2, time_phase: ["morning"], once_per_run: true },
    description: "你闻到了面包的香气。是从一家面包店飘出来的。\n你走过去。店主正在把新鲜的面包摆上货架。\n面包金黄酥脆，还在冒着热气。\n你的胃在叫。但你没有钱。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "乞讨", text: "你站在店门口，犹豫了很久。店主看到你，叹了口气，递给你一个面包。", effects: { food: 1, humanity: -2, add_run_memory: { text: "向面包店主乞讨了食物。" } } },
      { label: "离开", text: "你转身走了。面包的香气跟着你走了很远。", effects: { add_run_memory: { text: "忍住饥饿，没有向面包店乞讨。" } } }
    ]
  },
  {
    id: "resource_food_013", name: "老费舍的鱼", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "npc", "fisher"],
    trigger: { areas: ["harbor_district"], food_lte: 1, probability: 0.2, once_per_run: true, npc_alive: ["老费舍"], npc_trust_gte: { "老费舍": 2 } },
    description: "老费舍看到你，从桶里捞出一条鱼。\n「拿着，」他说，「别客气。」\n鱼还是活的，在你手里挣扎。\n「你会处理鱼吗？」他问。\n你摇了摇头。\n他叹了口气，从你手里拿回鱼，三两下就处理好了。\n「给你。下次自己学。」",
    effects: { food: 2, npc_trust: { "老费舍": 1 }, add_run_memory: { text: "老费舍给了你一条处理好的鱼。" } },
    event_classification: "NPC互动", normalcy_anchor: true,
    choices: []
  },
  {
    id: "resource_food_014", name: "食物中毒", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "poison"],
    trigger: { areas: ["town_center", "harbor_district"], food_lte: 2, probability: 0.15, once_per_run: true },
    description: "你吃了一些东西。味道不太对。但你太饿了，没有在意。\n过了半个小时，你的胃开始绞痛。你蹲在路边，额头上冒出了冷汗。\n你吐了。吐出来的东西里有一些你没吃过的——像是某种黑色的液体。\n你知道了——沃切斯特的食物不全是安全的。",
    effects: { hp: -2, san: -1, food: -1, add_run_memory: { text: "食物中毒，吐出了黑色液体。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_food_015", name: "最后的储备", type: "resource_pressure", subtype: "food_choice",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "food", "safehouse"],
    trigger: { areas: ["town_center"], food_lte: 0, probability: 0.2, once_per_run: true },
    description: "你回到安全屋。翻遍了所有角落。\n在一块松动的地板下面，你找到了一些东西——两罐罐头和一瓶水。\n是之前的住户留下的。罐头的标签已经褪色了，但生产日期还能看清——是去年的。\n你不确定这些罐头还能不能吃。但你已经没有别的选择了。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "吃掉", text: "你打开了罐头。里面的肉看起来还正常。你吃了一罐，留了一罐。", effects: { food: 2, san: -1, add_run_memory: { text: "吃了安全屋里的旧罐头。" } } },
      { label: "不吃", text: "你把罐头放回了原处。不值得冒险。", effects: { add_run_memory: { text: "没有吃安全屋里的旧罐头。" } } }
    ]
  },

  // =============================================
  // 光源衰竭 (12) - lightLevel <= 1
  // =============================================
  {
    id: "resource_light_001", name: "黑暗中的脚步", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "darkness"],
    trigger: { areas: ["catacombs_entrance"], light_lte: 1, probability: 0.25, once_per_run: true },
    description: "你走进墓穴。灯光很暗——几乎看不到前方的路。\n你听到了脚步声。不是你的是——\n你停下来。脚步声也停了。\n你继续走。脚步声又开始了。\n你什么都看不到。但你知道——有什么东西在跟着你。",
    effects: { san: -2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: [
      { label: "大声呼喊", text: "你大声喊了一声。回声在墓穴里回荡。脚步声消失了。", effects: { san: -1, add_run_memory: { text: "在黑暗的墓穴里大声呼喊，驱赶了跟踪者。" } } },
      { label: "加快脚步", text: "你加快了脚步。脚步声也加快了。你跑了起来。", effects: { san: -2, add_run_memory: { text: "在黑暗的墓穴里奔跑。" } } }
    ]
  },
  {
    id: "resource_light_002", name: "手电筒的闪烁", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "flashlight"],
    trigger: { areas: ["whispering_forest", "catacombs_entrance"], light_lte: 1, probability: 0.2, once_per_run: true },
    description: "你的手电筒开始闪烁。光一明一暗，像是快要没电了。\n你拍了拍手电筒。光稳定了一会儿，然后又开始闪烁。\n你知道——手电筒撑不了多久了。\n在沃切斯特的黑暗中，没有光意味着——\n你不敢想下去。",
    effects: { san: -1 },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "节省电量", text: "你关掉了手电筒，只在需要的时候打开。黑暗包围了你。", effects: { san: -2, add_run_memory: { text: "手电筒快没电了，节省使用。" } } },
      { label: "寻找光源", text: "你开始在黑暗中摸索，寻找任何可以发光的东西。", effects: { add_clue: "clue_resource_light_search", add_run_memory: { text: "手电筒快没电了，寻找替代光源。" } } }
    ]
  },
  {
    id: "resource_light_003", name: "蜡烛", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "candle"],
    trigger: { areas: ["voxchester_manor"], light_lte: 1, probability: 0.2, once_per_run: true },
    description: "你在庄园的走廊里摸索。几乎什么都看不到。\n你的手碰到了什么东西——是蜡烛。一支半截的蜡烛，插在烛台上。\n你摸了摸口袋。你有火柴吗？\n你记得——你有。是上周从杂货店买的。\n你划亮了火柴。火光照亮了走廊的一小段。你看到了——墙壁上有字。",
    effects: { san: 1, add_clue: "clue_resource_candle_message" },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_light_004", name: "黑暗中的声音", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "light", "sound"],
    trigger: { areas: ["deep_catacombs"], light_lte: 0, probability: 0.25, once_per_run: true },
    description: "你什么都看不到。完全的黑暗。\n但你能听到声音。很多声音。\n有脚步声。有呼吸声。有低语声。\n你知道——你不是一个人。在这片黑暗中，有什么东西在看着你。\n你伸出手。碰到了什么——冰冷的，光滑的。像是石头。又像是皮肤。\n你抽回了手。",
    effects: { san: -3 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: [
      { label: "闭上眼睛", text: "你闭上了眼睛。在完全的黑暗中，闭不闭眼没有区别。但你感到了一丝安慰。", effects: { san: -1, add_run_memory: { text: "在完全的黑暗中闭上了眼睛。" } } },
      { label: "大声唱歌", text: "你开始唱歌。声音在黑暗中回荡。声音渐渐变小——被什么东西吸收了。", effects: { san: -2, add_run_memory: { text: "在完全的黑暗中唱歌，声音被吸收了。" } } }
    ]
  },
  {
    id: "resource_light_005", name: "月光", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", distortion_variants: {'san_low':'你走出了森林的树冠覆盖区。月光洒了下来。\n你抬头看月亮。月亮是红色的。不是淡淡的红——是深红色。像凝固的血。\n你低头看地上的影子。影子比平时更长了。而且——影子在移动。不是跟着你动。是自己在动。\n影子的头转向了你。影子在看你。月光在影子里变成了另一种颜色。'}, quality_tier: "B", tags: ["resource", "light", "moon"],
    trigger: { areas: ["whispering_forest"], light_lte: 1, probability: 0.2, time_phase: ["evening", "midnight"], once_per_run: true },
    description: "你走出了森林的树冠覆盖区。月光洒了下来。\n你松了一口气。在沃切斯特，月光是少有的安全光源。\n你抬头看月亮。月亮是红色的。\n你记得——今天不是血月。但月亮确实是红色的。\n你低头看地上的影子。影子比平时更长了。而且——影子的方向不对。",
    effects: { san: -2 },
    event_classification: "轻微异常", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_light_006", name: "发光的蘑菇", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "mushroom"],
    trigger: { areas: ["forbidden_grove"], light_lte: 1, probability: 0.2, once_per_run: true },
    description: "你在黑暗中看到了光——微弱的，蓝绿色的光。\n是蘑菇。长在一棵枯树的根部。蘑菇的伞盖在发光。\n你凑近看。光很微弱，但足以照亮周围一小片区域。\n你摘了一朵。光在你手里继续发光。但你能感觉到——蘑菇是温热的。像是活的。",
    effects: { san: -1, add_item: { item_id: "glowing_mushroom", name: "发光蘑菇", uses: 3 } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_light_007", name: "灯光的代价", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "cost"],
    trigger: { areas: ["town_center"], light_lte: 1, probability: 0.2, once_per_run: true },
    description: "你需要光。你走进一家杂货店。\n店主有灯油。但价格是平时的三倍。\n「雾季涨价，」他解释，「灯油不好进。」\n你看着手里的钱。够买一瓶。但买了灯油，你就没钱买别的了。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "买灯油", text: "你付了钱，拿走了灯油。至少今晚你有光了。", effects: { modify_resource: { resource: "light", amount: 1 }, add_run_memory: { text: "花高价买了灯油。" } } },
      { label: "不买", text: "你把钱收了回去。你还有别的办法。", effects: { add_run_memory: { text: "拒绝了高价灯油。" } } }
    ]
  },
  {
    id: "resource_light_008", name: "火把", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "torch"],
    trigger: { areas: ["catacombs_entrance"], light_lte: 0, probability: 0.2, once_per_run: true },
    description: "你在墓穴入口的角落里找到了一些木棍和布条。你可以做一个简易的火把。\n但你需要火源。你摸了摸口袋——火柴还在。\n你用布条缠住了木棍，划亮了火柴。火把点着了。\n火光照亮了墓穴的入口。你看到了——墙壁上有很多字。",
    effects: { san: 1, add_clue: "clue_resource_torch_wall" },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_light_009", name: "黑暗中的怪物", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "monster"],
    trigger: { areas: ["deep_catacombs"], light_lte: 0, probability: 0.2, time_phase: ["midnight"], once_per_run: true },
    description: "你什么都看不到。但你能听到——呼吸声。很近。\n有什么东西在你身边。你能感觉到它的体温——冰冷的。\n你伸出手。碰到了什么——滑腻的，有鳞片的。\n你抽回了手。呼吸声变得更重了。\n你知道——它在看着你。在完全的黑暗中。",
    effects: { san: -3, hp: -1 },
    event_classification: "怪物遭遇", normalcy_anchor: false,
    choices: [
      { label: "保持不动", text: "你屏住了呼吸。一动不动。过了很久——也许是几分钟，也许是几小时——呼吸声远去了。", effects: { san: -2, add_run_memory: { text: "在完全的黑暗中遇到了怪物，保持不动逃过一劫。" } } },
      { label: "逃跑", text: "你转身就跑。撞到了墙壁。你爬起来继续跑。身后的呼吸声越来越近。", effects: { hp: -2, san: -2, add_run_memory: { text: "在完全的黑暗中逃跑，撞伤了自己。" } } }
    ]
  },
  {
    id: "resource_light_010", name: "灯油的残渣", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "oil"],
    trigger: { areas: ["lighthouse"], light_lte: 1, probability: 0.2, once_per_run: true },
    description: "你在灯塔的地下室找到了一些灯油。不多——大概够用一天。\n灯油是从一个破桶里漏出来的。你用布条吸收了一些。\n你闻了闻——是灯油。但味道有点不对。像是混了什么别的东西。\n你不确定这种灯油能不能用。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "使用", text: "你把布条做成了简易灯芯。点燃后，火光是绿色的。但至少有光。", effects: { modify_resource: { resource: "light", amount: 1 }, san: -1, add_run_memory: { text: "使用了混有杂质的灯油。" } } },
      { label: "不用", text: "你把布条扔了。不值得冒险。", effects: { add_run_memory: { text: "没有使用可疑的灯油。" } } }
    ]
  },
  {
    id: "resource_light_011", name: "眼睛", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "light", "eyes"],
    trigger: { areas: ["whispering_forest"], light_lte: 0, probability: 0.2, time_phase: ["midnight"], once_per_run: true },
    description: "你在森林里。没有光。\n你什么都看不到。但你感到了注视——从四面八方。\n然后你看到了眼睛。很多双眼睛。在树丛中，在草丛里，在树干上。\n眼睛是绿色的。不是动物的眼睛——动物的眼睛不会那么多。\n你停下了脚步。眼睛也在看着你。没有敌意。只是看着。\n然后眼睛消失了。一只一只地，像是灯泡熄灭了。",
    effects: { san: -3 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_light_012", name: "灯塔的光", type: "resource_pressure", subtype: "light_exhaustion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "light", "lighthouse"],
    trigger: { areas: ["harbor_district"], light_lte: 1, probability: 0.15, time_phase: ["midnight"], once_per_run: true },
    description: "你站在码头边。远处灯塔的光扫过海面。\n你看着灯光。灯光的节奏不对——不是正常的旋转。\n灯光在闪烁。三短。三长。三短。\nSOS。\n你知道——灯塔里有人在发信号。但灯塔应该是空的。\n灯光停了。然后又开始了。同样的节奏。",
    effects: { san: -2, add_clue: "clue_resource_lighthouse_signal" },
    event_classification: "神秘事件", normalcy_anchor: false,
    choices: []
  },

  // =============================================
  // 药品短缺 (10) - 无药品且 hp <= maxHp * 0.3
  // =============================================
  {
    id: "resource_med_001", name: "草药", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "herb"],
    trigger: { areas: ["whispering_forest"], hp_lte_ratio: 0.3, probability: 0.2, once_per_run: true },
    description: "你在森林里找到了一些草药。你认出了其中一种——是止血草。\n你摘了一些，嚼碎了敷在伤口上。伤口的疼痛减轻了。\n但你知道——在沃切斯特，草药可能不只是草药。你闻到了草药里有一股奇怪的味道。",
    effects: { hp: 2, san: -1, add_run_memory: { text: "用森林里的草药处理了伤口。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_med_002", name: "危险的交易", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "trade"],
    trigger: { areas: ["town_center"], hp_lte_ratio: 0.3, probability: 0.2, once_per_run: true },
    description: "一个人拦住了你。他看到了你身上的伤。\n「你需要药？」他问。\n他从口袋里掏出一个小瓶。「这个能治你的伤。但代价是——」\n他看着你的眼睛。\n「一个秘密。告诉我一个你没有告诉过任何人的秘密。」",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "交换", text: "你告诉了他一个秘密。他把小瓶递给了你。", effects: { hp: 3, add_run_memory: { text: "用秘密换了一瓶药。" } } },
      { label: "拒绝", text: "「我的秘密不是用来交换的。」他耸了耸肩，走了。", effects: { add_run_memory: { text: "拒绝了用秘密换药的交易。" } } }
    ]
  },
  {
    id: "resource_med_003", name: "伊莱亚斯的药", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "npc", "elias"],
    trigger: { areas: ["town_center"], hp_lte_ratio: 0.3, probability: 0.2, once_per_run: true, npc_alive: ["伊莱亚斯·沃德"] },
    description: "伊莱亚斯看到你的伤，皱了皱眉。\n「你受伤了，」他说，「进来。」\n他从书架后面拿出一个小盒子。里面是一些药粉和绷带。\n「这是我以前研究时准备的。对伤口有效。」\n他帮你处理了伤口。手法很熟练。",
    effects: { hp: 3, npc_trust: { "伊莱亚斯·沃德": 1 }, add_run_memory: { text: "伊莱亚斯帮你处理了伤口。" } },
    event_classification: "NPC互动", normalcy_anchor: true,
    choices: []
  },
  {
    id: "resource_med_004", name: "忍耐", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "endurance"],
    trigger: { areas: ["town_center", "harbor_district"], hp_lte_ratio: 0.3, probability: 0.15, once_per_run: true },
    description: "你没有药。你的伤口还在流血。\n你用布条紧紧地缠住了伤口。疼痛让你的眼前发黑。\n你深吸一口气。疼痛减轻了一点。但你知道——如果不处理，伤口会感染。\n你需要找到药。或者找到一个能帮你的人。",
    effects: { san: -1, add_run_memory: { text: "没有药品，只能忍耐伤口的疼痛。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_med_005", name: "教堂的急救", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "church"],
    trigger: { areas: ["town_center"], hp_lte_ratio: 0.3, probability: 0.15, once_per_run: true },
    description: "你走进教堂。伊莎贝拉看到你，立刻站起来。\n「你受伤了，」她说，「坐下。」\n她从祭坛下面拿出一个急救箱。里面有一些基本的药品和绷带。\n她帮你处理了伤口。手法很温柔。\n「你应该更小心，」她说，「沃切斯特已经够危险了。」",
    effects: { hp: 2, add_run_memory: { text: "伊莎贝拉在教堂帮你处理了伤口。" } },
    event_classification: "NPC互动", normalcy_anchor: true,
    choices: []
  },
  {
    id: "resource_med_006", name: "感染", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "infection"],
    trigger: { areas: ["town_center", "harbor_district"], hp_lte_ratio: 0.3, probability: 0.15, once_per_run: true },
    description: "你的伤口开始发炎。红肿、发热、疼痛加剧。\n你知道——伤口感染了。如果不处理，会越来越严重。\n你需要抗生素。或者至少需要一些干净的绷带和消毒水。\n但你现在什么都没有。",
    effects: { hp: -1, san: -1, add_run_memory: { text: "伤口感染了。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_med_007", name: "玛莎的药酒", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "npc", "martha"],
    trigger: { areas: ["harbor_district"], hp_lte_ratio: 0.3, probability: 0.15, once_per_run: true, npc_alive: ["玛莎·格雷"] },
    description: "玛莎看到你的伤，从吧台下面拿出一瓶酒。\n「这不是普通的酒，」她说，「是药酒。泡了一些草药。」\n她倒了一杯递给你。「喝下去。然后用剩下的洗伤口。」\n你喝了一口。酒很烈，但你能尝到草药的味道。伤口的疼痛减轻了一些。",
    effects: { hp: 2, san: 1, add_run_memory: { text: "玛莎用药酒帮你处理了伤口。" } },
    event_classification: "NPC互动", normalcy_anchor: true,
    choices: []
  },
  {
    id: "resource_med_008", name: "自愈", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "self_heal"],
    trigger: { areas: ["town_center"], hp_lte_ratio: 0.3, probability: 0.15, once_per_run: true },
    description: "你坐在安全屋里。伤口还在痛。\n你用布条紧紧地缠住了伤口。然后你躺下来，闭上了眼睛。\n你不知道过了多久。但当你醒来时，伤口的疼痛减轻了。\n你的身体正在自愈。很慢，但确实在愈合。\n你知道——在沃切斯特，自愈是少有的安慰。",
    effects: { hp: 1, san: 1, add_run_memory: { text: "在安全屋里休息，伤口自愈了一些。" } },
    event_classification: "正常事件", normalcy_anchor: true,
    choices: []
  },
  {
    id: "resource_med_009", name: "代价", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "cost"],
    trigger: { areas: ["town_center"], hp_lte_ratio: 0.3, probability: 0.12, once_per_run: true },
    description: "你在街上遇到了一个人。他看到了你的伤。\n「我可以帮你，」他说，「但代价很大。」\n他从口袋里掏出一个小瓶。里面的液体是红色的。\n「喝下去。你的伤会好。但你会忘记一些东西。」\n他看着你。\n「你愿意吗？」",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "喝下去", text: "你把红色液体喝了下去。伤口的疼痛立刻消失了。但你忘记了——什么？你记不清了。", effects: { hp: 5, san: -3, add_run_memory: { text: "喝了一种奇怪的药，伤好了但失去了部分记忆。" } } },
      { label: "拒绝", text: "「不。」他点了点头，收起了小瓶。", effects: { add_run_memory: { text: "拒绝了代价不明的药物。" } } }
    ]
  },
  {
    id: "resource_med_010", name: "简陋的手术", type: "resource_pressure", subtype: "medicine_shortage",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "medicine", "surgery"],
    trigger: { areas: ["harbor_district"], hp_lte_ratio: 0.2, probability: 0.1, once_per_run: true },
    description: "你的伤口很深。需要缝合。\n你没有针线。但你找到了一根鱼钩和一些渔线。\n你看着这些东西。你知道你需要做什么。\n你深吸一口气。把鱼钩穿过了伤口边缘的皮肤。疼痛让你的眼前发黑。\n你缝了三针。粗糙、不整齐，但至少伤口合上了。",
    effects: { hp: 2, san: -2, add_run_memory: { text: "用鱼钩和渔线给自己缝了伤口。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },

  // =============================================
  // 安全屋入侵 (10) - safehouseCorruption >= 50
  // =============================================
  {
    id: "resource_safehouse_001", name: "墙上的手印", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", distortion_variants: {'san_low':'你回到安全屋。门是锁着的。你进去了。\n墙上多了一些手印。不是孩子的——是你的。你的手掌大小。你的手指长度。\n但你没有碰过墙。你今天没有碰过墙。\n手印是湿的。你闻了闻——是你的汗液的味道。你的手印在你不在的时候出现在了墙上。'}, quality_tier: "B", tags: ["resource", "safehouse", "invasion"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 50, probability: 0.2, once_per_run: true },
    description: "你回到安全屋。门是锁着的。你进去了。\n墙上多了一些手印。很小，像是孩子的。\n但手印的高度不对——太高了，孩子够不到。\n手印是黑色的。你用手指碰了碰——是湿的。你闻了闻——是铁锈和海水的味道。\n你知道——有东西进过你的安全屋。",
    effects: { san: -2, safehouseCorruption: 5 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_002", name: "被翻动的物品", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", distortion_variants: {'san_low':'你回到安全屋。你的物品被动过了。\n笔记本被翻到了不同的页码——翻到了你没有写过的一页。页面上有字。你的笔迹。但你不记得写过。\n上面写着：「第三十七次检查物品。每次都是这个结果。」\n你数了数被翻动的物品。和你记忆中上次检查的数量一样。'}, quality_tier: "B", tags: ["resource", "safehouse", "invasion"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 50, probability: 0.2, once_per_run: true },
    description: "你回到安全屋。你的物品被动过了。\n笔记本被翻到了不同的页码。食物少了一些。急救包被打开了。\n但门是锁着的。窗户也是关着的。\n有东西进来过。但它是怎么进来的？\n你检查了所有可能的入口。没有痕迹。\n除了——地板上有一滩水。",
    effects: { san: -2, food: -1, safehouseCorruption: 5 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_003", name: "NPC的闯入", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "safehouse", "npc", "invasion"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 60, probability: 0.15, once_per_run: true },
    description: "你回到安全屋。门开着。\n你走进去。一个人坐在你的椅子上。\n你认出了他——是镇上的一个居民。但他的眼睛不对——瞳孔太大了，像是没有光的深井。\n他看到你，站了起来。\n「我来找你，」他说，「它让我来找你。」\n他朝你走了一步。你注意到他的脚是湿的。",
    effects: { san: -3, safehouseCorruption: 5 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: [
      { label: "把他赶出去", text: "你用力把他推出了门外。他没有反抗。但他站在门外，看着你。\n「它还会来的，」他说，「它总会来的。」\n然后他转身走了。", effects: { san: -1, add_run_memory: { text: "把一个被控制的人赶出了安全屋。" } } },
      { label: "和他交谈", text: "你问他：「它是谁？」\n他的嘴角抽搐了一下。\n「它在水下面。它一直在看着。」\n然后他倒下了。你扶住他。他的身体很冷。", effects: { san: -2, add_clue: "clue_safehouse_invader", add_run_memory: { text: "和一个被控制的人交谈。" } } }
    ]
  },
  {
    id: "resource_safehouse_004", name: "地板下的声音", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", distortion_variants: {'san_low':'你躺在床上。地板下面有声音。是敲击声。三短三长三短。\n你把耳朵贴在地板上。声音停了。取而代之的是呼吸声。\n你用匕首撬开了一块地板。地板下面不是泥土——是石头。光滑的石头。上面刻着封印的符号。\n你知道——你的安全屋建在封印上面。地板下面不是地下室。是封印。'}, quality_tier: "B", tags: ["resource", "safehouse", "sound"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 50, probability: 0.2, time_phase: ["midnight"], once_per_run: true },
    description: "你躺在床上。地板下面有声音。\n是敲击声。有节奏的。三短。三长。三短。\n你把耳朵贴在地板上。声音更清晰了。\n你知道——地板下面没有地下室。至少图纸上没有。\n但声音确实在那里。像是有什么东西在地板下面。",
    effects: { san: -2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_005", name: "被污染的食物", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", distortion_variants: {'san_low':'你回到安全屋。你储存的食物变了。\n面包上长了霉——霉的形状像是文字。你凑近看。文字在缓慢地变化。每秒一个字。\n你认出了其中一个字。是你笔记本上某一页的第一个字。\n你知道——污染不是从外面来的。是从你的笔记本里渗出来的。你的记录在污染你的食物。'}, quality_tier: "B", tags: ["resource", "safehouse", "food"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 50, probability: 0.2, once_per_run: true },
    description: "你回到安全屋。你储存的食物变了。\n面包上长了霉——但霉的形状不对。像是某种文字。\n你凑近看。确实是文字。但你不认识。\n你把面包扔了。你检查了其他食物。罐头的标签也变了——变成了那种你不认识的文字。\n你知道——你的食物被污染了。",
    effects: { food: -2, san: -2, safehouseCorruption: 5 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_006", name: "NPC的信任危机", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "safehouse", "npc", "trust"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 60, probability: 0.15, once_per_run: true },
    description: "你邀请一个NPC来你的安全屋。他看到安全屋的状态，皱了皱眉。\n「你住在这种地方？」他问。\n你解释说安全屋被污染了。他看着墙上的痕迹，摇了摇头。\n「我不会再来这里了，」他说，「这里不安全。」\n他走了。你知道——安全屋的状态正在影响你和NPC的关系。",
    effects: { npc_trust: { "汤米·陈": -1 }, add_run_memory: { text: "NPC因为安全屋的状态拒绝来访。" } },
    event_classification: "NPC互动", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_007", name: "灯光的异常", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", distortion_variants: {'san_low':'你躺在床上。灯突然灭了。\n你起来检查。灯油还有。灯芯也正常。但灯就是点不着。\n你划了火柴。火柴亮了。但火光在你手掌里——不在空气中。火光只照亮了你的手。\n你把手伸向房间。火光缩小了。像是被房间吞掉了。\n你知道——安全屋的黑暗不是没有光。是黑暗在进食。它在吃你的光。'}, quality_tier: "B", tags: ["resource", "safehouse", "light"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 50, probability: 0.2, time_phase: ["midnight"], once_per_run: true },
    description: "你躺在床上。灯突然灭了。\n你起来检查。灯油还有。灯芯也正常。但灯就是点不着。\n你划了火柴。火柴亮了，但灯光照不远——像是被什么东西吸收了。\n你环顾四周。安全屋里很暗。比外面还暗。\n你知道——安全屋的光源正在被什么东西吞噬。",
    effects: { san: -2, modify_resource: { resource: "light", amount: -1 } },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_008", name: "墙壁的变化", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "safehouse", "wall"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 70, probability: 0.15, once_per_run: true },
    description: "你回到安全屋。墙壁变了。\n不是颜色变了——是形状变了。墙壁变得不平整了，像是有什么东西从里面往外推。\n你用手摸了摸。墙壁是软的。像皮肤。\n"+DESC.WALL_HAND_REMOVE+"",
    effects: { san: -3, safehouseCorruption: 5 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_009", name: "入侵者", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "safehouse", "invasion"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 70, probability: 0.12, time_phase: ["midnight"], once_per_run: true },
    description: "你被声音吵醒了。是脚步声。在安全屋里。\n你睁开眼睛。一个人影站在房间中央。\n你看不清它的脸。但你能看出——它不是人。四肢太长了。比例不对。\n它看着你。你看着它。\n然后它走了。穿过了墙壁。像是墙壁不存在一样。\n你起来检查。墙壁完好无损。但你注意到——墙壁上有一片潮湿的印记。",
    effects: { san: -3, safehouseCorruption: 5 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_safehouse_010", name: "净化", type: "resource_pressure", subtype: "safehouse_invasion",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "safehouse", "purify"],
    trigger: { areas: ["town_center"], safehouse_corruption_gte: 50, probability: 0.15, once_per_run: true },
    description: "你决定净化安全屋。你用盐在门口和窗户上画了线。你点燃了所有的灯。\n你坐在房间中央，闭上眼睛，集中精神。\n你感到了什么——在安全屋的角落里。是某种存在。微弱的，但确实存在。\n你睁开眼睛。角落里什么都没有。但空气变清新了。\n你知道——你的净化起了作用。至少暂时。",
    effects: { safehouseCorruption: -10, san: 2, add_run_memory: { text: "净化了安全屋。" } },
    event_classification: "正常事件", normalcy_anchor: true,
    choices: []
  },

  // =============================================
  // 极端环境 (8) - 天气为大雾/血月，san <= 40
  // =============================================
  {
    id: "resource_extreme_001", name: "大雾中的声音", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "weather", "fog", "sound"],
    trigger: { areas: ["town_center", "harbor_district"], san_lte: 40, requires_weather: ["大雾"], probability: 0.2, once_per_run: true },
    description: "雾很浓。你几乎看不到前方的路。\n你听到了声音。是从雾里传来的。\n是脚步声。很多脚步声。像是有一群人在雾里走。\n你停下了。脚步声也停了。\n你继续走。脚步声又开始了。\n你知道——雾里有什么东西。但你看不到它。",
    effects: { san: -2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: [
      { label: "朝声音走去", text: "你朝着声音走去。走了几步，声音消失了。你站在雾中，什么也看不到。", effects: { san: -2, add_clue: "clue_extreme_fog_sound", add_run_memory: { text: "在大雾中追寻神秘的脚步声。" } } },
      { label: "背离声音", text: "你转身朝相反的方向走去。脚步声渐渐远了。", effects: { add_run_memory: { text: "在大雾中背离了神秘的脚步声。" } } }
    ]
  },
  {
    id: "resource_extreme_002", name: "血月下的影子", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "weather", "blood_moon", "shadow"],
    trigger: { areas: ["whispering_forest"], san_lte: 40, requires_weather: ["血月"], probability: 0.2, once_per_run: true },
    description: "血月的光照在森林里。一切都是红色的。\n你的影子投在地上。但影子的形状不对——不是你的形状。\n影子太长了。太瘦了。四肢的比例不对。\n你动了动。影子也动了。但不是你的动作——是它自己的。\n你停下了。影子也停下了。然后影子转过头来——看着你。",
    effects: { san: -3 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_extreme_003", name: "迷路", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "weather", "fog", "lost"],
    trigger: { areas: ["whispering_forest"], san_lte: 40, requires_weather: ["大雾"], probability: 0.2, once_per_run: true },
    description: "你在森林里迷路了。雾太浓了，你分不清方向。\n你走了很久。但你感觉——你没有前进。周围的树木看起来都一样。\n你停下来。你听到了水声。你知道——附近有一条小溪。小溪会带你走出森林。\n但你不确定小溪在哪个方向。水声从四面八方传来。",
    effects: { san: -2 },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "跟着声音走", text: "你选了一个方向，朝着水声走去。走了很久，你找到了小溪。沿着小溪，你走出了浓雾区。", effects: { add_run_memory: { text: "在大雾中迷路，跟着水声找到了出路。" } } },
      { label: "原地等待", text: "你坐下来，等待雾散去。等了很久。雾没有散。但你感到了一丝平静。", effects: { san: 1, add_run_memory: { text: "在大雾中原地等待。" } } }
    ]
  },
  {
    id: "resource_extreme_004", name: "血月的低语", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", distortion_variants: {'san_low':'血月的光照在你身上。你感到了——什么？不是热，不是冷。是某种更基本的东西。\n你听到了低语。不是从外面来的——是从你自己的血液里来的。\n低语在说话。用你的声音。说的是：「血月之夜。门会变薄。你也会变薄。」\n你低头看自己的手。手是半透明的。你看到了自己的血管。血管里的血是黑色的。\n你知道——血月不是天象。血月是你的血在发光。'}, quality_tier: "B", tags: ["resource", "weather", "blood_moon", "whisper"],
    trigger: { areas: ["town_center", "harbor_district"], san_lte: 40, requires_weather: ["血月"], probability: 0.2, once_per_run: true },
    description: "血月的光照在你身上。你感到了——什么？不是热，不是冷。是某种更基本的东西。\n你听到了低语。不是从外面来的——是从你自己的脑海里来的。\n低语在说话。用一种你不认识的语言。但你听得懂。\n「血月之夜。门会变薄。」\n你摇了摇头。低语消失了。但你知道——你刚才听到的是真的。",
    effects: { san: -2, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_extreme_005", name: "大雾中的灯", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "weather", "fog", "light"],
    trigger: { areas: ["harbor_district"], san_lte: 40, requires_weather: ["大雾"], probability: 0.15, once_per_run: true },
    description: "你在大雾中看到了一盏灯。灯光很远，但你能看清——是一盏手提灯。\n灯光在移动。朝你的方向移动。\n你等着。灯光越来越近。\n然后灯光停下了。距离你大概十步远。\n你看不清灯光后面是什么。但你能看到——灯光的颜色不对。是绿色的。\n你知道——沃切斯特的雾里，绿色的灯光不是好事。",
    effects: { san: -2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: [
      { label: "朝灯光走去", text: "你朝着灯光走去。走了几步，灯光消失了。你站在雾中，什么也看不到。", effects: { san: -2, add_run_memory: { text: "在大雾中追寻绿色的灯光。" } } },
      { label: "转身离开", text: "你转身走了。背后是绿色的灯光。前面是未知的黑暗。", effects: { add_run_memory: { text: "在大雾中回避了绿色的灯光。" } } }
    ]
  },
  {
    id: "resource_extreme_006", name: "血月下的野兽", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "weather", "blood_moon", "monster"],
    trigger: { areas: ["whispering_forest"], san_lte: 35, requires_weather: ["血月"], probability: 0.15, once_per_run: true },
    description: "血月的光照在森林里。你听到了嚎叫声。\n不是狼——是某种更大的东西。嚎叫声从远处传来，但你能感觉到震动。\n你躲到了一棵大树后面。你看到了它——在树林间移动。\n它很大。比熊还大。它的轮廓在血月的光照下显得——不对。四肢太长了。比例不对。\n它停下了。转过头。看着你。\n然后它继续走了。消失在树林里。",
    effects: { san: -3, hp: -1 },
    event_classification: "怪物遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_extreme_007", name: "大雾中的陷阱", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", quality_tier: "B", tags: ["resource", "weather", "fog", "trap"],
    trigger: { areas: ["harbor_district"], san_lte: 40, requires_weather: ["大雾"], probability: 0.15, once_per_run: true },
    description: "你在大雾中走着。突然，你的脚踩空了。\n你掉了下去。不深——大概一米。但你的脚踝扭了。\n你抬头看。雾太浓了，你看不到洞口的边缘。\n你摸索着爬了上去。你的脚踝在痛。\n你知道——在沃切斯特的大雾里，连地面都不是安全的。",
    effects: { hp: -2, san: -1, add_run_memory: { text: "在大雾中踩到了陷阱，扭伤了脚踝。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_extreme_008", name: "血月下的真相", type: "resource_pressure", subtype: "extreme_weather",
    weight: 1, tier: "normal", quality_tier: "A", tags: ["resource", "weather", "blood_moon", "truth"],
    trigger: { areas: ["catacombs_entrance"], san_lte: 35, requires_weather: ["血月"], probability: 0.1, once_per_run: true },
    description: "血月的光照在墓穴入口。你看到了——\n封印的符号在发光。不是反射月光——是自己在发光。\n你走近了。符号的颜色在变化。从蓝色变成了红色。和月亮一样的红色。\n你知道了——血月不是自然现象。血月是封印在衰弱的信号。\n符号的光越来越亮。然后突然灭了。你的眼前一片黑暗。",
    effects: { san: -3, mythos: 2, add_clue: "clue_extreme_blood_moon_seal" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },

  // ═══════════════════════════════════════════════════════════
  // §2 补充：生存任务链 (4) — 连续饥饿/光源耗尽触发特殊事件
  // ═══════════════════════════════════════════════════════════
  {
    id: "resource_chain_starvation_3", name: "第三天的饥饿", type: "resource_pressure", subtype: "survival_chain",
    weight: 1.2, tier: "normal", quality_tier: "B",
    tags: ["resource", "food", "starvation", "chain"],
    trigger: { areas: ["town_center", "harbor_district"], food_lte: 0, probability: 0.4, once_per_run: true },
    description: "你已经三天没吃东西了。你的手在发抖。你的视线在模糊。\n你路过一个垃圾桶。你弯下腰。你开始翻。\n你找到了——半块面包。发霉的。但你的胃不在乎。\n你把面包塞进嘴里。味道不好。但你的身体在欢呼。\n你知道——你刚才做了一件你从来没想过会做的事。在沃切斯特，饥饿改变了你。",
    effects: { food: 1, san: -2, humanity: -3, add_run_memory: { text: "连续三天没吃东西后，从垃圾桶里翻出了食物。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_chain_martha_feeds", name: "玛莎的施舍（连续饥饿）", type: "resource_pressure", subtype: "survival_chain",
    weight: 1.2, tier: "normal", quality_tier: "A",
    tags: ["resource", "food", "martha", "chain", "npc"],
    trigger: { areas: ["harbor_district"], food_lte: 0, probability: 0.35, once_per_run: true, npc_alive: ["玛莎·格雷"], requires_flags: ["flag_starvation_day_3"] },
    description: "你走进酒吧。玛莎看到你，放下了手中的杯子。\n她没有说话。她走进后厨。端出了一碗汤。\n汤很热。里面有土豆、鱼肉、和一点香草。\n「吃吧，」她说，「别客气。」\n你坐下来。你喝了一口。你的身体在颤抖——不是因为冷。是因为温暖。\n「我知道你的情况，」玛莎说，「沃切斯特不是给人活的地方。但你可以活下来。」\n她看着你。\n「吃完之后，帮我一个忙。码头那边——有一个渔民失踪了。帮我找找他。」",
    effects: { food: 2, san: 2, npc_trust: { "玛莎·格雷": 2 }, add_flag: "flag_martha_quest_missing_fisher", add_clue: "clue_chain_missing_fisher" },
    event_classification: "NPC互动", normalcy_anchor: true,
    choices: []
  },
  {
    id: "resource_chain_light_out", name: "黑暗中的安全屋", type: "resource_pressure", subtype: "survival_chain",
    weight: 1, tier: "normal", quality_tier: "B",
    tags: ["resource", "light", "safehouse", "chain"],
    trigger: { areas: ["town_center"], probability: 0.25, once_per_run: true },
    description: "你回到安全屋。灯灭了。灯油用完了。\n你在黑暗中坐了一会儿。你的眼睛在适应。\n你听到了——从墙壁里传来的声音。很轻。像是有人在用指甲刮墙。\n你划亮了最后一根火柴。火光只持续了三秒。\n在那三秒里，你看到了——墙上多了一道划痕。你上次没有见过。\n火柴灭了。黑暗回来了。刮墙声也回来了。\n你知道——在黑暗中，安全屋不安全。",
    effects: { san: -2, add_run_memory: { text: "安全屋灯灭了。黑暗中有东西在刮墙。" } },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: [
      { label: "摸黑睡觉", text: "你闭上了眼睛。刮墙声在你耳边持续了很久。你不确定你有没有睡着。", effects: { san: -1 } },
      { label: "离开安全屋", text: "你走出了安全屋。外面的空气很冷。但至少——你能看到星星。", effects: { san: 1 } }
    ]
  },
  {
    id: "resource_chain_medicine_last", name: "最后一瓶药水", type: "resource_pressure", subtype: "survival_chain",
    weight: 1, tier: "normal", quality_tier: "A",
    tags: ["resource", "medicine", "chain", "critical"],
    trigger: { areas: ["town_center", "harbor_district"], probability: 0.2, once_per_run: true },
    description: "你检查了你的急救包。只剩下一瓶药水了。\n你把药水拿在手里。瓶子很轻。液体在瓶子里晃动。\n你知道——如果不用，它可能会在关键时刻救你一命。但如果不用——你现在可能就会倒下。\n你的伤口在疼。你的头在晕。你的身体在发出最后的警告。",
    effects: {},
    event_classification: "正常事件", normalcy_anchor: false,
    choices: [
      { label: "现在使用", text: "你拧开瓶盖。把药水喝了下去。味道很苦。但你的伤口在愈合。你的头不再晕了。", effects: { hp: 3, san: 1, add_run_memory: { text: "使用了最后一瓶药水。" } } },
      { label: "留着备用", text: "你把药水放回了急救包。你的伤口还在疼。但你知道——更危险的时候还在后面。", effects: { san: -1, add_run_memory: { text: "忍住伤痛，把最后一瓶药水留到了关键时刻。" } } }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // §2 补充：跨日后果 (2) — 选择在后续天数产生影响
  // ═══════════════════════════════════════════════════════════
  {
    id: "resource_consequence_theft", name: "偷窃的代价", type: "resource_pressure", subtype: "consequence",
    weight: 1, tier: "normal", quality_tier: "A",
    tags: ["resource", "theft", "consequence", "npc"],
    trigger: { areas: ["town_center"], probability: 0.2, once_per_run: true, requires_flags: ["flag_stole_from_shop"] },
    description: "你路过那家杂货店。店主站在门口。他看着你。\n你加快了脚步。他没有追上来。\n但你注意到了——店门口多了一张告示。告示上画着一个人的轮廓。轮廓的体型和你很像。\n告示上写着：「注意此人。此人曾偷窃本店货物。」\n你低头走了过去。背后的目光像火一样烧着你。\n你知道——在沃切斯特，偷窃的代价不只是良心。是信任。",
    effects: { humanity: -2, add_run_memory: { text: "杂货店张贴了告示，镇民开始用异样的眼光看你。" } },
    event_classification: "正常事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "resource_consequence_shared_food", name: "分享的回报", type: "resource_pressure", subtype: "consequence",
    weight: 1, tier: "normal", quality_tier: "A",
    tags: ["resource", "share", "consequence", "reward"],
    trigger: { areas: ["harbor_district"], probability: 0.2, once_per_run: true, requires_flags: ["flag_shared_food_with_child"] },
    description: "你走在码头上。一个孩子跑过来。\n他塞给你一个纸包就跑了。\n你打开纸包。里面是一块面包。面包很新鲜。上面还带着余温。\n你回头看了看。孩子已经不见了。\n你知道——在沃切斯特，善意是有回报的。只是回报的方式——你不一定预料得到。",
    effects: { food: 1, san: 1, humanity: 1, add_run_memory: { text: "之前分享食物的孩子回赠了一块面包。" } },
    event_classification: "正常事件", normalcy_anchor: true,
    choices: []
  }
];
