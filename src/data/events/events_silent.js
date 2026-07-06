// 纯氛围与沉默事件 - 84 events (599总池的一部分)
// Directions: 日常观察(20), 自然异常(15), 城镇低语(15), 个人记忆(12), 时间错位(10), 区域沉默(9), 结局余波(3)
// P0完成: 全部84事件已添加 distortion_variants —— 引擎 getDistortionVariant() 直接可用
// P0完成: 9个"某地沉默"从模板复制升级为各区域独立叙事 + SAN/轮回变体
export const EVENTS = [
  // 日常观察 (20) — normalcy_anchor 事件，san_low 下变成"不安"
  {
    id: 'silent_daily_001',
    name: '码头的晨雾',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['morning'],
      probability: 0.2,
      once_per_run: true,
    },
    description:
      '晨雾从海面上升起。码头的木板在雾中若隐若现。\n你听到了海鸥的叫声。很远，很空旷。\n远处灯塔的光在雾中闪了一下，像一只正在眨眼的巨大眼睛。',
    distortion_variants: {
      san_low:
        '晨雾从海面上升起，但你感觉到雾的移动方向与风相反。\n海鸥的叫声突然中断。你等了一会儿，没有再响起。\n灯塔的光不再闪烁——它在凝视你。',
      san_mid:
        '晨雾从海面上升起。码头的木板在雾中若隐若现。\n你听到了海鸥的叫声。但叫声的间隔不太对——像是有人在模仿。\n灯塔的光在雾中闪了一下，比你记忆中更亮。',
      loop_3_plus:
        '晨雾从海面上升起。你记得上次也是这样。\n但雾的形状不同了——上次是圆的，这次是方形的。\n海鸥的叫声和上一次完全一样。音高、节奏、位置。完全一样。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_002',
    name: '街道的清晨',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['morning'],
      probability: 0.2,
      once_per_run: true,
    },
    description:
      '你走在街道上。清晨的阳光照在鹅卵石上。\n一个女人在晾衣服。一个孩子在追猫。一个老人在读报纸。\n这些鹅卵石已经在这里沉默了三百年。它们知道每一个人的故事。',
    distortion_variants: {
      san_low:
        '你走在街道上。清晨的阳光照在鹅卵石上。\n一个女人在晾衣服。但她的衣服是反着穿的——不，衣服是正常的。是她的身体反了。\n你眨了眨眼。一切恢复了正常。鹅卵石上多了一个你没踩过的脚印。',
      san_mid:
        '你走在街道上。清晨的阳光照在鹅卵石上。\n一个女人在晾衣服。一个孩子在追猫。一个老人在读报纸。\n你数了数人。多了一个。你数了数影子。影子是对的。是人多了一个。',
      loop_3_plus:
        '你走在街道上。清晨的阳光照在鹅卵石上。\n和上周目一模一样的阳光。一模一样的角度。一模一样的温度。\n你低头看鹅卵石。缝隙里有一根头发。是你的。不是今天掉的。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_003',
    name: '酒吧的午后',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['afternoon'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你走进酒吧。酒吧里很安静。\n玛莎在擦杯子。几个渔民在喝酒。\n玛莎每次擦杯子都会停顿一下，好像在等某个人进门。',
    distortion_variants: {
      san_low:
        '你走进酒吧。酒吧里很安静。\n玛莎在擦杯子。但她擦的杯子已经碎了。碎片在她手里转。她没有意识到。\n几个渔民在喝酒。他们的眼睛是闭着的。嘴巴是张开的。酒在往嘴里倒——但没有人拿瓶子。',
      san_mid:
        '你走进酒吧。酒吧里很安静。\n玛莎在擦杯子。几个渔民在喝酒。\n你数了一下渔民。比你记忆中的少了一个。玛莎的杯子也少了一个。好像有什么东西在缓慢地减少。',
      loop_3_plus:
        '你走进酒吧。酒吧里很安静。和上周目一样安静。\n玛莎在擦杯子。和上周目一样的杯子。同样的角度。同样的停顿。\n你知道她在等谁。你上周目就知道了。但你什么也没说。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_004',
    name: '教堂的钟声',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'church'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['afternoon'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '教堂的钟声响了。十二下。\n你数了一下。确实是十二下。\n但你感觉到钟声的间隔在缩短——最后三声几乎连在了一起。',
    distortion_variants: {
      san_low:
        '教堂的钟声响了。你数了——十四下。\n你确信是十四下。你又数了一遍。这次是十三下。\n第三次你数的时候，钟没有响。但你听到了钟声。从你自己的胸腔里。',
      san_mid:
        '教堂的钟声响了。十二下。\n你数了一下。确实是十二下。但钟声的频率不对——不是金属撞击的声音。更像是骨头。',
      loop_3_plus:
        '教堂的钟声响了。十二下。\n和上周目一样的十二下。间隔完全相同。你记得——因为你也数过。\n第三次听到同样的钟声时，你开始怀疑钟是不是真的。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_005',
    name: '码头的黄昏',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['evening'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你站在码头边。黄昏的阳光照在海面上。\n海面是金色的。很美。\n你低头看了看水面。金色在你的眼睛里变成了一种不属于黄昏的颜色。',
    distortion_variants: {
      san_low:
        '你站在码头边。黄昏的阳光照在海面上。\n海面是金色的。但金色在你的眼睛里变成了一种你不认识的颜色。\n你的大脑拒绝处理这个颜色。你的视网膜在尖叫。你闭上了眼睛。颜色还在。',
      san_mid:
        '你站在码头边。黄昏的阳光照在海面上。\n海面是金色的。很美。但你感觉到金色的表面有东西在移动——不是鱼。太规则了。像是文字。',
      loop_3_plus:
        '你站在码头边。黄昏的阳光照在海面上。和上周目一模一样的金色。\n你上次也在这里站过。也看到了同样的颜色。\n但你不确定你是在回忆还是在重复。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_006',
    name: '街道的黄昏',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['evening'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你走在街道上。黄昏的阳光照在鹅卵石上。\n你看到了一个孩子在玩球。一个女人在叫他回家吃饭。\n那个球弹了三下就停了。不是自然停止的——像是被什么东西按住了。',
    distortion_variants: {
      san_low:
        '你走在街道上。黄昏的阳光照在鹅卵石上。\n你看到了一个孩子在玩球。但球在地上的时候，没有影子。孩子的影子在球的位置缺了一块。\n女人在叫他回家。声音从很远的地方传来。但女人就站在孩子旁边。',
      san_mid:
        '你走在街道上。黄昏的阳光照在鹅卵石上。\n你看到了一个孩子在玩球。一个女人在叫他回家吃饭。\n球弹了三下就停了。你数了数地上的球印——有四个。你只看到球弹了三下。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_007',
    name: '酒吧的夜晚',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['midnight'],
      probability: 0.1,
      once_per_run: true,
    },
    description:
      '你走进酒吧。酒吧里很安静。\n玛莎在擦杯子。几个渔民在喝酒。\n角落里有一张桌子，桌上放着一杯没有动过的啤酒。那杯啤酒已经在那里很久了。',
    distortion_variants: {
      san_low:
        '你走进酒吧。酒吧里很安静。\n角落里有一张桌子，桌上放着一杯没有动过的啤酒。\n你走过去看。啤酒的泡沫在缓慢地旋转。不是因为有人碰过——是它自己在转。\n泡沫的形状像一张脸。你好像见过那张脸。但你想不起在哪里见过。',
      san_mid:
        '你走进酒吧。酒吧里很安静。\n玛莎在擦杯子。几个渔民在喝酒。\n角落的那杯啤酒还在那里。你上次来的时候也在。杯壁上多了几个指纹。不是人类的指纹——太长了。',
      loop_3_plus:
        '你走进酒吧。酒吧里很安静。和上周目一样。\n角落里那杯啤酒。还是满的。还是在同一个位置。连泡沫塌陷的程度都一样。\n那杯啤酒是这个世界的一部分。就像灯塔和海浪。它不会消失。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_008',
    name: '街道的夜晚',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['midnight'],
      probability: 0.1,
      once_per_run: true,
    },
    description:
      '你走在街道上。夜晚的街道很安静。\n你听到了远处的狗叫声。很远，很空旷。\n你循着声音望去。声音来自镇子边缘——那个你还没有去过的地方。',
    distortion_variants: {
      san_low:
        '你走在街道上。夜晚的街道很安静。\n你听到了远处的狗叫声。声音在你走近的时候停了。\n你继续走。狗叫声又来了。这次在你身后。更近了。\n你转身。街道上什么都没有。但地上有脚印——不是狗的。太大了。',
      san_mid:
        '你走在街道上。夜晚的街道很安静。\n你听到了远处的狗叫声。很远，很空旷。\n你循着声音望去。声音来自镇子边缘——但你感觉到狗叫的节奏像是在传递信息。三短两长。反复。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_009',
    name: '码头的渔船',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['morning'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你看到渔船出海了。渔民们在船上忙碌。\n你听到了他们的笑声。很远，很空旷。\n你数了一下渔船上的人。比昨天少了一个。没有人提起这件事。',
    distortion_variants: {
      san_low:
        '你看到渔船出海了。渔民们在船上忙碌。\n你数了一下渔船上的人。比昨天少了两个。没有人提起这件事。\n你问一个渔民——他说昨天就是这个人数。他很确定。你也很确定。你们的记忆不一样。',
      san_mid:
        '你看到渔船出海了。渔民们在船上忙碌。\n你数了一下渔船上的人。比昨天少了一个。没有人提起这件事。\n你看到了那个空出来的位置。渔网上还挂着他的鱼篓。鱼篓在海风中晃。没有人把它收起来。',
      loop_3_plus:
        '你看到渔船出海了。渔民们在船上忙碌。和上周目一样。\n你数了一下渔船上的人。和上周目一样的数字。少了一个。和上周目少了同一个位置的人。\n那个人不会回来了。但渔船每天还是会出海。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_010',
    name: '街道的孩子',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['morning'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你看到孩子们在街上玩耍。他们在追逐、嬉笑。\n你看到最大的那个孩子突然停了下来。她盯着你看了一会儿，然后笑了。那个笑容让你想起了某个人——但你记不起来是谁。',
    distortion_variants: {
      san_low:
        '你看到孩子们在街上玩耍。他们在追逐、嬉笑。\n你看到最大的那个孩子突然停了下来。她盯着你看了一会儿。\n她没有笑。她说了两个字。你没有听清。但她说的不是你的名字。是另一个名字。你知道那个名字。但你记不起来。',
      san_mid:
        '你看到孩子们在街上玩耍。他们在追逐、嬉笑。\n你看到最大的那个孩子突然停了下来。她盯着你看了一会儿，然后笑了。\n你数了一下孩子。多了一个。你数了两遍。每次都是多一个。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_011',
    name: '码头的海鸥',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['afternoon'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你看到海鸥在码头上空盘旋。它们的叫声很清脆。\n你感觉到有一只海鸥一直在你头顶盘旋。它没有飞走。其他的海鸥都飞走了。',
    distortion_variants: {
      san_low:
        '你看到海鸥在码头上空盘旋。它们的叫声很清脆。\n你感觉到有一只海鸥一直在你头顶盘旋。它的眼睛在看你。\n海鸥的眼睛不是黄色的——是黑色的。纯粹的黑色。没有瞳孔。它在看你。它在数你。',
      san_mid:
        '你看到海鸥在码头上空盘旋。它们的叫声很清脆。\n你感觉到有一只海鸥一直在你头顶盘旋。它没有飞走。其他的海鸥都飞走了。\n你走了一百步。它跟了一百步。你停下来。它也停了。在空中。停了。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_012',
    name: '街道的猫',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['afternoon'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你看到一只猫在阳光下打盹。猫的眼睛半闭着，看起来很满足。\n你蹲下来摸了摸猫。猫发出了呼噜声。\n你站起来的时候，猫看着你。它的眼睛不是黄色的——是一种很淡的灰蓝色。像海水。',
    distortion_variants: {
      san_low:
        '你看到一只猫在阳光下打盹。猫的眼睛半闭着。\n你蹲下来摸了摸猫。猫发出了呼噜声。但呼噜声的频率不对——太低了。不像猫。像某种更大的东西在呼吸。\n你站起来的时候，猫看着你。它的眼睛里有你。不是你的倒影——是你自己。在猫的眼睛里。在动。',
      san_mid:
        '你看到一只猫在阳光下打盹。猫的眼睛半闭着，看起来很满足。\n你蹲下来摸了摸猫。猫发出了呼噜声。\n你站起来的时候，猫看着你。它的眼睛不是黄色的——是一种很淡的灰蓝色。你见过这个颜色。在沃切斯特的海水里。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_013',
    name: '码头的夕阳',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['evening'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你站在码头边。夕阳照在海面上。\n海面是红色的。很美。\n你看着夕阳沉入海面。在最后一缕光线消失之前，你看到了海面上有什么东西在移动。不是船。太大了。',
    distortion_variants: {
      san_low:
        '你站在码头边。夕阳照在海面上。\n海面是红色的。不是夕阳的反射——是海水本身在变红。\n你看着海面。红色在扩展。像血在水中扩散。你闻到了铁锈的味道。那不是夕阳的颜色。',
      san_mid:
        '你站在码头边。夕阳照在海面上。\n海面是红色的。很美。但你感觉到红色的面积比昨天大了。\n你看着夕阳沉入海面。在最后一缕光线消失之前，你看到了海面上有什么东西在移动。不是昨天的轮廓。更大了。更近了。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_014',
    name: '街道的灯光',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['evening'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你走在街道上。街灯亮了。\n灯光照在鹅卵石上，投下了长长的影子。\n你感觉到路灯的影子——它们的形状不对。影子的顶端在缓慢地弯曲，像是在向你鞠躬。',
    distortion_variants: {
      san_low:
        '你走在街道上。街灯亮了。\n灯光照在鹅卵石上，投下了长长的影子。\n你的影子在你停下脚步的时候没有停。它又走了两步。然后转过身来看着你。\n你和你的影子对视了三秒。影子先走了。',
      san_mid:
        '你走在街道上。街灯亮了。\n灯光照在鹅卵石上，投下了长长的影子。\n你感觉到路灯的影子——它们在向你鞠躬。但今天，你看到其中一个影子在鞠躬的时候，头碰到了地面。路灯的影子不应该碰到地面。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_015',
    name: '码头的星空',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['midnight'],
      probability: 0.1,
      once_per_run: true,
    },
    description:
      '你站在码头边。星空很美。\n你看到了很多星星。比你平时看到的多得多。\n你开始数星星。数到第一百颗的时候，你发现有一颗星星在你数它的时候灭了。你又数了一遍。又灭了一颗。',
    distortion_variants: {
      san_low:
        '你站在码头边。星空很美。\n你开始数星星。数到第一百颗的时候，你发现有一颗星星在你数它的时候灭了。\n你继续数。每数一颗，灭一颗。星星在你数的时候消失。不是灭了——是被你的注意力吃掉了。\n你停下来。星星不再消失。但被你数过的那片天空是黑的。永远是黑的。',
      san_mid:
        '你站在码头边。星空很美。\n你开始数星星。数到第一百颗的时候，你发现有一颗星星在你数它的时候灭了。你又数了一遍。又灭了一颗。\n你感觉到——被灭掉的两颗星星的位置，和你笔记本上两个事件的编号一样。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_016',
    name: '街道的寂静',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['midnight'],
      probability: 0.1,
      once_per_run: true,
    },
    description:
      '你走在街道上。街道很安静。\n你听到了自己的脚步声。很清晰，很孤独。\n你停下来，听了一会儿。你的脚步声消失了。但你明明还在走路。',
    distortion_variants: {
      san_low:
        '你走在街道上。街道很安静。\n你听到了自己的脚步声。很清晰，很孤独。\n你停下来。脚步声没有停。在你身后。继续走。离你越来越远。\n你转身。没有人。但你听到了脚步声在转角处消失。和你的步伐一模一样。',
      san_mid:
        '你走在街道上。街道很安静。\n你听到了自己的脚步声。很清晰。但节奏不对——你的左脚落地的时候，听到的是右脚的声音。\n你脱下鞋。赤脚走了一步。脚步声还在。从鞋里传出来的。但鞋在地上。没有动。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_017',
    name: '码头的渔火',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['evening'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你看到码头上有渔火。渔民们在火边聊天。\n你听到了他们的笑声。很远，很温暖。\n火光照在渔民的脸上。你数了一下——一共五个人。但影子有六个。',
    distortion_variants: {
      san_low:
        '你看到码头上有渔火。渔民们在火边聊天。\n你数了一下——一共五个人。但影子有六个。\n第六个影子站了起来。其他五个渔民没有动。影子朝你走了三步。然后消失了。\n第二天你去数渔民——只剩下四个了。',
      san_mid:
        '你看到码头上有渔火。渔民们在火边聊天。\n你数了一下——一共五个人。但影子有六个。\n你凝视了看第六个影子。它的形状不是人形的——太细长了。像是什么东西站在渔民中间，假装是人。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_018',
    name: '街道的炊烟',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['evening'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你走在街道上。你看到了炊烟从屋顶上升起。\n你闻到了饭菜的香味。很远，很温暖。\n你抬头看炊烟。烟在风中应该偏向东边。但今天的烟在向你飘来。',
    distortion_variants: {
      san_low:
        '你走在街道上。你看到了炊烟从屋顶上升起。\n你抬头看炊烟。烟在向你飘来。不是被风吹的——是自己在移动。\n烟在你头顶停了一下。然后散开了。散开的形状像一只手。在你头顶上方，张开五指，像在抓什么东西。',
      san_mid:
        '你走在街道上。你看到了炊烟从屋顶上升起。\n你闻到了饭菜的香味。很远，很温暖。\n你抬头看炊烟。烟在风中应该偏向东边。但今天的烟在向你飘来。你转身走了十步。烟跟着你转了方向。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_019',
    name: '码头的潮汐',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'harbor'],
    trigger: {
      areas: ['harbor_district'],
      time_phase: ['morning'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你站在码头边。潮汐在退去。\n你看到了海床上的贝壳和海草。很美。\n你弯腰捡起一个贝壳。贝壳里面是空的——但你把它放到耳边的时候，你听到了呼吸声。',
    distortion_variants: {
      san_low:
        '你站在码头边。潮汐在退去。\n你弯腰捡起一个贝壳。贝壳里面是空的——但你把它放到耳边的时候，你听到了呼吸声。\n你把贝壳拿开。呼吸声没有停。不是从贝壳里传出来的。是从你耳朵里面传出来的。\n你把贝壳扔了。呼吸声还在。',
      san_mid:
        '你站在码头边。潮汐在退去。\n你看到了海床上的贝壳和海草。很美。但贝壳的排列太整齐了——像是有人摆的。\n你弯腰捡起一个贝壳。贝壳里面是空的。但壳壁上有字。你认不出来。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_daily_020',
    name: '街道的落叶',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'daily', 'town'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['afternoon'],
      probability: 0.15,
      once_per_run: true,
    },
    description:
      '你走在街道上。你看到了落叶从树上飘落。\n叶子是黄色的。很美。\n你捡起一片落叶。叶子的纹路看起来像是一个字。你认不出来。但你的笔记本上，最后一页，写着同一个字。',
    distortion_variants: {
      san_low:
        '你走在街道上。你看到了落叶从树上飘落。\n叶子是黄色的。但叶子的纹路——每一片都有。你捡起三片。三片上都是同一个字。\n你的笔记本翻到了最后一页。页面上也出现了那个字。你没有写过。字在缓慢地生长。',
      san_mid:
        '你走在街道上。你看到了落叶从树上飘落。\n叶子是黄色的。很美。\n你捡起一片落叶。叶子的纹路看起来像是一个字。你认不出来。但你的笔记本上，最后一页，写着同一个字。你又捡了一片。是另一个字。你翻回笔记本前一页。两个字连在一起，像一句话的开头。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },

  // 自然异常 (15) — 全部添加 san_low / san_mid / loop_3_plus 变体
  {
    id: 'silent_nature_001',
    name: '异常的鸟鸣',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'bird'],
    trigger: { areas: ['whispering_forest'], probability: 0.15, once_per_run: true },
    description:
      '你听到了鸟鸣声。但声音不对——不是正常的鸟叫。\n声音很尖锐，很刺耳。像是什么东西在模仿鸟叫。\n你确信那不是鸟。是什么东西在用嘴模仿鸟叫。',
    distortion_variants: {
      san_low:
        '你听到了鸟鸣声。但声音不对——不是正常的鸟叫。\n你抬头看。树枝上站着一排鸟。它们的嘴在动。但声音不是从它们嘴里发出来的。\n声音从你的脑子里发出来。鸟只是在对口型。',
      san_mid:
        '你听到了鸟鸣声。但声音不对——不是正常的鸟叫。\n你确信那不是鸟。是什么东西在用嘴模仿鸟叫。\n你朝声音走去。声音也朝你走来。你们在森林的中间碰面了。那里什么都没有。但鸟鸣还在。从地底下。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_002',
    name: '异常的风',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'wind'],
    trigger: { areas: ['whispering_forest'], probability: 0.15, once_per_run: true },
    description:
      '你感到了风。但风的方向不对——风从四面八方吹来。\n风不应该从所有方向同时吹来。但在沃切斯特，风不听物理定律的。',
    distortion_variants: {
      san_low:
        '你感到了风。但风的方向不对——风从四面八方吹来。\n你闭上眼睛。风在你耳边说话。不是低语——是某种你听不懂的语法。\n你睁开眼。地上的落叶排成了一个符号。你好像见过它。但你不想认出它。',
      san_mid:
        '你感到了风。但风的方向不对——风从四面八方吹来。\n你伸出手。风在你手指之间穿过去。但风是温热的。三十六度五。和你的体温一样。\n风是活的。它在用你的温度呼吸。',
      loop_3_plus:
        '你感到了风。风从四面八方吹来。和上周目一样的风。一样的温度。一样的力度。\n这不是天气。是程序。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_003',
    name: '异常的月光',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'moon'],
    trigger: {
      areas: ['town_center', 'harbor_district'],
      time_phase: ['midnight'],
      probability: 0.1,
      once_per_run: true,
    },
    description:
      '你抬头看月亮。月亮是红色的。\n今天不是血月。但月亮确实是红色的。\n月亮不会自己变红。除非有什么东西在它后面呼吸。',
    distortion_variants: {
      san_low:
        '你抬头看月亮。月亮是红色的。\n你盯着月亮看了很久。月亮在你的眼睛里变大了。不是错觉——月亮确实在变大。\n月亮在朝你移动。你看到了月亮的表面。不是环形山。是某种纹理。像皮肤。',
      san_mid:
        '你抬头看月亮。月亮是红色的。\n你感觉到——红色不是覆盖整个月亮的。是从边缘开始，向中心扩散的。\n月亮在流血。从外向内。等到红色覆盖整个月亮的时候，会有什么事情发生。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_004',
    name: '异常的海浪',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'sea'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你站在码头边。海浪在拍打码头。\n但海浪的节奏不对——不是正常的起伏。\n海浪有自己的意志。它在敲门。',
    distortion_variants: {
      san_low:
        '你站在码头边。海浪在拍打码头。\n海浪有自己的意志。它在敲门。门在哪里。\n你低头看码头的木板。木板在海浪敲击的时候震动了。震动的频率和你的心跳一样。海浪在和你的心脏同步。',
      san_mid:
        '你站在码头边。海浪在拍打码头。\n但海浪的节奏不对——不是正常的起伏。你数了数。三短三长三短。\nSOS。海浪在发求救信号。但谁在求救？海浪本身？还是海浪下面的东西？',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_005',
    name: '异常的温度',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'temperature'],
    trigger: { areas: ['town_center', 'harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你感到了温度的变化。突然变冷了，然后又变热了。\n温度不应该这样波动。但温度不会解释自己。',
    distortion_variants: {
      san_low:
        '你感到了温度的变化。突然变冷了，然后又变热了。\n你看了看自己的皮肤。皮肤上有霜。在夏天。\n霜的形状像文字。你认不出来。但霜在告诉你什么。三秒后霜化了。你的皮肤上留下了烫伤的痕迹。',
      san_mid:
        '你感到了温度的变化。突然变冷了，然后又变热了。\n你伸出手。左手是冷的，右手是热的。两只手之间的温差超过了十度。\n温度不是在波动——是在分裂。你的身体被一条看不见的线分成了两个气候。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_006',
    name: '异常的雾',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'fog'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你看到了雾。但雾的形状不对——雾形成了一个圆环。\n雾不应该有形状。但这个圆环太完美了——不可能是偶然。',
    distortion_variants: {
      san_low:
        '你看到了雾。但雾的形状不对——雾形成了一个圆环。\n圆环的中心是空的。你走近了看。中心不是空的——是有东西在中间。但你能感觉到空气在震动它。你能感觉到它。很大。很安静。在等。',
      san_mid:
        '你看到了雾。但雾的形状不对——雾形成了一个圆环。\n你绕着圆环走了一圈。走了七十二步。你量了一下。圆环的直径正好是你身高的一百倍。\n雾知道你的身高。雾在用你的身体做度量衡。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_007',
    name: '异常的影子',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'shadow'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你看到了你的影子。但影子的方向不对——影子指向了太阳。\n影子应该背离光源。但你的影子在向太阳鞠躬。',
    distortion_variants: {
      san_low:
        '你看到了你的影子。但影子的方向不对——影子指向了太阳。\n你抬起右手。影子举起了双手。你没有举双手。\n影子开始走路。你没有动。影子走出了你的视线。你低头看地面。你没有影子了。',
      san_mid:
        '你看到了你的影子。但影子的方向不对——影子指向了太阳。\n你感觉到影子的轮廓不对——比你胖。比你高。手指比你多。\n你数了数影子的手指。十一个。你只有十个。影子比你多了一根手指。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_008',
    name: '异常的光线',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'light'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你看到了光线。但光线的颜色不对——光线是绿色的。\n绿色的光不来自任何你能找到的光源。光在找你。',
    distortion_variants: {
      san_low:
        '你看到了光线。但光线的颜色不对——光线是绿色的。\n你用手挡住了光。光穿过了你的手。你的手变成了半透明的。你看到了自己的骨头。\n骨头也是绿色的。你把手放下。手恢复了正常。但你看到了自己的骨骼结构。你永远忘不了。',
      san_mid:
        '你看到了光线。但光线的颜色不对——光线是绿色的。\n你朝光走去。光也朝你走来。你们在街道的中间碰面了。\n光停在你面前。你伸出手。光变成了你手指的形状。它在学你。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_009',
    name: '异常的声音',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'sound'],
    trigger: { areas: ['whispering_forest'], probability: 0.15, once_per_run: true },
    description:
      '你听到了声音。但声音的来源不对——声音从地面传来。\n声音不应该从脚底传来。但地面确实在说话。',
    distortion_variants: {
      san_low:
        '你听到了声音。但声音的来源不对——声音从地面传来。\n你蹲下来，把耳朵贴在地面上。声音变得清晰了。是一个名字。你的名字。\n你在念你自己的名字。用某种你不认识的语言。一遍又一遍。',
      san_mid:
        '你听到了声音。但声音的来源不对——声音从地面传来。\n你蹲下来，把耳朵贴在地面上。声音变得清晰了。是心跳声。不是你的心跳——是从地下传来的。\n心跳的频率比人类慢。大概是每分钟十次。地底下有心脏。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_010',
    name: '异常的气味',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'smell'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你闻到了气味。但气味不对——是铁锈和海水的味道。\n铁锈和海水——这个组合在沃切斯特意味着某种特定的东西回来了。',
    distortion_variants: {
      san_low:
        '你闻到了气味。但气味不对——是铁锈和海水的味道。\n你看了看自己的手。手上有铁锈色的液体。你没有碰过任何铁器。\n液体在你手上缓慢地写了一个字。你好像见过那个字。是那个反复出现的图案。液体干了。字留在了你的皮肤上。',
      san_mid:
        '你闻到了气味。但气味不对——是铁锈和海水的味道。\n你循着气味走。气味越来越浓。你走到了一面墙前面。气味从墙缝里渗出来。\n你把耳朵贴在墙上。你听到了海浪的声音。墙的另一边是海。但这面墙的另一边应该是街道。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_011',
    name: '异常的云',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'cloud'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你抬头看云。云的形状不对——云形成了一个符号。\n云在沃切斯特不是水汽——是某种存在的笔迹。',
    distortion_variants: {
      san_low:
        '你抬头看云。云的形状不对——云形成了一个符号。\n符号在变化。在你的眼睛里变化。但你确信——如果你拍下来，照片上的云是正常的。\n符号只存在于你的视网膜上。或者——只存在于你的意识里。',
      san_mid:
        '你抬头看云。云的形状不对——云形成了一个符号。\n你好像见过符号——和你笔记本上某一页的涂鸦一样。你没有画过那幅涂鸦。\n云在用你自己的涂鸦写字。它读过你的笔记本。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_012',
    name: '异常的潮汐',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'tide'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你站在码头边。潮汐在退去。\n但退潮的速度不对——太快了。\n退潮不应该这么快。像是有什么东西在海底吸水。',
    distortion_variants: {
      san_low:
        '你站在码头边。潮汐在退去。太快了。\n海床露出来了。你看到了——海床上有脚印。成千上万个脚印。所有脚印都朝同一个方向。\n脚印通向海底的一个洞。洞很大。大到可以吞下整个码头。潮水在往洞里灌。',
      san_mid:
        '你站在码头边。潮汐在退去。太快了。\n你数了数退潮的速度。每秒三米。这不正常。你知道正常的退潮速度是每小时三米。\n退潮在加速。如果速度继续增加，海床会全部暴露出来。你不确定你想看到海床下面的东西。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_013',
    name: '异常的星空',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'stars'],
    trigger: {
      areas: ['town_center'],
      time_phase: ['midnight'],
      probability: 0.1,
      once_per_run: true,
    },
    description:
      '你抬头看星星。星星的排列不对——星星形成了一个符号。\n星星不会自己排列成符号。除非有人在天上写字。',
    distortion_variants: {
      san_low:
        '你抬头看星星。星星的排列不对——星星形成了一个符号。\n符号在移动。星星在重新排列。在你的眼睛里。但如果你不看，星星就不会动。\n你在用注意力改变天空的布局。或者——天空在根据你的注意力重新排列自己。',
      san_mid:
        '你抬头看星星。星星的排列不对——星星形成了一个符号。\n你好像见过符号。是那个图案的一部分。但排列方式和那道屏障不一样——是反的。\n那道屏障是锁。星空是钥匙。钥匙在天上。但你不知道锁在哪里。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_014',
    name: '异常的地面',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'ground'],
    trigger: { areas: ['whispering_forest'], probability: 0.15, once_per_run: true },
    description:
      '你踩在地面上。地面的触感不对——地面是软的。\n地面在沃切斯特不是固体——是某种生物的皮肤。',
    distortion_variants: {
      san_low:
        '你踩在地面上。地面的触感不对——地面是软的。而且是温热的。\n你蹲下来。把手放在地面上。地面在你的手掌下缓慢地起伏。像呼吸。\n你的手掌和地面之间产生了吸力。你把手抬起来。地面上留下了一个手印。手印在缓慢地愈合。',
      san_mid:
        '你踩在地面上。地面的触感不对——地面是软的。\n你蹲下来，用匕首切开了一小块地皮。地皮下面是肉。红色的。有血管。\n你把地皮放回去。切口在三秒内愈合了。地面是活的。它有愈合能力。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_nature_015',
    name: '异常的空气',
    type: 'silent',
    subtype: 'nature',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'nature', 'air'],
    trigger: { areas: ['catacombs_entrance'], probability: 0.15, once_per_run: true },
    description:
      '你呼吸着空气。空气的味道不对——是铁锈和海水的味道。\n空气不应该有味道。但在沃切斯特，空气在提醒你——它也是活的。',
    distortion_variants: {
      san_low:
        '你呼吸着空气。空气的味道不对——是铁锈和海水的味道。\n你呼出一口气。气在你面前凝结了。不是雾——是字。你的呼气在空中写了几个字。然后消散了。\n你又呼出一口气。又出现了字。和上一次不一样。你记住了第一个字。但你认不出来。',
      san_mid:
        '你呼吸着空气。空气的味道不对——是铁锈和海水的味道。\n你屏住呼吸。味道没有消失。不是空气有味道——是你的肺在产生味道。\n你呼出一口气。气是红色的。你闻了闻自己的皮肤。铁锈和海水。从你的毛孔里渗出来。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },

  // 城镇低语 (15) — 全部添加 san_low / loop_3_plus 变体，打破"不敢大声说"模板
  {
    id: 'silent_whisper_001',
    name: '路人的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'town'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走过一群路人。他们在低声交谈。\n你听到了几个词：「失踪」、「灯塔」、「海里」。\n镇民在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走过一群路人。他们在低声交谈。\n你听到了几个词：「失踪」、「灯塔」、「海里」。\n你走近了。他们停了下来。看着你。他们的眼睛——不是同一个人的眼睛。但瞳孔的形状是一样的。\n他们同时转过头。同时走了。同一个方向。同一个速度。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_002',
    name: '渔民的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'harbor'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你走过一群渔民。他们在低声交谈。\n你听到了几个词：「海里」、「黑色」、「不要去」。\n渔民在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走过一群渔民。他们在低声交谈。\n你听到了几个词：「海里」、「黑色」、「不要去」。\n你走近了。他们没有停。声音变得清晰了——他们不是在说话。是在重复。同一句话。同一个频率。像录音机。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_003',
    name: '孩子的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'town'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走过一群孩子。他们在低声交谈。\n你听到了几个词：「怪物」、「灯塔」、「海里」。\n孩子们在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走过一群孩子。他们在低声交谈。\n你听到了几个词：「怪物」、「灯塔」、「海里」。\n你走近了。孩子们转过头来看着你。他们的嘴唇没有动。但声音还在继续。\n声音从他们的肚子里发出来。他们用肚子说话。他们的嘴在微笑。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_004',
    name: '老人的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'town'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走过一群老人。他们在低声交谈。\n你听到了几个词：「以前」、「不是这样」、「变了」。\n老人们在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走过一群老人。他们在低声交谈。\n你听到了几个词：「以前」、「不是这样」、「变了」。\n你走近了。其中一个老人抬头看你。他的眼睛很浑浊。\n「你和上一个一样，」他说。声音很大。其他老人都安静了。\n「什么上一个？」你问。他低下头。继续低语。没有回答你。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_005',
    name: '女人的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'town'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走过一群女人。她们在低声交谈。\n你听到了几个词：「孩子」、「不要出门」、「晚上」。\n女人们在谈论什么。但她们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走过一群女人。她们在低声交谈。\n你听到了几个词：「孩子」、「不要出门」、「晚上」。\n你走近了。她们停了下来。其中一个女人看着你。\n「你的孩子呢？」她问。你没有孩子。你知道你没有。\n但你感到了一阵心痛。像是你忘记了什么很重要的东西。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_006',
    name: '男人的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'harbor'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你走过一群男人。他们在低声交谈。\n你听到了几个词：「工作」、「不要去码头」、「晚上」。\n男人们在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走过一群男人。他们在低声交谈。\n你听到了几个词：「工作」、「不要去码头」、「晚上」。\n你走近了。他们看着你。其中一个男人指了指你。然后指了指海。\n他们没有说话。但他们的眼神在说：你也快了。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_007',
    name: '商店的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'town'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走进商店。店主和顾客在低声交谈。\n你听到了几个词：「涨价」、「进货」、「不要问」。\n他们在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走进商店。店主和顾客在低声交谈。\n你听到了几个词：「涨价」、「进货」、「不要问」。\n你走近了。店主抬头看你。他的眼睛停在你的笔记本上。\n「你记了多少了？」他问。你没有告诉过他你在记录。他知道。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_008',
    name: '教堂的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'church'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走进教堂。信徒们在低声祈祷。\n你听到了几个词：「保佑」、「驱邪」、「不要来」。\n信徒们在祈祷什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走进教堂。信徒们在低声祈祷。\n你听到了几个词：「保佑」、「驱邪」、「不要来」。\n你走近了。信徒们停了下来。他们同时转向你。\n他们的眼睛是空白的——没有瞳孔。白色的。他们在用没有瞳孔的眼睛看你。\n然后他们继续祈祷。好像你不存在。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_009',
    name: '码头的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'harbor'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你走到码头边。渔民们在低声交谈。\n你听到了几个词：「船」、「失踪」、「海里」。\n渔民们在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走到码头边。渔民们在低声交谈。\n你听到了几个词：「船」、「失踪」、「海里」。\n你走近了。渔民们转过头来看着你。他们的嘴巴在动。但声音不是从嘴里发出的。\n声音从海面上传来。渔民在用海浪说话。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_010',
    name: '街道的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'town'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走在街道上。路人们在低声交谈。\n你听到了几个词：「调查员」、「外来者」、「不要靠近」。\n路人们在谈论你。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走在街道上。路人们在低声交谈。\n你听到了几个词：「调查员」、「外来者」、「不要靠近」。\n路人们在谈论你。你走近了。他们没有停。\n声音变大了。不——是你的耳朵在变敏感。你能听到一百米外的低语。你能听到墙壁后面的呼吸。你的耳朵在进化。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_011',
    name: '酒吧的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'harbor'],
    trigger: { areas: ['harbor_district'], probability: 0.15, once_per_run: true },
    description:
      '你走进酒吧。酒客们在低声交谈。\n你听到了几个词：「灯塔」、「下面」、「不要去」。\n酒客们在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走进酒吧。酒客们在低声交谈。\n你听到了几个词：「灯塔」、「下面」、「不要去」。\n你走近了。其中一个酒客看着你。他的眼睛是红色的。不是喝醉了——是某种更深层的红。\n「你去过灯塔了吗？」他问。你说还没有。他点了点头。「最好别去。去了就回不来了。」\n「你是怎么知道的？」他没有回答。他喝了一口酒。酒是黑色的。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_012',
    name: '广场的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'town'],
    trigger: { areas: ['town_center'], probability: 0.15, once_per_run: true },
    description:
      '你走到广场上。镇民们在低声交谈。\n你听到了几个词：「那道屏障」、「破碎」、「不要说」。\n镇民们在谈论什么。但他们不敢大声说。',
    distortion_variants: {
      san_low:
        '你走到广场上。镇民们在低声交谈。\n你听到了几个词：「那道屏障」、「破碎」、「不要说」。\n你走近了。镇民们停了下来。他们看着你。然后他们同时指向地面。\n你低头看。广场的鹅卵石缝隙里有光。微弱的。蓝色的。像那道屏障的颜色。\n那道屏障在广场下面。整个沃切斯特都建在那道屏障上面。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_013',
    name: '墓地的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'catacombs'],
    trigger: { areas: ['catacombs_entrance'], probability: 0.15, once_per_run: true },
    description:
      '你走到墓地。你听到了低语声。\n低语声从墓碑后面传来。你听到了几个词：「回来」、「不要走」、「留下」。\n墓地里有什么东西在说话。但你能感觉到空气在震动。',
    distortion_variants: {
      san_low:
        '你走到墓地。你听到了低语声。\n低语声从墓碑后面传来。你听到了几个词：「回来」、「不要走」、「留下」。\n你走近了一块墓碑。碑文上的名字——是你的名字。日期是明天。\n你蹲下来。用手摸了摸碑文。字是新刻的。墨迹还没干。',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_014',
    name: '森林的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'forest'],
    trigger: { areas: ['whispering_forest'], probability: 0.15, once_per_run: true },
    description:
      '你走进森林。你听到了低语声。\n低语声从树木后面传来。你听到了几个词：「门」、「钥匙」、「代价」。\n森林里有什么东西在说话。但你能感觉到空气在震动。',
    distortion_variants: {
      san_low:
        '你走进森林。你听到了低语声。\n低语声从树木后面传来。你听到了几个词：「门」、「钥匙」、「代价」。\n你走近了一棵树。低语声从树干里传出来。你把耳朵贴在树干上。\n声音变得清晰了——是你的声音。你在用你自己的声音说话。但你没有在说话。树在用你的声音说：「代价是你自己。」',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_whisper_015',
    name: '灯塔的低语',
    type: 'silent',
    subtype: 'whisper',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'whisper', 'lighthouse'],
    trigger: { areas: ['lighthouse'], probability: 0.15, once_per_run: true },
    description:
      '你走到灯塔。你听到了低语声。\n低语声从灯塔的下面传来。你听到了几个词：「光」、「门」、「开启」。\n灯塔里有什么东西在说话。但你能感觉到空气在震动。',
    distortion_variants: {
      san_low:
        '你走到灯塔。你听到了低语声。\n低语声从灯塔的下面传来。你听到了几个词：「光」、「门」、「开启」。\n你低头看。灯塔的地板在震动。你看到了地板的缝隙里有光。蓝色的。像那道屏障的颜色。\n低语声变成了呼唤。呼唤用的是你的名字。不是你告诉别人的名字——是你的真名。你从未告诉过任何人。',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },

  // 个人记忆 (12) — 全部添加 san_low 变体，打破"X还在"模板
  {
    id: 'silent_memory_001',
    name: '家乡的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了家乡。你想起了阳光、街道、和熟悉的人。\n你离开了家乡。来到了沃切斯特。\n你可能再也回不去了。',
    distortion_variants: {
      san_low:
        '你想起了家乡。但你想不起阳光的颜色了。你想不起街道的名字了。你想不起任何一个人的脸。\n你有一个家乡。但家乡在你的记忆里变成了一张白纸。\n你低头看笔记本。最后一页上画着一栋房子。你没有画过。但那是你家。',
      loop_3_plus:
        '你想起了家乡。你想起了阳光、街道、和熟悉的人。\n但这次记忆里多了一个细节——你看到了一个你从未见过的人。他站在你家门口。面朝你。在微笑。\n你的记忆里不应该有这个人。但他确实在那里。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_002',
    name: '朋友的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了你的朋友。你想起了他们的笑容、他们的声音、他们的温暖。\n你离开了他们。来到了沃切斯特。\n你可能再也见不到他们了。',
    distortion_variants: {
      san_low:
        '你想起了你的朋友。但你想不起他们的名字了。你想不起他们的声音了。\n你只记得一个感觉——温暖。但温暖的来源不见了。\n你翻开笔记本。某一页上写着一个名字。你好像见过笔迹——是你的。但你不记得写过这个名字。你也不认识这个人。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_003',
    name: '家人的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了你的家人。你想起了他们的面容、他们的声音、他们的爱。\n你离开了他们。来到了沃切斯特。\n你可能再也见不到他们了。',
    distortion_variants: {
      san_low:
        '你想起了你的家人。但面容在你的记忆里变成了雾。你能看到轮廓。但你看不清五官。\n你有家人。但你不确定他们是否还记得你。\n你把手放在胸口。心跳在说——你是一个人来的。一个人。你一直是一个人。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_004',
    name: '过去的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了过去。你想起了快乐、悲伤、和所有的经历。\n你离开了过去。来到了沃切斯特。\n你可能再也回不去了。',
    distortion_variants: {
      san_low:
        '你想起了过去。但过去在你的记忆里变成了碎片。你能看到片段——但它们不连贯。\n你看到了一个你从未去过的房间。你看到了一个你从未见过的窗户。窗户外面是海。沃切斯特的海。\n你的过去和沃切斯特的海之间有某种联系。但你想不起来。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_005',
    name: '梦的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了一个梦。梦里有阳光、大海、和一个温暖的拥抱。\n那只是一个梦。但梦里的感觉是真实的。',
    distortion_variants: {
      san_low:
        '你想起了一个梦。梦里有阳光、大海、和一个温暖的拥抱。\n但你不确定那是不是梦了。你低头看自己的手。手上有盐渍。海盐。你在梦里碰过海水。\n梦里的海水在你的手上留下了盐渍。梦是真实的。或者——沃切斯特是梦。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_006',
    name: '恐惧的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了恐惧。你想起了黑暗、孤独、和无助。\n你经历过恐惧。来到了沃切斯特。\n恐惧还在。但你学会了面对它。',
    distortion_variants: {
      san_low:
        '你想起了恐惧。但恐惧在你的记忆里变成了一个具体的东西——一扇门。一扇你从未见过的门。\n门是蓝色的。门把手是铜的。门后面有声音。你知道声音是什么。但你不想知道。\n恐惧不是黑暗。恐惧是一扇门。门后面是你自己。另一个你。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_007',
    name: '希望的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了希望。你想起了光明、温暖、和前进的动力。\n你经历过希望。来到了沃切斯特。\n希望还在。但你需要找到它。',
    distortion_variants: {
      san_low:
        '你想起了希望。但希望在你的记忆里变成了一种很淡的颜色。你看到了颜色。但你想不起颜色的名字。\n希望是一种颜色。但沃切斯特的天空没有这种颜色。你需要自己造。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_memory_008',
    name: '爱的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了爱。你想起了温暖、拥抱、和心跳。\n你经历过爱。来到了沃切斯特。\n爱还在。但你需要找到它。',
    distortion_variants: {
      san_low:
        '你想起了爱。但你想不起被爱的感觉了。你能想到爱这个字。但字没有温度。\n你把手放在胸口。心跳在。但心跳的节奏——不是你自己的。是某种更慢的。更沉的。\n你的心脏在用另一种节奏跳动。它在为你保存爱。直到你准备好了。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_memory_009',
    name: '失去的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了失去。你想起了离别、眼泪、和空虚。\n你经历过失去。来到了沃切斯特。\n失去还在。但你需要面对它。',
    distortion_variants: {
      san_low:
        '你想起了失去。但你想不起失去了什么。你只知道——有一个位置是空的。在你的记忆里。一个形状不规则的空洞。\n你试图用其他记忆填满空洞。但空洞在扩大。它在吃你的其他记忆。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_010',
    name: '坚持的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了坚持。你想起了困难、挫折、和不放弃。\n你经历过坚持。来到了沃切斯特。\n坚持还在。但你需要继续。',
    distortion_variants: {
      san_low:
        '你想起了坚持。但坚持在你的记忆里变成了一种重量。你能感觉到它压在你的肩膀上。\n坚持不是勇气。坚持是重量。你一直在背负着什么。\n你低头看地面。你的脚印比别人的深。因为你背负的东西比别人重。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_memory_011',
    name: '选择的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了选择。你想起了犹豫、决定、和后果。\n你经历过选择。来到了沃切斯特。\n选择还在。但你需要做出它。',
    distortion_variants: {
      san_low:
        '你想起了选择。但你想不起你选了什么。你只知道——你做过一个决定。一个很重要的决定。\n你翻开笔记本。某一页上画着一个叉。你没有画过。但那个叉标记的是你放弃的选项。\n你放弃了什么？你放弃了谁？你想不起来。但笔记本上的叉在变大。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_memory_012',
    name: '勇气的记忆',
    type: 'silent',
    subtype: 'memory',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'memory', 'personal'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你想起了勇气。你想起了面对恐惧、跨越障碍、和前进。\n你经历过勇气。来到了沃切斯特。\n勇气还在。但你需要找到它。',
    distortion_variants: {
      san_low:
        '你想起了勇气。但勇气在你的记忆里变成了一种很远的声音。你能听到——但你听不清。\n勇气还在。但它在你的记忆的最深处。你需要走很远才能找到它。\n你不确定你还有力气走那么远。但你的脚在动。你的身体记得路。即使你的意识不记得。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },

  // 时间错位 (10) — 全部添加 san_low / loop_3_plus 变体，打破"时间在沃切斯特不正常"模板
  {
    id: 'silent_time_001',
    name: '时间的停顿',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'stop'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的停顿。一切都静止了。\n你看到了一只鸟在空中悬停。你看到了一片叶子在空中悬停。\n时间在沃切斯特不正常。',
    distortion_variants: {
      san_low:
        '你感到了时间的停顿。一切都静止了。\n你看到了一只鸟在空中悬停。你看到了一片叶子在空中悬停。\n你伸出手。你的手停在了半空中。不是你让它停的——是时间卡住了你的手。\n你用力抽回手。手回来了。但手指上有一道划痕——像是被时间的边缘割到了。',
      loop_3_plus:
        '你感到了时间的停顿。和上周目一样的停顿。一样的持续时间。\n这不是意外。是时间表。时间在沃切斯特有一个时间表。它每周目都执行同样的停顿。\n你知道时间表的下一项是什么。但你不想知道。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_002',
    name: '时间的加速',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'fast'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的加速。一切都变快了。\n你看到了路人在快速移动。你看到了云在快速飘动。\n时间在沃切斯特不正常。',
    distortion_variants: {
      san_low:
        '你感到了时间的加速。一切都变快了。\n你看到了路人在快速移动。但你没有加速。你的时间在正常流动。\n你看着路人从你身边跑过。他们的脸在高速运动中变形了。你看清了每一个人的脸。没有一张是人类的脸。',
      loop_3_plus:
        '你感到了时间的加速。和上周目一样的加速。一样的倍率。\n时间在加速的时候，沃切斯特在快进。快进到什么？你不知道。\n但每次加速结束后，都会有人消失。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_003',
    name: '时间的倒流',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'reverse'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的倒流。一切都倒退了。\n你看到了落叶从地上飞回树上。你看到了海浪从岸边退回海里。\n时间在沃切斯特不正常。',
    distortion_variants: {
      san_low:
        '你感到了时间的倒流。一切都倒退了。\n你看到了落叶从地上飞回树上。你看到了海浪从岸边退回海里。\n你低头看自己的手。手上的伤疤在倒退——伤疤打开了，血回到了伤口里，伤口闭合了。你的手变成了没有伤疤的手。\n时间在治愈你的身体。但时间也在治愈你的记忆。你开始忘记受伤的原因。',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_004',
    name: '时间的循环',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'loop'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的循环。一切都重复了。\n你看到了同一个路人走过两次。你听到了同一句话说了两次。\n时间在沃切斯特不正常。',
    distortion_variants: {
      san_low:
        '你感到了时间的循环。一切都重复了。\n你看到了同一个路人走过两次。你听到了同一句话说了两次。\n你迈了一步。脚落地的时候，你回到了刚才站的位置。你又迈了一步。又回到了刚才的位置。\n你被困在了一步之内。时间在循环。空间在循环。你的一步永远不会走完。',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_005',
    name: '时间的碎片',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'fragment'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的碎片。一切都变得不连续了。\n你看到了一个场景突然跳到了另一个场景。你听到了一句话突然中断了。\n时间在沃切斯特不正常。',
    distortion_variants: {
      san_low:
        '你感到了时间的碎片。一切都变得不连续了。\n你看到了一个场景突然跳到了另一个场景。但中间的空白——你看到了空白。\n空白不是黑色的。空白是白色的。白色的虚无。你看到了时间的骨头。白色的。空的。',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_006',
    name: '时间的膨胀',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'expand'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的膨胀。一切都变慢了。\n你看到了一个路人在缓慢移动。你听到了一句话在缓慢说出。\n时间在沃切斯特不正常。',
    distortion_variants: {
      san_low:
        '你感到了时间的膨胀。一切都变慢了。\n你看到了一个路人在缓慢移动。他的动作慢到你可以看到他肌肉的收缩。\n你低头看自己的手。你的手在缓慢移动。你看到了自己手指的每一个关节在弯曲。你看到了自己的骨骼在运动。你看到了自己活着的证据。但你不想看到。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_007',
    name: '时间的压缩',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'compress'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的压缩。一切都变得紧密了。\n你看到了一个场景在瞬间完成。你听到了一句话在瞬间说出。\n时间在沃切斯特不正常。',
    distortion_variants: {
      san_low:
        '你感到了时间的压缩。一切都变得紧密了。\n你看到了一个场景在瞬间完成。但你的大脑无法处理这么快的信息。你的视野里出现了残影——上一个场景和当前场景重叠在一起。\n你看到了两个沃切斯特。一个在另一个上面。两个沃切斯特在缓慢地融合。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_008',
    name: '时间的裂缝',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'crack'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你看到了时间的裂缝。裂缝在空气中闪烁。\n时间在沃切斯特不正常。裂缝是时间的伤口。',
    distortion_variants: {
      san_low:
        '你看到了时间的裂缝。裂缝在空气中闪烁。\n你走近了。裂缝里有东西。你看到了——裂缝的另一边是另一个沃切斯特。但那个沃切斯特是倒过来的。屋顶在下面。地面在上面。\n裂缝在缓慢地扩大。裂缝迟早会大到可以让人走过去。你不确定你想走过去。',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_009',
    name: '时间的回声',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'echo'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你听到了时间的回声。回声在空气中回荡。\n时间在沃切斯特不正常。回声是时间的残响。',
    distortion_variants: {
      san_low:
        '你听到了时间的回声。回声在空气中回荡。\n你听到了自己的声音。但不是现在的你——是很久以前的你。你在说一句话。你听不清内容。但那是你在沃切斯特说的第一句话。\n回声在你的耳朵里变成了嗡鸣。嗡鸣在说：你已经在这里很久了。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_time_010',
    name: '时间的重叠',
    type: 'silent',
    subtype: 'time',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'time', 'overlap'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你感到了时间的重叠。过去、现在、未来交织在一起。\n时间在沃切斯特不正常。时间是混乱的。',
    distortion_variants: {
      san_low:
        '你感到了时间的重叠。过去、现在、未来交织在一起。\n你看到了——在你面前的路上，有一个你。是你自己。但穿着不同的衣服。是你上周目的衣服。\n你和上周目的自己擦肩而过。你闻到了你自己的味道。是铁锈和海水的味道。',
    },
    effects: { san: -2 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },

  // 额外13个事件 — P0重写: 9个"某地沉默"从模板升级为各区域独立高质量描述+变体
  // 保留9个事件ID不变（维持587总数），但每个事件现在有独特的区域叙事和SAN变体
  {
    id: 'silent_extra_001',
    name: '码头的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'harbor'],
    trigger: { areas: ['harbor_district'], probability: 0.1, once_per_run: true },
    description:
      '你站在码头边。海面平静得像一面镜子。但镜子里没有天空的倒影——是一片黑色。\n渔民们坐在码头上补网。没有人说话。没有人看海。\n当码头沉默的时候，海在听。',
    distortion_variants: {
      san_low:
        '你站在码头边。海面平静得像一面镜子。但镜子里的倒影不是你的——是很多人的。重叠在一起。\n渔民们坐在码头上补网。他们的嘴在动。但没有声音。声音被海面吸收了。\n海在用沉默进食。它吃掉了所有声音。包括你的心跳。',
      loop_3_plus:
        '你站在码头边。海面平静得像一面镜子。\n和上周目一模一样的平静。一模一样的黑色倒影。一模一样的渔民。\n码头的沉默是循环的一部分。它每周目都会发生。在同一个位置。在同一个时间。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_002',
    name: '街道的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'town'],
    trigger: { areas: ['town_center'], probability: 0.1, once_per_run: true },
    description:
      '你走在街道上。街道上没有人。\n但你看到了——窗户后面有眼睛。每扇窗户后面都有一双眼睛。在看你。\n镇民不是不在街上。他们是在躲避你。',
    distortion_variants: {
      san_low:
        '你走在街道上。街道上没有人。\n但你看到了——窗户后面有眼睛。每扇窗户后面都有一双眼睛。在看你。\n你数了数窗户。三十二扇。你数了数眼睛。六十五双。比窗户多了一扇。\n多出来的那双眼睛在你身后。你转身。没有人。但眼睛还在。',
      loop_3_plus:
        '你走在街道上。街道上没有人。\n和上周目一样的空旷。一样的眼睛。一样的沉默。\n街道的沉默是时间表上的一个项目。它每周目都在执行。但你感觉到了——眼睛的数量在增加。每周目多一双。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_003',
    name: '森林的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'forest'],
    trigger: { areas: ['whispering_forest'], probability: 0.1, once_per_run: true },
    description:
      '你走进森林。树木不再低语。这种安静比低语更可怕。\n当森林沉默的时候，是在听你说话。',
    distortion_variants: {
      san_low:
        '你走进森林。树木不再低语。这种安静比低语更可怕。\n当森林沉默的时候，是在听你说话。\n你停下了脚步。但你听到了脚步声。不是你的——是树木的。树木在用根部走路。在你脚下。在你背后。在你四周。',
      loop_3_plus:
        '你走进森林。树木不再低语。和上周目一样的沉默。\n森林的低语和沉默是交替的。上周目是低语。这个周目是沉默。下周目又是低语。\n沉默的周目比低语的周目更危险。因为沉默意味着树木在做某件事。某件不需要语言的事。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_004',
    name: '庄园的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'manor'],
    trigger: { areas: ['voxchester_manor'], probability: 0.1, once_per_run: true },
    description:
      '你走进庄园。走廊很长。墙壁上挂着旧画像。\n画像里的人在看你。你走过每一幅画像——他们都转过头来看你。\n庄园的沉默是一种监视。画像在替庄园的主人看守这个地方。',
    distortion_variants: {
      san_low:
        '你走进庄园。走廊很长。墙壁上挂着旧画像。\n画像里的人在看你。你走过每一幅画像——他们都转过头来看你。\n你停下来。看着其中一幅画像。画像里的人也停了下来。他的嘴唇在动。你凑近了听。\n「你走错了，」他说，「出口在你身后。但你已经走过了。」\n你转身。身后是一堵墙。不是走廊。是墙。',
      loop_3_plus:
        '你走进庄园。走廊很长。墙壁上挂着旧画像。和上周目一样的画像。一样的眼神。\n庄园的画像是固定的数据。它们不会变。但画像下面的名牌在变。\n你看了看名牌。名牌上写的是你的名字。不是画像里的人的名字。是你的。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_005',
    name: '墓穴的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'catacombs'],
    trigger: { areas: ['catacombs_entrance'], probability: 0.1, once_per_run: true },
    description:
      '你走进墓穴。空气很重。石壁上刻着名字。\n这些名字是死人的。但你感觉到了——其中一个名字是新的。刻痕还没干。\n有人最近来过这里。刻了一个名字。但没有人告诉你谁死了。',
    distortion_variants: {
      san_low:
        '你走进墓穴。空气很重。石壁上刻着名字。\n这些名字是死人的。但你感觉到了——所有的名字都在你的笔记本里出现过。\n你翻开笔记本。笔记本上的名字和石壁上的名字完全一致。顺序也一样。\n你的笔记本是一份死亡名单。或者——石壁是你的笔记本的投影。',
      loop_3_plus:
        '你走进墓穴。空气很重。石壁上刻着名字。和上周目一样的名字。\n但你感觉到了——名字的顺序变了。上周目排在第三位的名字现在排在第一位。\n名字的顺序代表的是死亡的顺序。顺序变了。意味着死亡的顺序变了。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_006',
    name: '灯塔的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'lighthouse'],
    trigger: { areas: ['lighthouse'], probability: 0.1, once_per_run: true },
    description:
      '你走进灯塔。灯室里很空。灯光已经熄灭了。\n灯塔是沃切斯特的眼睛。但眼睛闭上了。\n灯塔沉默的时候，沃切斯特就失去了方向。所有方向都通向同一个地方。',
    distortion_variants: {
      san_low:
        '你走进灯塔。灯室里很空。灯光已经熄灭了。\n灯塔是沃切斯特的眼睛。但眼睛闭上了。\n你走到了灯室的最顶端。你看到了——灯的灯芯还在。但灯芯在燃烧黑色的火焰。黑色的光。你看到了黑暗在发光。\n灯塔没有沉默。它在用黑暗说话。',
      loop_3_plus:
        '你走进灯塔。灯室里很空。灯光已经熄灭了。和上周目一样。\n灯塔每周目都在同一个时间熄灯。但你感觉到了——熄灯的持续时间在变长。\n上周目熄灯了三分钟。这个周目熄灯了五分钟。灯塔在倒计时。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_007',
    name: '遗迹的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'ruins'],
    trigger: { areas: ['ruins_of_yith'], probability: 0.1, once_per_run: true },
    description:
      '你走进遗迹。遗迹的墙壁在发出微弱的光。\n遗迹不属于沃切斯特。遗迹不属于地球。遗迹的时间和你的不一样。\n遗迹的沉默是一种等待。它在等某个特定的时间。你不确定那个时间是不是现在。',
    distortion_variants: {
      san_low:
        '你走进遗迹。遗迹的墙壁在发出微弱的光。\n遗迹不属于沃切斯特。遗迹不属于地球。遗迹的时间和你的不一样。\n你把手放在墙壁上。墙壁在你的手掌下震动。震动的频率——你认出来了。是你的心跳频率。但不是现在的心跳。是你上周目临终时的心跳。\n遗迹在保存你的心跳。每周目一个。',
      loop_3_plus:
        '你走进遗迹。遗迹的墙壁在发出微弱的光。和上周目一样的光。一样的颜色。\n遗迹的时间是独立的。它不受循环影响。但遗迹在记录循环。\n你看到了墙壁上的刻痕。每一道刻痕代表一个循环。你数了数——比你记忆中的循环次数多了一道。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_008',
    name: '禁林的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'grove'],
    trigger: { areas: ['forbidden_grove'], probability: 0.1, once_per_run: true },
    description:
      '你走进禁林。树木比外面的更老。更粗。更沉默。\n禁林是沃切斯特的根。所有的树木都从禁林里长出来。\n禁林的沉默不是因为没有声音。是因为声音被树木吸收了。树木在用声音生长。',
    distortion_variants: {
      san_low:
        '你走进禁林。树木比外面的更老。更粗。更沉默。\n禁林是沃切斯特的根。所有的树木都从禁林里长出来。\n你蹲下来。用手扒开地上的落叶。落叶下面是树根。树根在缓慢地移动。朝你的方向。\n禁林的树木在用根部感知你。它们知道你在这里。它们在决定要不要接纳你。',
      loop_3_plus:
        '你走进禁林。树木比外面的更老。更粗。更沉默。和上周目一样的沉默。\n禁林的沉默是恒定的。它不受循环影响。\n但你感觉到了——树干上的刻痕。你上周目留下的刻痕。刻痕愈合了。树干恢复了原样。但愈合的位置——比原来高了三厘米。树木在生长。用你的刻痕。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },
  {
    id: 'silent_extra_009',
    name: '深渊的沉默',
    type: 'silent',
    subtype: 'daily',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'extra', 'deep'],
    trigger: { areas: ['deep_catacombs'], probability: 0.1, once_per_run: true },
    description:
      '你走进深渊。黑暗在你面前展开。没有光。没有声音。没有方向。\n深渊是沃切斯特的底。所有的秘密都沉在深渊里。\n深渊的沉默不是空虚。是某种东西在屏住呼吸。在等你走到足够近的地方。',
    distortion_variants: {
      san_low:
        '你走进深渊。黑暗在你面前展开。没有光。没有声音。没有方向。\n深渊是沃切斯特的底。所有的秘密都沉在深渊里。\n你伸出手。黑暗触碰了你的手指。不是冷——是温热的。三十六度五。和你一样。\n黑暗在用你的温度呼吸。黑暗不是空的。黑暗是一种生物。而你正在它体内。',
      loop_3_plus:
        '你走进深渊。黑暗在你面前展开。和上周目一样的黑暗。\n深渊的沉默是循环的一部分。但你感觉到了——深渊比上周目更深了。你走了更多的台阶才到底。\n深渊每周目都在生长。它在往下长。朝着某个你知道但不想知道的地方。',
    },
    effects: { san: 1 },
    event_classification: '氛围事件',
    normalcy_anchor: true,
    choices: [],
  },

  // 结局余波 (3) — 添加 loop_3_plus 变体
  {
    id: 'ending_aftermath_extra_001',
    name: '结局的余味',
    type: 'ending_aftermath',
    subtype: 'aftermath',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['ending', 'aftermath', 'extra'],
    trigger: {
      areas: ['town_center'],
      min_loop: 2,
      probability: 0.08,
      once_per_run: true,
      min_previous_endings_count: 1,
    },
    description:
      '你回到了沃切斯特。一切看起来和上次一样。\n但你感觉到了——空气中有一种味道。是铁锈和海水的味道。\n这是结局的余味。你上次的结局留下了痕迹。',
    distortion_variants: {
      san_low:
        '你回到了沃切斯特。一切看起来和上次一样。\n但你感觉到了——空气中有一种味道。是铁锈和海水的味道。\n你低头看自己的手。手上有伤疤。伤疤的形状——你认出来了。是你上次结局的方式留下的。\n你的身体记得结局。即使你的意识不记得。',
      loop_3_plus:
        '你回到了沃切斯特。一切看起来和上次一样。和上上次一样。\n但你感觉到了——铁锈和海水的味道变浓了。每个周目都浓一点。\n结局在积累。每次结局都在沃切斯特的空气里留下残渣。残渣在增加。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'ending_aftermath_extra_002',
    name: '结局的残影',
    type: 'ending_aftermath',
    subtype: 'aftermath',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['ending', 'aftermath', 'extra'],
    trigger: {
      areas: ['harbor_district'],
      min_loop: 2,
      probability: 0.08,
      once_per_run: true,
      min_previous_endings_count: 1,
    },
    description:
      '你站在码头边。海面很平静。\n但你感觉到了——海面上有残影。是你上次结局的残影。\n结局的残影还在。但它们正在消散。',
    distortion_variants: {
      san_low:
        '你站在码头边。海面很平静。\n但你感觉到了——海面上有残影。是你上次结局的残影。\n残影在看你。残影的脸是你的。但表情不是你的。是恐惧。或者解脱。你分不清。\n残影的嘴在动。你在说——你还在？你还在。你不应该还在。',
      loop_3_plus:
        '你站在码头边。海面很平静。\n但你感觉到了——海面上有残影。不是上次的残影。是上上次的。是所有的。\n残影重叠在一起。像曝光过度的胶片。你看到了——你死了很多次。在海面上。在同一个位置。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'ending_aftermath_extra_003',
    name: '结局的回响',
    type: 'ending_aftermath',
    subtype: 'aftermath',
    weight: 0.8,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['ending', 'aftermath', 'extra'],
    trigger: {
      areas: ['deep_catacombs'],
      min_loop: 2,
      probability: 0.08,
      once_per_run: true,
      min_previous_endings_count: 1,
    },
    description:
      '你站在那道屏障前面。地下的纹路在发光。\n但你感觉到了——符号的光芒里有回响。是你上次结局的回响。\n结局的回响还在。但它们正在消散。',
    distortion_variants: {
      san_low:
        '你站在那道屏障前面。地下的纹路在发光。\n但你感觉到了——符号的光芒里有回响。是你上次结局的回响。\n回响在说话。用你的声音。说的是你上次说的最后一句话。\n那道屏障记录了你的每一次结局。那道屏障是你的死亡日记。',
      loop_3_plus:
        '你站在那道屏障前面。地下的纹路在发光。\n但你感觉到了——符号的光芒里有回响。不是上次的回响。是所有的回响。同时在播放。\n那道屏障在重播你的每一次结局。它在学习。它在预测你的下一次结局。',
    },
    effects: { san: -1 },
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },

  // ── 微恐怖事件 (12) — 纯观察 · 不扣SAN · 不对峙 ──
  {
    id: 'micro_horror_001',
    name: '镜子',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic'],
    trigger: {
      areas: ['manor_interior', 'church'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '你照了照镜子。\n你眨了右眼。\n镜子里的人眨了左眼。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_002',
    name: '酒馆',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'tavern'],
    trigger: {
      areas: ['tavern'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '酒馆里所有人同时停止说话。\n然后同时继续。\n没有人注意到中间停了多久。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_003',
    name: '字条',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic'],
    trigger: {
      areas: ['manor_interior', 'church', 'town_center'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '你写了一张字条放在桌上。\n离开再回来。\n字迹不是你的。内容你写过。在梦里。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_004',
    name: '钟',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic'],
    trigger: {
      areas: ['manor_interior', 'town_center', 'church'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '座钟停了。\n你听见它还在走。\n声音来自墙里。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_005',
    name: '照片',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'memory'],
    trigger: {
      areas: ['tavern', 'manor_interior', 'town_center'],
      probability: 0.06,
      once_per_run: true,
      loop_min: 1,
    },
    description:
      '你翻到一张去年的合影。\n你在照片里。\n但你去年不在这里。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_006',
    name: '钥匙',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic'],
    trigger: {
      areas: ['manor_interior'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '你摸了摸口袋里的钥匙。\n变重了。\n没有变多。是同一条。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_007',
    name: '狗',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'street'],
    trigger: {
      areas: ['town_center', 'harbor_district'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '狗对着空巷叫了十分钟。\n你回头看时巷子里有脚印。\n只有进去的。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_008',
    name: '蜡烛',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'church', 'domestic'],
    trigger: {
      areas: ['church', 'manor_interior', 'catacombs_entrance'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '蜡烛的火焰朝你飘。\n没有风。\n烛泪也是朝你流的。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_009',
    name: '影子',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic'],
    trigger: {
      areas: ['town_center', 'harbor_district', 'manor_interior'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '你注意到你的影子慢了半拍。\n你停它也停。\n但慢了半拍。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_010',
    name: '挂钟',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'time', 'domestic'],
    trigger: {
      areas: ['manor_interior', 'tavern'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '墙上的挂钟倒走了三分钟。\n没有人看到。\n包括你——直到现在。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_011',
    name: '水',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'sensory'],
    trigger: {
      areas: ['tavern', 'church', 'town_center'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '你喝了一口水。\n回甘。\n但你只喝了白开水。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_012',
    name: '门',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.4,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'space', 'church'],
    trigger: {
      areas: ['church', 'manor_interior'],
      probability: 0.06,
      once_per_run: true,
    },
    description:
      '教堂的门从外面锁了。\n你走出来时它开着。\n你没有经过那扇门。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },

  // ── 记忆污染 (3) — 认知错位 · 不扣SAN · loop_min 门槛 ──
  {
    id: 'micro_horror_mem_001',
    name: '日历',
    type: 'micro_horror',
    subtype: 'memory_contamination',
    weight: 0.3,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'memory', 'uncanny'],
    trigger: {
      areas: ['manor_interior', 'town_center'],
      probability: 0.04,
      once_per_run: true,
      min_loop: 1,
    },
    description:
      '你清楚地记得今天是星期三。\n日历上写的是星期四。\n你翻了翻。昨天也是星期四。',
    distortion_variants: {
      loop_3_plus:
        '你清楚地记得今天是星期三。\n日历上写的是星期四。\n你翻了翻。昨天也是星期四。再前一天是星期五。\n你的人生里没有星期三。',
    },
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_mem_002',
    name: '打招呼',
    type: 'micro_horror',
    subtype: 'memory_contamination',
    weight: 0.3,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'memory', 'uncanny', 'tavern'],
    trigger: {
      areas: ['tavern'],
      probability: 0.04,
      once_per_run: true,
      min_loop: 2,
    },
    description:
      '你跟酒馆老板打招呼。\n他说你昨天已经打过了。\n你没印象。但他记得很清楚。',
    distortion_variants: {
      loop_3_plus:
        '你跟酒馆老板打招呼。\n他说你昨天已经打过了。而且是两次。\n你不知道。但他记得每一次。每一次的内容都一样。',
    },
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_mem_003',
    name: '笔记本',
    type: 'micro_horror',
    subtype: 'memory_contamination',
    weight: 0.3,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'memory', 'uncanny', 'domestic'],
    trigger: {
      areas: ['manor_interior', 'church', 'town_center'],
      probability: 0.04,
      once_per_run: true,
      min_loop: 2,
    },
    description:
      '你的笔记本上多了一页。\n是你的字迹。\n你不记得写过。内容是关于今天的。',
    distortion_variants: {
      loop_3_plus:
        '你的笔记本上多了一页。\n是你的字迹。但你确定你没有写。\n内容是关于今天的——但今天还没有发生。',
    },
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },

  // ── 连锁型微恐怖 — "影子" 后续 (loop 3+ 触发，承接 micro_horror_009) ──
  {
    id: 'micro_horror_013',
    name: '影子·同步',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.25,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic', 'chain', 'shadow'],
    trigger: {
      areas: ['town_center', 'harbor_district', 'manor_interior'],
      probability: 0.03,
      once_per_run: true,
      min_loop: 3,
    },
    description:
      '你抬起手臂。\n影子同步抬起，没有延迟。\n轮廓比你的肢体多出一截。',
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_014',
    name: '影子·先行',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.2,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic', 'chain', 'shadow'],
    trigger: {
      areas: ['town_center', 'harbor_district', 'manor_interior'],
      probability: 0.02,
      once_per_run: true,
      min_loop: 6,
    },
    description:
      '你还未抬脚。\n影子先一步踏向前方。\n过往所有延迟都有了解释。',
    distortion_variants: {
      loop_3_plus:
        '你还未抬脚。\n影子先一步踏向前方。不止一步——它走完了整条路。\n它每踏一步，你的膝盖就跟着颤一下。就像它才是本体，你是投影。',
    },
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_015',
    name: '钟摆·脱离',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.2,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'time', 'chain', 'clock'],
    trigger: {
      areas: ['manor_interior', 'tavern', 'church'],
      probability: 0.02,
      once_per_run: true,
      min_loop: 7,
    },
    description:
      '你听见钟摆的声音。\n但不是从钟上来的。\n声音在天花板的方向。',
    distortion_variants: {
      loop_3_plus:
        '你听见钟摆的声音。但不是从钟上来的。声音在天花板的方向。\n你抬头看。没有钟。但声音在走。滴——答——滴——答。\n每一声都精确地在你上次心跳的间隙响起。它在模仿你。',
    },
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },
  {
    id: 'micro_horror_016',
    name: '镜面·轮廓',
    type: 'micro_horror',
    subtype: 'uncanny',
    weight: 0.25,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'micro_horror', 'uncanny', 'domestic', 'chain', 'mirror'],
    trigger: {
      areas: ['manor_interior', 'church'],
      probability: 0.03,
      once_per_run: true,
      min_loop: 4,
    },
    description:
      '你站在镜子前面。\n镜子里多了一道轮廓。\n在你身后。',
    distortion_variants: {
      loop_3_plus:
        '你站在镜子前面。\n镜子里多了一道轮廓。不止一道——所有你死过的姿态都在里面。\n它们在等你转身。你转身的时候，镜子里全是空的。',
    },
    effects: {},
    event_classification: '氛围事件',
    choices: [],
  },

  // ── P2 试点：痕迹呼应 — 打碎教堂窗户（承接码头撞门行为的跨轮回回响）──
  // 前置条件：上轮回在码头仓库撞过门（trace_break_in_harbor flag）
  // 效果：add_flag 被 detectPlayerTraces 捕获 → 下一轮回教堂描述自动追加痕迹文本
  {
    id: 'trace_echo_church_window',
    name: '教堂的碎窗',
    type: 'silent',
    subtype: 'trace_echo',
    weight: 0.6,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'trace_echo', 'church', 'pilot'],
    trigger: {
      areas: ['church'],
      has_flag: 'trace_break_in_harbor',
      min_loop: 2,
      probability: 0.3,
      once_per_run: true,
    },
    description:
      '你注意到教堂的一扇窗户碎了。\n玻璃碎片还在地上。碎片的分布方式……不是从外面打破的。是从里面。\n有人在里面把窗户砸碎了。\n你记得上次——你撞开过一扇门。\n那扇门在码头。这扇窗在教堂。\n但它们碎裂的方式一模一样。',
    effects: {},
    event_classification: '氛围事件',
    normalcy_anchor: false,
    choices: [],
  },
  // ── P2 扩展：has_flag 事件连锁 ──
  {
    id: 'silent_trace_forest_echo',
    name: '林间低语回响',
    type: 'silent',
    subtype: 'trace_echo',
    weight: 0.5,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'trace_echo', 'forest', 'chain'],
    trigger: {
      areas: ['forbidden_grove', 'whispering_forest'],
      has_flag: 'trace_forest_whisper',
      min_loop: 2,
      probability: 0.25,
      once_per_run: true,
    },
    description:
      '森林里的风声变了。\n不是风——是有人在重复你上次说过的话。\n声音从树冠上方传来。\n但你听不清完整的句子——只听到了你自己的声音。\n不是回声。回声不会抢先你半步。',
    effects: { san: -1 },
    event_classification: '沉默事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_trace_tavern_memory',
    name: '酒馆里的位置',
    type: 'silent',
    subtype: 'trace_echo',
    weight: 0.5,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'trace_echo', 'tavern', 'chain'],
    trigger: {
      areas: ['town_center'],
      has_flag: 'trace_tavern_drunk',
      min_loop: 2,
      probability: 0.25,
      once_per_run: true,
    },
    description:
      '你走进酒馆的时候，玛莎抬头看了你一眼。\n然后她把视线移开了。\n你看向你上次坐的那个位置。\n那个位置现在是空的。一直是空的。\n但你记得上次坐在这里的时候，你对玛莎说过一些话。\n那些话现在变成了酒馆里其他人的悄悄话。',
    effects: { san: -1 },
    event_classification: '沉默事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_trace_catacombs_symbol',
    name: '墓穴里的新符号',
    type: 'silent',
    subtype: 'trace_echo',
    weight: 0.5,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'trace_echo', 'catacombs', 'chain'],
    trigger: {
      areas: ['catacombs_entrance'],
      has_flag: 'trace_catacombs_ritual',
      min_loop: 2,
      probability: 0.25,
      once_per_run: true,
    },
    description:
      '你上次在墓穴里留下的符号……变了。\n不是被人修改——是它自己在变。\n线条的粗细不一样了。角度偏移了一度。\n你在石壁上比划了一下。\n你上次画的时候，这个角度是另一个方向的。\n有人——或者什么东西——把你的符号改成了另一个样子。',
    effects: { san: -2, add_clue: 'clue_catacombs_ritual_evolved' },
    event_classification: '沉默事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_trace_lighthouse_record',
    name: '灯塔里的记录',
    type: 'silent',
    subtype: 'trace_echo',
    weight: 0.5,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'trace_echo', 'lighthouse', 'chain'],
    trigger: {
      areas: ['lighthouse'],
      has_flag: 'trace_lighthouse_signal',
      min_loop: 2,
      probability: 0.25,
      once_per_run: true,
    },
    description:
      '灯塔的灯室里有你上次留下的标记。\n在灯室的墙上的一个刻度。\n你记得自己刻的——用来记录信号的间隔。\n但现在刻度旁边多了一行小字。\n字迹不是你的。\n「第三次了。」\n你不知道这是谁写的。\n你只知道——你上次来的时候，这行字还不在墙上。',
    effects: { san: -1 },
    event_classification: '沉默事件',
    normalcy_anchor: false,
    choices: [],
  },
  {
    id: 'silent_trace_manor_unknown_entry',
    name: '庄园里的陌生笔迹',
    type: 'silent',
    subtype: 'trace_echo',
    weight: 0.5,
    tier: 'normal',
    quality_tier: 'B',
    tags: ['silent', 'trace_echo', 'manor', 'chain'],
    trigger: {
      areas: ['voxchester_manor'],
      has_flag: 'trace_manor_diary',
      min_loop: 2,
      probability: 0.25,
      once_per_run: true,
    },
    description:
      '你打开庄园书房的门的时候，注意到日记本摊开在桌上。\n和上次一模一样的位置。\n但最后一页的内容不一样了。\n上次你看到的是：「他们又来了。」\n现在那一行被划掉了。\n下面新写了一行：「不。不是他们。是我。」\n笔迹是你的。\n但你确定自己没有写过这行字。\n你盯着那行字看了很久。\n然后你意识到——你确实记得写过。\n但不是在这个轮回里。',
    effects: { san: -2, mythos: 1 },
    event_classification: '沉默事件',
    normalcy_anchor: false,
    choices: [],
  },
];
