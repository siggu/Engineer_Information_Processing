# 정처기 AI 튜터

정보처리기사 실기 시험 준비를 위한 AI 튜터 웹 애플리케이션입니다.

## 기능

- **이론 학습**: DB, 네트워크/OS, SW설계, SW개발, 보안/신기술
- **코딩 학습**: C언어, Java, Python, 알고리즘 기출 문제
- **AI 튜터**: Claude Haiku 기반 실시간 스트리밍 Q&A
- **예상 문제 생성**: 과목·난이도별 AI 자동 생성

## 로컬 실행

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 에 ANTHROPIC_API_KEY 입력

# 3. 서버 시작
npm start
# → http://localhost:3000
```

## Railway 배포

1. GitHub에 push
2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. 레포지토리 선택 후 **Variables** 탭에서:
   - `ANTHROPIC_API_KEY` = 본인의 Anthropic API 키
   - `NODE_ENV` = `production`
4. 자동 배포 완료

> **비용**: Railway Starter $5/월 플랜으로 충분합니다.
> 별도 DB 없이 JSON 파일 기반으로 운영되므로 추가 비용 없음.

## 프로젝트 구조

```
├── server/
│   ├── index.js          # Express 진입점
│   └── routes/api.js     # API 라우터
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── data/
│   ├── exam_overview.json
│   ├── theory/
│   └── coding/
└── railway.json
```

---

참고: [수제비](https://cafe.naver.com/soojebi?iframe_url=/ArticleList.nhn%3Fsearch.clubid=29835300%26search.menuid=58%26search.boardtype=L) · [시나공](https://www.sinagong.co.kr/)
