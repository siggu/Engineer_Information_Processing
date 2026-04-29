/* ===== 상태 ===== */
const state = {
  currentSection: 'theory',
  currentSubject: 'db',
  sidebarCollapsed: false,
  lightMode: true,
  dataCache: {},
};

/* ===== DOM ===== */
const $ = id => document.getElementById(id);
const sidebar        = $('sidebar');
const sidebarToggle  = $('sidebarToggle');
const breadcrumb     = $('breadcrumb');
const themeToggle    = $('themeToggle');
const contentSection = $('contentSection');
const quizSection    = $('quizSection');
const learnPane      = $('learnPane');
const problemsPane   = $('problemsPane');
const learnContent   = $('learnContent');
const problemsContent= $('problemsContent');
const startQuizBtn   = $('startQuizBtn');
const quizCountBadge = $('quizCountBadge');
const quizResult     = $('quizResult');
const tabBtns        = document.querySelectorAll('.tab-btn');
const navItems       = document.querySelectorAll('.nav-item');

/* ===== 라벨 맵 ===== */
const LABELS = {
  db: '데이터베이스',
  network: '네트워크 / OS',
  sw_design: 'SW 설계',
  sw_dev: 'SW 개발',
  security: '보안 / 신기술',
  c: 'C언어',
  java: 'Java',
  python: 'Python',
  algorithm: '알고리즘',
  common: '공통 기초',
};

/* ===== API 호출 ===== */
async function fetchData(url) {
  if (state.dataCache[url]) return state.dataCache[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  state.dataCache[url] = data;
  return data;
}

/* ===== 내비게이션 ===== */
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const section = item.dataset.section;
    const subject = item.dataset.subject;
    state.currentSection = section;
    state.currentSubject = subject;
    breadcrumb.textContent = subject ? LABELS[subject] : '기출 문제';
    if (section === 'quiz') {
      contentSection.classList.add('hidden');
      quizSection.classList.remove('hidden');
    } else {
      contentSection.classList.remove('hidden');
      quizSection.classList.add('hidden');
      loadContent(section, subject);
    }
  });
});

/* ===== 탭 ===== */
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    learnPane.classList.toggle('active', tab === 'learn');
    problemsPane.classList.toggle('active', tab === 'problems');
  });
});

/* ===== 콘텐츠 로드 ===== */
async function loadContent(section, subject) {
  learnContent.innerHTML = loadingHTML();
  problemsContent.innerHTML = '';

  try {
    const url = section === 'theory'
      ? `/api/theory/${subject}`
      : `/api/coding/${subject}`;
    const data = await fetchData(url);

    learnContent.innerHTML = renderLearn(data, section);
    problemsContent.innerHTML = renderProblems(data, section);
    attachToggleListeners();
  } catch (e) {
    learnContent.innerHTML = errorHTML(e.message);
  }
}

/* ===== 이론 렌더링 ===== */
function renderLearn(data, section) {
  if (section === 'theory') return renderTheory(data);
  return renderCodingLearn(data);
}

function renderTheory(data) {
  const topics = data.topics || [];
  if (!topics.length) return emptyHTML('학습 내용이 없습니다.');

  return topics.map(topic => `
    <div class="topic-card">
      <div class="topic-header" data-topic="${topic.id}">
        <span class="topic-title">${topic.title}</span>
        <span class="topic-toggle">▼</span>
      </div>
      <div class="topic-body">
        ${renderTopicBody(topic)}
      </div>
    </div>
  `).join('');
}

function renderTopicBody(topic) {
  const c = topic.content;
  if (!c) return '';
  let html = '';

  // 암기법
  if (c.mnemonic) {
    html += `<div class="mnemonic-box"><div class="label">암기법</div><div class="value">${c.mnemonic}</div></div>`;
  }

  // 단계 목록
  if (c.steps) {
    const hasStepObjects = c.steps.length && typeof c.steps[0] === 'object';
    if (hasStepObjects) {
      html += `<table class="info-table" style="margin-top:10px">
        <tr><th>단계</th><th>키워드</th><th>설명</th></tr>
        ${c.steps.map(s => `<tr><td><span class="badge badge-blue">${escapeHtml(String(s.level || s.step || ''))}</span></td><td>${escapeHtml(s.keyword || '')}</td><td>${escapeHtml(s.condition || s.description || '')}</td></tr>`).join('')}
      </table>`;
    } else {
      html += renderValue(c.steps);
    }
  }

  // 레이어 목록 (OSI)
  if (c.layers) {
    const hasNumber = c.layers.length && c.layers[0].number != null;
    if (hasNumber) {
      html += `<table class="info-table" style="margin-top:10px">
        <tr><th>계층</th><th>이름</th><th>프로토콜/장비</th><th>PDU</th></tr>
        ${c.layers.map(l => `
          <tr>
            <td><span class="badge badge-blue">${l.number}계층</span></td>
            <td><strong>${escapeHtml(l.name || '')}</strong></td>
            <td>${(l.protocols || []).map(escapeHtml).join(', ')}${l.device ? ' / ' + escapeHtml(l.device) : ''}</td>
            <td>${escapeHtml(l.pdu || '-')}</td>
          </tr>`).join('')}
      </table>`;
    } else {
      html += renderValue(c.layers);
    }
  }

  // 알고리즘 목록
  if (c.algorithms) {
    html += `<table class="info-table" style="margin-top:10px">
      <tr><th>이름</th><th>유형</th><th>설명</th></tr>
      ${c.algorithms.map(a => `
        <tr>
          <td><strong>${a.name}</strong></td>
          <td><span class="badge ${a.type === '선점' ? 'badge-red' : 'badge-green'}">${a.type || '-'}</span></td>
          <td>${a.description || ''}</td>
        </tr>`).join('')}
    </table>`;
  }

  // 레벨 목록 (결합도/응집도)
  if (c.levels) {
    html += `<table class="info-table" style="margin-top:10px">
      <tr><th>유형</th><th>강도</th><th>설명</th></tr>
      ${c.levels.map(l => `
        <tr>
          <td><strong>${l.type}</strong></td>
          <td><small>${l.strength || ''}</small></td>
          <td>${l.description || ''}</td>
        </tr>`).join('')}
    </table>`;
  }

  // 패턴 목록 (디자인 패턴)
  if (c.creational || c.structural || c.behavioral) {
    ['creational', 'structural', 'behavioral'].forEach(cat => {
      if (!c[cat]) return;
      html += `<h4 style="margin-top:12px;margin-bottom:6px;color:var(--accent);font-size:12px">${c[cat].description}</h4>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
        ${(c[cat].patterns || []).map(p => `
          <div style="background:var(--bg-hover);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:12px">
            <strong>${p.name}</strong><br><span style="color:var(--text-muted);font-size:11px">${p.description}</span>
          </div>`).join('')}
        </div>`;
    });
  }

  // 관계 목록 (UML)
  if (c.relationships) {
    html += `<table class="info-table" style="margin-top:10px">
      <tr><th>관계</th><th>표기</th><th>설명</th></tr>
      ${c.relationships.map(r => `<tr><td><strong>${r.type}</strong></td><td><code>${r.notation}</code></td><td>${r.description}</td></tr>`).join('')}
    </table>`;
  }

  // 일반 키-값 (definition, characteristics 등)
  if (c.definition) {
    html += `<p style="margin-top:10px;color:var(--text-primary)">${c.definition}</p>`;
  }
  if (c.characteristics) {
    html += `<ul class="key-points" style="margin-top:8px">${c.characteristics.map(x => `<li>${x}</li>`).join('')}</ul>`;
  }
  if (c.types) {
    if (Array.isArray(c.types)) {
      html += renderValue(c.types);
    } else if (typeof c.types === 'object') {
      html += `<ul class="key-points" style="margin-top:8px">
        ${Object.entries(c.types).map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`).join('')}
      </ul>`;
    }
  }
  if (c.acid) {
    html += `<ul class="key-points" style="margin-top:8px">
      ${Object.entries(c.acid).map(([k, v]) => `<li><strong>${k.toUpperCase()}:</strong> ${v}</li>`).join('')}
    </ul>`;
  }
  if (c.schema_3layer) {
    html += `<ul class="key-points" style="margin-top:8px">
      ${Object.entries(c.schema_3layer).map(([k, v]) => `<li>${v}</li>`).join('')}
    </ul>`;
  }

  // 범용 catch-all: 지원하지 않는 필드를 재귀적으로 렌더링
  const knownFields = new Set(['mnemonic','steps','layers','algorithms','levels',
    'creational','structural','behavioral','relationships',
    'definition','characteristics','types','acid','schema_3layer']);
  Object.entries(c).forEach(([key, val]) => {
    if (knownFields.has(key) || val === null || val === undefined) return;
    html += renderValue(val);
  });

  return html || `<p style="color:var(--text-muted);margin-top:10px">내용을 불러오는 중입니다.</p>`;
}

/* ===== 범용 값 렌더러 (재귀) ===== */
function renderValue(val) {
  if (val === null || val === undefined || val === '') return '';

  if (typeof val === 'string') {
    return `<p style="margin-top:6px;color:var(--text-primary)">${escapeHtml(val)}</p>`;
  }

  if (Array.isArray(val)) {
    if (!val.length) return '';
    if (typeof val[0] === 'string') {
      return `<ul class="key-points" style="margin-top:8px">${val.map(x => `<li>${escapeHtml(String(x))}</li>`).join('')}</ul>`;
    }
    if (typeof val[0] === 'object') {
      const KEY_LABELS = {
        name:'이름', description:'설명', type:'유형', level:'레벨', term:'용어',
        element:'요소', step:'단계', keyword:'키워드', condition:'조건',
        strength:'강도', notation:'표기', alias:'별칭', count:'개수',
        feature:'특징', category:'분류', protocol:'프로토콜', port:'포트',
        method:'방법', purpose:'목적', example:'예시', note:'비고',
        algorithm:'알고리즘', complexity:'복잡도', attack:'공격', defense:'방어',
        tool:'도구', advantage:'장점', disadvantage:'단점', phase:'단계',
        standard:'표준', version:'버전', target:'대상', value:'값',
      };
      const allKeys = Array.from(new Set(val.flatMap(r => Object.keys(r))));
      const headers = allKeys;
      return `<table class="info-table" style="margin-top:10px">
        <tr>${headers.map(h => `<th>${KEY_LABELS[h] || h}</th>`).join('')}</tr>
        ${val.map(row => `<tr>${headers.map(h => {
          const v = row[h];
          if (v == null) return '<td>-</td>';
          if (Array.isArray(v)) return `<td>${v.map(x => escapeHtml(String(x))).join(', ')}</td>`;
          if (typeof v === 'object') return `<td>${Object.entries(v).map(([k2,v2]) => `<strong>${escapeHtml(k2)}:</strong> ${escapeHtml(String(v2))}`).join('<br>')}</td>`;
          return `<td>${escapeHtml(String(v))}</td>`;
        }).join('')}</tr>`).join('')}
      </table>`;
    }
    return '';
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val);
    const allSimple = entries.every(([, v]) => typeof v === 'string' || typeof v === 'number');
    if (allSimple) {
      return `<ul class="key-points" style="margin-top:8px">
        ${entries.map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`).join('')}
      </ul>`;
    }
    let html = '';
    entries.forEach(([k, v]) => {
      if (typeof v === 'string' || typeof v === 'number') {
        html += `<p style="margin-top:6px"><strong style="color:var(--accent)">${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</p>`;
      } else {
        html += `<p style="margin-top:10px;font-weight:700;font-size:12px;color:var(--accent);text-transform:uppercase;letter-spacing:0.05em">${escapeHtml(k)}</p>`;
        html += renderValue(v);
      }
    });
    return html;
  }

  return escapeHtml(String(val));
}

function renderCodingLearn(data) {
  const concepts = data.key_concepts || [];
  if (!concepts.length) return emptyHTML('학습 내용이 없습니다.');

  return concepts.map(c => `
    <div class="topic-card">
      <div class="topic-header" data-topic="${c.id}">
        <span class="topic-title">${c.title}</span>
        <span class="topic-toggle">▼</span>
      </div>
      <div class="topic-body">
        ${renderConceptBody(c.content)}
      </div>
    </div>
  `).join('');
}

function renderConceptBody(c) {
  if (!c) return '';
  let html = '';
  if (c.explanation) html += `<p style="margin-top:10px">${c.explanation}</p>`;
  if (c.syntax) html += `<div class="mnemonic-box"><div class="label">문법</div><div class="value" style="font-family:monospace">${c.syntax}</div></div>`;
  if (c.rules) html += `<ul class="key-points" style="margin-top:8px">${c.rules.map(r => `<li>${r}</li>`).join('')}</ul>`;
  if (c.examples) html += `<pre>${c.examples.join('\n')}</pre>`;
  if (c.operators) html += `<ul class="key-points" style="margin-top:8px">${Object.entries(c.operators).map(([k, v]) => `<li><code>${k}</code> : ${v}</li>`).join('')}</ul>`;
  if (c.overriding || c.overloading) {
    ['overriding', 'overloading'].forEach(k => {
      if (!c[k]) return;
      html += `<div style="margin-top:10px"><strong>${k === 'overriding' ? '오버라이딩' : '오버로딩'}</strong>: ${c[k].description}</div>`;
    });
  }
  return html || `<p style="color:var(--text-muted);margin-top:10px">내용을 불러오는 중입니다.</p>`;
}

/* ===== 기출 문제 렌더링 ===== */
function renderProblems(data, section) {
  const problems = section === 'theory'
    ? (data.practice_problems || [])
    : (data.problems || []);

  if (!problems.length) return emptyHTML('기출 문제가 없습니다.');

  return problems.map((p, i) => {
    const hasCode = p.code || p.problem_code;
    return `
      <div class="problem-card">
        <div class="problem-meta">
          <span class="badge badge-blue">문제 ${i + 1}</span>
          ${p.year ? `<span class="badge badge-green">${p.year}</span>` : ''}
          ${p.difficulty ? `<span class="badge ${diffBadge(p.difficulty)}">${p.difficulty}</span>` : ''}
        </div>
        <div class="problem-question">${escapeHtml(p.question || p.title || '')}</div>
        ${hasCode ? `<div class="problem-code">${escapeHtml(p.code || p.problem_code || '')}</div>` : ''}
        <button class="answer-toggle" onclick="toggleAnswer('ans_${i}')">정답 보기</button>
        <div class="answer-box" id="ans_${i}">
          <div class="answer-label">정답</div>
          <div class="answer-text">${escapeHtml(String(p.answer || ''))}</div>
          ${p.explanation ? `<div class="explanation-label">해설</div><div class="explanation-text">${escapeHtml(p.explanation)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function diffBadge(d) {
  if (d === '상') return 'badge-red';
  if (d === '하') return 'badge-green';
  return 'badge-yellow';
}

function toggleAnswer(id) {
  const el = $(id);
  if (el) el.classList.toggle('visible');
}
window.toggleAnswer = toggleAnswer;

/* ===== 토글 이벤트 ===== */
function attachToggleListeners() {
  document.querySelectorAll('.topic-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.topic-card').classList.toggle('open');
    });
  });
}

/* ===== 기출 문제 랜덤 풀기 ===== */
const THEORY_SUBJECTS = ['db', 'network', 'sw_design', 'sw_dev', 'security'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

startQuizBtn.addEventListener('click', async () => {
  const subject = $('quizSubject').value;
  startQuizBtn.disabled = true;
  startQuizBtn.textContent = '⏳ 로딩 중...';
  quizResult.innerHTML = loadingHTML('문제를 불러오는 중...');
  quizCountBadge.textContent = '';

  try {
    const subjects = subject === 'all' ? THEORY_SUBJECTS : [subject];
    const allProblems = [];

    await Promise.all(subjects.map(async s => {
      const data = await fetchData(`/api/theory/${s}`);
      (data.practice_problems || []).forEach(p => {
        allProblems.push({ ...p, _subject: LABELS[s] });
      });
    }));

    if (!allProblems.length) {
      quizResult.innerHTML = emptyHTML('기출 문제가 없습니다.');
      quizCountBadge.textContent = '';
      return;
    }

    const problems = shuffle(allProblems);
    quizCountBadge.textContent = `총 ${problems.length}문제`;

    quizResult.innerHTML = problems.map((p, i) => `
      <div class="quiz-problem-card">
        <div class="problem-meta">
          <span class="badge badge-blue">문제 ${i + 1}</span>
          ${p._subject ? `<span class="badge badge-purple">${p._subject}</span>` : ''}
          ${p.year ? `<span class="badge badge-green">${p.year}</span>` : ''}
          ${p.difficulty ? `<span class="badge ${diffBadge(p.difficulty)}">${p.difficulty}</span>` : ''}
        </div>
        <div class="quiz-problem-q">${escapeHtml(p.question || '')}</div>
        ${p.code || p.problem_code ? `<div class="problem-code">${escapeHtml(p.code || p.problem_code || '')}</div>` : ''}
        <button class="answer-toggle" onclick="toggleAnswer('qans_${i}')">정답 보기</button>
        <div class="answer-box" id="qans_${i}">
          <div class="answer-label">정답</div>
          <div class="answer-text">${escapeHtml(String(p.answer || ''))}</div>
          ${p.explanation ? `<div class="explanation-label">해설</div><div class="explanation-text">${escapeHtml(p.explanation)}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    quizResult.innerHTML = errorHTML(e.message);
  } finally {
    startQuizBtn.disabled = false;
    startQuizBtn.textContent = '🎲 문제 섞기';
  }
});

/* ===== UI 토글 ===== */
sidebarToggle.addEventListener('click', () => {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
});

themeToggle.addEventListener('click', () => {
  state.lightMode = !state.lightMode;
  document.body.classList.toggle('light-mode', state.lightMode);
  themeToggle.textContent = state.lightMode ? '🌞' : '🌙';
});

/* ===== 유틸 ===== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function loadingHTML(msg = '로딩 중...') {
  return `<div class="loading-state"><div class="spinner"></div><p>${msg}</p></div>`;
}
function errorHTML(msg) {
  return `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${msg}</p></div>`;
}
function emptyHTML(msg) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div>`;
}

/* ===== 초기 로드 ===== */
loadContent('theory', 'db');
