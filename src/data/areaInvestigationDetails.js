/**
 * 可调查细节 — 每个区域 5-8 条，随 loop / SAN / 死亡记录变化
 * 格式：每条 detail 有 conditions（loop_min / san_below / death_in_area）+ text
 * getInvestigationDetail() 返回符合条件的随机一条
 */

var AREA_INVESTIGATION_DETAILS = {
  // ── 墓穴入口 ──────────────────────────────────────────
  'catacombs_entrance': [
    {
      conditions: { loop_min: 1 },
      text: '石壁上的划痕是新的。不像是石头自己裂的。像是有什么东西想从里面出去。',
    },
    {
      conditions: { loop_min: 2 },
      text: '你蹲下来看一道划痕。形状……像是指甲。五道一组。方向朝外。',
    },
    {
      conditions: { loop_min: 3, san_below: 50 },
      text: '你认出了那些划痕。角度、间距、用力方式——都和你上次死的时候在门上留下的吻合。',
    },
    {
      conditions: { loop_min: 4 },
      text: '石壁上有一道新的痕迹。比其他的深。是你上次留下的。你记得那个瞬间——脚滑，手撑在墙上。',
    },
    {
      conditions: { loop_min: 5, death_in_area: 'catacombs_entrance' },
      text: '你在那道最深的划痕前站了很久。划痕的末端有皮肉的碎屑。你没有碰它。',
    },
    {
      conditions: { loop_min: 3, san_below: 40 },
      text: '你注意到石壁上的划痕在变多。每次你来，都会有新的。是谁在和你同时在里面？',
    },
  ],

  // ── 深层墓穴 ──────────────────────────────────────────
  'deep_catacombs': [
    {
      conditions: { loop_min: 1 },
      text: '水面有波纹。但这里没有风。波纹的规律不像自然的水流。',
    },
    {
      conditions: { loop_min: 2 },
      text: '水面倒映出你的脸。但倒影眨眼的时机比你慢了半秒。',
    },
    {
      conditions: { loop_min: 3 },
      text: '你伸手触碰水面。倒影没有同步抬手。它等你手收回去之后，才缓缓举起它的手。',
    },
    {
      conditions: { loop_min: 3, death_in_area: 'deep_catacombs' },
      text: '水底有一道阴影。形状像一个人。面朝上。你不需要看清脸就知道那是谁。',
    },
    {
      conditions: { loop_min: 4, san_below: 45 },
      text: '水底的阴影不在水里。它在水的下面。水下面还有一层空间。',
    },
    {
      conditions: { loop_min: 5 },
      text: '你看到水底阴影的手指动了一下。不是水流带动的。是故意的。',
    },
  ],

  // ── 禁忌之森 ──────────────────────────────────────────
  'forbidden_grove': [
    {
      conditions: { loop_min: 1 },
      text: '树上有一圈圈的刻痕。像是什么东西在这里住了很久，每年在树上记一笔。',
    },
    {
      conditions: { loop_min: 2 },
      text: '浆果的汁液滴在树皮上。痕迹还没有干。有人比你早到。但你没有遇到任何人。',
    },
    {
      conditions: { loop_min: 3 },
      text: '你看到一棵树上有牙齿的痕迹。不是动物啃的——太整齐了。像是刻上去的。又像是长出来的。',
    },
    {
      conditions: { loop_min: 4, death_in_area: 'forbidden_grove' },
      text: '你找到了一棵树。树皮上有一道裂口。裂口的形状像一个名字。是你的名字。',
    },
    {
      conditions: { loop_min: 3, san_below: 40 },
      text: '树林里的鸟全部安静了。不是黄昏——是正午。它们在害怕什么。你也该害怕。',
    },
    {
      conditions: { loop_min: 5 },
      text: '你在地上发现了一个脚印。只有一只脚。方向朝树林深处。你也朝深处走了——你没有记忆。',
    },
  ],

  // ── 码头区 ──────────────────────────────────────────
  'harbor_district': [
    {
      conditions: { loop_min: 1 },
      text: '木板上有深深的沟痕。锚链拖过的地方。比正常的拖痕深得多。',
    },
    {
      conditions: { loop_min: 2 },
      text: '你注意到一根缆绳断了。断口很整齐。不是磨断的——是割断的。有人用刀。',
    },
    {
      conditions: { loop_min: 3 },
      text: '木板缝隙里有盐结晶。白色的。摸上去有些黏。不是盐——是别的东西干了之后的样子。',
    },
    {
      conditions: { loop_min: 4 },
      text: '你蹲下来看木板上的沟痕。沟痕里有指甲印。五道一组。和你手掌的间距吻合。',
    },
    {
      conditions: { loop_min: 3, death_in_area: 'harbor_district' },
      text: '码头尽头有一道湿痕。从水面延伸到木板上。形状像一个人爬上来之后留下的拖痕。',
    },
    {
      conditions: { loop_min: 5, san_below: 45 },
      text: '你低头看自己的手掌。指甲缝里有盐结晶。和木板上的一样白。你不记得碰过海水。',
    },
    {
      conditions: { loop_min: 2, san_below: 50 },
      text: '水面今天特别平静。没有浪。没有船。什么都没有动。但你知道水底下有东西在看你。',
    },
  ],

  // ── 灯塔 ──────────────────────────────────────────
  'lighthouse': [
    {
      conditions: { loop_min: 1 },
      text: '楼梯扶手有焦痕。不是火烧的——是手。有人在这里扶了很久，手心在冒汗。',
    },
    {
      conditions: { loop_min: 2 },
      text: '灯室里有一张纸条。用铅笔写的。字迹很用力，纸都快破了。「不要开灯。」',
    },
    {
      conditions: { loop_min: 3 },
      text: '灯室的玻璃上有一个指印。在很高的位置。你踮起脚才能够到。上一次你够到过那个位置。',
    },
    {
      conditions: { loop_min: 4, death_in_area: 'lighthouse' },
      text: '你看到扶手最高处的焦痕旁边有一个刻痕。很小的。像是用指甲刻的。是一个数字。是你的死亡次数。',
    },
    {
      conditions: { loop_min: 3, san_below: 40 },
      text: '灯塔的灯灭着。但灯室里有光。来自灯芯。灯芯在燃烧——但没有火焰。',
    },
    {
      conditions: { loop_min: 5 },
      text: '你打开灯室的日志本。最后一页写着一行字：「他又上来了。这次我不会让他下去。」字迹是你的。',
    },
  ],

  // ── 犹格斯遗迹 ──────────────────────────────────────────
  'ruins_of_yith': [
    {
      conditions: { loop_min: 1 },
      text: '墙壁上的几何图案不是人类的画法。某些角度看起来是立体的——但墙是平的。',
    },
    {
      conditions: { loop_min: 2 },
      text: '你看到图案里有一张脸。不是浮雕——是墙面的纹理巧合。但你越看越觉得它在看你。',
    },
    {
      conditions: { loop_min: 3 },
      text: '你把手贴在墙上。图案的线条在你的手掌周围绕开了。像在避让什么。',
    },
    {
      conditions: { loop_min: 3, san_below: 45 },
      text: '房间中央有一个凹槽。凹槽的形状像一只手。你把你的手放进去——严丝合缝。不是巧合。',
    },
    {
      conditions: { loop_min: 4, death_in_area: 'ruins_of_yith' },
      text: '凹槽的底部有一层薄灰。你把灰吹开——底下有一个指纹。和你的完全一样。',
    },
    {
      conditions: { loop_min: 5, san_below: 35 },
      text: '你注意到墙壁上的图案在旋转。你没有动。图案自己在转。一圈。两圈。然后停在你面对的方向。',
    },
  ],

  // ── 镇中心 ──────────────────────────────────────────
  'town_center': [
    {
      conditions: { loop_min: 1 },
      text: '公告栏上有一张寻人启事。照片是空的。没有人觉得有问题。',
    },
    {
      conditions: { loop_min: 2 },
      text: '井里的水比上次清了一些。你往下看。水底的石头排列成某种形状。不是自然形成的。',
    },
    {
      conditions: { loop_min: 3 },
      text: '你在地上看到一排脚印。从教堂方向来。在井边停了。然后——消失了。没有继续的脚印。',
    },
    {
      conditions: { loop_min: 3, death_in_area: 'town_center' },
      text: '公告栏上的寻人启事换了照片。是一张模糊的背影。你知道那个人是谁。',
    },
    {
      conditions: { loop_min: 4, san_below: 45 },
      text: '镇中心的钟今天敲了七下。不是七点。没有任何时间对应七下。你数了三次。都是七下。',
    },
    {
      conditions: { loop_min: 5 },
      text: '你在地上发现了一个不属于任何人的物品。是一个纽扣。你认得出这个纽扣——你衣服上少了一颗一模一样的。',
    },
  ],

  // ── 沃克斯斯特庄园 ──────────────────────────────────────────
  'voxchester_manor': [
    {
      conditions: { loop_min: 1 },
      text: '走廊里的画像今天在看的方向比昨天偏了一点。偏了大概十五度。没有风。',
    },
    {
      conditions: { loop_min: 2 },
      text: '你经过一幅画像。画中人的手指比上次多了一根。你确定上次是四根。现在是五根。',
    },
    {
      conditions: { loop_min: 3 },
      text: '画像下方的小名牌上写着：「莫里斯，1780–？」。问号代替了一个年份。那个年份是你第一次来到这里的日子。',
    },
    {
      conditions: { loop_min: 3, death_in_area: 'voxchester_manor' },
      text: '你在一幅画像前停住。画中人的脸——在变。从一个陌生人变成你认识的什么人。又变成你自己。',
    },
    {
      conditions: { loop_min: 4, san_below: 45 },
      text: '走廊尽头的门今天开着。你记得上次它是关着的。没有人开过它。你也没有。',
    },
    {
      conditions: { loop_min: 5, san_below: 40 },
      text: '画像全部面向你。不是同时转向的——是依次的。像波浪一样。从左到右。最后一幅画像的脸是你自己的。',
    },
    {
      conditions: { loop_min: 2 },
      text: '壁炉里的灰还没有凉。但庄园已经空了很多天了。有人——或者什么东西——最近在这里生过火。',
    },
  ],
};

/**
 * 从指定区域的可调查细节池中，随机返回一条符合条件的描述
 * @param {string} areaId - 区域 ID
 * @param {object} state - 游戏状态
 * @param {function} rng - 可选随机数生成器
 * @returns {string|null}
 */
export function getInvestigationDetail(areaId, state, rng) {
  var pool = AREA_INVESTIGATION_DETAILS[areaId];
  if (!pool || pool.length === 0) return null;

  var loop = (state && state.loopCount) || 0;
  var san = (state && state.san) || 60;
  var deathsByArea = (state && state.previousDeathsByArea) || {};
  var deathCount = deathsByArea[areaId] || 0;

  var _rand = typeof rng === 'function' ? rng : Math.random;

  var candidates = pool.filter(function (d) {
    var c = d.conditions || {};
    if (c.loop_min != null && loop < c.loop_min) return false;
    if (c.san_below != null && san >= c.san_below) return false;
    if (c.death_in_area != null && deathCount < 1) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  return candidates[Math.floor(_rand() * candidates.length)].text;
}

export function getAreaInvestigationDetails(areaId) {
  return AREA_INVESTIGATION_DETAILS[areaId] || null;
}

export default AREA_INVESTIGATION_DETAILS;
