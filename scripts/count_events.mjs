// scripts/count_events.mjs — Count events per file and generate INDEX.md
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const EVENTS_DIR = join(process.cwd(), 'src/data/events');
const OUTPUT = join(process.cwd(), 'src/data/events/INDEX.md');

async function countEventsInFile(filepath) {
  const content = await readFile(filepath, 'utf-8');
  // Count objects with id: 'pattern in EVENTS array
  const matches = content.match(/^\s+id:\s+'[^']+'/gm);
  return matches ? matches.length : 0;
}

function extractLineCount(filepath, content) {
  return content.split('\n').length;
}

function inferCoverage(filename) {
  const map = {
    'events_ch2plus.js': 'ch2+',
    'events_area_deep.js': '区域深入',
    'events_death_meta.js': '死亡元',
    'events_death_count_meta.js': '死亡计数元',
    'events_death_echo.js': '死亡回响',
    'events_ending.js': '结局',
    'events_fear_endings.js': '恐惧结局',
    'events_humanity.js': '人性',
    'events_legendary.js': '传说',
    'events_loop.js': '循环',
    'events_meta.js': '元',
    'events_missing_600.js': '补充(600)',
    'events_mythos.js': '神话',
    'events_npc_cross.js': 'NPC交叉',
    'events_omens_600.js': '预兆(600)',
    'events_resource.js': '资源',
    'events_silent.js': '沉默',
    'events_supplement.js': '补充',
    'prologue_events.js': '序章',
  };
  return map[filename] || '综合';
}

function inferTrigger(filename) {
  const map = {
    'events_ch2plus.js': '章节推进',
    'events_area_deep.js': '探索深处区域',
    'events_death_meta.js': '死亡触发',
    'events_death_count_meta.js': '死亡次数达到阈值',
    'events_death_echo.js': '死亡后回响',
    'events_ending.js': '结局条件满足',
    'events_fear_endings.js': '恐惧结局触发',
    'events_humanity.js': '人性值变化',
    'events_legendary.js': '传奇条件',
    'events_loop.js': '循环次数',
    'events_meta.js': '元事件',
    'events_missing_600.js': '补充事件池',
    'events_mythos.js': '神话知识等级',
    'events_npc_cross.js': 'NPC互动交叉',
    'events_omens_600.js': '结局预兆',
    'events_resource.js': '资源管理',
    'events_silent.js': '沉默事件(无 narration)',
    'events_supplement.js': '补充事件池',
    'prologue_events.js': '游戏开始',
  };
  return map[filename] || '综合触发';
}

async function main() {
  const files = await readdir(EVENTS_DIR);
  const eventFiles = files
    .filter(f => f.startsWith('events_') && f.endsWith('.js'))
    .sort();

  let totalEvents = 0;
  let totalLines = 0;
  const rows = [];

  for (const file of eventFiles) {
    const filepath = join(EVENTS_DIR, file);
    const content = await readFile(filepath, 'utf-8');
    const eventCount = await countEventsInFile(filepath);
    const lineCount = extractLineCount(filepath, content);
    totalEvents += eventCount;
    totalLines += lineCount;
    rows.push({
      file,
      events: eventCount,
      lines: lineCount,
      coverage: inferCoverage(file),
      trigger: inferTrigger(file),
    });
  }

  // Sort by event count descending
  rows.sort((a, b) => b.events - a.events);

  // Generate INDEX.md
  let md = `# 事件文件索引

> 自动生成于 ${new Date().toISOString().split('T')[0]}
> 总计: ${eventFiles.length} 个文件, ${totalEvents} 个事件, ${totalLines.toLocaleString()} 行代码

## 文件列表（按事件数降序）

| 文件 | 事件数 | 行数 | 覆盖 | 主要触发条件 |
|------|--------|------|------|-------------|
`;

  for (const row of rows) {
    md += `| ${row.file} | ${row.events} | ${row.lines} | ${row.coverage} | ${row.trigger} |\n`;
  }

  md += `\n## 说明\n\n`;
  md += `- **事件数**: 通过统计 \`id:\` 字段数量计算\n`;
  md += `- **覆盖**: 事件主要对应的游戏阶段或区域\n`;
  md += `- **触发条件**: 事件被调用的主要条件\n`;
  md += `- 新增事件文件时请同步更新此索引\n`;

  await mkdir(join(EVENTS_DIR, 'events'), { recursive: true });
  await writeFile(OUTPUT, md, 'utf-8');
  console.log(`Generated ${OUTPUT}`);
  console.log(`Total: ${eventFiles.length} files, ${totalEvents} events, ${totalLines} lines`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
