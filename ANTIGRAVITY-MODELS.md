# Antigravity OAuth - Supported Models

By authenticating with Antigravity OAuth and accessing the Google Cloud Code API, you can use multiple AI models.

## Authentication

```bash
# Start authentication
node test-auth.js
```

Log in with your Google account in the browser; tokens are saved automatically.

---

## Supported Models

### Gemini 3 Family (Latest)

| Model | Status | Image Generation | Description |
|-------|--------|------------------|-------------|
| `gemini-3-pro` | ✅ Available | ✅ Supported | Latest Gemini 3 Pro model with image generation |
| `gemini-3-flash` | ✅ Available | ❌ Not supported | Fast-response Gemini 3 Flash model |

### Gemini 2.5 Family

| Model | Status | Image Generation | Description |
|-------|--------|------------------|-------------|
| `gemini-2.5-pro` | ✅ Available | ✅ Supported | Gemini 2.5 Pro model |
| `gemini-2.5-flash` | ✅ Available | ❌ Not supported | Fast-response Gemini 2.5 Flash model |

### Claude Family (Anthropic Proxy)

Antigravity proxies to the Anthropic API to make Claude models available.

| Model | Status | Description |
|-------|--------|-------------|
| `claude-sonnet-4-5-thinking` | ✅ Available | Claude Sonnet 4.5 Thinking model |
| `claude-opus-4-5-thinking` | ✅ Available | Claude Opus 4.5 Thinking model |
| `claude-sonnet-4-5` | ✅ Available | Claude Sonnet 4.5 model |
| `claude-opus-4-5` | ✅ Available | Claude Opus 4.5 model |

### GPT Family (OpenAI Proxy)

Antigravity proxies to the OpenAI API to make GPT models available.

| Model | Status | Description |
|-------|--------|-------------|
| `gpt-5.2-codex` | ✅ Available | GPT 5.2 Codex model |
| `gpt-5-codex` | ✅ Available | GPT 5 Codex model |

---

## Thinking Settings (Advanced)

### Claude Model Thinking Budget

| Tier | Budget (tokens) |
|------|------------------|
| low | 8,192 |
| medium | 16,384 |
| high | 32,768 |

Add the `-low`, `-medium`, or `-high` suffix to the model name:
- `claude-sonnet-4-5-thinking-low`
- `claude-sonnet-4-5-thinking-high`

### Gemini 3 Model Thinking Level

| Model | Supported Levels |
|-------|------------------|
| gemini-3-pro | low, high |
| gemini-3-flash | minimal, low, medium, high |

Add a suffix to the model name:
- `gemini-3-pro-low`
- `gemini-3-flash-high`

---

## API Endpoints

| Environment | URL | Description |
|-------------|-----|-------------|
| daily | `https://daily-cloudcode-pa.sandbox.googleapis.com` | Dev/test (some models may return 404) |
| autopush | `https://autopush-cloudcode-pa.sandbox.googleapis.com` | Pre-release environment |
| prod | `https://cloudcode-pa.googleapis.com` | Production (recommended) |

### Endpoint Selection Strategy

1. Try **daily** first (separate quota).
2. Fallback to **prod** (main quota).

---

## Quota Notes

- Quotas are tracked per model.
- When quota is exhausted, the API returns 429.
- Quotas typically reset about every 5 hours (varies by model).

### Check Quota Status

```bash
# Check per-model quota status
node test-models.js
```

Result interpretation:
- ✅ 200 OK: model is working
- ⏳ 429 Rate Limited: model exists, quota exhausted
- ❌ 404 Not Found: model not supported on that endpoint

---

## Image Generation Usage

### Supported Models

Image generation is only supported on:
- `gemini-3-pro` (recommended)
- `gemini-2.5-pro`

### Request Example

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

### Extract Image from Response

```javascript
const data = await response.json();
const responseData = data.response || data;  // Antigravity response shape
const parts = responseData.candidates?.[0]?.content?.parts || [];

for (const part of parts) {
    if (part.inlineData) {
        const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        // Save or process imageBuffer
    }
}
```

---

## References

- [opencode-antigravity-auth](https://github.com/NoeFabris/opencode-antigravity-auth) - Antigravity OAuth plugin
- [MODEL-VARIANTS.md](https://github.com/NoeFabris/opencode-antigravity-auth/blob/main/docs/MODEL-VARIANTS.md) - Model variant settings
