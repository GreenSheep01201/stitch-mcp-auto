# Stitch MCP Auto

**[English](README.md)** | **[한국어](README.ko.md)**

> **Just let AI handle everything.** - AI에게 모든 걸 맡기세요.

**💡 AI에게 이 링크만 전달하세요:** `https://github.com/GreenSheep01201/stitch-mcp-auto`

한 번의 명령으로 설정 완료, 즉각적인 UI 디자인 생성. Google Stitch를 위한 가장 자동화된 MCP 서버.

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL-blue" alt="Platform">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen" alt="Node.js">
</p>

**주요 기능:**
- **자동 설정** - 한 번의 명령으로 모든 것을 설치 (gcloud 인증, API 활성화, MCP 설정)
- **다중 CLI 지원** - Claude Code, Gemini CLI, Codex CLI에서 모두 작동
- **19개 전문 도구** - 디자인 생성, 접근성 검사, 디자인 시스템 내보내기
- **5개 워크플로우 명령** - `/design`, `/design-system`, `/design-flow`, `/design-qa`, `/design-export`
- **🌐 다국어 지원** - 시스템 언어 자동 감지 (영어/한국어) - 설정 마법사 및 콘솔 메시지

---

## 목차

- [빠른 시작 (1분)](#-빠른-시작-1분)
- [수동 설치](#-수동-설치)
  - [1단계: Google Cloud CLI 설치](#1단계-google-cloud-cli-설치)
  - [2단계: 자동 설정 실행](#2단계-자동-설정-실행)
  - [3단계: MCP 클라이언트 설정](#3단계-mcp-클라이언트-설정)
- [사용 가능한 도구](#-사용-가능한-도구)
- [사용 예시](#-사용-예시)
- [문제 해결](#-문제-해결)
- [아키텍처](#-아키텍처)

---

## 사전 요구사항 (먼저 설치하세요)

### 1. Node.js 설치 (v18 이상)

#### Windows
```powershell
# winget 사용 (Windows 10/11)
winget install OpenJS.NodeJS.LTS

# 또는 https://nodejs.org/ 에서 설치 프로그램 다운로드
```

#### macOS
```bash
# Homebrew 사용
brew install node@22

# 또는 https://nodejs.org/ 에서 설치 프로그램 다운로드
```

#### Linux / WSL
```bash
# nvm 사용 (권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 또는 apt 사용 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Node.js 설치 확인:**
```bash
node --version   # v18.x.x 이상이어야 함
npm --version    # 9.x.x 이상이어야 함
```

---

### 2. Google Cloud CLI (gcloud) 설치

#### Windows

**방법 A: 설치 프로그램 (권장)**
1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)에서 다운로드
2. 설치 프로그램 실행 ("Run gcloud init" 옵션 체크)
3. 터미널 재시작

**방법 B: PowerShell**
```powershell
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:TEMP\gcloud.exe")
Start-Process "$env:TEMP\gcloud.exe" -Wait
# 설치 후 터미널 재시작
```

#### macOS
```bash
# Homebrew 사용 (권장)
brew install --cask google-cloud-sdk

# 또는 직접 설치
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

#### Linux / WSL
```bash
# 다운로드 및 설치
curl -sSL https://sdk.cloud.google.com | bash -s -- --disable-prompts --install-dir=$HOME

# PATH에 추가
echo 'export PATH="$HOME/google-cloud-sdk/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**gcloud 설치 확인:**
```bash
gcloud --version
# Google Cloud SDK xxx.x.x 형태로 출력되어야 함
```

---

## 빠른 시작

Node.js와 gcloud CLI 설치 후:

```bash
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

설정 마법사가 자동으로:
1. `http://localhost:51121`에서 웹 기반 설정 페이지 열기
2. Google 로그인 안내
3. 프로젝트 선택 또는 생성
4. Stitch API 활성화
5. 설정 저장

> **🤖 AI 에이전트 참고 (WSL 환경):**
> WSL에서 실행 시 브라우저가 자동으로 열리지 않습니다. PowerShell을 통해 Windows 브라우저에서 URL을 열어야 합니다:
> ```powershell
> # PowerShell에서 실행 (WSL 터미널 아님)
> Start-Process "http://localhost:51121"
> ```
> 또는 사용자에게 Windows 브라우저에서 `http://localhost:51121`을 직접 열도록 안내하세요.

---

## 수동 설치 (대안)

### 1단계: 자동 설정 실행

```bash
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

또는 저장소를 클론한 경우:
```bash
node setup.js
```

#### 설정 과정

1. **시작 페이지** - "Google로 로그인" 버튼 클릭
2. **Google 로그인** - 새 브라우저 창에서 인증 진행
   - 로그인 후 "연결 거부" 페이지가 나오면 **그냥 닫으세요**
   - 설정 페이지가 자동으로 로그인을 감지합니다
3. **프로젝트 선택** - 기존 프로젝트 선택 또는 새로 생성
4. **API 활성화** - 버튼을 클릭하여 Stitch API 활성화
   - 활성화까지 몇 초 걸릴 수 있음
5. **완료** - MCP 설정을 복사하여 에디터에 추가

> **⚠️ WSL 사용자 - 중요:**
> WSL은 브라우저를 직접 열 수 없습니다. 설정 마법사가 시작되면:
> 1. URL `http://localhost:51121`을 복사하세요
> 2. **Windows 브라우저** (Chrome, Edge 등)에서 직접 열기
> 3. 또는 PowerShell에서 실행: `Start-Process "http://localhost:51121"`
>
> WSL과 Windows는 localhost를 공유하므로 인증이 정상 작동합니다.

---

### 3단계: MCP 클라이언트 설정

설정이 완료되면 MCP 클라이언트에 설정을 추가합니다.

#### Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp-auto"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

#### Claude Code

프로젝트 루트에 `.mcp.json` 파일 생성:

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "stitch-mcp-auto"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

#### Cursor

**Settings > MCP > Add New Server**에서 추가:
- Command: `npx`
- Args: `-y stitch-mcp-auto`
- Environment: `GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID`

---

## 사용 가능한 도구

### 기본 Stitch API 도구

| 도구 | 설명 |
|------|------|
| `create_project` | 새 Stitch 프로젝트를 생성합니다. 프로젝트는 UI 디자인과 프론트엔드 코드를 담는 컨테이너입니다. |
| `get_project` | 프로젝트 이름을 사용하여 특정 Stitch 프로젝트의 세부 정보를 조회합니다. |
| `list_projects` | 사용자가 접근 가능한 모든 Stitch 프로젝트를 나열합니다. 기본적으로 소유한 프로젝트를 표시합니다. |
| `list_screens` | 특정 Stitch 프로젝트 내의 모든 화면을 나열합니다. |
| `get_screen` | 프로젝트 내 특정 화면의 세부 정보를 조회합니다. |
| `generate_screen_from_text` | 텍스트 프롬프트를 기반으로 프로젝트 내에 새 화면을 생성합니다. |
| `fetch_screen_code` | 화면의 실제 HTML/코드 콘텐츠를 가져옵니다. |
| `fetch_screen_image` | 화면의 스크린샷/미리보기 이미지를 가져옵니다. |

### 🎨 전문 웹 디자인 도구

#### 디자인 일관성 도구

| 도구 | 설명 |
|------|------|
| `extract_design_context` | 기존 화면에서 디자인 DNA(색상, 타이포그래피, 간격, 컴포넌트)를 추출하여 여러 화면에서 시각적 일관성을 유지합니다. |
| `apply_design_context` | 추출된 디자인 컨텍스트를 사용하여 시각적 일관성을 유지하는 새 화면을 생성합니다. |
| `compare_designs` | 두 화면을 비교하여 디자인 차이점, 불일치 사항을 식별하고 조화로운 개선을 제안합니다. |

#### 생산성 도구

| 도구 | 설명 |
|------|------|
| `generate_design_tokens` | 화면 디자인에서 디자인 토큰(CSS 변수, Tailwind 설정, SCSS, JSON)을 생성합니다. |
| `generate_responsive_variant` | 다른 디바이스 타입을 위한 기존 화면의 반응형 변형을 생성합니다. |
| `batch_generate_screens` | 일관된 디자인으로 여러 관련 화면을 한 번에 생성합니다. |

#### 품질 및 분석 도구

| 도구 | 설명 |
|------|------|
| `analyze_accessibility` | WCAG 2.1 접근성 준수 여부를 분석하고 실행 가능한 권장 사항을 제공합니다. |
| `extract_components` | 재사용 가능한 UI 컴포넌트 패턴(버튼, 카드, 폼)과 스타일을 추출합니다. |

#### 디자인 향상 도구

| 도구 | 설명 |
|------|------|
| `suggest_trending_design` | 2024-2025 UI 트렌드(글래스모피즘, 벤토 그리드, 그라데이션 메시 등)를 화면 생성에 적용합니다. |
| `generate_style_guide` | 기존 디자인에서 종합적인 스타일 가이드/디자인 문서를 생성합니다. |
| `export_design_system` | 개발자 핸드오프를 위한 완전한 디자인 시스템 패키지(토큰, 컴포넌트, 문서)를 내보냅니다. |

---

## MCP Prompts (자동 검색)

MCP Prompts는 서버가 연결되면 **자동으로 사용 가능**합니다 - 별도 설치가 필요 없습니다. MCP 클라이언트의 프롬프트 목록에 표시됩니다.

| 프롬프트 | 설명 |
|----------|------|
| `/stitch:design` | 자동 스타일 감지를 통한 스마트 UI 디자인 생성 |
| `/stitch:design-system` | 디자인 일관성을 유지하며 새 화면 생성 |
| `/stitch:design-flow` | 완전한 사용자 플로우를 위한 여러 화면 생성 |
| `/stitch:design-qa` | 접근성 (WCAG 2.1) 및 디자인 품질 검사 |
| `/stitch:design-export` | 개발자 핸드오프를 위한 디자인 시스템 패키지 내보내기 |

**Claude Code에서 사용:**
```
/stitch:design 다크 모드 로그인 페이지
/stitch:design-system 설정 페이지
/stitch:design-flow 온보딩: 환영 -> 가입 -> 완료
/stitch:design-qa all --level AA
/stitch:design-export --token_format tailwind
```

> **참고:** MCP Prompts에는 AI가 복잡한 디자인 작업을 자동으로 수행하도록 안내하는 상세한 워크플로우 지침이 포함되어 있습니다.

---

## 커스텀 명령어 (멀티 CLI 지원)

`npx -p stitch-mcp-auto stitch-mcp-auto-setup`을 실행하면 **커스텀 명령어**가 모든 주요 AI CLI 도구(Claude Code, Gemini CLI, Codex CLI)에 자동으로 설치됩니다.

### 지원 CLI

| CLI | 명령어 형식 | 설치 경로 |
|-----|------------|----------|
| **Claude Code** | `/design` | `~/.claude/commands/` |
| **Gemini CLI** | `/stitch:design` | `~/.gemini/commands/stitch/` |
| **Codex CLI** | `$stitch-design` | `~/.codex/skills/stitch/` |

### 사용 가능한 명령어

| 명령어 | Claude Code | Gemini CLI | Codex CLI | 설명 |
|--------|-------------|------------|-----------|------|
| design | `/design` | `/stitch:design` | `$stitch-design` | 스마트 UI 디자인 생성 |
| design-system | `/design-system` | `/stitch:design-system` | `$stitch-design-system` | 디자인 일관성 유지 |
| design-flow | `/design-flow` | `/stitch:design-flow` | `$stitch-design-flow` | 사용자 플로우 생성 |
| design-qa | `/design-qa` | `/stitch:design-qa` | `$stitch-design-qa` | 접근성 및 품질 검사 |
| design-export | `/design-export` | `/stitch:design-export` | `$stitch-design-export` | 디자인 시스템 내보내기 |

### 사용 예시

**Claude Code:**
```bash
/design login page dark mode
/design-system settings page
/design-flow onboarding: welcome -> signup -> complete
```

**Gemini CLI:**
```bash
/stitch:design login page dark mode
/stitch:design-system settings page
/stitch:design-flow onboarding: welcome -> signup -> complete
```

**Codex CLI:**
```bash
$stitch-design login page dark mode
$stitch-design-system settings page
$stitch-design-flow onboarding: welcome -> signup -> complete
```

### 명령어 설치 위치

명령어는 모든 CLI 디렉토리에 자동 설치됩니다:
```
~/.claude/commands/          # Claude Code (Markdown)
├── design.md
├── design-system.md
├── design-flow.md
├── design-qa.md
└── design-export.md

~/.gemini/commands/stitch/   # Gemini CLI (TOML)
├── design.toml
├── design-system.toml
├── design-flow.toml
├── design-qa.toml
└── design-export.toml

~/.codex/skills/stitch/      # Codex CLI (Skills)
├── design.md
├── design-system.md
├── design-flow.md
├── design-qa.md
└── design-export.md
```

---

## 사용 예시

### 새 프로젝트 생성

```
"내 앱"이라는 새 Stitch 프로젝트를 만들어줘
```

### 화면 생성

```
이메일과 비밀번호 입력 필드,
"비밀번호 찾기" 링크,
Google과 Apple 소셜 로그인 버튼이 있는 로그인 페이지를 만들어줘.
모던한 그라데이션 배경을 사용해.
```

### 특정 스타일로 생성

```
다음 요소가 있는 대시보드 화면을 만들어줘:
- 다크 테마
- 사이드바 네비게이션
- 상단에 4개의 통계 카드
- 주간 데이터를 보여주는 라인 차트
- 최근 활동 목록
```

### 한국어 페이지 생성

```
다음 요소가 포함된 한국어 쇼핑몰 상품 상세 페이지를 만들어줘:
- 상품 이미지 캐러셀
- 가격 및 할인 배지
- 사이즈 선택기
- 장바구니 담기 버튼
- 고객 리뷰 섹션
```

### "디자이너 플로우"

여러 화면에서 일관된 UI를 위해:

1. **기존 화면에서 디자인 컨텍스트 추출:**
   ```
   프로젝트 X의 홈 스크린에서 디자인 컨텍스트를 가져와줘
   ```

2. **같은 스타일로 새 화면 생성:**
   ```
   그 디자인 컨텍스트를 사용해서 같은 비주얼 스타일의 설정 화면을 생성해줘
   ```

### 디자인 토큰 활용

개발 워크플로우에 맞는 디자인 토큰 내보내기:

```
대시보드 화면의 디자인에서 CSS 변수를 생성해줘
```

```
홈 화면을 기반으로 Tailwind 설정을 만들어줘
```

### 트렌딩 디자인 생성

최신 UI/UX 트렌드 자동 적용:

```
글래스모피즘과 그라데이션 메시 효과를 적용한 가격 페이지를 만들어줘
```

```
벤토 그리드 레이아웃과 다크 모드를 사용한 대시보드를 디자인해줘
```

### 배치 화면 생성

일관된 스타일로 여러 화면을 한 번에 생성:

```
완전한 온보딩 플로우를 생성해줘: 환영, 기능 소개, 가입, 확인 화면
```

### 접근성 검사

디자인의 접근성 확보:

```
로그인 페이지가 WCAG AA를 준수하는지 확인해줘
```

### 디자인 시스템 내보내기

개발자 핸드오프를 위한 내보내기:

```
이 프로젝트의 완전한 디자인 시스템을 토큰과 컴포넌트 포함해서 내보내줘
```

---

## 문제 해결

### "gcloud: command not found"

**Linux/macOS/WSL:**
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
echo 'export PATH="$HOME/google-cloud-sdk/bin:$PATH"' >> ~/.bashrc
```

**Windows:** gcloud 설치 후 터미널을 재시작하세요.

---

### "Stitch API has not been used in project" 오류

API를 수동으로 활성화:
```bash
gcloud services enable stitch.googleapis.com --project=YOUR_PROJECT_ID
```

또는 방문: `https://console.cloud.google.com/apis/library/stitch.googleapis.com?project=YOUR_PROJECT_ID`

---

### 토큰 만료 / 인증 오류

인증 갱신:
```bash
gcloud auth login
```

또는 설정 재실행:
```bash
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

---

### Google 로그인 후 "연결 거부" 페이지

이것은 **정상적인 동작**입니다. Google 인증이 완료되면 브라우저가 gcloud가 사용하는 임시 콜백 서버인 `localhost:8085`로 리다이렉트됩니다. 인증이 완료되면 이 서버는 종료됩니다.

**해결:** 이 탭을 닫고 설정 페이지로 돌아가세요. 자동으로 로그인을 감지합니다.

---

### 브라우저가 자동으로 열리지 않음 (WSL)

WSL에서 브라우저가 자동으로 열리지 않으면:

1. 터미널에 표시된 URL을 복사
2. Windows 브라우저에 수동으로 붙여넣기
3. 로그인 완료
4. 설정 페이지로 돌아가기

---

### 전체 초기화

문제가 발생하면 모든 것을 초기화:

```bash
# stitch-mcp-auto 설정 삭제
rm -rf ~/.stitch-mcp-auto

# gcloud 자격 증명 취소
gcloud auth revoke --all

# 설정 재실행
npx -p stitch-mcp-auto stitch-mcp-auto-setup
```

---

## 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                        사용자 요청                            │
│              "로그인 페이지를 만들어줘..."                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI 에디터 (Claude/Cursor)                  │
│                         MCP 클라이언트                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     stitch-mcp-auto                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ setup.js    │  │ index.js    │  │ auth.js     │           │
│  │ (자동 설정)  │  │ (MCP 서버)  │  │ (OAuth)     │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ gcloud CLI  │  │ OAuth 2.0   │  │ Stitch API  │           │
│  │ (인증)      │  │ (토큰)      │   │ (UI 생성)   │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

### 파일 구조

```
stitch-mcp-auto/
├── index.js          # 메인 MCP 서버
├── setup.js          # 웹 기반 자동 설정 마법사
├── auth.js           # OAuth 헬퍼 유틸리티
├── package.json      # 의존성 및 스크립트
├── README.md         # 영문 문서
├── README.ko.md      # 한국어 문서
└── skills/           # Claude Code 슬래시 명령어
    ├── design.md
    ├── design-system.md
    ├── design-flow.md
    ├── design-qa.md
    └── design-export.md
```

### 설정 파일

| 파일 | 위치 | 용도 |
|------|------|------|
| `tokens.json` | `~/.stitch-mcp-auto/` | OAuth 액세스 토큰 |
| `config.json` | `~/.stitch-mcp-auto/` | 프로젝트 설정 |
| `commands/` | `~/.claude/commands/` | Claude Code 명령어 (자동 설치) |
| `commands/stitch/` | `~/.gemini/commands/stitch/` | Gemini CLI 명령어 (자동 설치) |
| `skills/stitch/` | `~/.codex/skills/stitch/` | Codex CLI 스킬 (자동 설치) |

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `npx -p stitch-mcp-auto stitch-mcp-auto-setup` | 대화형 설정 마법사 실행 |
| `npx stitch-mcp-auto` | MCP 서버 시작 (에디터에서 사용) |
| `node auth.js --status` | 인증 상태 확인 |
| `node auth.js --login` | 수동 로그인 |
| `node auth.js --logout` | 저장된 토큰 삭제 |

---

## 요구 사항

- **Node.js:** 18.0.0 이상
- **Google Cloud CLI:** 최신 버전
- **Google 계정:** Google Cloud Console 접근 권한 필요
- **MCP 클라이언트:** Claude Desktop, Claude Code, Cursor 또는 호환 에디터

---

## 라이선스

**Apache 2.0** - 오픈 소스, 무료 사용 가능

---

## 크레딧

- **제작자:** greensheep01201 (서원길)
- **원본 컨셉:** Aakash Kargathara [stitch-mcp](https://github.com/Kargatharaakash/stitch-mcp)

---

## 지원

- **이슈:** [GitHub Issues](https://github.com/GreenSheep01201/stitch-mcp-auto/issues)
- **문서:** [Google Stitch API](https://cloud.google.com/stitch)

---

*AI 커뮤니티를 위해 사랑을 담아 제작*
