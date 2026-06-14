// src/components/TitleScreen.jsx — 游戏标题画面
import { audioManager } from '../managers/AudioManager.js';
const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

export const TITLE_TAGLINES = [
  '第十三声钟响之后，没有人再数下去。',
  '有些失踪，是从抵达开始的。',
  '沃切斯特记得你。你不记得它。',
  '雾从海上来，也从档案的空白处来。',
  '请勿相信所有记录。尤其是你亲手写下的。',
  '灯塔仍在工作。只是它不再指向岸边。',
  '你已经来过这里。只是这一次，门牌还没有认出你。',
];

export function TitleScreen({ onStart, onContinue, saveExists, onSettingsOpen, onAchOpen, endingCoins, loopShopTier, loopCount, onShopPurchase }) {
  const [tagIdx, setTagIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: (i * 5.7 + 13) % 100,
        top: (i * 7.3 + 29) % 100,
        delay: (i * 1.3) % 10,
        dur: 15 + ((i * 1.7) % 10),
      })),
    []
  );
  useEffect(() => {
    const iv = setInterval(() => {
      setTagIdx((i) => (i + 1) % TITLE_TAGLINES.length);
    }, 8000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    try {
      audioManager.playAreaAmbient('harbor_district', 'morning');
    } catch (e) {}
    return () => {
      try {
        audioManager.stopAmbient && audioManager.stopAmbient();
      } catch (e) {}
    };
  }, []);
  const handleStart = () => {
    setFading(true);
    setTimeout(onStart, 800);
  };
  return (
    <div className={'title-screen' + (fading ? ' fading' : '')}>
      <div className="title-bg-harbor" />
      <div className="title-bg-vignette" />
      <div className="title-fog-layer fog-1" />
      <div className="title-fog-layer fog-2" />
      <div className="title-fog-layer fog-3" />
      <div className="title-particles">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: p.left + '%',
              top: p.top + '%',
              animationDelay: p.delay + 's',
              animationDuration: p.dur + 's',
            }}
          />
        ))}
      </div>
      <main className="title-content">
        <div className="title-kicker">调查档案 / 1926</div>
        <h1>深渊低语</h1>
        <h2>沃切斯特之影</h2>
        <p key={tagIdx} className="title-tagline">
          {TITLE_TAGLINES[tagIdx]}
        </p>
        <div className="title-actions">
          <button className="btn btn-primary" onClick={handleStart}>
            踏入深渊
          </button>
          {saveExists && (
            <button className="btn" onClick={onContinue}>
              翻阅旧档案
            </button>
          )}
        </div>
        <div className="title-version">ABYSSAL WHISPERS · v1.0</div>
        <div className="title-corner-btns">
          {onAchOpen && (
            <button className="title-settings-btn" onClick={onAchOpen} title="成就">
              🏆
            </button>
          )}
          {(loopShopTier || 0) > 0 && (
            <button className="title-settings-btn" onClick={() => setShopOpen(true)} title="轮回商店">
              🪙
            </button>
          )}
          {onSettingsOpen && (
            <button className="title-settings-btn" onClick={onSettingsOpen} title="设置">
              ⚙️
            </button>
          )}
        </div>
        {/* Loop Shop Modal */}
        {shopOpen && (
          <LoopShopModal
            open={shopOpen}
            onClose={() => setShopOpen(false)}
            endingCoins={endingCoins || 0}
            loopShopTier={loopShopTier || 0}
            loopCount={loopCount || 0}
            onPurchase={onShopPurchase}
          />
        )}
      </main>
    </div>
  );
}

// ── Loop Shop Modal ──
const LOOP_SHOP_TIERS = {
  tier_1: {
    unlock: 5,
    items: [
      { id: 'shop_skill_points', name: '初始额外技能点', desc: '开局获得3点额外技能点', cost: 3 },
      { id: 'shop_random_rare', name: '随机稀有物品', desc: '从稀有物品池中随机获得一件', cost: 5 },
      { id: 'shop_npc_trust', name: 'NPC初始信任', desc: '解锁一个隐藏NPC的初始信任+2', cost: 7 },
    ],
  },
  tier_2: {
    unlock: 7,
    items: [
      { id: 'shop_resistance', name: '永久神话抗性', desc: '神话伤害永久减少10%', cost: 10 },
      { id: 'shop_death_insurance', name: '轮回记忆保险', desc: '死亡后保留一件关键物品', cost: 15 },
      { id: 'shop_san_cap_boost', name: 'SAN上限恢复', desc: 'SAN上限永久+5（最高70）', cost: 12 },
    ],
  },
};

function LoopShopModal({ open, onClose, endingCoins, loopShopTier, loopCount, onPurchase }) {
  const [purchased, setPurchased] = useState([]);
  if (!open) return null;

  const handleBuy = (item) => {
    if (endingCoins < item.cost) return;
    if (purchased.includes(item.id)) return;
    setPurchased(prev => [...prev, item.id]);
    if (onPurchase) onPurchase(item);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#1a1612', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 12, padding: '2rem', maxWidth: 480, width: '90%',
        maxHeight: '80vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#e0d5c0', fontSize: 18 }}>轮回商店</h3>
          <span style={{ color: 'var(--gold)', fontSize: 14 }}>
            🪙 {endingCoins} 代币
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#a89a85', marginBottom: '1rem', lineHeight: 1.6 }}>
          每次达成结局获得1枚代币。这些物品会在下一轮开局生效。
        </div>

        {Object.entries(LOOP_SHOP_TIERS).map(([tierKey, tier]) => {
          const unlocked = loopShopTier >= (tierKey === 'tier_1' ? 1 : 2);
          return (
            <div key={tierKey} style={{ marginBottom: '1.2rem' }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: unlocked ? '#e0d5c0' : '#666',
                marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4,
              }}>
                {tierKey === 'tier_1' ? 'Tier 1' : 'Tier 2'}
                {!unlocked && <span style={{ fontWeight: 400, marginLeft: 8 }}>（轮回{tier.unlock}次解锁）</span>}
              </div>
              {tier.items.map(item => {
                const bought = purchased.includes(item.id);
                const canAfford = endingCoins >= item.cost;
                return (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', opacity: unlocked ? 1 : 0.4,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: bought ? '#666' : '#e0d5c0' }}>
                        {item.name} {bought && '✓'}
                      </div>
                      <div style={{ fontSize: 11, color: '#a89a85' }}>{item.desc}</div>
                    </div>
                    <button
                      disabled={!unlocked || bought || !canAfford}
                      onClick={() => handleBuy(item)}
                      style={{
                        background: bought ? '#333' : canAfford ? 'var(--gold, #b8963a)' : '#444',
                        color: bought ? '#888' : '#111',
                        border: 'none', borderRadius: 6, padding: '4px 12px',
                        fontSize: 12, cursor: !unlocked || bought || !canAfford ? 'default' : 'pointer',
                        opacity: !unlocked || !canAfford ? 0.5 : 1,
                        marginLeft: 12,
                      }}
                    >
                      {bought ? '已购' : '🪙 ' + item.cost}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}

        <button onClick={onClose} style={{
          display: 'block', width: '100%', marginTop: '1rem',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
          color: '#a89a85', borderRadius: 8, padding: '8px',
          fontSize: 13, cursor: 'pointer',
        }}>
          关闭
        </button>
      </div>
    </div>
  );
}
