#!/usr/bin/env python3
"""
scripts/add_variants.py — 批量事件变体注入工具
为高优先级单一版本事件添加 distortion_variants + unreliable_narration_level

用法:
  python scripts/add_variants.py P0          # 结局 + npc_cross_duo
  python scripts/add_variants.py P1          # mythos + loop + area
  python scripts/add_variants.py P2          # humanity
  python scripts/add_variants.py P3          # meta + resource
  python scripts/add_variants.py all         # 全部
  python scripts/add_variants.py P0 --dry-run  # 预览不写入
"""

import re
import sys
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data')

# ═══════════════════════════════════════════════════════════════
# 变体文本模板
# ═══════════════════════════════════════════════════════════════

VARIANTS = {
    # SAN 低值变体 — 通用
    'san_low': (
        "你的视线在模糊。那些征兆、符号、场景——在你眼前扭曲、重叠、分离。"
        "\\n你分不清这是真实发生的事还是你的大脑在自行填补空白。"
        "\\n你捏了一下手背。疼。至少这部分是真实的。"
    ),
    # SAN 中值变体 — 通用
    'san_mid': (
        "你注意到了一些以前没有注意到的细节。"
        "\\n空气中的气味变了。墙壁上的纹理似乎在缓慢脉动。"
        "\\n你觉得它们在有节奏地跳动——像某种巨大的器官。"
    ),
    # 腐化高变体 — 通用
    'corruption_high': (
        "空气中弥漫着一种陌生的气味。"
        "\\n墙壁的颜色似乎比记忆中更深了。角落里有东西在蠕动。"
        "\\n你翻了个身。床垫发出的声音不像弹簧——更像某种软体生物的呼吸。"
    ),
    # 循环 3+ 变体
    'loop_3_plus': (
        "这已经不是你第一次经历这个了。"
        "\\n你确定——你在之前的循环里见过这一幕。"
        "\\n但记忆的边缘在模糊。是第几次来着？你数不清了。"
        "\\n但你知道——它还会再来。"
    ),
    # 循环 8+ 变体
    'loop_8_plus': (
        "你太熟悉这一切了。每一个细节都像刻在骨头上的铭文。"
        "\\n你知道接下来会发生什么——但每次你都走同一条路。"
        "\\n不是因为没有选择。是因为你记住了所有的路，而它们最终都通向同一个地方。"
    ),
    # 虚假记忆
    'false_memory': (
        "你记得一个场景。但你知道这个记忆不属于现在的你——"
        "\\n它来自某个更早的循环。"
        "\\n记忆中的你已经站在这里了，做出了一些选择。"
        "\\n你试图回忆那些选择。但你只能看到一个剪影——"
        "\\n一个正在做出你不知道是什么选择的、你自己。"
    ),
    # 恐惧：海洋
    'fear_ocean': (
        "空气中有海水的味道。你看了看窗外——是内陆。但盐味还在。"
        "\\n你咽了一下。嘴里有铁锈的味道。嘴唇上有盐粒。它们没有消失。它们在增多。"
    ),
    # 恐惧：身体
    'fear_body': (
        "你注意到皮肤上有一个你从未见过的斑点。你揉了揉眼睛。它还在。"
        "\\n你摸了摸它——不疼，不痒。但触感不对。"
        "\\n你把它划破了。没有血。是淡蓝色的液体。像海水。"
    ),
    # 恐惧：深度
    'fear_depth': (
        "地面在你脚下变得不真实。你往下看了一眼——不是真的看，是'感觉'了一眼。"
        "\\n下面有东西。很深的东西。"
        "\\n你听到了一个声音——不是从耳朵进入的，是从骨头里传上来的。"
        "\\n低频的、持续的振动。像是什么巨大的东西在水底下呼吸。"
    ),
}

# 按类别定制变体（覆盖通用模板）
CATEGORY_VARIANTS = {
    # 结局预兆 — 封印主题
    'ending_omen': {
        'san_low': (
            "封印的符号在你眼中扭曲了。你分不清是符号在动还是你的视线在晃。"
            "\\n光从裂缝里渗出来，不是白色的——是暗红色的。"
            "\\n你用手去碰。皮肤感到一阵灼热。你收回了手。手指上没有伤口。"
        ),
        'san_mid': (
            "封印的符号还在那里。但你注意到——光在闪烁。"
            "\\n频率和你心跳不一样。你数了三下。第四下的节奏变了。"
            "\\n像是有什么东西在符号后面呼吸。"
        ),
    },
    # 结局预兆 — 灯塔主题
    'ending_omen_lighthouse': {
        'san_low': (
            "灯塔的灯光在旋转。但光不是白的——是暗紫色的。"
            "\\n你盯着看了太久。旋转的光在你视网膜上留下了残像。"
            "\\n你闭上眼睛。残像还在。你在黑暗中看到了光在转。"
            "\\n灯光的节奏和你心跳同步了。"
        ),
    },
    # 结局预兆 — 深渊主题
    'ending_omen_abyss': {
        'san_low': (
            "竖井的黑暗在呼吸。你确定——因为你跟着它的节奏屏住了呼吸。"
            "\\n下面有东西在看你。不是用眼睛。是用更古老的东西。"
            "\\n你扔下去的石头不是碰水面——是碰到了某种柔软的东西。下面不是水。"
        ),
    },
    # 结局余波
    'ending_aftermath': {
        'san_low': (
            "你走过的地方留下了痕迹。不是脚印——是记忆的裂痕。"
            "\\n你回头看的时候，发现刚才走过的路已经不一样了。"
            "\\n不是风景变了。是你对那段路的记忆被替换了。"
            "\\n你记得你走的路，但你知道那不是你走的路。"
        ),
        'false_memory': (
            "你记得一个场景。但你知道这个记忆不属于你。"
            "\\n它来自某个做出了不同选择的、另一个你。"
            "\\n你站在一个十字路口。左边的路通向光明但虚假的终点。"
            "\\n右边的路通向黑暗但真实的深渊。你选择了哪条？"
            "\\n不——你不记得了。"
        ),
    },
    # 结局交织
    'ending_cross': {
        'san_low': (
            "所有的结局在你脑中重叠。你同时经历了每一个结局——"
            "\\n超越者的冷光、深渊的黑暗、逃离的曙光。"
            "\\n它们在你意识里交错，像是所有可能的你同时在呼吸。"
            "\\n你感到无数个自己在不同的时间线上死去和重生。"
        ),
    },
    # NPC 双人对话
    'npc_cross_duo': {
        'san_low': (
            "他们的对话听起来很远。你努力集中注意力才能跟上。"
            "\\n声音像是隔着一层水。你看到他们的嘴在动，但声音到达时已经扭曲了。"
            "\\n你点了点头。你其实没听清他们在说什么。"
        ),
        'san_mid': (
            "对话进行的时候，你注意到了一些奇怪的事情。"
            "\\n他们说话的方式——像在传递某种暗号。"
            "\\n每一个停顿、每一个眼神交换都不是偶然的。"
            "\\n你觉得他们知道一些你不知道的事情。"
        ),
    },
    # 神话回声
    'mythos_echo': {
        'san_low': (
            "你盯着那个符号看了太久。它开始在你的视野边缘扩散。"
            "\\n不是因为它变大了——是因为你的眼睛在重新排列它。"
            "\\n你看到符号的每一个笔画都在动，像是有生命一样蠕动。"
            "\\n你闭上了眼睛。但符号在你的眼睑后面跳动。"
        ),
    },
    # 神话反噬
    'mythos_backlash': {
        'san_low': (
            "知识在回流。不是从外部进入——是从你的内部涌出。"
            "\\n你学到的那些名字、那些符号——它们在反噬你。"
            "\\n你的大脑在把它们推出去，但它们在你的颅骨内回荡。"
            "\\n你咬了一下舌头。疼。这是你唯一确定的东西。"
        ),
    },
    # 神话禁忌
    'mythos_forbidden': {
        'san_low': (
            "那些文字在移动。不是字在纸上移动——是纸上的空白在扩大。"
            "\\n文字在向边缘退去，像是什么东西从纸的背面把它们推开了。"
            "\\n你凑得更近。纸的背面什么都没有。但你能感觉到——"
            "\\n有什么东西正从纸的背面看着你。"
        ),
    },
    # 神话深层
    'mythos_deep': {
        'san_low': (
            "深度不是距离。是重量。"
            "\\n你感到一种下坠感——但不是身体在往下掉。"
            "\\n是你的意识在往下沉。穿过海面、穿过黑暗、穿过某种屏障。"
            "\\n你在很深的地方看到了光。不是温暖的光——是饥饿的光。"
        ),
    },
    # 循环低语 — NPC 类（认出来但不说破的层次）
    'loop_whisper_npc': {
        'loop_3_plus': (
            "目光在你脸上多停了一秒。不是久到可疑——是刚好让你注意到。\\n"
            "那句熟悉的话没有说出口。取而代之的是一个更安全的问题。\\n"
            "但你看到了——那半秒的停顿里，他们在重新评估你。\\n"
            "不是用眼睛看，是用记忆核对。"
        ),
        'loop_8_plus': (
            "他已经不问了。\\n"
            "只是递东西的时候，手停在了半空中——\\n"
            "不是犹豫，是在确认。确认你是你，不是另一个长得像你的人。\\n"
            "确认后他什么也没说。但你知道——\\n"
            "那种停顿本身比任何追问都沉重。"
        ),
        'san_low': (
            "他们的表情在变化。不是恐惧——是另一种更复杂的东西。\\n"
            "像是看着一个从很久以前就认识的人，\\n"
            "但又不确定这个人是不是从那个时代来的。\\n"
            "他们的视线在你身上停留。然后移开。\\n"
            "移开的时候轻轻叹了一口气。\\n"
            "那口气里有一半是如释重负——另一半是悲伤。"
        ),
        'false_memory': (
            "你觉得他们好像要对你说什么——\\n"
            "一个关于上一次循环的名字、一个约定、一个没有兑现的承诺。\\n"
            "但他们停住了。\\n"
            "不是忘记了。是选择了不说。\\n"
            "也许有些东西说出来会让现在的你承担不属于你的重量。\\n"
            "所以他们只是沉默地看着你。\\n"
            "那种沉默里有你想不起来的故事。"
        ),
    },
    # 循环低语 — 物体/场景类（环境在重复中渗出异样）
    'loop_whisper_object': {
        'loop_3_plus': (
            "你太熟悉这一幕了。不是记忆——是肌肉记忆。\\n"
            "你的身体先于你的意识做出了反应。\\n"
            "你知道接下来会发生什么。你知道声音从哪个方向来。\\n"
            "你知道墙上的字写的是什么。你知道地图上的标记指向哪里。\\n"
            "你甚至知道——这次你会不会选择走同一条路。"
        ),
        'loop_8_plus': (
            "你在这个循环里太久了。\\n"
            "每一个细微的细节都刻在了你的意识里。\\n"
            "你能预判每一个声音、每一个阴影、每一个不该存在的东西。\\n"
            "世界在重复。但你不再是被动地重复——\\n"
            "你开始注意到那些'幕后'的东西。那些推动循环的力量。\\n"
            "它们也在注意你。"
        ),
        'san_low': (
            "现实的边缘在溶解。\\n"
            "你看到的东西、听到的声音——它们开始重叠。\\n"
            "现在的你和上一轮的你同时存在于同一个场景里。\\n"
            "你分不清哪个是真实的。\\n"
            "也许都不真实。也许都真实。\\n"
            "你捏了一下手背。疼。但你知道——\\n"
            "这个疼可能也是循环的一部分。"
        ),
        'false_memory': (
            "你记得一个场景。\\n"
            "但你知道这个记忆不属于现在的循环。\\n"
            "它来自更早的某个循环——在那个循环里，\\n"
            "你在这里做出了一个不同的选择。\\n"
            "你试图回忆那个选择。\\n"
            "但你看到的只是一个剪影：\\n"
            "一个正在做出你不知道是什么选择的、你自己。"
        ),
    },
    # 循环墙
    'loop_wall': {
        'san_low': (
            "墙壁在变化。不是砖块在移动——是墙壁后面的东西在变。"
            "\\n你把手放在墙上。你能感觉到后面有东西。"
            "\\n它在呼吸。和你呼吸的节奏不一样——慢了整整一拍。"
            "\\n你收回了手。掌心里留下了一个湿的印子。不是汗。"
        ),
    },
    # 循环记忆
    'loop_memory': {
        'loop_3_plus': (
            "记忆像潮水一样涌来——但不是你的记忆。"
            "\\n是另一个你的记忆。在另一个时间线里。"
            "\\n你看到一个场景：同一个地方，同一个人，但做出了不同的选择。"
            "\\n那个你看到了你。你们对视了一秒。然后他转过了头。"
        ),
    },
    # 循环修正
    'loop_correction': {
        'loop_3_plus': (
            "世界在'修正'自己。"
            "\\n你看到了不协调的地方——上一轮里发生过的事，现在痕迹消失了。"
            "\\n墙壁上的字被抹掉了。地上的脚印被填平了。"
            "\\n有人在清理你的痕迹。但清理得不够仔细。"
            "\\n还有一些残留——那些清理者来不及清除的东西。"
        ),
    },
    # 循环终点
    'loop_endpoint': {
        'san_mid': (
            "你走到了一个你以前从未到过的地方。"
            "\\n或者说——你以前到过，但每次都走开了。"
            "\\n这一次你没有。你站在这里。面前是一扇门。"
            "\\n门上写着你的名字。但不是用墨水写的——"
            "\\n是用某种更持久的东西刻上去的。"
        ),
    },
    # 循环深处
    'loop_deep': {
        'san_low': (
            "时间的层次在你面前展开了。"
            "\\n你能看到过去、现在、未来——不是线性的，是交织在一起的。"
            "\\n你看到了无数个自己。每一个都在做出不同的选择。"
            "\\n每一个都在走向不同的结局。但每一个都在经历同样的痛苦。"
        ),
    },
    # 区域森林
    'area_forest': {
        'san_low': (
            "森林在观察你。不是比喻——你能感觉到目光。"
            "\\n来自树后面、灌木丛里、你头顶的枝叶间。"
            "\\n树在移动。很慢，慢到你几乎察觉不到。"
            "\\n但它们确实在移动。围拢来。你在缩小包围圈的中心。"
        ),
    },
    # 区域禁忌林
    'area_grove': {
        'san_low': (
            "这里的树长得不一样。不是形态不一样——是本质不一样。"
            "\\n它们的树干上有和你类似的纹路。像皮肤。像血管。"
            "\\n你把手贴在一棵树上。树干是温热的。它在脉搏。"
            "\\n你缩回了手。树的脉搏没有停止。它还在跳。"
        ),
    },
    # 区域深渊
    'area_deep': {
        'san_low': (
            "深度不是距离。是重量。"
            "\\n你感到一种下坠感——但不是身体在往下掉。"
            "\\n是你的意识在往下沉。穿过岩层、穿过黑暗、穿过某种屏障。"
            "\\n你在很深的地方看到了光。不是温暖的光——是饥饿的光。"
        ),
    },
    # 善行回报
    'humanity_good': {
        'san_low': (
            "善意在扭曲。\\n"
            "你分不清这份善意是来自他人的真心，还是来自你SAN降低后的臆想。\\n"
            "也许他们从来没有对你微笑。也许那只是你疲惫的大脑制造的幻觉。\\n"
            "但你感受到了温暖。这就够了。或者……这本身就是问题所在。"
        ),
        'loop_3_plus': (
            "你记得上一次也是类似的情景。\\n"
            "同一个NPC、同一份善意、同一句温暖的话。\\n"
            "但结局不一样。上次你选择了另一条路。\\n"
            "现在你又站在了同一个路口。\\n"
            "善意是循环里为数不多的锚点——但锚点也会移位。"
        ),
        'false_memory': (
            "你记得收到过这份善意——但也许是在另一个循环里。\\n"
            "这个NPC在另一个时间线里对你说过同样的话。\\n"
            "你分不清这份善意属于当前的时间线，还是属于某个你已遗忘的过去。\\n"
            "但无论如何，你选择相信它。"
        ),
    },
    # 恶行反噬
    'humanity_bad': {
        'san_low': (
            "后果在膨胀。\\n"
            "你过去的恶行像回旋镖一样回来了。\\n"
            "每一个被你伤害过的人都变成了阴影中的眼睛。\\n"
            "他们在看着你。不是仇恨——是失望。\\n"
            "那种失望比仇恨更让你不安。"
        ),
        'corruption_high': (
            "环境在呼应你的恶。\\n"
            "墙壁上的污渍更深了。空气中有一种铁锈和灰烬的味道。\\n"
            "你经过的地方，阴影似乎变得更浓。\\n"
            "不是光线变暗了——是你在把光带走。\\n"
            "你留下的只有暗色的痕迹。"
        ),
        'loop_3_plus': (
            "你又回到了同一个场景。\\n"
            "上次你选择了恶。这次呢？\\n"
            "循环在测试你——不是测试你是否记得，\\n"
            "而是测试你是否愿意改变。\\n"
            "但改变需要先承认错误。而承认错误比走同一条路更难。"
        ),
    },
    # 人性交易
    'humanity_trade': {
        'san_low': (
            "交易正在进行。但你不知道交易的双方是谁。"
            "\\n你觉得自己是买家，也觉得自己是商品。"
            "\\n签契约的手在发抖——你不知道那是对方的手还是你的手。"
            "\\n墨迹还没干。但你已经签了。"
        ),
    },
    # Meta 事件
    'meta': {
        'san_low': (
            "你的意识在碎裂。每一个认知的碎片都在反射不同的现实。"
            "\\n你同时存在于多个地方——屏幕前、沃切斯特的街头、一个你从未去过的地方。"
            "\\n你在哪里？你还在看吗？你还在吗？"
        ),
        'loop_3_plus': (
            "这已经不是你第一次看到这个了。"
            "\\n上一次是什么时候？上上次呢？"
            "\\n记忆的层次叠在一起，像旧照片上的重影。"
            "\\n你能感觉到——这行字在你之前的某个循环里也出现过。一模一样。"
        ),
    },
    # NPC 三角关系
    'npc_cross_triangle': {
        'san_low': (
            "三角关系在恶化。每一个眼神、每一次停顿都充满了未说出口的东西。"
            "\\n你觉得自己在三个人的目光之间被撕裂。"
            "\\n每个人的表情你都读不懂——不是因为他们掩饰得好，而是因为你的大脑无法处理这么多的信号。"
        ),
        'corruption_high': (
            "空气中有一种紧张感——像是暴风雨前的最后一刻。"
            "\\n三方的利益在碰撞。你知道任何一方获胜都不一定是好事。"
            "\\n你感到自己站在了一个引爆点的边缘。"
        ),
    },
    # NPC 秘密
    'npc_cross_secret': {
        'san_low': (
            "秘密的重量压在了对话上。每一句话都有两层含义。"
            "\\n你注意到有人在观察——不是观察对话内容，而是观察说话的人的表情。"
            "\\n秘密不只是藏在话语里。它藏在停顿里、在 Blick 里、在话语说出口之前的那一秒里。"
        ),
    },
    # NPC 死亡相关
    'npc_cross_death': {
        'san_low': (
            "某个人的缺席像一块空洞。在画面里你能看到那个位置——"
            "\\n但那里什么都没有。不是空的——是被抹除的。"
            "\\n其他人在谈论那个人，但他们的表情像是在谈论一个不存在的人。"
            "\\n你不知道他们是不是忘记了——还是故意不提。"
        ),
    },
    # NPC 团队
    'npc_cross_team': {
        'san_low': (
            "团队的行动在展开。但协调出现了裂痕。"
            "\\n每个人的步调不一致。有人快了。有人慢了。"
            "\\n你注意到一个细节——有人在看手表。不是一次。是三次。"
            "\\n他们的时间表和你看到的不一样。"
        ),
    },
    # NPC 传承
    'npc_legacy': {
        'san_low': (
            "遗产的重量压了下来。不是物质的——是记忆的。"
            "\\n你继承了某个人的知识、某个人的诅咒、某个人的未完之事。"
            "\\n它们在你身上发酵。你不知道自己能承受多少。"
        ),
        'false_memory': (
            "你记起了一个不属于你的故事。"
            "\\n一个来自前一个循环的某人的记忆——"
            "\\n那个人把这些托付给了你。但你不知道那个人是谁。"
            "\\n你只知道你需要完成一些你不知道是什么的事。"
        ),
    },
    # NPC 网络
    'npc_web': {
        'san_low': (
            "网络在收紧。每一条线都连到了不同的节点。"
            "\\n你突然看到了全局——不是从正面，而是从背面。"
            "\\n所有的关系、交易、背叛——它们连成了一个图案。"
            "\\n你站在图案的中心。你也是其中的一条线。"
        ),
    },
    # NPC 小队
    'npc_team': {
        'san_low': (
            "小队的氛围变了。不是外部的威胁——是内部的。"
            "\\n信任在裂开。你能看到那些裂缝——细微的、几乎不可见的。"
            "\\n但你知道裂缝会扩大。你知道它们最终会断开什么。"
        ),
    },
    # 资源压力
    'resource': {
        'san_low': (
            "匮乏感在啃噬你。不只是食物或光——"
            "\\n是某种更本质的东西在被消耗。"
            "\\n你感到自己正在被某个看不见的东西一点点抽空。"
            "\\n每做出一个选择都更困难。因为选择需要力气。而你的力气在流失。"
        ),
    },
}

# unreliable_narration_level 设置
UNRELIABLE_LEVEL = {
    'ending_omen': 2,
    'ending_aftermath': 1,
    'ending_cross': 3,
    'npc_cross_duo': 1,
    'mythos_perception': 1,
    'mythos_forbidden': 2,
    'mythos_backlash': 2,
    'mythos_echo': 2,
    'mythos_transcend': 3,
    'mythos_deep': 3,
    'loop_memory': 2,
    'loop_contradiction': 2,
    'loop_wall': 2,
    'loop_correction': 1,
    'loop_deep': 3,
    'loop_endpoint': 3,
    'area_deep': 1,
    'humanity_trial': 1,
    'humanity_collective': 1,
    'humanity_trade': 1,
    'resource_safehouse': 2,
    'resource_extreme': 2,
    'meta': 3,
}

# ═══════════════════════════════════════════════════════════════
# 类别配置
# ═══════════════════════════════════════════════════════════════

CATEGORY_RULES = {
    # P0
    'ending_omen': {
        'file': 'events_ending.js', 'prefix': 'ending_omen_',
        'variants': ['san_low', 'san_mid', 'loop_3_plus', 'corruption_high'],
        'unreliable': 2,
    },
    'ending_aftermath': {
        'file': 'events_ending.js', 'prefix': 'ending_aftermath_',
        'variants': ['san_low', 'loop_3_plus', 'false_memory'],
        'unreliable': 1,
    },
    'ending_cross': {
        'file': 'events_ending.js', 'prefix': 'ending_cross_',
        'variants': ['san_low', 'san_mid', 'loop_8_plus', 'fear_ocean', 'fear_body'],
        'unreliable': 3,
    },
    'npc_cross_duo': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_cross_duo_',
        'variants': ['san_low', 'san_mid', 'corruption_high'],
        'unreliable': 1,
    },
    'npc_cross_triangle': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_cross_triangle_',
        'variants': ['san_low', 'loop_3_plus', 'corruption_high'],
        'unreliable': 1,
    },
    'npc_cross_secret': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_cross_secret_',
        'variants': ['san_low', 'corruption_high'],
        'unreliable': 1,
    },
    'npc_cross_death': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_cross_death_',
        'variants': ['san_low', 'loop_3_plus', 'false_memory'],
        'unreliable': 2,
    },
    'npc_cross_team': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_cross_team_',
        'variants': ['san_low', 'corruption_high'],
        'unreliable': 1,
    },
    'npc_legacy': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_legacy_',
        'variants': ['san_low', 'loop_3_plus', 'false_memory'],
        'unreliable': 2,
    },
    'npc_web': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_web_',
        'variants': ['san_low', 'san_mid'],
        'unreliable': 1,
    },
    'npc_team': {
        'file': 'events_npc_cross.js', 'prefix': 'npc_team_',
        'variants': ['san_low', 'corruption_high'],
        'unreliable': 1,
    },
    # P1 — mythos
    'mythos_perception': {
        'file': 'events_mythos.js', 'prefix': 'mythos_perception_',
        'variants': ['san_low', 'san_mid'],
        'unreliable': 1,
    },
    'mythos_forbidden': {
        'file': 'events_mythos.js', 'prefix': 'mythos_forbidden_',
        'variants': ['san_low', 'loop_3_plus', 'fear_body', 'fear_depth'],
        'unreliable': 2,
    },
    'mythos_backlash': {
        'file': 'events_mythos.js', 'prefix': 'mythos_backlash_',
        'variants': ['san_low', 'san_mid', 'corruption_high', 'fear_body'],
        'unreliable': 2,
    },
    'mythos_echo': {
        'file': 'events_mythos.js', 'prefix': 'mythos_echo_',
        'variants': ['san_low', 'corruption_high', 'fear_ocean', 'fear_depth'],
        'unreliable': 2,
    },
    'mythos_transcend': {
        'file': 'events_mythos.js', 'prefix': 'mythos_transcend_',
        'variants': ['san_low', 'loop_3_plus', 'fear_depth'],
        'unreliable': 3,
    },
    'mythos_deep': {
        'file': 'events_mythos.js', 'prefix': 'mythos_deep_',
        'variants': ['san_low', 'san_mid', 'fear_ocean', 'fear_depth'],
        'unreliable': 3,
    },
    # P1 — loop
    'loop_whisper': {
        'file': 'events_loop.js', 'prefix': 'loop_whisper_',
        'variants': ['loop_3_plus', 'loop_8_plus', 'san_low', 'false_memory'],
        'unreliable': 1,
    },
    'loop_wall': {
        'file': 'events_loop.js', 'prefix': 'loop_wall_',
        'variants': ['loop_3_plus', 'loop_8_plus', 'san_low'],
        'unreliable': 2,
    },
    'loop_memory': {
        'file': 'events_loop.js', 'prefix': 'loop_memory_',
        'variants': ['loop_3_plus', 'loop_8_plus', 'false_memory'],
        'unreliable': 2,
    },
    'loop_correction': {
        'file': 'events_loop.js', 'prefix': 'loop_correction_',
        'variants': ['loop_3_plus', 'loop_8_plus'],
        'unreliable': 1,
    },
    'loop_deep': {
        'file': 'events_loop.js', 'prefix': 'loop_deep_',
        'variants': ['loop_8_plus', 'san_low', 'false_memory'],
        'unreliable': 3,
    },
    'loop_contradiction': {
        'file': 'events_loop.js', 'prefix': 'loop_contradiction_',
        'variants': ['loop_8_plus', 'san_low'],
        'unreliable': 2,
    },
    'loop_endpoint': {
        'file': 'events_loop.js', 'prefix': 'loop_endpoint_',
        'variants': ['loop_8_plus', 'san_mid', 'corruption_high'],
        'unreliable': 3,
    },
    # P1 — area
    'area_forest': {
        'file': 'events_area_deep.js', 'prefix': 'area_forest_',
        'variants': ['san_mid', 'loop_3_plus', 'fear_depth'],
        'unreliable': 1,
    },
    'area_grove': {
        'file': 'events_area_deep.js', 'prefix': 'area_grove_',
        'variants': ['san_low', 'corruption_high', 'fear_depth'],
        'unreliable': 2,
    },
    'area_deep': {
        'file': 'events_area_deep.js', 'prefix': 'area_deep_',
        'variants': ['san_low', 'corruption_high', 'fear_ocean'],
        'unreliable': 2,
    },
    'area_harbor': {
        'file': 'events_area_deep.js', 'prefix': 'area_harbor_',
        'variants': ['san_mid', 'fear_ocean'],
        'unreliable': 1,
    },
    'area_lighthouse': {
        'file': 'events_area_deep.js', 'prefix': 'area_lighthouse_',
        'variants': ['san_low', 'loop_3_plus'],
        'unreliable': 1,
    },
    'area_manor': {
        'file': 'events_area_deep.js', 'prefix': 'area_manor_',
        'variants': ['san_mid', 'loop_3_plus'],
        'unreliable': 1,
    },
    'area_ruins': {
        'file': 'events_area_deep.js', 'prefix': 'area_ruins_',
        'variants': ['san_low', 'corruption_high'],
        'unreliable': 2,
    },
    'area_town_center': {
        'file': 'events_area_deep.js', 'prefix': 'area_town_center_',
        'variants': ['san_mid', 'loop_3_plus'],
        'unreliable': 1,
    },
    'area_catacombs': {
        'file': 'events_area_deep.js', 'prefix': 'area_catacombs_',
        'variants': ['san_low', 'corruption_high', 'fear_depth'],
        'unreliable': 2,
    },
    # P2 — humanity
    'humanity_good': {
        'file': 'events_humanity.js', 'prefix': 'humanity_good_',
        'variants': ['san_low', 'loop_3_plus', 'false_memory'],
        'unreliable': 1,
    },
    'humanity_bad': {
        'file': 'events_humanity.js', 'prefix': 'humanity_bad_',
        'variants': ['san_low', 'corruption_high', 'loop_3_plus'],
        'unreliable': 1,
    },
    'humanity_trade': {
        'file': 'events_humanity.js', 'prefix': 'humanity_trade_',
        'variants': ['san_low', 'corruption_high'],
        'unreliable': 1,
    },
    'humanity_collective': {
        'file': 'events_humanity.js', 'prefix': 'humanity_collective_',
        'variants': ['san_low', 'loop_3_plus'],
        'unreliable': 1,
    },
    'humanity_trial': {
        'file': 'events_humanity.js', 'prefix': 'humanity_trial_',
        'variants': ['san_low', 'san_mid'],
        'unreliable': 1,
    },
    # P3 — meta
    'meta_identity': {
        'file': 'events_meta.js', 'prefix': 'meta_identity_',
        'variants': ['san_low', 'loop_3_plus'],
        'unreliable': 3,
    },
    'meta_save': {
        'file': 'events_meta.js', 'prefix': 'meta_save_',
        'variants': ['san_low'],
        'unreliable': 2,
    },
    'meta_author': {
        'file': 'events_meta.js', 'prefix': 'meta_author_',
        'variants': ['san_low', 'loop_3_plus'],
        'unreliable': 3,
    },
    # P3 — resource
    'resource_light': {
        'file': 'events_resource.js', 'prefix': 'resource_light_',
        'variants': ['san_mid', 'corruption_high'],
        'unreliable': 1,
    },
    'resource_safehouse': {
        'file': 'events_resource.js', 'prefix': 'resource_safehouse_',
        'variants': ['corruption_high', 'loop_3_plus'],
        'unreliable': 2,
    },
    'resource_extreme': {
        'file': 'events_resource.js', 'prefix': 'resource_extreme_',
        'variants': ['san_low', 'loop_8_plus'],
        'unreliable': 2,
    },
    'resource_food': {
        'file': 'events_resource.js', 'prefix': 'resource_food_',
        'variants': ['corruption_high', 'san_low'],
        'unreliable': 1,
    },
    'resource_consequence': {
        'file': 'events_resource.js', 'prefix': 'resource_consequence_',
        'variants': ['san_low', 'loop_3_plus'],
        'unreliable': 1,
    },
    'resource_chain': {
        'file': 'events_resource.js', 'prefix': 'resource_chain_',
        'variants': ['san_low', 'loop_3_plus'],
        'unreliable': 1,
    },
}

PRIORITY_MAP = {
    'P0': [
        'ending_omen', 'ending_aftermath', 'ending_cross',
        'npc_cross_duo', 'npc_cross_triangle', 'npc_cross_secret',
        'npc_cross_death', 'npc_cross_team', 'npc_legacy', 'npc_web', 'npc_team',
    ],
    'P1': [
        'loop_whisper',
        'mythos_perception', 'mythos_forbidden', 'mythos_backlash',
        'mythos_echo', 'mythos_transcend', 'mythos_deep',
        'loop_wall', 'loop_memory', 'loop_correction',
        'loop_deep', 'loop_contradiction', 'loop_endpoint',
        'area_forest', 'area_grove', 'area_deep',
        'area_harbor', 'area_lighthouse', 'area_manor',
        'area_ruins', 'area_town_center', 'area_catacombs',
    ],
    'P2': [
        'humanity_good', 'humanity_bad', 'humanity_trade', 'humanity_collective', 'humanity_trial',
    ],
    'P3': [
        'meta_identity', 'meta_save', 'meta_author',
        'resource_light', 'resource_safehouse', 'resource_extreme',
        'resource_food', 'resource_consequence', 'resource_chain',
    ],
}

# ═══════════════════════════════════════════════════════════════
# 核心逻辑：brace counting 提取事件对象
# ═══════════════════════════════════════════════════════════════

def extract_event(content, event_id, search_start=0):
    """用 brace counting 提取完整的事件对象"""
    id_pat = re.compile(r"id:\s*'" + re.escape(event_id) + "'")
    m = id_pat.search(content, search_start)
    if not m:
        return None, -1, -1

    # 从 event_id 往前找最近的 {
    brace_start = content.rfind('{', 0, m.start())
    if brace_start == -1:
        return None, -1, -1

    depth = 0
    i = brace_start
    while i < len(content):
        c = content[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return content[brace_start:i + 1], brace_start, i + 1
        elif c == "'" or c == '"':
            # 跳过字符串内容
            quote = c
            i += 1
            while i < len(content):
                if content[i] == '\\':
                    i += 2
                    continue
                if content[i] == quote:
                    break
                i += 1
        i += 1
    return None, -1, -1

def has_field(event_text, field_name):
    """检查事件对象是否已有某字段"""
    return bool(re.search(r'\b' + re.escape(field_name) + r'\s*:', event_text))

def get_variant_text(key, event_id, category_key, event_text=''):
    """获取变体文本，优先用类别定制模板，回退到通用模板"""

    # loop_whisper 特殊路由：NPC 类 vs 物体/场景类
    if category_key == 'loop_whisper':
        is_npc = bool(re.search(r"npc_alive:", event_text))
        sub_key = 'loop_whisper_npc' if is_npc else 'loop_whisper_object'
        cat_var = CATEGORY_VARIANTS.get(sub_key, {})
        return cat_var.get(key, VARIANTS.get(key, '[变体文本待补]'))

    # 先找类别定制模板
    cat_var = CATEGORY_VARIANTS.get(category_key, {})

    # 对于 ending_omen，根据 subtype/tag 选择不同模板
    if category_key == 'ending_omen':
        if 'lighthouse' in event_id:
            return CATEGORY_VARIANTS['ending_omen_lighthouse'].get(key, cat_var.get(key, VARIANTS.get(key, '')))
        elif 'abyss' in event_id:
            return CATEGORY_VARIANTS['ending_omen_abyss'].get(key, cat_var.get(key, VARIANTS.get(key, '')))
        else:
            return cat_var.get(key, VARIANTS.get(key, ''))

    return cat_var.get(key, VARIANTS.get(key, '[变体文本待补]'))

def build_variants_block(variant_keys, event_id, category_key, event_text=''):
    """生成 distortion_variants JS 块"""
    indent = '    '
    lines = ['', indent + 'distortion_variants: {']
    for k in variant_keys:
        text = get_variant_text(k, event_id, category_key, event_text)
        # 转义单引号
        safe = text.replace("'", "\\'")
        lines.append(f"{indent}  {k}: '{safe}',")
    lines.append(indent + '},')  # <-- comma after closing brace
    return '\n'.join(lines)

# ═══════════════════════════════════════════════════════════════
# 文件处理
# ═══════════════════════════════════════════════════════════════

def process_category(category_key, dry_run=False):
    """处理单个类别"""
    rule = CATEGORY_RULES[category_key]
    filepath = os.path.join(SRC, rule['file'])
    prefix = rule['prefix']
    variant_keys = rule['variants']
    unrel_level = rule['unreliable']

    content = open(filepath, 'r', encoding='utf-8').read()
    original = content

    # 找到所有匹配的事件
    events_found = []
    search_pos = 0
    while True:
        # 用正则快速定位 id 行
        id_pat = re.compile(r"id:\s*'" + re.escape(prefix) + r"([^']+)'")
        m = id_pat.search(content, search_pos)
        if not m:
            break
        event_id = m.group(0).split("'")[1]
        event_text, start, end = extract_event(content, event_id, search_pos)
        if event_text:
            events_found.append((event_id, event_text, start, end))
            search_pos = end
        else:
            search_pos = m.end()

    if not events_found:
        return 0

    modified = 0
    skipped = 0

    # 从后往前处理（避免位置偏移）
    for event_id, event_text, start, end in reversed(events_found):
        # 跳过已有变体的事件
        if has_field(event_text, 'distortion_variants'):
            skipped += 1
            continue

        # 生成变体块（传入 event_text 用于 loop_whisper 路由）
        variants_block = build_variants_block(variant_keys, event_id, category_key, event_text)

        # 找插入位置：choices 之前
        choices_pos = event_text.find('\n    choices:')
        if choices_pos == -1:
            # fallback: normalcy_anchor 之后
            anchor_pos = event_text.rfind('\n    normalcy_anchor:')
            if anchor_pos != -1:
                insert_pos = anchor_pos + 1
            else:
                insert_pos = len(event_text) - 1
        else:
            insert_pos = choices_pos

        new_event = event_text[:insert_pos] + variants_block + event_text[insert_pos:]

        # 添加 unreliable_narration_level（如果没有）
        if not has_field(new_event, 'unreliable_narration_level'):
            anchor_pos = new_event.find('\n    normalcy_anchor:')
            if anchor_pos != -1:
                line_end = new_event.find('\n', anchor_pos + 1)
                if line_end == -1:
                    line_end = len(new_event) - 1
                new_event = (
                    new_event[:line_end]
                    + f"\n    unreliable_narration_level: {unrel_level},"
                    + new_event[line_end:]
                )

        content = content[:start] + new_event + content[end:]
        modified += 1

    if not dry_run and modified > 0:
        open(filepath, 'w', encoding='utf-8', newline='\n').write(content)
        print(f"  [{category_key}] {os.path.basename(filepath)}: +{modified} events (+{skipped} skipped)")
    elif modified == 0 and skipped > 0:
        print(f"  [{category_key}] {os.path.basename(filepath)}: all {skipped} events already have variants")
    elif modified == 0:
        print(f"  [{category_key}] {os.path.basename(filepath)}: no events found")
    else:
        print(f"  [{category_key}] {os.path.basename(filepath)}: would add {modified} variants (dry-run)")

    return modified


def process_priority(priority, dry_run=False):
    cats = PRIORITY_MAP.get(priority, [])
    total = 0
    for cat in cats:
        total += process_category(cat, dry_run)
    return total


def main():
    args = sys.argv[1:]
    dry_run = '--dry-run' in args or '-n' in args
    args = [a for a in args if a not in ('--dry-run', '-n')]

    if not args or args[0] == 'all':
        priorities = ['P0', 'P1', 'P2', 'P3']
    else:
        priorities = [a.upper() for a in args if a.upper() in PRIORITY_MAP]

    if not priorities:
        print("Usage: python scripts/add_variants.py [P0|P1|P2|P3|all] [--dry-run]")
        return

    total = 0
    for p in priorities:
        print(f"\n{'='*60}")
        print(f"  {p}: {len(PRIORITY_MAP[p])} categories")
        print(f"{'='*60}")
        total += process_priority(p, dry_run)

    print(f"\n{'='*60}")
    if dry_run:
        print(f"  DRY RUN: would modify {total} events")
    else:
        print(f"  DONE: modified {total} events")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
