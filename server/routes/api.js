const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function loadData(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

// 시험 개요 조회
router.get('/overview', (req, res) => {
  const data = loadData(path.join(DATA_DIR, 'exam_overview.json'));
  if (!data) return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
  res.json(data);
});

// 과목별 이론 데이터 조회
router.get('/theory/:subject', (req, res) => {
  const subjectMap = {
    db: 'db.json',
    network: 'network_os.json',
    sw_design: 'sw_design.json',
    sw_dev: 'sw_development.json',
    security: 'security_new_tech.json',
  };
  const fileName = subjectMap[req.params.subject];
  if (!fileName) return res.status(404).json({ error: '과목을 찾을 수 없습니다.' });

  const data = loadData(path.join(DATA_DIR, 'theory', fileName));
  if (!data) return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
  res.json(data);
});

// 코딩 문제 데이터 조회
router.get('/coding/:lang', (req, res) => {
  const langMap = {
    c: 'c_language.json',
    java: 'java.json',
    python: 'python.json',
    algorithm: 'algorithms.json',
    common: 'common.json',
  };
  const fileName = langMap[req.params.lang];
  if (!fileName) return res.status(404).json({ error: '언어를 찾을 수 없습니다.' });

  const data = loadData(path.join(DATA_DIR, 'coding', fileName));
  if (!data) return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
  res.json(data);
});

// AI 튜터 스트리밍 응답
router.post('/chat/stream', async (req, res) => {
  const { message, subject, context } = req.body;
  if (!message) return res.status(400).json({ error: '메시지가 필요합니다.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const subjectLabel = {
    db: '데이터베이스(DB)',
    network: '네트워크/운영체제',
    sw_design: 'SW 설계',
    sw_dev: 'SW 개발',
    security: '보안/신기술',
    c: 'C언어',
    java: 'Java',
    python: 'Python',
    algorithm: '알고리즘',
    common: '프로그래밍 공통 기초',
  }[subject] || '정보처리기사 실기';

  const systemPrompt = `당신은 정보처리기사 실기 시험 전문 AI 튜터입니다.
현재 과목: ${subjectLabel}

규칙:
- 핵심 개념을 명확하고 간결하게 설명합니다.
- 예시 코드나 SQL은 코드 블록(\`\`\`)으로 감쌉니다.
- 시험에 자주 나오는 포인트는 **굵게** 강조합니다.
- 암기법(예: 도부이결다조, 식통감기)이 있으면 알려줍니다.
- 관련 예상 문제를 1~2개 제시합니다.
- 한국어로 답변합니다.
${context ? `\n참고 컨텍스트:\n${context}` : ''}`;

  try {
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Claude API 오류:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI 응답 중 오류가 발생했습니다.' })}\n\n`);
    res.end();
  }
});

// 예상 문제 생성
router.post('/quiz/generate', async (req, res) => {
  const { subject, difficulty = '중간', count = 3 } = req.body;

  const subjectLabel = {
    db: '데이터베이스(DB) - SQL, 정규화, 트랜잭션, 키',
    network: '네트워크/OS - OSI 7계층, 페이지 교체, 스케줄링',
    sw_design: 'SW 설계 - 디자인 패턴, 응집도/결합도, UML',
    sw_dev: 'SW 개발 - 테스트, 형상 관리, 품질',
    security: '보안/신기술 - 암호화, 공격 유형, 신기술',
    c: 'C언어 프로그래밍 - 포인터, 구조체, 재귀',
    java: 'Java 프로그래밍 - 상속, 오버라이딩, 인터페이스',
    python: 'Python 프로그래밍 - 슬라이싱, 클래스, 람다',
    algorithm: '알고리즘 - 정렬, 탐색, 자료구조',
    common: '프로그래밍 공통 기초 - 변수, 연산자, 반복문, 메모리 구조',
  }[subject] || '정보처리기사 실기';

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `정보처리기사 실기 시험 [${subjectLabel}] 파트에서 난이도 '${difficulty}'의 예상 문제 ${count}개를 JSON 배열 형식으로 생성해주세요.

형식:
[
  {
    "id": 1,
    "question": "문제 내용",
    "answer": "정답",
    "explanation": "해설",
    "hint": "힌트"
  }
]

- 실제 기출 스타일로 작성
- 코딩 문제는 코드를 포함
- JSON만 반환 (다른 텍스트 없이)`
      }],
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: '문제 생성에 실패했습니다.' });

    const problems = JSON.parse(jsonMatch[0]);
    res.json({ problems });
  } catch (err) {
    console.error('문제 생성 오류:', err.message);
    res.status(500).json({ error: '문제 생성 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
