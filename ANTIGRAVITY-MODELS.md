# Antigravity OAuth - 지원 모델 목록

Antigravity OAuth를 통해 Google Cloud Code API에 접근하면 다양한 AI 모델을 사용할 수 있습니다.

## 인증 방법

```bash
# 인증 시작
node test-auth.js
```

브라우저에서 Google 계정으로 로그인하면 토큰이 자동 저장됩니다.

---

## 지원 모델 목록

### Gemini 3 계열 (최신)

| 모델명 | 상태 | 이미지 생성 | 설명 |
|--------|------|-------------|------|
| `gemini-3-pro` | ✅ 사용 가능 | ✅ 지원 | 최신 Gemini 3 Pro 모델, 이미지 생성 지원 |
| `gemini-3-flash` | ✅ 사용 가능 | ❌ 미지원 | 빠른 응답용 Gemini 3 Flash 모델 |

### Gemini 2.5 계열

| 모델명 | 상태 | 이미지 생성 | 설명 |
|--------|------|-------------|------|
| `gemini-2.5-pro` | ✅ 사용 가능 | ✅ 지원 | Gemini 2.5 Pro 모델 |
| `gemini-2.5-flash` | ✅ 사용 가능 | ❌ 미지원 | 빠른 응답용 Gemini 2.5 Flash 모델 |

### Claude 계열 (Anthropic 프록시)

Antigravity API가 Anthropic API로 프록시하여 Claude 모델 사용 가능.

| 모델명 | 상태 | 설명 |
|--------|------|------|
| `claude-sonnet-4-5-thinking` | ✅ 사용 가능 | Claude Sonnet 4.5 Thinking 모델 |
| `claude-opus-4-5-thinking` | ✅ 사용 가능 | Claude Opus 4.5 Thinking 모델 |
| `claude-sonnet-4-5` | ✅ 사용 가능 | Claude Sonnet 4.5 모델 |
| `claude-opus-4-5` | ✅ 사용 가능 | Claude Opus 4.5 모델 |

### GPT 계열 (OpenAI 프록시)

Antigravity API가 OpenAI API로 프록시하여 GPT 모델 사용 가능.

| 모델명 | 상태 | 설명 |
|--------|------|------|
| `gpt-5.2-codex` | ✅ 사용 가능 | GPT 5.2 Codex 모델 |
| `gpt-5-codex` | ✅ 사용 가능 | GPT 5 Codex 모델 |

---

## Thinking 설정 (고급)

### Claude 모델 Thinking Budget

| Tier | Budget (tokens) |
|------|-----------------|
| low | 8,192 |
| medium | 16,384 |
| high | 32,768 |

모델명에 `-low`, `-medium`, `-high` 접미사 추가:
- `claude-sonnet-4-5-thinking-low`
- `claude-sonnet-4-5-thinking-high`

### Gemini 3 모델 Thinking Level

| 모델 | 지원 레벨 |
|------|-----------|
| gemini-3-pro | low, high |
| gemini-3-flash | minimal, low, medium, high |

모델명에 접미사 추가:
- `gemini-3-pro-low`
- `gemini-3-flash-high`

---

## API 엔드포인트

| 환경 | URL | 설명 |
|------|-----|------|
| daily | `https://daily-cloudcode-pa.sandbox.googleapis.com` | 개발/테스트용 (일부 모델 404) |
| autopush | `https://autopush-cloudcode-pa.sandbox.googleapis.com` | 사전 배포 환경 |
| prod | `https://cloudcode-pa.googleapis.com` | 프로덕션 (권장) |

### 엔드포인트 선택 전략

1. **daily** 먼저 시도 (쿼터가 별도)
2. **prod**로 fallback (메인 쿼터)

---

## 쿼터 정보

- 각 모델별로 개별 쿼터 적용
- 쿼터 소진 시 429 에러 반환
- 쿼터 리셋: 약 5시간마다 (모델별 상이)

### 쿼터 확인 방법

```bash
# 모델별 쿼터 상태 확인
node test-models.js
```

결과 해석:
- ✅ 200 OK: 모델 작동 중
- ⏳ 429 Rate Limited: 모델 존재, 쿼터 소진
- ❌ 404 Not Found: 해당 엔드포인트에서 모델 미지원

---

## 이미지 생성 사용법

### 지원 모델

이미지 생성은 다음 모델에서만 지원됩니다:
- `gemini-3-pro` (권장)
- `gemini-2.5-pro`

### 요청 예시

```javascript
const requestBody = {
    project: projectId,
    model: 'gemini-3-pro',
    request: {
        contents: [{
            role: 'user',
            parts: [{ text: 'Generate an image of a sunset over mountains' }]
        }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE']
        }
    },
    requestType: 'agent',
    userAgent: 'antigravity',
    requestId: 'agent-' + crypto.randomUUID()
};
```

### 응답에서 이미지 추출

```javascript
const data = await response.json();
const responseData = data.response || data;  // Antigravity 응답 구조
const parts = responseData.candidates?.[0]?.content?.parts || [];

for (const part of parts) {
    if (part.inlineData) {
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        // imageBuffer를 파일로 저장하거나 처리
    }
}
```

---

## 참고 자료

- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - Antigravity OAuth 플러그인
- [MODEL-VARIANTS.md](https://github.com/NoeFabris/opencode-antigravity-auth/blob/main/docs/MODEL-VARIANTS.md) - 모델 변형 설정
