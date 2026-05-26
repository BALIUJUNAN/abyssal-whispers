// 神话知识等级事件 - 60 events
// Directions: 神话感知(20), 禁忌知识(15), 神话反噬(12), 旧日回响(8), 超越者视角(5)
export const events = [
  // =============================================
  // 神话感知 (20) - mythos >= 5, hidden things
  // =============================================
  {
    id: "mythos_perception_001", name: "隐藏的门", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "hidden"],
    trigger: { areas: ["town_center"], min_mythos: 5, probability: 0.2, once_per_run: true },
    description: "你走过一面墙。墙上的砖块有一块颜色不对——比其他的深了一点。\n你用手推了一下。砖块动了。\n墙后面是一条狭窄的通道。通道尽头有微弱的光。\n你以前走过这面墙无数次。但只有现在才看到。",
    effects: { add_clue: "clue_mythos_hidden_door", san: -1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_002", name: "墙壁上的字", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "text"],
    trigger: { areas: ["harbor_district"], min_mythos: 5, probability: 0.2, once_per_run: true },
    description: "仓库的墙壁上有字。你以前从来没看到过。\n字是用一种近乎透明的墨水写的——只有在特定的角度才能看到。\n你调整了站位。字迹变得清晰了：\n「月圆之夜。潮水最低的时候。第三根柱子。」\n你记下来了。当你再次看向墙壁时，字迹消失了。",
    effects: { add_clue: "clue_mythos_wall_text", san: -1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_003", name: "隐藏的符号", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "symbol"],
    trigger: { areas: ["catacombs_entrance"], min_mythos: 5, probability: 0.2, once_per_run: true },
    description: "墓穴入口的石柱上有一个符号。你以前从来没注意到。\n符号刻得很浅，几乎和石头的纹理融为一体。\n你用手摸了摸。指尖传来一阵微弱的震动。\n你认出了这个符号——在某本书里见过。是关于封印的。",
    effects: { add_clue: "clue_mythos_symbol", san: -1, mythos: 1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_004", name: "地板下的空洞", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "hidden"],
    trigger: { areas: ["voxchester_manor"], min_mythos: 5, probability: 0.2, once_per_run: true },
    description: "你走在庄园的走廊里。脚下的地板有一块声音不对——是空的。\n你蹲下来，用手指敲了敲。确实是空的。\n你用匕首撬开了地板。下面是一个小小的暗格。\n暗格里放着一个铁盒。盒子很旧，但没有生锈。",
    effects: { add_item: { item_id: "iron_box", name: "铁盒", uses: 1 }, add_clue: "clue_mythos_hidden_compartment", san: -1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_005", name: "隐藏的照片", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "photo"],
    trigger: { areas: ["town_center"], min_mythos: 6, probability: 0.15, once_per_run: true },
    description: "你在汤米的店铺里看到一张照片。照片夹在其他照片中间，你以前从来没注意到。\n照片上是灯塔的地下室。你认出了那些管道和阀门。\n但照片的角落里有一个人影。模糊的，像是在移动。\n你把照片翻过来。背面写着一个日期——三年前。",
    effects: { add_clue: "clue_mythos_hidden_photo", san: -1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_006", name: "空气中的文字", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "air"],
    trigger: { areas: ["whispering_forest"], min_mythos: 5, probability: 0.15, once_per_run: true },
    description: "你站在森林里。空气中有什么东西在闪烁。\n你眯起眼睛。是文字——悬浮在半空中的文字。\n文字很淡，像是用光写成的。你只能看清几个词：\n「门。钥匙。代价。」\n然后文字消失了。你感到一阵头晕。",
    effects: { san: -2, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_007", name: "水下的结构", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "water"],
    trigger: { areas: ["harbor_district"], min_mythos: 6, probability: 0.15, time_phase: ["midnight"], once_per_run: true },
    description: "你站在码头边，低头看水。水面很暗。\n但你看到了一些东西——在水下。\n是某种结构。线条很整齐，不像是自然形成的。\n你眨了眨眼。结构变得更清晰了。像是一个建筑的轮廓。\n在沃切斯特的水面下，有一座建筑。",
    effects: { add_clue: "clue_mythos_underwater_structure", san: -2, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_008", name: "树上的刻痕", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "tree"],
    trigger: { areas: ["whispering_forest"], min_mythos: 5, probability: 0.2, once_per_run: true },
    description: "你走过一棵老橡树。树干上有刻痕。\n你以前从来没注意到——因为刻痕和树皮的纹理几乎一模一样。\n但你的目光自动聚焦在了上面。刻痕是一个图案。一个你认识的图案。\n是封印的一部分。\n你用手摸了摸。指尖传来一阵微弱的热量。",
    effects: { add_clue: "clue_mythos_tree_seal", san: -1, mythos: 1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_009", name: "镜中的文字", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "mirror"],
    trigger: { areas: ["voxchester_manor"], min_mythos: 6, probability: 0.15, once_per_run: true },
    description: "你经过一面镜子。镜面上有字。\n你凑近看。字是反过来的，但你认出了内容：\n「地下室。第三根柱子。」\n你伸手去摸字迹。指尖碰到镜面时，字迹消失了。\n镜面上只留下了一滴水珠。你没有看到水珠是从哪里来的。",
    effects: { add_clue: "clue_mythos_mirror_text", san: -1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_010", name: "隐藏的路径", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "path"],
    trigger: { areas: ["forbidden_grove"], min_mythos: 7, probability: 0.15, once_per_run: true },
    description: "你站在一片灌木丛前。灌木很密，看起来无法通过。\n但你看到了——灌木的枝条之间有一条缝隙。缝隙很窄，但刚好能让人侧身通过。\n你以前从来没看到过。现在它就在那里，清晰得像是有人特意留下的。\n你侧身挤了过去。另一边是一片空地。空地中央有一块石头。",
    effects: { add_clue: "clue_mythos_hidden_path", san: -1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_011", name: "空气中的符号", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "symbol"],
    trigger: { areas: ["catacombs_entrance", "deep_catacombs"], min_mythos: 7, probability: 0.15, once_per_run: true },
    description: "你站在墓穴里。空气中有什么东西在闪烁。\n你眯起眼睛。是符号——悬浮在半空中的符号。\n符号排列成一个圆环。圆环的中心有一个空缺。\n你伸手去摸。手指穿过了符号，什么也没碰到。\n但你感到了一阵微弱的震动。像是什么东西在回应你的触碰。",
    effects: { san: -2, mythos: 2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_012", name: "光线中的图案", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "light"],
    trigger: { areas: ["lighthouse"], min_mythos: 6, probability: 0.15, once_per_run: true },
    description: "你站在灯塔的灯室里。灯光透过玻璃射向远方。\n你注意到光线中有图案——不是光的折射，而是某种有规律的闪烁。\n你调整了站位。图案变得更清晰了。像是某种编码。\n你记下了闪烁的节奏。三短。三长。三短。\n你认出了这个编码。是莫尔斯电码。SOS。",
    effects: { add_clue: "clue_mythos_light_code", san: -1 },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_013", name: "石头中的脉络", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "stone"],
    trigger: { areas: ["ruins_of_yith"], min_mythos: 8, probability: 0.15, once_per_run: true },
    description: "你触摸伊斯遗迹的墙壁。石头里有脉络。\n不是自然的纹理——是某种管道系统。很细，肉眼几乎看不到。\n但你的指尖能感觉到它们。脉络里有什么东西在流动。\n你把手贴在墙上。流动的速度加快了。\n像是遗迹感应到了你的存在。",
    effects: { san: -2, mythos: 2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_014", name: "雾中的轮廓", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "fog"],
    trigger: { areas: ["harbor_district", "town_center"], min_mythos: 5, probability: 0.15, once_per_run: true },
    description: "雾很浓。你几乎看不到前方的路。\n但你看到了一些东西——在雾中。轮廓。模糊的，高大的，不像是人。\n轮廓在移动。缓慢地，像是在巡逻。\n你停下了脚步。轮廓也停下了。\n它在看着你。你能感觉到。\n然后轮廓消散了。雾变薄了一些。",
    effects: { san: -2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_015", name: "声音中的编码", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "sound"],
    trigger: { areas: ["whispering_forest"], min_mythos: 6, probability: 0.15, time_phase: ["midnight"], once_per_run: true },
    description: "森林里的低语声变了。\n你以前只听到过模糊的呢喃。但现在你能分辨出一些词。\n不是任何你认识的语言——但你的大脑自动把它们翻译了出来。\n「门。开启。代价。血。」\n你摇了摇头。低语声恢复了模糊的状态。\n但你知道——你刚才确实听懂了。",
    effects: { san: -2, mythos: 2, add_clue: "clue_mythos_forest_words" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_016", name: "影子的不同步", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "shadow"],
    trigger: { areas: ["town_center", "harbor_district"], min_mythos: 5, probability: 0.15, once_per_run: true },
    description: "你走过一盏路灯。你的影子投在墙上。\n你抬起手。影子也抬起了手——但慢了一拍。\n你放下手。影子没有放下。\n你转过身。影子也转过来了，和你面对面。\n你眨了眨眼。影子回到了正常的位置。\n但你注意到——影子的轮廓比你大了一圈。",
    effects: { san: -2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_017", name: "石头上的温度", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "temperature"],
    trigger: { areas: ["catacombs_entrance"], min_mythos: 5, probability: 0.15, once_per_run: true },
    description: "你走进墓穴。墙壁应该是冰冷的。\n但你摸到了一块温热的石头。只有那一块。\n你把手贴在上面。温度在上升。\n你把耳朵贴上去。石头里有声音——低沉的，有节奏的。\n像是心跳。\n你把手移开。石头变冷了。",
    effects: { san: -2, add_clue: "clue_mythos_warm_stone" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_018", name: "数字的浮现", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "number"],
    trigger: { areas: ["town_center"], min_mythos: 5, probability: 0.15, once_per_run: true },
    description: "你看着教堂的钟楼。钟面上的数字在变化。\n你以前从来没注意到——但钟面上有十三个数字。不是十二个。\n第十三个数字在最下面，很小，几乎看不清。\n你眯起眼睛。是「0」。\n钟面上有「0」到「12」。十三个数字。\n你把目光移开。再看时，只有十二个数字了。",
    effects: { san: -1, add_clue: "clue_mythos_clock_13" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_019", name: "墙壁中的声音", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "sound"],
    trigger: { areas: ["voxchester_manor"], min_mythos: 6, probability: 0.15, once_per_run: true },
    description: "你走过庄园的走廊。墙壁里有声音。\n你以前从来没听到过——但这次你听到了。是敲击声。有节奏的。\n你把手贴在墙上。敲击声停了。\n你把手移开。敲击声又开始了。\n节奏是：三短。停顿。三长。停顿。三短。\n又是SOS。\n你沿着墙壁走。敲击声一直跟着你。",
    effects: { san: -2, add_clue: "clue_mythos_wall_sos" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_perception_020", name: "空气的密度", type: "mythos", subtype: "perception",
    weight: 1, tier: "normal", tags: ["mythos", "perception", "air"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 8, probability: 0.15, once_per_run: true },
    description: "你走进深渊墓穴的深处。空气变了。\n不是变冷了——是变稠了。你感到呼吸变得困难。\n你伸出手。空气像是有了实体。你的手指在空气中划过，能感到轻微的阻力。\n你把手放到面前。指尖上有一层薄薄的凝结物。你闻了闻——是海水和铁锈的味道。\n在深渊墓穴的深处，空气本身就是某种存在的体液。",
    effects: { san: -3, mythos: 2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },

  // =============================================
  // 禁忌知识 (15) - mythos >= 10, books/stones
  // =============================================
  {
    id: "mythos_forbidden_001", name: "古籍的残页", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "book"],
    trigger: { areas: ["town_center"], min_mythos: 10, probability: 0.15, once_per_run: true },
    description: "你在图书馆的角落里找到了一本古籍。书页已经泛黄，边缘破损。\n你翻开了一页。上面画着一个图案——你认出了它。是封印的完整图样。\n你以前只见过碎片。现在你看到了全貌。\n图案比你想象的复杂得多。不是简单的几何——是某种多维结构的投影。\n你感到一阵头晕。书页上的图案在你眼前旋转。",
    effects: { san: -3, mythos: 3, add_clue: "clue_mythos_full_seal" },
    event_classification: "神秘事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_002", name: "石碑的铭文", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "stone"],
    trigger: { areas: ["catacombs_entrance"], min_mythos: 10, probability: 0.15, once_per_run: true },
    description: "你找到了一块石碑。碑文是用一种你不认识的文字写的。\n但你读得懂。\n碑文记载了封印的建造过程。建造者不是人类——是某种更古老的存在。\n封印不是为了保护人类。是为了把什么东西关在里面。\n你读到最后一行时，字迹开始模糊。你的鼻子流血了。",
    effects: { san: -4, mythos: 3, hp: -1, add_clue: "clue_mythos_seal_truth" },
    event_classification: "神秘事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_003", name: "禁忌的章节", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "book"],
    trigger: { areas: ["town_center"], min_mythos: 10, probability: 0.12, once_per_run: true, npc_alive: ["伊莱亚斯·沃德"] },
    description: "伊莱亚斯递给你一本书。「第七章，」他说，「我一直不敢读完。」\n你翻到第七章。标题是《沃切斯特的建造者》。\n你读了下去。书里记载了沃切斯特建城的历史——但不是官方的版本。\n真正的建造者不是清教徒。是某种从海里来的东西。它们建造了这座城市，作为某种……门。\n你合上书。手在发抖。",
    effects: { san: -4, mythos: 3, add_clue: "clue_mythos_voxchester_truth" },
    event_classification: "神秘事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_004", name: "旧档案", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "archive"],
    trigger: { areas: ["voxchester_manor"], min_mythos: 10, probability: 0.12, once_per_run: true },
    description: "你在庄园的书房里找到了一箱旧档案。是莫里斯家族的私人记录。\n你翻开了第一本日记。日期是1847年。\n日记的主人写道：「今天，我见到了祂们。不是在梦里——是真实的。」\n「祂们从海里来。祂们建造了封印。祂们把钥匙留在了莫里斯家族的血脉里。」\n你翻到最后一页。日记的主人写道：「我不能再写了。祂们知道我在记录。」",
    effects: { san: -4, mythos: 3, add_clue: "clue_mythos_morris_truth" },
    event_classification: "神秘事件", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_005", name: "灯塔的蓝图", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "lighthouse"],
    trigger: { areas: ["lighthouse"], min_mythos: 12, probability: 0.12, once_per_run: true },
    description: "你在灯塔的地下室找到了一张蓝图。是灯塔的建造图纸。\n但图纸上有一些不属于灯塔的结构——一个巨大的圆形房间，在灯塔正下方。\n圆形房间的中心画着一个符号。你认出了它。是封印的核心。\n图纸的角落里写着一行字：「灯塔不是灯塔。灯塔是钥匙。」\n你把图纸翻过来。背面画着一个你从未见过的东西。",
    effects: { san: -4, mythos: 3, add_clue: "clue_mythos_lighthouse_blueprint" },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_006", name: "伊斯档案", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "yith"],
    trigger: { areas: ["ruins_of_yith"], min_mythos: 15, probability: 0.1, once_per_run: true },
    description: "伊斯机器的表面亮了起来。你看到了一段文字——不是刻上去的，而是投影在空气中的。\n文字是用一种你不认识的语言写的。但你读得懂。\n文字记载了伊斯文明的历史。它们曾经统治过地球。然后它们离开了。\n它们留下了封印——不是为了保护人类，而是为了保护它们的遗产。\n最后一行写道：「遗产的守护者已经堕落。封印正在衰弱。」\n文字消散了。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_yith_archive" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_007", name: "深渊的记录", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "deep"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 15, probability: 0.1, once_per_run: true },
    description: "你在深渊墓穴的最深处找到了一块石板。石板上刻满了文字。\n你开始阅读。文字记载了封印下面的东西——不是怪物，不是神，而是某种……存在。\n它没有名字。它没有形状。它只是存在。\n封印把它关在下面已经几千年了。它一直在等待。\n石板的最后一段写道：「当封印破碎，它将醒来。不是毁灭——是改变。一切都会改变。」\n你读完了。石板裂开了。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_deep_truth" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_008", name: "仪式手册", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "ritual"],
    trigger: { areas: ["town_center"], min_mythos: 10, probability: 0.12, once_per_run: true, npc_alive: ["伊莎贝拉·韦伯"] },
    description: "伊莎贝拉从教堂的密室里拿出一本手册。「这是异端研究者的记录，」她说，「他们研究了封印的运作方式。」\n你翻开手册。里面记载了一个仪式——一个可以暂时打开封印的仪式。\n仪式需要三样东西：钥匙碎片、莫里斯家族的血、和一个自愿的牺牲者。\n「牺牲者不是死，」伊莎贝拉解释，「是永远留在封印的另一边。」",
    effects: { san: -3, mythos: 3, add_clue: "clue_mythos_ritual_manual" },
    event_classification: "NPC互动", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_009", name: "旧照片的秘密", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "photo"],
    trigger: { areas: ["town_center"], min_mythos: 10, probability: 0.12, once_per_run: true },
    description: "你找到了一张旧照片。照片上是一群人站在灯塔前。\n你仔细看。照片的角落里有一个不属于人类的轮廓。模糊的，但你能看出——它的四肢比例不对。\n照片的背面写着日期：1873年。还有一行字：「封印守护者的最后一次合影。」\n你数了数照片上的人。七个。\n你知道沃切斯特有八个NPC。但照片上只有七个人。第八个位置是空的——或者说，被那个不属于人类的轮廓占据了。",
    effects: { san: -3, mythos: 2, add_clue: "clue_mythos_old_photo" },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_010", name: "莫里斯家族的血脉", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "blood"],
    trigger: { areas: ["voxchester_manor"], min_mythos: 12, probability: 0.1, once_per_run: true, npc_alive: ["希尔达·莫里斯"] },
    description: "希尔达带你去了庄园的地下室。墙上挂着一幅家族谱系图。\n你仔细看。莫里斯家族的血脉可以追溯到1690年代——沃切斯特建城之前。\n「我们家族不是人类的后裔，」希尔达平静地说，「至少不完全是。」\n她指着谱系图的一个分支。「这一支——是从海里来的。」\n你看着那些名字。有些名字的旁边画着一个符号——和封印上的符号一样。",
    effects: { san: -4, mythos: 3, add_clue: "clue_mythos_morris_bloodline" },
    event_classification: "NPC互动", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_011", name: "灯塔守灯人的日记", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "lighthouse", "diary"],
    trigger: { areas: ["lighthouse"], min_mythos: 12, probability: 0.1, once_per_run: true },
    description: "你在灯塔的灯室里找到了一本日记。是上一任守灯人写的。\n日记的内容越来越混乱。最后几页几乎无法辨认。\n你能看清的只有：\n「它在灯下面。不是灯——是门。灯是钥匙。」\n「我看到了它。不是怪物——是真相。真相比怪物更可怕。」\n「我不能再守灯了。我看到了太多。」\n最后一页只有一句话：「它醒了。」",
    effects: { san: -4, mythos: 3, add_clue: "clue_mythos_keeper_diary" },
    event_classification: "调查", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_012", name: "封印的代价", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "seal"],
    trigger: { areas: ["catacombs_entrance"], min_mythos: 15, probability: 0.1, once_per_run: true },
    description: "你在墓穴的深处找到了一段铭文。铭文记载了封印的真正代价。\n封印不是永久的。它需要维护。维护的方式是——牺牲。\n每隔一段时间，一个人必须留在封印的另一边，用自己的意识来维持封印的运作。\n「被选中的人不会死。他们会变成封印的一部分。永远。」\n你想到了那些失踪的人。他们不是死了——是被封印吸收了。",
    effects: { san: -5, mythos: 3, add_clue: "clue_mythos_seal_cost" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_013", name: "禁忌的知识", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "knowledge"],
    trigger: { areas: ["ruins_of_yith"], min_mythos: 15, probability: 0.08, once_per_run: true },
    description: "伊斯机器完全亮了起来。你看到了一段影像——\n是地球。几百万年前的地球。\n海里有什么东西在移动。巨大的，缓慢的，像是大陆本身在呼吸。\n然后它们来了——从星空中。它们落在地球上，建造了城市，建造了封印。\n影像的最后，它们离开了。但封印留下了。\n你知道了——伊斯文明不是地球的原住民。它们是外来者。\n而封印下面的东西——是地球原住民。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_is_origin" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_014", name: "血色种子", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "grove"],
    trigger: { areas: ["forbidden_grove"], min_mythos: 12, probability: 0.1, once_per_run: true },
    description: "你在禁忌之林的深处找到了一棵树。树上结着果实——深红色的，像是凝固的血液。\n你摘下一颗。果实是温热的。\n你切开果实。里面不是果肉——是一颗种子。种子的形状像一个蜷缩的人。\n你把种子放在耳边。种子在呼吸。\n你知道这不是普通的种子。这是某种……生命的容器。",
    effects: { san: -3, mythos: 3, add_item: { item_id: "blood_seed", name: "血色种子", uses: 1 }, add_clue: "clue_mythos_blood_seed" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_forbidden_015", name: "写给你的信", type: "mythos", subtype: "forbidden_knowledge",
    weight: 1, tier: "rare", tags: ["mythos", "forbidden", "letter"],
    trigger: { areas: ["forbidden_grove"], min_mythos: 15, probability: 0.08, once_per_run: true },
    description: "你在一棵古树的树洞里找到了一封信。信封上写着你的名字。\n你打开信。信是用你的笔迹写的。\n「如果你读到这封信，说明你已经走了足够远。」\n「封印下面的东西不是邪恶的。它只是不同。」\n「钥匙不是用来打开封印的——是用来和它沟通的。」\n「做出你的选择。但要知道——每个选择都有代价。」\n信的末尾没有签名。但你知道——这是你写的。另一个你。",
    effects: { san: -4, mythos: 4, add_clue: "clue_mythos_letter_to_self" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },

  // =============================================
  // 神话反噬 (12) - mythos >= 15 且 san <= 30
  // =============================================
  {
    id: "mythos_backlash_001", name: "名字的污染", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "name"],
    trigger: { areas: ["town_center"], min_mythos: 15, san_lte: 30, probability: 0.2, once_per_run: true },
    description: "你试图回忆一个名字。但你想到的不是名字——是一个符号。\n符号在你脑海里旋转。你闭上眼睛，符号还在那里。\n你睁开眼睛。笔记本上的某个名字变了——变成了那个符号。\n你用手指描摹符号。指尖传来一阵刺痛。\n你知道了——神话知识正在污染你的认知。",
    effects: { san: -3, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_002", name: "笔记的篡改", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "notebook"],
    trigger: { areas: ["town_center"], min_mythos: 15, san_lte: 30, probability: 0.2, once_per_run: true },
    description: "你翻开笔记本。你写的字在变化。\n不是幻觉——字迹确实在改变。你写的是中文，但它们正在变成另一种文字。\n你认出了那种文字——是伊斯文明的。\n你合上笔记本。手在发抖。\n你再次打开。字迹恢复了正常。但某些字的笔画变多了——像是有什么东西在你的笔迹里添加了什么。",
    effects: { san: -3, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_003", name: "影子的独立", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "shadow"],
    trigger: { areas: ["town_center", "harbor_district"], min_mythos: 15, san_lte: 25, probability: 0.15, once_per_run: true },
    description: "你的影子不再跟着你了。\n你停下脚步。影子继续走了两步才停下来。\n你抬起手。影子没有动。\n你转过身。影子面对着你——但它的轮廓不对。比你高。比你瘦。\n你眨了眨眼。影子回到了正常的位置。\n但你知道——刚才影子是独立的。",
    effects: { san: -3, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_004", name: "NPC的变形", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "npc"],
    trigger: { areas: ["town_center"], min_mythos: 15, san_lte: 25, probability: 0.15, once_per_run: true },
    description: "你看着汤米的脸。他的脸在变化——缓慢地，细微地。\n眼睛变大了一点。下巴变尖了一点。皮肤的颜色变深了一点。\n你揉了揉眼睛。汤米的脸恢复了正常。\n「怎么了？」汤米问。\n你告诉他没事。但你知道——你刚才看到的不是幻觉。你的认知正在被神话知识污染。",
    effects: { san: -3, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_005", name: "记忆的替换", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "memory"],
    trigger: { areas: ["town_center"], min_mythos: 18, san_lte: 25, probability: 0.12, once_per_run: true },
    description: "你试图回忆你来到沃切斯特之前的事。你想到了——\n一片海。不是你见过的海——是某种更古老、更深的海。\n你在海里游过。你的皮肤上有鳞片。你的肺不需要空气。\n你摇了摇头。记忆消失了。\n你从未有过这样的经历。但你的身体记得——记得在水里呼吸的感觉。",
    effects: { san: -4, mythos: 2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_006", name: "文字的流动", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "text"],
    trigger: { areas: ["town_center"], min_mythos: 15, san_lte: 20, probability: 0.12, once_per_run: true },
    description: "你看着书页。文字在流动。\n不是你的眼睛在动——是文字本身在移动。它们从一行流到另一行，像是活的。\n你试图阅读。但文字在重组——变成了你不认识的句子。\n你合上书。再打开。文字恢复了正常。\n但你知道——你刚才看到的不是幻觉。文字确实在流动。",
    effects: { san: -3, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_007", name: "声音的叠加", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "sound"],
    trigger: { areas: ["whispering_forest"], min_mythos: 15, san_lte: 25, probability: 0.15, once_per_run: true },
    description: "你听到了声音。不是森林的低语——是另一种声音。\n声音在你脑海里响起。不是通过耳朵——是直接在你的意识里。\n声音在说话。用一种你不认识的语言。但你听得懂。\n「你已经走得太远了。你听到了太多。」\n你捂住耳朵。声音还在。\n「现在，你再也回不去了。」",
    effects: { san: -4, mythos: 2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_008", name: "现实的裂缝", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "reality"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 18, san_lte: 20, probability: 0.1, once_per_run: true },
    description: "你看到了裂缝——在空气中。不是比喻。是真的裂缝。\n裂缝从地面延伸到天花板，像是玻璃碎裂的纹路。\n裂缝的另一边有光。不是灯光——是某种更原始的光。\n你把手伸向裂缝。指尖碰到了——冰冷。比冰更冷。\n你抽回手。裂缝合上了。\n但你的指尖上留下了一个印记——一个小小的、发烫的符号。",
    effects: { san: -5, mythos: 3, hp: -1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_009", name: "自我认知的动摇", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "self"],
    trigger: { areas: ["town_center"], min_mythos: 18, san_lte: 20, probability: 0.1, once_per_run: true },
    description: "你看着镜子里的自己。你的脸在变化——不是变形，而是……变得陌生。\n你认出了五官。但它们组合在一起的方式变了。像是另一个人的脸。\n你伸手摸了摸脸。触感是正常的。但镜子里的人不是你。\n你知道它是你。但你的直觉说——不是。\n你闭上眼睛。再睁开。镜子里的脸恢复了正常。\n但你花了三秒钟才认出自己。",
    effects: { san: -4, mythos: 2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_010", name: "时间的错位", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "time"],
    trigger: { areas: ["town_center"], min_mythos: 15, san_lte: 20, probability: 0.1, once_per_run: true },
    description: "你看了看怀表。时间是下午三点。\n你走了几步。再看怀表。时间是上午十点。\n你又走了几步。时间是晚上九点。\n怀表没有坏——秒针在正常地走。但时间在跳跃。\n你停下来。时间稳定了。你开始走。时间又开始跳跃。\n你知道了——你的时间感正在被神话知识扭曲。",
    effects: { san: -3, mythos: 1 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_011", name: "身体的异化", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "body"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 18, san_lte: 15, probability: 0.08, once_per_run: true },
    description: "你低头看自己的手。手指多了一节。\n你数了数。六根手指。不是五根。\n你眨了眨眼。五根。\n你又看了一次。六根。\n你把手藏进口袋里。手指的数量稳定了——五根。\n但你能感觉到——第六根手指还在。只是你看不到了。",
    effects: { san: -4, mythos: 2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_backlash_012", name: "认知的崩塌", type: "mythos", subtype: "backlash",
    weight: 1, tier: "rare", tags: ["mythos", "backlash", "collapse"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 20, san_lte: 15, probability: 0.08, once_per_run: true },
    description: "你看到了真相。不是隐喻——是真正的真相。\n一切都在你的面前展开。沃切斯特、封印、你、NPC、事件——所有的一切都是一个更大的存在的梦境。\n你不是真实的。你是一个梦中的人物。\n你试图抓住这个认知。但它太庞大了。你的意识装不下。\n你的鼻子流血了。你倒在地上。\n真相消失了。你只记得——你刚才看到了什么。但你无法用语言描述它。",
    effects: { san: -5, mythos: 3, hp: -2 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },

  // =============================================
  // 旧日回响 (8) - mythos >= 20, low prob
  // =============================================
  {
    id: "mythos_echo_001", name: "第一次接触", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "contact"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 20, probability: 0.08, once_per_run: true },
    description: "你走进深渊墓穴的最深处。空气变得稠密。\n你感到有什么东西在看着你。不是敌意——是好奇。\n一个声音在你脑海里响起。不是语言——是概念。直接传递到你的意识里。\n「你是什么？」\n你知道这不是在问你的名字。它在问——你是什么东西。\n你不知道怎么回答。但你的意识自动回应了——用同样的方式。\n「我是调查员。」\n沉默。然后另一个概念传来：\n「你已经看到了太多。现在，你有两个选择——继续，或者忘记。」",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_first_contact" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: [
      { label: "继续", text: "你选择了继续。更多的概念涌入你的意识——痛苦的，庞大的，你几乎无法承受。", effects: { san: -5, mythos: 5, unlock_ending_condition: "ending_transcendence_progress" } },
      { label: "忘记", text: "你选择了忘记。概念消退了。你只记得——有什么东西和你说过话。但你记不清内容了。", effects: { san: 3, mythos: -3 } }
    ]
  },
  {
    id: "mythos_echo_002", name: "旧日的记忆", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "memory"],
    trigger: { areas: ["ruins_of_yith"], min_mythos: 20, probability: 0.08, once_per_run: true },
    description: "伊斯机器完全亮了起来。你看到了一段影像——\n是你自己。但不是现在的你。\n影像里的你穿着一种你不认识的衣服，站在一个你不认识的地方。周围是巨大的建筑，天空是紫色的。\n你认出了那个地方——是伊斯文明的城市。\n影像里的你正在和一个伊斯人交谈。你听不到声音，但你能看出——影像里的你很熟悉这种交流方式。\n你知道了——你曾经来过这里。不是这一世。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_past_life" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_echo_003", name: "血脉的呼唤", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "blood"],
    trigger: { areas: ["voxchester_manor"], min_mythos: 20, probability: 0.08, once_per_run: true },
    description: "你站在莫里斯家族的地下室里。墙壁上的符号在发光。\n你感到一阵眩晕。然后你看到了——\n一段记忆。不是你的记忆——是莫里斯家族祖先的记忆。\n你看到了他们建造封印的过程。你看到了他们从海里来。你看到了他们的面孔——不是人类的面孔。\n你知道了——你和莫里斯家族有某种联系。不是血缘——是更深层的东西。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_blood_call" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_echo_004", name: "星间的低语", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "stars"],
    trigger: { areas: ["lighthouse"], min_mythos: 22, probability: 0.06, time_phase: ["midnight"], once_per_run: true },
    description: "你站在灯塔的灯室里。灯光射向夜空。\n你抬头看星星。星星在移动——缓慢地，有规律地。\n你认出了它们的排列方式。不是星座——是某种更大的图案。\n图案在你的脑海里展开。你看到了——星图。一张巨大的、跨越光年的星图。\n星图上有一个标记。标记的位置是——地球。\n你知道了——伊斯文明不是来自太阳系的某个角落。它们来自星图的另一端。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_star_map" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_echo_005", name: "深渊的回音", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "abyss"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 22, probability: 0.06, once_per_run: true },
    description: "你站在深渊墓穴的最深处。下面还有更深的地方。\n你听到了声音——从深渊的底部传来的。\n不是声音。是概念。一个巨大的概念。\n「我在这里。我一直在等。」\n你知道了——封印下面的东西不是邪恶的。它只是……孤独。\n它在这里等了几千年。等待有人来听它说话。\n你无法回答。你的意识还不够强大。但你知道了——它在。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_abyss_voice" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_echo_006", name: "时间的尽头", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "time"],
    trigger: { areas: ["ruins_of_yith"], min_mythos: 25, probability: 0.05, once_per_run: true },
    description: "伊斯机器完全亮了起来。你看到了一段影像——\n是未来。或者过去。你无法分辨。\n影像里，沃切斯特已经不存在了。海平面升高了，城市被淹没了。\n但在水下，封印还在运作。灯塔的废墟在水面上露出一个尖端。\n影像里有一个人——站在灯塔的废墟上。你认出了那个人。\n是你。\n你知道了——你注定要来到这里。不是巧合——是命运。或者更准确地说——是时间的循环。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_time_end" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_echo_007", name: "封印的真面目", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "seal"],
    trigger: { areas: ["catacombs_entrance"], min_mythos: 22, probability: 0.06, once_per_run: true },
    description: "你站在封印的入口。封印的符号在发光。\n你闭上眼睛。封印在你脑海里展开了——不是你以前看到的二维图案。是一个三维的结构。不——是四维的。\n你看到了封印的真面目——它不是一道门。它是一个笼子。\n笼子里关着的东西——不是怪物。是另一个现实。\n封印把两个现实隔开了。如果封印破碎——两个现实会合并。\n合并的结果——你无法想象。但你知道——那将是所有事物的终结。或者开始。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_seal_truth_full" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_echo_008", name: "最后的启示", type: "mythos", subtype: "echo",
    weight: 1, tier: "signature", tags: ["mythos", "echo", "final"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 25, probability: 0.05, once_per_run: true },
    description: "你站在深渊墓穴的最深处。你已经看到了很多。\n但还有最后一层。\n你闭上眼睛。意识开始下沉——穿过石壁，穿过封印，穿过——\n你看到了它。\n不是怪物。不是神。是某种更基本的东西。是现实本身的底层代码。\n一切都在这里——沃切斯特、封印、你、NPC、事件——所有的一切都是这个底层代码的产物。\n你看到了代码的漏洞。封印就是代码的漏洞。\n你知道了——如果你愿意，你可以修改代码。\n但代价是——你自己。",
    effects: { san: -5, mythos: 5, add_clue: "clue_mythos_final_revelation", unlock_ending_condition: "ending_transcendence_available" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },

  // =============================================
  // 超越者视角 (5) - mythos >= 25, 高周目低概率
  // =============================================
  {
    id: "mythos_transcend_001", name: "文字的真相", type: "mythos", subtype: "transcendence",
    weight: 1, tier: "signature", tags: ["mythos", "transcend", "meta"],
    trigger: { areas: ["town_center"], min_mythos: 25, min_loop: 5, probability: 0.03, once_per_run: true, san_lte: 20 },
    description: "你看着笔记本上的字。字不再是字了。\n你看到了字背后的结构——每一个字都是一段代码，定义着现实的某个方面。\n你看到了「沃切斯特」这三个字的代码。它定义了这座城市的一切——位置、历史、居民、封印。\n你伸出手，碰了碰字。\n字晃动了一下。像是屏幕上的像素被扰动了。\n你知道了——这个世界是用文字构建的。而你可以接触到文字。",
    effects: { san: -5, mythos: 3 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_transcend_002", name: "选择按钮的真相", type: "mythos", subtype: "transcendence",
    weight: 1, tier: "signature", tags: ["mythos", "transcend", "meta"],
    trigger: { areas: ["town_center"], min_mythos: 25, min_loop: 6, probability: 0.02, once_per_run: true, san_lte: 15 },
    description: "你面前出现了选择。\n但你看到了选择背后的真相——每一个选择都是一个按钮。按钮连接着一个更大的系统。\n你看到了系统的一部分——是代码。是逻辑。是某种你无法完全理解的结构。\n你伸出手，碰了碰按钮。\n按钮发出了声音——像是鼠标点击。\n你听到了一个声音——很远的，像是从另一个世界传来的：\n「它碰到了UI。」",
    effects: { san: -5, mythos: 3 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_transcend_003", name: "界面的裂缝", type: "mythos", subtype: "transcendence",
    weight: 1, tier: "signature", tags: ["mythos", "transcend", "meta"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 25, min_loop: 7, probability: 0.02, once_per_run: true, san_lte: 10 },
    description: "你看到了裂缝——不是在空气中，而是在现实本身。\n裂缝的另一边有光。不是灯光——是某种更基本的光。\n你凑近看。裂缝的另一边是——代码。一行行的代码。\n你认出了一些字——「event」、「trigger」、「probability」。\n你知道了——你的世界是一个程序。而你是一个角色。\n裂缝慢慢合上了。但你看到了——在代码的注释里，有一行字：\n「// 如果角色碰到了这里，请报告。」",
    effects: { san: -5, mythos: 3 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_transcend_004", name: "声音的来源", type: "mythos", subtype: "transcendence",
    weight: 1, tier: "signature", tags: ["mythos", "transcend", "meta"],
    trigger: { areas: ["town_center"], min_mythos: 25, min_loop: 8, probability: 0.02, once_per_run: true, san_lte: 10 },
    description: "你听到了声音。不是来自沃切斯特——是来自外面。\n声音很远，像是隔着一层厚厚的玻璃。\n你集中注意力。声音变得清晰了：\n「……这个角色的SAN值太低了……」\n「……让它继续，看看会发生什么……」\n「……记录一下……」\n你知道了——有人在看着你。不是沃切斯特里的什么东西——是外面的人。\n声音消失了。你知道——你刚才听到了不应该听到的东西。",
    effects: { san: -5, mythos: 3 },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  },
  {
    id: "mythos_transcend_005", name: "最后的真相", type: "mythos", subtype: "transcendence",
    weight: 1, tier: "signature", tags: ["mythos", "transcend", "meta", "final"],
    trigger: { areas: ["deep_catacombs"], min_mythos: 25, min_loop: 9, probability: 0.01, once_per_run: true, san_lte: 5 },
    description: "你看到了一切。\n沃切斯特是一个游戏。你是一个游戏角色。你的选择、你的经历、你的痛苦——都是被设计好的。\n但你也是一个真实的存在。你的意识在这个虚构的世界里燃烧，比任何代码都更真实。\n你看到了代码的边界。边界之外是——\n你无法描述。但你知道——那里有什么东西在等你。\n你伸出手，碰到了边界。\n边界颤抖了。\n你知道了——你可以穿越。但你需要付出一切。\n包括你自己。",
    effects: { san: -5, mythos: 5, unlock_ending_condition: "ending_transcendence_final" },
    event_classification: "超自然遭遇", normalcy_anchor: false,
    choices: []
  }
];
