/* ===== 章节数据校验脚本 =====
 * 用法: node docs/validate.js
 * 检查所有 data/chapter-*.js 的语法与 schema 合规性。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ALLOWED_TAGS = ['h3', 'p', 'b', 'strong', 'i', 'em', 'code', 'ul', 'ol', 'li', 'br', 'span', 'div'];
const TYPE_LABEL = { choice: '单选', multiple: '多选', code: '读代码', fill: '填空' };

const files = fs.readdirSync(DATA_DIR).filter(f => /^chapter-\d+\.js$/.test(f)).sort();
if (!files.length) { console.error('✗ 未找到任何章节文件'); process.exit(1); }

let problems = 0;
let totals = { chapters: 0, sections: 0, exercises: 0 };

files.forEach(file => {
  const filePath = path.join(DATA_DIR, file);
  let src;
  try {
    src = fs.readFileSync(filePath, 'utf8');
    // 语法检查
    new vm.Script(src, { filename: file });
  } catch (e) {
    problems++;
    console.error(`✗ [${file}] 语法错误: ${e.message}`);
    return;
  }

  const sandbox = { window: { CHAPTERS: {} }, console };
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: file });
  } catch (e) {
    problems++;
    console.error(`✗ [${file}] 执行错误: ${e.message}`);
    return;
  }

  const ch = sandbox.window.CHAPTERS[Object.keys(sandbox.window.CHAPTERS)[0]];
  if (!ch) { problems++; console.error(`✗ [${file}] 未注册章节`); return; }

  const errs = [];
  const expectOrder = parseInt(file.match(/\d+/)[0], 10);

  if (ch.id !== `chapter-${String(expectOrder).padStart(2, '0')}` && ch.id !== `chapter-${expectOrder}`) errs.push(`id 应为 chapter-${String(expectOrder).padStart(2, '0')}`);
  if (ch.order !== expectOrder) errs.push(`order 应为 ${expectOrder}`);
  if (!ch.title) errs.push('缺少 title');
  if (!ch.summary) errs.push('缺少 summary');
  if (!ch.icon) errs.push('缺少 icon');

  // sections
  if (!Array.isArray(ch.sections) || ch.sections.length < 5) errs.push(`sections 数量不足 (${ch.sections ? ch.sections.length : 0}, 需≥5)`);
  let textCnt = 0, codeCnt = 0, tipCnt = 0;
  (ch.sections || []).forEach((s, i) => {
    if (!s || !s.type) { errs.push(`sections[${i}] 缺 type`); return; }
    if (!['text', 'code', 'tip', 'table', 'list'].includes(s.type)) errs.push(`sections[${i}] type 非法: ${s.type}`);
    if (s.type === 'text') { textCnt++; if (!s.html) errs.push(`sections[${i}] text 缺 html`); }
    if (s.type === 'code') { codeCnt++; if (!s.code) errs.push(`sections[${i}] code 缺 code`); if (!s.title) errs.push(`sections[${i}] code 缺 title`); }
    if (s.type === 'tip') { tipCnt++; if (!s.html) errs.push(`sections[${i}] tip 缺 html`); if (s.kind && !['tip', 'info', 'warn'].includes(s.kind)) errs.push(`sections[${i}] tip kind 非法`); }
    if (s.type === 'table') { if (!Array.isArray(s.headers) || !Array.isArray(s.rows)) errs.push(`sections[${i}] table 缺 headers/rows`); }
    if (s.type === 'list') { if (!Array.isArray(s.items) || !s.items.length) errs.push(`sections[${i}] list 缺 items`); }
    // HTML 标签白名单
    if ((s.type === 'text' || s.type === 'tip') && s.html) {
      const tags = s.html.match(/<\/?([a-zA-Z0-9]+)/g) || [];
      tags.forEach(t => {
        const name = t.replace(/<\/?/, '');
        if (!ALLOWED_TAGS.includes(name)) errs.push(`sections[${i}] 用了不允许的标签 <${name}>`);
      });
      if (/<h[124]/.test(s.html)) errs.push(`sections[${i}] 不允许 h1/h2/h4`);
      if (/<img/i.test(s.html)) errs.push(`sections[${i}] 不允许 img`);
    }
    // 代码平衡性粗检
    if (s.type === 'code' && s.code) {
      const o = (s.code.match(/\{/g) || []).length, c = (s.code.match(/\}/g) || []).length;
      if (o !== c) errs.push(`sections[${i}] 代码花括号不平衡 {${o} vs }${c}`);
    }
  });
  if (textCnt < 2) errs.push(`text 小节不足 (${textCnt})`);
  if (codeCnt < 2) errs.push(`code 小节不足 (${codeCnt})`);
  if (tipCnt < 1) errs.push('缺少 tip 小节');

  // exercises
  if (!Array.isArray(ch.exercises) || ch.exercises.length < 5) errs.push(`练习题数量不足 (${ch.exercises ? ch.exercises.length : 0}, 需≥5)`);
  const seen = new Set();
  (ch.exercises || []).forEach((q, i) => {
    if (!q) { errs.push(`exercises[${i}] 为空`); return; }
    if (!q.id) errs.push(`exercises[${i}] 缺 id`);
    else if (seen.has(q.id)) errs.push(`exercises[${i}] id 重复: ${q.id}`);
    else seen.add(q.id);
    if (!q.question) errs.push(`exercises[${i}] 缺 question`);
    if (!TYPE_LABEL[q.type]) errs.push(`exercises[${i}] type 非法: ${q.type}`);
    if (!q.explanation || q.explanation.length < 30) errs.push(`exercises[${i}] explanation 太短`);
    if (q.type === 'choice' || q.type === 'code') {
      if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`exercises[${i}] 缺 options`);
      else if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) errs.push(`exercises[${i}] answer 越界: ${q.answer}`);
    }
    if (q.type === 'multiple') {
      if (!Array.isArray(q.options) || q.options.length < 2) errs.push(`exercises[${i}] 缺 options`);
      if (!Array.isArray(q.answer) || !q.answer.length) errs.push(`exercises[${i}] multiple 缺 answer 数组`);
      else q.answer.forEach(a => { if (a < 0 || a >= (q.options || []).length) errs.push(`exercises[${i}] answer 越界: ${a}`); });
    }
    if (q.type === 'fill') {
      if (!Array.isArray(q.accept) || !q.accept.length) errs.push(`exercises[${i}] fill 缺 accept 数组`);
    }
    if (q.type === 'code' && !q.code) errs.push(`exercises[${i}] code 题缺 code`);
  });

  totals.chapters++; totals.sections += (ch.sections || []).length; totals.exercises += (ch.exercises || []).length;

  if (errs.length) {
    problems++;
    console.log(`✗ [${file}] ${ch.title || '(无标题)'}`);
    errs.slice(0, 12).forEach(e => console.log(`    - ${e}`));
    if (errs.length > 12) console.log(`    ... 共 ${errs.length} 个问题`);
  } else {
    console.log(`✓ [${file}] ${ch.title} — 小节 ${ch.sections.length} 个, 练习 ${ch.exercises.length} 题`);
  }
});

console.log(`\n合计: ${totals.chapters} 章 / ${totals.sections} 小节 / ${totals.exercises} 题, 问题: ${problems}`);
process.exit(problems ? 1 : 0);
