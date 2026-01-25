#!/usr/bin/env node

/**
 * Stitch MCP Auto - Fully Automated Setup Script
 * Just let AI handle everything.
 *
 * Web-based setup with gcloud CLI authentication/project management
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const url = require('url');
const { execSync, spawn } = require('child_process');

// Config
const CONFIG_DIR = path.join(os.homedir(), '.stitch-mcp-auto');
const TOKEN_PATH = path.join(CONFIG_DIR, 'tokens.json');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const ANTIGRAVITY_TOKEN_PATH = path.join(CONFIG_DIR, 'antigravity_tokens.json');
const SKILLS_SOURCE_DIR = path.join(__dirname, 'skills');

// Antigravity OAuth 설정 (이미지 생성용) - opencode 방식
const ANTIGRAVITY_CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const ANTIGRAVITY_CLIENT_SECRET = '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';
const ANTIGRAVITY_REDIRECT_URI = 'http://localhost:51121/antigravity-callback';
const ANTIGRAVITY_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs'
];
const ANTIGRAVITY_ENDPOINTS = {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    daily: 'https://daily-cloudcode-pa.sandbox.googleapis.com',
    autopush: 'https://autopush-cloudcode-pa.sandbox.googleapis.com',
    prod: 'https://cloudcode-pa.googleapis.com'
};
// CLI-specific command installation paths
const CLI_TARGETS = {
    claude: path.join(os.homedir(), '.claude', 'commands'),
    gemini: path.join(os.homedir(), '.gemini', 'commands', 'stitch'),
    codex: path.join(os.homedir(), '.codex', 'skills', 'stitch')
};

// MCP config paths for each CLI
const MCP_CONFIG_PATHS = {
    claude: {
        json: path.join(os.homedir(), '.claude.json'),
        cli: 'claude',
        cliArgs: (projectId) => `mcp add -e GOOGLE_CLOUD_PROJECT=${projectId} -s user stitch -- npx -y stitch-mcp-auto`
    },
    gemini: {
        json: path.join(os.homedir(), '.gemini', 'settings.json'),
        cli: 'gemini',
        cliArgs: (projectId) => `mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=${projectId}`
    },
    codex: {
        toml: path.join(os.homedir(), '.codex', 'config.toml'),
        cli: 'codex',
        cliArgs: (projectId) => `mcp add stitch -- npx -y stitch-mcp-auto --env GOOGLE_CLOUD_PROJECT=${projectId}`
    }
};
const PORT = 51121;

// ============================================================
// i18n - Language Detection & Messages
// ============================================================
function detectLanguage() {
    const lang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '';
    return lang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

const LANG = detectLanguage();

const i18n = {
    en: {
        // Console messages
        consoleSetupTitle: 'Stitch MCP Auto Setup',
        consoleBrowserOpening: 'Opening setup page in browser...',
        consoleAutoClose: 'Setup will close automatically when complete.',
        consoleCtrlC: '(Press Ctrl+C to cancel)',
        consoleOpeningLogin: 'Opening Google login page...',
        consoleLoginComplete: 'Login complete',
        consoleProjectSelected: 'Project selected',
        consoleProjectCreated: 'Project created',
        consoleSetupComplete: 'Stitch MCP Setup Complete!',
        consoleProject: 'Project',
        consoleTokens: 'Tokens',
        consoleCommandsInstalled: 'Commands installed to',
        consoleAvailableCommands: 'Available commands',
        consoleSkillsNotFound: 'Skills directory not found, skipping...',
        consoleSkillsError: 'Skills installation error',
        consoleCommandsInstalled2: 'commands installed',
        consoleLoginFailed: 'Login failed',
        consoleBrowserManual: 'Please open browser manually',
        consoleAntigravityEnabled: 'Image generation enabled (Antigravity)',
        consoleAntigravitySkipped: 'Image generation skipped',
        consoleImageGeneration: 'Image Generation',
        consoleOpeningAntigravityOAuth: 'Opening Antigravity OAuth...',
        consoleTryingLoadCodeAssist: 'Trying loadCodeAssist',
        consoleProjectIdFound: 'Project ID found',
        consoleLoadCodeAssistError: 'loadCodeAssist error',
        consoleAntigravityAuthSuccess: 'Antigravity authentication successful',
        consoleAntigravityOAuthError: 'Antigravity OAuth error',
        consoleServerError: 'Error',
        consoleCanCloseWindow: 'You can close this window.',

        // HTML pages - Welcome
        welcomeGcloudRequired: 'gcloud CLI Required',
        welcomeGcloudNotInstalled: 'Google Cloud CLI is not installed',
        welcomeGcloudInstruction: 'Click the button below to open the installation page.<br>Refresh this page after installation.',
        welcomeInstallGcloud: 'Install gcloud CLI',
        welcomeRefresh: 'Refresh',
        welcomeAlreadyLoggedIn: 'Already Logged In',
        welcomeDifferentAccount: 'Login with different account',
        welcomeContinue: 'Continue',
        welcomeTitle: 'Stitch MCP Setup',
        welcomeSubtitle: 'AI-powered UI/UX design tool',
        welcomeDescription: 'Login with your Google account to get started',
        welcomeLoginButton: 'Login with Google',
        welcomeOpeningLogin: 'Opening login...',

        // HTML pages - Login
        loginWaiting: 'Waiting for login...',
        loginInstruction: 'Complete Google login in the browser',
        loginNotice: 'Notice',
        loginStep1: 'Complete Google login in the new window',
        loginStep2: 'If you see "Connection refused" page, just close it',
        loginStep3: 'This page will automatically proceed to the next step',
        loginCheckingAuth: 'Checking authentication',
        loginComplete: 'Login complete! Redirecting...',
        loginCompleteNext: 'Login complete → Next step',

        // HTML pages - Projects
        projectsTitle: 'Select Project',
        projectsNone: 'No projects found.<br>Create a new project.',
        projectsCreate: 'Create New Project',
        projectsIdPrompt: 'Project ID (lowercase letters, numbers, hyphens):',
        projectsIdError: 'Invalid format.\\n6-30 characters, must start with lowercase letter, only letters/numbers/hyphens allowed',
        projectsCreateFailed: 'Project creation failed',

        // HTML pages - API
        apiTitle: 'Enable API',
        apiSubtitle: 'Project',
        apiDescription: 'You need to enable the Stitch API.<br>Click the button below.',
        apiOpenButton: 'Open API Activation Page',
        apiChecking: 'Checking activation...',

        // HTML pages - Complete
        completeTitle: 'Setup Complete!',
        completeSubtitle: 'Stitch MCP Auto has been configured successfully',
        completeCommandsInstalled: 'Commands Installed for All CLIs',
        completeAddConfig: 'Add to your MCP config file:',
        completeCopyConfig: 'Copy Config',
        completeCopied: 'Copied to clipboard!',
        completeClose: 'Close',
        completeCommands: 'commands',
        completeSkills: 'skills',

        // HTML pages - Antigravity Choice
        antigravityChoiceTitle: 'Enable Image Generation?',
        antigravityChoiceSubtitle: 'Antigravity / Gemini 3 Pro',
        antigravityChoiceDescription: 'AI-powered image generation for design assets (icons, illustrations, backgrounds).<br>This feature is <strong>optional</strong>.',
        antigravityChoiceYes: 'Yes, enable it',
        antigravityChoiceNo: 'No, UI only',
        antigravityChoiceYesDesc: 'Generate images with Gemini 3 Pro',
        antigravityChoiceNoDesc: 'Skip image generation, design UI screens only',

        // HTML pages - Antigravity Auth
        antigravityTitle: 'Image Generation Setup',
        antigravitySubtitle: 'Antigravity / Gemini 3 Pro',
        antigravityDescription: 'Click the button below to authenticate with Google.',
        antigravityLoginButton: 'Authenticate',
        antigravityWaiting: 'Waiting for authentication...',
        antigravityComplete: 'Image generation enabled!',
        antigravitySkipped: 'Skipped - UI generation only',

        // Steps
        stepLogin: 'Login',
        stepProject: 'Project',
        stepAPI: 'API',
        stepAntigravity: 'Images',
        stepComplete: 'Complete',
    },
    ko: {
        // Console messages
        consoleSetupTitle: 'Stitch MCP 자동 설정',
        consoleBrowserOpening: '브라우저에서 설정 페이지가 열립니다...',
        consoleAutoClose: '설정이 완료되면 자동으로 종료됩니다.',
        consoleCtrlC: '(Ctrl+C로 취소)',
        consoleOpeningLogin: 'Google 로그인 페이지 열기...',
        consoleLoginComplete: '로그인 완료',
        consoleProjectSelected: '프로젝트 선택',
        consoleProjectCreated: '프로젝트 생성',
        consoleSetupComplete: 'Stitch MCP 설정 완료!',
        consoleProject: '프로젝트',
        consoleTokens: '토큰',
        consoleCommandsInstalled: '명령어 설치됨',
        consoleAvailableCommands: '사용 가능한 명령어',
        consoleSkillsNotFound: 'Skills 디렉토리를 찾을 수 없어 건너뜁니다...',
        consoleSkillsError: 'Skills 설치 오류',
        consoleCommandsInstalled2: '개 명령어 설치됨',
        consoleLoginFailed: '로그인 실패',
        consoleBrowserManual: '브라우저를 수동으로 열어주세요',
        consoleAntigravityEnabled: '이미지 생성 활성화됨 (Antigravity)',
        consoleAntigravitySkipped: '이미지 생성 건너뜀',
        consoleImageGeneration: '이미지 생성',
        consoleOpeningAntigravityOAuth: 'Antigravity OAuth 열기...',
        consoleTryingLoadCodeAssist: 'loadCodeAssist 시도',
        consoleProjectIdFound: '프로젝트 ID 발견',
        consoleLoadCodeAssistError: 'loadCodeAssist 오류',
        consoleAntigravityAuthSuccess: 'Antigravity 인증 성공',
        consoleAntigravityOAuthError: 'Antigravity OAuth 오류',
        consoleServerError: '오류',
        consoleCanCloseWindow: '이 창을 닫아도 됩니다.',

        // HTML pages - Welcome
        welcomeGcloudRequired: 'gcloud CLI 필요',
        welcomeGcloudNotInstalled: 'Google Cloud CLI가 설치되어 있지 않습니다',
        welcomeGcloudInstruction: '아래 버튼을 클릭하여 설치 페이지를 여세요.<br>설치 후 이 페이지를 새로고침하세요.',
        welcomeInstallGcloud: 'gcloud CLI 설치하기',
        welcomeRefresh: '새로고침',
        welcomeAlreadyLoggedIn: '이미 로그인됨',
        welcomeDifferentAccount: '다른 계정으로 로그인',
        welcomeContinue: '계속 진행',
        welcomeTitle: 'Stitch MCP Setup',
        welcomeSubtitle: 'AI 기반 UI/UX 디자인 도구',
        welcomeDescription: 'Google 계정으로 로그인하여 시작하세요',
        welcomeLoginButton: 'Google로 로그인',
        welcomeOpeningLogin: '로그인 창 여는 중...',

        // HTML pages - Login
        loginWaiting: '로그인 대기 중...',
        loginInstruction: '브라우저에서 Google 로그인을 완료하세요',
        loginNotice: '안내사항',
        loginStep1: '새 창에서 Google 로그인을 진행하세요',
        loginStep2: '로그인 후 "연결 거부" 페이지가 나오면 그냥 닫으세요',
        loginStep3: '이 페이지가 자동으로 다음 단계로 진행됩니다',
        loginCheckingAuth: '인증 확인 중',
        loginComplete: '로그인 완료! 이동 중...',
        loginCompleteNext: '로그인 완료됨 → 다음 단계',

        // HTML pages - Projects
        projectsTitle: '프로젝트 선택',
        projectsNone: '프로젝트가 없습니다.<br>새 프로젝트를 만드세요.',
        projectsCreate: '새 프로젝트 만들기',
        projectsIdPrompt: '프로젝트 ID (영문 소문자, 숫자, 하이픈):',
        projectsIdError: '잘못된 형식입니다.\\n6-30자, 영문 소문자로 시작, 영문/숫자/하이픈만 가능',
        projectsCreateFailed: '프로젝트 생성 실패',

        // HTML pages - API
        apiTitle: 'API 활성화',
        apiSubtitle: '프로젝트',
        apiDescription: 'Stitch API를 활성화해야 합니다.<br>아래 버튼을 클릭하세요.',
        apiOpenButton: 'API 활성화 페이지 열기',
        apiChecking: '활성화 확인 중...',

        // HTML pages - Complete
        completeTitle: '설정 완료!',
        completeSubtitle: 'Stitch MCP Auto가 성공적으로 구성되었습니다',
        completeCommandsInstalled: '모든 CLI에 명령어 설치됨',
        completeAddConfig: 'MCP 설정 파일에 추가하세요:',
        completeCopyConfig: '설정 복사',
        completeCopied: '클립보드에 복사됨!',
        completeClose: '닫기',
        completeCommands: '개 명령어',
        completeSkills: '개 스킬',

        // HTML pages - Antigravity Choice
        antigravityChoiceTitle: '이미지 생성 활성화?',
        antigravityChoiceSubtitle: 'Antigravity / Gemini 3 Pro',
        antigravityChoiceDescription: '디자인 에셋(아이콘, 일러스트, 배경)을 위한 AI 이미지 생성입니다.<br>이 기능은 <strong>선택 사항</strong>입니다.',
        antigravityChoiceYes: '예, 활성화',
        antigravityChoiceNo: '아니오, UI만',
        antigravityChoiceYesDesc: 'Gemini 3 Pro로 이미지 생성',
        antigravityChoiceNoDesc: '이미지 생성 건너뛰기, UI 화면만 디자인',

        // HTML pages - Antigravity Auth
        antigravityTitle: '이미지 생성 설정',
        antigravitySubtitle: 'Antigravity / Gemini 3 Pro',
        antigravityDescription: '아래 버튼을 클릭하여 Google 인증을 진행하세요.',
        antigravityLoginButton: '인증하기',
        antigravityWaiting: '인증 대기 중...',
        antigravityComplete: '이미지 생성 활성화 완료!',
        antigravitySkipped: '건너뜀 - UI 생성만 사용',

        // Steps
        stepLogin: '로그인',
        stepProject: '프로젝트',
        stepAPI: 'API',
        stepAntigravity: '이미지',
        stepComplete: '완료',
    }
};

const t = i18n[LANG];

// State storage
let setupState = {
    step: 'init',
    gcloudPath: null,
    userEmail: null,
    projects: [],
    selectedProject: null,
    apiEnabled: false,
    antigravityEnabled: false,
    antigravitySkipped: false,
    error: null
};

// Find gcloud path
function findGcloud() {
    const paths = [
        path.join(os.homedir(), 'google-cloud-sdk', 'bin', 'gcloud'),
        '/usr/local/bin/gcloud',
        '/usr/bin/gcloud',
        '/snap/bin/gcloud',
        'gcloud'
    ];

    if (os.platform() === 'win32') {
        paths.unshift(
            path.join(process.env.LOCALAPPDATA || '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
            path.join(process.env.PROGRAMFILES || '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd')
        );
    }

    for (const p of paths) {
        try {
            if (fs.existsSync(p)) return p;
            execSync(`which "${p}"`, { stdio: 'ignore' });
            return p;
        } catch (e) {}
    }
    return null;
}

// Execute gcloud command
function gcloudExec(args, silent = true) {
    if (!setupState.gcloudPath) return null;
    try {
        return execSync(`"${setupState.gcloudPath}" ${args}`, {
            encoding: 'utf8',
            stdio: silent ? 'pipe' : 'inherit'
        }).trim();
    } catch (e) {
        return null;
    }
}

// Check current auth status
function checkAuth() {
    const account = gcloudExec('auth list --format="value(account)" --filter="status:ACTIVE"');
    return account || null;
}

// List projects
function listProjects() {
    const json = gcloudExec('projects list --format=json --limit=20');
    try {
        return JSON.parse(json || '[]');
    } catch (e) {
        return [];
    }
}

// Get access token
function getAccessToken() {
    return gcloudExec('auth print-access-token');
}

// HTML style
const baseStyle = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }
    .container {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 24px;
        padding: 48px;
        max-width: 520px;
        width: 100%;
        box-shadow: 0 25px 50px rgba(0,0,0,0.25);
        text-align: center;
    }
    h1 { color: #1a1a2e; margin-bottom: 8px; font-size: 28px; }
    .subtitle { color: #666; margin-bottom: 32px; font-size: 16px; }
    .step-indicator {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 32px;
    }
    .step-dot {
        width: 12px; height: 12px;
        border-radius: 50%;
        background: #ddd;
        transition: all 0.3s;
    }
    .step-dot.active { background: #667eea; transform: scale(1.2); }
    .step-dot.done { background: #4CAF50; }
    .btn {
        display: inline-block;
        padding: 16px 32px;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        text-decoration: none;
        transition: transform 0.2s, box-shadow 0.2s;
        margin: 8px;
    }
    .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    .btn-secondary {
        background: #f0f0f0;
        color: #333;
    }
    .btn-secondary:hover { box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
    .btn-success { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); }
    .icon { font-size: 64px; margin-bottom: 24px; }
    .project-list {
        text-align: left;
        margin: 24px 0;
        max-height: 280px;
        overflow-y: auto;
    }
    .project-item {
        padding: 16px;
        border: 2px solid #eee;
        border-radius: 12px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .project-item:hover {
        border-color: #667eea;
        background: #f8f9ff;
    }
    .project-name { font-weight: 600; color: #333; }
    .project-id { font-size: 13px; color: #666; margin-top: 4px; }
    .loading {
        display: inline-block;
        width: 24px; height: 24px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { color: #e74c3c; margin: 16px 0; padding: 12px; background: #fdf2f2; border-radius: 8px; }
    .success { color: #27ae60; }
    .info-box {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 16px;
        margin: 24px 0;
        text-align: left;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 12px;
        word-break: break-all;
        white-space: pre-wrap;
        max-height: 200px;
        overflow-y: auto;
    }
    .progress-text { color: #666; margin: 16px 0; }
    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
    }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-done { background: #d4edda; color: #155724; }
`;

function createPage(content, currentStep = 1) {
    const steps = [t.stepLogin, t.stepProject, t.stepAPI, t.stepAntigravity, t.stepComplete];
    const stepDots = steps.map((s, i) => {
        let cls = 'step-dot';
        if (i + 1 < currentStep) cls += ' done';
        else if (i + 1 === currentStep) cls += ' active';
        return `<div class="${cls}" title="${s}"></div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="${LANG}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stitch MCP Setup</title>
    <style>${baseStyle}</style>
</head>
<body>
    <div class="container">
        <div class="step-indicator">${stepDots}</div>
        ${content}
    </div>
</body>
</html>`;
}

// Pages
function welcomePage() {
    const hasGcloud = !!setupState.gcloudPath;
    const isLoggedIn = !!setupState.userEmail;

    if (!hasGcloud) {
        return createPage(`
            <div class="icon">⚠️</div>
            <h1>${t.welcomeGcloudRequired}</h1>
            <p class="subtitle">${t.welcomeGcloudNotInstalled}</p>
            <p style="color: #666; margin-bottom: 24px;">
                ${t.welcomeGcloudInstruction}
            </p>
            <a href="https://cloud.google.com/sdk/docs/install" target="_blank" class="btn">
                📥 ${t.welcomeInstallGcloud}
            </a>
            <button class="btn btn-secondary" onclick="location.reload()">🔄 ${t.welcomeRefresh}</button>
        `, 1);
    }

    if (isLoggedIn) {
        return createPage(`
            <div class="icon">✅</div>
            <h1>${t.welcomeAlreadyLoggedIn}</h1>
            <p class="subtitle">${setupState.userEmail}</p>
            <p style="color: #666; margin-bottom: 24px;">
                ${t.welcomeDifferentAccount}
            </p>
            <a href="/projects" class="btn btn-success">${t.welcomeContinue} →</a>
            <a href="/login" class="btn btn-secondary">${t.welcomeDifferentAccount}</a>
        `, 1);
    }

    return createPage(`
        <div class="icon">🎨</div>
        <h1>${t.welcomeTitle}</h1>
        <p class="subtitle">${t.welcomeSubtitle}</p>
        <p style="color: #666; margin-bottom: 32px;">
            ${t.welcomeDescription}
        </p>
        <button class="btn" onclick="startLogin()" id="loginBtn">🔐 ${t.welcomeLoginButton}</button>
        <script>
            function startLogin() {
                document.getElementById('loginBtn').disabled = true;
                document.getElementById('loginBtn').textContent = '${t.welcomeOpeningLogin}';
                fetch('/start-login').then(() => {
                    window.location.href = '/login';
                });
            }
        </script>
    `, 1);
}

function loginPage() {
    return createPage(`
        <div class="icon"><div class="loading"></div></div>
        <h1>${t.loginWaiting}</h1>
        <p class="progress-text">${t.loginInstruction}</p>

        <div style="background: #fff3cd; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: left;">
            <p style="color: #856404; font-size: 14px; margin-bottom: 8px;">
                <strong>📌 ${t.loginNotice}</strong>
            </p>
            <ol style="color: #856404; font-size: 13px; padding-left: 20px; margin: 0;">
                <li>${t.loginStep1}</li>
                <li>${t.loginStep2}</li>
                <li>${t.loginStep3}</li>
            </ol>
        </div>
        <p id="status" style="color: #666; font-size: 13px;"></p>
        <button class="btn btn-secondary" onclick="location.href='/projects'" style="margin-top: 16px;">
            ${t.loginCompleteNext}
        </button>

        <script>
            let dots = 0;
            const interval = setInterval(() => {
                dots = (dots + 1) % 4;
                document.getElementById('status').textContent = '${t.loginCheckingAuth}' + '.'.repeat(dots);

                fetch('/check-auth')
                    .then(r => r.json())
                    .then(data => {
                        if (data.loggedIn) {
                            clearInterval(interval);
                            document.getElementById('status').innerHTML =
                                '<span style="color: #27ae60;">✅ ${t.loginComplete}</span>';
                            setTimeout(() => {
                                window.location.href = '/projects';
                            }, 1000);
                        }
                    })
                    .catch(() => {});
            }, 2000);
        </script>
    `, 1);
}

function projectsPage(error = null) {
    const projects = setupState.projects;
    const projectList = projects.length > 0
        ? projects.map(p => `
            <div class="project-item" onclick="selectProject('${p.projectId}')">
                <div class="project-name">${p.name || p.projectId}</div>
                <div class="project-id">${p.projectId}</div>
            </div>
        `).join('')
        : `<p style="color: #666; text-align: center; padding: 32px;">
            ${t.projectsNone}
           </p>`;

    return createPage(`
        <div class="icon">📁</div>
        <h1>${t.projectsTitle}</h1>
        <p class="subtitle">${setupState.userEmail}</p>
        ${error ? `<div class="error">${error}</div>` : ''}
        <div class="project-list">${projectList}</div>
        <button class="btn" onclick="createNewProject()">➕ ${t.projectsCreate}</button>
        <script>
            function selectProject(id) {
                window.location.href = '/select-project?id=' + encodeURIComponent(id);
            }
            function createNewProject() {
                const defaultId = 'auto-stitch-' + Date.now().toString(36).slice(-6);
                const id = prompt('${t.projectsIdPrompt}', defaultId);
                if (id && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(id)) {
                    window.location.href = '/create-project?id=' + encodeURIComponent(id);
                } else if (id) {
                    alert('${t.projectsIdError}');
                }
            }
        </script>
    `, 2);
}

function apiPage() {
    const projectId = setupState.selectedProject;
    return createPage(`
        <div class="icon">🔌</div>
        <h1>${t.apiTitle}</h1>
        <p class="subtitle">${t.apiSubtitle}: ${projectId}</p>
        <p style="color: #666; margin-bottom: 24px;">
            ${t.apiDescription}
        </p>
        <a href="https://console.cloud.google.com/apis/library/stitch.googleapis.com?project=${projectId}"
           target="_blank" class="btn" id="apiBtn" onclick="startCheck()">
            🚀 ${t.apiOpenButton}
        </a>
        <p id="status" class="progress-text" style="margin-top: 24px;"></p>
        <script>
            let checking = false;
            function startCheck() {
                if (checking) return;
                checking = true;
                document.getElementById('status').innerHTML =
                    '<div class="loading" style="display:inline-block;width:16px;height:16px;vertical-align:middle;"></div> ${t.apiChecking}';
                checkApi();
            }
            function checkApi() {
                fetch('/check-api')
                    .then(r => r.json())
                    .then(data => {
                        if (data.enabled) {
                            window.location.href = '/antigravity-choice';
                        } else {
                            setTimeout(checkApi, 3000);
                        }
                    })
                    .catch(() => setTimeout(checkApi, 3000));
            }
            // Check if already enabled
            fetch('/check-api').then(r => r.json()).then(data => {
                if (data.enabled) window.location.href = '/antigravity-choice';
            });
        </script>
    `, 3);
}

function antigravityChoicePage() {
    return createPage(`
        <div class="icon">🎨</div>
        <h1>${t.antigravityChoiceTitle}</h1>
        <p class="subtitle">${t.antigravityChoiceSubtitle}</p>
        <p style="color: #666; margin-bottom: 32px;">
            ${t.antigravityChoiceDescription}
        </p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px; max-width: 220px;">
                <a href="/antigravity-auth" class="btn btn-success" style="display: block; margin-bottom: 8px;">
                    ✅ ${t.antigravityChoiceYes}
                </a>
                <p style="font-size: 12px; color: #666;">${t.antigravityChoiceYesDesc}</p>
            </div>
            <div style="flex: 1; min-width: 200px; max-width: 220px;">
                <a href="/antigravity-skip" class="btn btn-secondary" style="display: block; margin-bottom: 8px;">
                    ⏭️ ${t.antigravityChoiceNo}
                </a>
                <p style="font-size: 12px; color: #666;">${t.antigravityChoiceNoDesc}</p>
            </div>
        </div>
    `, 4);
}

function antigravityAuthPage() {
    return createPage(`
        <div class="icon"><div class="loading"></div></div>
        <h1>${t.antigravityTitle}</h1>
        <p class="subtitle">${t.antigravitySubtitle}</p>
        <p style="color: #666; margin-bottom: 24px;">
            ${t.antigravityDescription}
        </p>
        <button class="btn" onclick="startAntigravityAuth()" id="authBtn">
            🔐 ${t.antigravityLoginButton}
        </button>
        <p id="status" class="progress-text" style="margin-top: 24px;"></p>
        <script>
            let authStarted = false;
            function startAntigravityAuth() {
                if (authStarted) return;
                authStarted = true;
                document.getElementById('authBtn').disabled = true;
                document.getElementById('authBtn').style.opacity = '0.5';
                document.getElementById('status').innerHTML =
                    '<div class="loading" style="display:inline-block;width:16px;height:16px;vertical-align:middle;"></div> ${t.antigravityWaiting}';

                fetch('/start-antigravity-auth').then(() => {
                    checkAntigravityAuth();
                });
            }
            function checkAntigravityAuth() {
                fetch('/check-antigravity-auth')
                    .then(r => r.json())
                    .then(data => {
                        if (data.authenticated) {
                            document.getElementById('status').innerHTML =
                                '<span style="color: #27ae60;">✅ ${t.antigravityComplete}</span>';
                            setTimeout(() => {
                                window.location.href = '/complete';
                            }, 1000);
                        } else {
                            setTimeout(checkAntigravityAuth, 2000);
                        }
                    })
                    .catch(() => setTimeout(checkAntigravityAuth, 2000));
            }
            // Auto-start auth
            startAntigravityAuth();
        </script>
    `, 4);
}

function completePage(skillsResult = null, mcpResults = null) {
    const projectId = setupState.selectedProject;
    const config = JSON.stringify({
        mcpServers: {
            stitch: {
                command: 'npx',
                args: ['-y', 'stitch-mcp-auto'],
                env: { GOOGLE_CLOUD_PROJECT: projectId }
            }
        }
    }, null, 2);

    // Generate CLI-specific installation results
    let skillsInfo = '';
    if (skillsResult && !skillsResult.error) {
        const cliResults = [];

        // Claude Code
        if (skillsResult.claude && skillsResult.claude.installed.length > 0) {
            cliResults.push(`
                <div style="margin-bottom: 8px;">
                    <strong>Claude Code</strong> - ${skillsResult.claude.installed.length} ${t.completeCommands}
                    <div style="font-size: 12px; color: #666;">
                        ${skillsResult.claude.installed.map(s => `/${s}`).join(', ')}
                    </div>
                </div>
            `);
        }

        // Gemini CLI
        if (skillsResult.gemini && skillsResult.gemini.installed.length > 0) {
            cliResults.push(`
                <div style="margin-bottom: 8px;">
                    <strong>Gemini CLI</strong> - ${skillsResult.gemini.installed.length} ${t.completeCommands}
                    <div style="font-size: 12px; color: #666;">
                        ${skillsResult.gemini.installed.map(s => `/stitch:${s}`).join(', ')}
                    </div>
                </div>
            `);
        }

        // Codex CLI
        if (skillsResult.codex && skillsResult.codex.installed.length > 0) {
            cliResults.push(`
                <div style="margin-bottom: 8px;">
                    <strong>Codex CLI</strong> - ${skillsResult.codex.installed.length} ${t.completeSkills}
                    <div style="font-size: 12px; color: #666;">
                        ${skillsResult.codex.installed.map(s => `$stitch-${s}`).join(', ')}
                    </div>
                </div>
            `);
        }

        if (cliResults.length > 0) {
            skillsInfo = `
                <div style="background: #d4edda; border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                    <strong style="color: #155724; display: block; margin-bottom: 12px;">✅ ${t.completeCommandsInstalled}</strong>
                    <div style="color: #155724;">
                        ${cliResults.join('')}
                    </div>
                </div>
            `;
        }
    }

    // MCP registration results
    let mcpInfo = '';
    if (mcpResults) {
        const mcpStatusList = [];

        for (const [cli, result] of Object.entries(mcpResults)) {
            let statusIcon, statusText;
            if (result.success) {
                if (result.alreadyInstalled) {
                    statusIcon = '✓';
                    statusText = 'Already registered';
                } else {
                    statusIcon = '✓';
                    statusText = result.method === 'cli' ? 'Registered via CLI' : 'Config file updated';
                }
            } else {
                statusIcon = '⚠';
                statusText = result.error || 'CLI not available';
            }

            mcpStatusList.push(`
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>${cli.charAt(0).toUpperCase() + cli.slice(1)}</span>
                    <span style="color: ${result.success ? '#155724' : '#856404'};">${statusIcon} ${statusText}</span>
                </div>
            `);
        }

        mcpInfo = `
            <div style="background: #e7f3ff; border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                <strong style="color: #004085; display: block; margin-bottom: 12px;">🔌 MCP Server Registration</strong>
                <div style="color: #004085; font-size: 13px;">
                    ${mcpStatusList.join('')}
                </div>
            </div>
        `;
    }

    // Antigravity status
    const antigravityStatus = setupState.antigravityEnabled
        ? '✅ Enabled (Gemini 3 Pro)'
        : '⏭️ Skipped (UI only)';

    return createPage(`
        <div class="icon">🎉</div>
        <h1>${t.completeTitle}</h1>
        <p class="subtitle success">${t.completeSubtitle}</p>
        <div class="info-box">Project: ${projectId}
Tokens: ~/.stitch-mcp-auto/tokens.json
Image Generation: ${antigravityStatus}

Commands installed to:
├─ Claude Code: ~/.claude/commands/
├─ Gemini CLI:  ~/.gemini/commands/stitch/
└─ Codex CLI:   ~/.codex/skills/stitch/</div>
        ${skillsInfo}
        ${mcpInfo}
        <p style="color: #666; margin-bottom: 8px;">${t.completeAddConfig}</p>
        <div class="info-box">${escapeHtml(config)}</div>
        <button class="btn" onclick="copyConfig()">📋 ${t.completeCopyConfig}</button>
        <button class="btn btn-secondary" onclick="window.close()">${t.completeClose}</button>
        <script>
            function copyConfig() {
                navigator.clipboard.writeText(${JSON.stringify(config)});
                alert('${t.completeCopied}');
            }
        </script>
    `, 5);
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Markdown → Gemini CLI TOML conversion
function convertToGeminiToml(mdContent, filename) {
    // Parse YAML frontmatter
    const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---/);
    let description = `Stitch MCP: ${filename}`;

    if (frontmatterMatch) {
        const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
        if (descMatch) description = descMatch[1].trim();
    }

    // Remove frontmatter and extract body
    const body = mdContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

    // Convert to TOML format
    return `# Stitch MCP - ${filename}
# Auto-generated for Gemini CLI

description = "${description.replace(/"/g, '\\"')}"

prompt = """
${body}

User request: {{args}}
"""
`;
}

// Markdown → Codex CLI Skills conversion
function convertToCodexSkill(mdContent, filename) {
    // Parse YAML frontmatter
    const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---/);
    let name = filename;
    let description = `Stitch MCP: ${filename}`;

    if (frontmatterMatch) {
        const nameMatch = frontmatterMatch[1].match(/name:\s*(.+)/);
        const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
        if (nameMatch) name = nameMatch[1].trim();
        if (descMatch) description = descMatch[1].trim();
    }

    // Remove frontmatter and extract body
    const body = mdContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

    // Codex Skills format (AGENTS.md style)
    return `# $stitch-${filename}

${description}

## Instructions

${body}
`;
}

// Install Skills (all CLI support)
function installSkills() {
    const result = {
        claude: { installed: [], skipped: [] },
        gemini: { installed: [], skipped: [] },
        codex: { installed: [], skipped: [] },
        error: null
    };

    try {
        // Check Skills source directory
        if (!fs.existsSync(SKILLS_SOURCE_DIR)) {
            console.log(`⚠️  ${t.consoleSkillsNotFound}`);
            return { ...result, error: 'Source directory not found' };
        }

        const skillFiles = fs.readdirSync(SKILLS_SOURCE_DIR).filter(f => f.endsWith('.md'));

        // Install for each CLI
        for (const [cli, targetDir] of Object.entries(CLI_TARGETS)) {
            // Create target directory
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            for (const file of skillFiles) {
                const sourcePath = path.join(SKILLS_SOURCE_DIR, file);
                const filename = file.replace('.md', '');

                try {
                    const content = fs.readFileSync(sourcePath, 'utf8');
                    let targetPath, targetContent;

                    switch (cli) {
                        case 'claude':
                            // Claude Code: Copy as-is
                            targetPath = path.join(targetDir, file);
                            targetContent = content;
                            break;
                        case 'gemini':
                            // Gemini CLI: Convert to TOML format
                            targetPath = path.join(targetDir, `${filename}.toml`);
                            targetContent = convertToGeminiToml(content, filename);
                            break;
                        case 'codex':
                            // Codex CLI: Convert to Skills format
                            targetPath = path.join(targetDir, file);
                            targetContent = convertToCodexSkill(content, filename);
                            break;
                    }

                    fs.writeFileSync(targetPath, targetContent, 'utf8');
                    result[cli].installed.push(filename);
                } catch (e) {
                    result[cli].skipped.push({ file, error: e.message });
                }
            }
        }

        // Log results
        for (const [cli, data] of Object.entries(result)) {
            if (cli === 'error') continue;
            if (data.installed.length > 0) {
                console.log(`✅ ${cli.toUpperCase()} ${t.consoleCommandsInstalled2}: ${data.installed.length}`);
            }
        }
    } catch (e) {
        console.error(`❌ ${t.consoleSkillsError}:`, e.message);
        return { ...result, error: e.message };
    }

    return result;
}

// Save MCP settings for all CLIs
function saveAllMcpSettings(projectId) {
    const results = {
        claude: { success: false, alreadyInstalled: false, error: null, method: null },
        gemini: { success: false, alreadyInstalled: false, error: null, method: null },
        codex: { success: false, alreadyInstalled: false, error: null, method: null }
    };

    results.claude = saveMcpSettingsForCli('claude', projectId);
    results.gemini = saveMcpSettingsForCli('gemini', projectId);
    results.codex = saveMcpSettingsForCli('codex', projectId);

    return results;
}

// Save MCP settings for a specific CLI (config file only - CLI commands can block)
function saveMcpSettingsForCli(cliName, projectId) {
    const result = { success: false, alreadyInstalled: false, error: null, method: null };
    const config = MCP_CONFIG_PATHS[cliName];

    if (!config) {
        result.error = `Unknown CLI: ${cliName}`;
        return result;
    }

    // Write directly to config file (CLI commands can hang, so skip them)
    try {
        if (config.json) {
            // JSON config (Claude, Gemini)
            const configDir = path.dirname(config.json);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            let settings = {};
            if (fs.existsSync(config.json)) {
                try {
                    settings = JSON.parse(fs.readFileSync(config.json, 'utf8'));
                } catch (e) {
                    settings = {};
                }
            }

            if (!settings.mcpServers) {
                settings.mcpServers = {};
            }

            if (settings.mcpServers.stitch) {
                result.alreadyInstalled = true;
                if (settings.mcpServers.stitch.env?.GOOGLE_CLOUD_PROJECT !== projectId) {
                    settings.mcpServers.stitch.env = { GOOGLE_CLOUD_PROJECT: projectId };
                    fs.writeFileSync(config.json, JSON.stringify(settings, null, 2));
                }
                result.success = true;
                result.method = 'file';
                return result;
            }

            settings.mcpServers.stitch = {
                command: 'npx',
                args: ['-y', 'stitch-mcp-auto'],
                env: { GOOGLE_CLOUD_PROJECT: projectId }
            };

            fs.writeFileSync(config.json, JSON.stringify(settings, null, 2));
            result.success = true;
            result.method = 'file';
            console.log(`✅ ${cliName}: MCP settings installed: ${config.json}`);
        } else if (config.toml) {
            // TOML config (Codex)
            const configDir = path.dirname(config.toml);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            let tomlContent = '';
            if (fs.existsSync(config.toml)) {
                tomlContent = fs.readFileSync(config.toml, 'utf8');
            }

            // Check if stitch is already configured (any format)
            if (tomlContent.includes('[mcp_servers.stitch]')) {
                result.alreadyInstalled = true;

                // Remove old stitch config (all formats) and add new one
                // Use a safer regex that handles array brackets like args = ["-y", ...]
                // Match from [mcp_servers.stitch] until next section or end of file
                tomlContent = tomlContent.replace(
                    /\[mcp_servers\.stitch\][\s\S]*?(?=\n\[(?!mcp_servers\.stitch)|$)/g,
                    ''
                ).trim();

                // Add new stitch config with env section
                const stitchToml = `

[mcp_servers.stitch]
command = "npx"
args = ["-y", "stitch-mcp-auto"]

[mcp_servers.stitch.env]
GOOGLE_CLOUD_PROJECT = "${projectId}"
`;
                fs.writeFileSync(config.toml, tomlContent + stitchToml);
                result.success = true;
                result.method = 'file';
                console.log(`✅ ${cliName}: MCP settings updated: ${config.toml}`);
                return result;
            }

            const stitchToml = `

[mcp_servers.stitch]
command = "npx"
args = ["-y", "stitch-mcp-auto"]

[mcp_servers.stitch.env]
GOOGLE_CLOUD_PROJECT = "${projectId}"
`;
            fs.writeFileSync(config.toml, tomlContent + stitchToml);
            result.success = true;
            result.method = 'file';
            console.log(`✅ ${cliName}: MCP settings installed: ${config.toml}`);
        }
    } catch (e) {
        result.error = e.message;
        console.error(`❌ ${cliName}: Failed to install MCP settings: ${e.message}`);
    }

    return result;
}

// Save tokens
function saveTokens(projectId) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const accessToken = getAccessToken();
    const tokens = {
        access_token: accessToken,
        refresh_token: null,
        expiry_date: Date.now() + 3600000,
        managed_by: 'gcloud'
    };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

    const config = { projectId, setupComplete: true, setupDate: new Date().toISOString() };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    // Install Skills
    const skillsResult = installSkills();
    return skillsResult;
}

// Check API enabled
function checkApiEnabled(projectId) {
    // Check services list with gcloud
    const result = gcloudExec(`services list --project=${projectId} --filter="name:stitch" --format="value(name)"`);
    return result && result.includes('stitch');
}

// Start gcloud auth login
function startGcloudLogin() {
    return new Promise((resolve, reject) => {
        const gcloud = setupState.gcloudPath;
        let browserOpened = false;

        // WSL may not be able to open browser, so detect URL and open manually
        const child = spawn(gcloud, ['auth', 'login', '--brief'], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        const handleOutput = (data) => {
            const output = data.toString();
            process.stdout.write(output);  // Output to terminal

            // Detect URL (open only once)
            if (!browserOpened) {
                const urlMatch = output.match(/https:\/\/accounts\.google\.com[^\s\n]+/);
                if (urlMatch) {
                    browserOpened = true;
                    console.log(`\n🌐 ${t.consoleOpeningLogin}`);
                    openBrowser(urlMatch[0]);
                }
            }
        };

        child.stdout.on('data', handleOutput);
        child.stderr.on('data', handleOutput);

        child.on('close', (code) => {
            if (code === 0) {
                setupState.userEmail = checkAuth();
                setupState.projects = listProjects();
                console.log(`✅ ${t.consoleLoginComplete}: ${setupState.userEmail}`);
                resolve();
            } else {
                reject(new Error(t.consoleLoginFailed));
            }
        });
    });
}

// Open browser
function openBrowser(url) {
    const platform = os.platform();

    // Detect WSL (check first)
    const isWSL = (() => {
        try {
            if (fs.existsSync('/proc/version')) {
                const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
                return version.includes('microsoft') || version.includes('wsl');
            }
        } catch (e) {}
        return false;
    })();

    try {
        if (platform === 'win32') {
            execSync(`start "" "${url}"`, { stdio: 'ignore' });
        } else if (platform === 'darwin') {
            execSync(`open "${url}"`, { stdio: 'ignore' });
        } else if (isWSL) {
            // WSL: Use Windows browser
            try {
                execSync(`cmd.exe /c start "" "${url.replace(/&/g, '^&')}"`, { stdio: 'ignore' });
            } catch (e) {
                // Try powershell if cmd.exe fails
                execSync(`powershell.exe -Command "Start-Process '${url}'"`, { stdio: 'ignore' });
            }
        } else {
            execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
        }
    } catch (e) {
        console.log(`\n⚠️  ${t.consoleBrowserManual}:\n   ${url}\n`);
    }
}

// Start server
let loginInProgress = false;
let loginStarted = false;
let antigravityAuthInProgress = false;

async function startServer() {
    // Check initial state
    setupState.gcloudPath = findGcloud();
    if (setupState.gcloudPath) {
        setupState.userEmail = checkAuth();
        if (setupState.userEmail) {
            setupState.projects = listProjects();
        }
    }

    const server = http.createServer(async (req, res) => {
        const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
        const pathname = parsedUrl.pathname;

        try {
            // Main page
            if (pathname === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(welcomePage());
            }
            // Login page (don't run gcloud)
            else if (pathname === '/login') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(loginPage());
            }
            // Start actual login (AJAX call)
            else if (pathname === '/start-login') {
                res.writeHead(200, { 'Content-Type': 'application/json' });

                if (loginInProgress) {
                    res.end(JSON.stringify({ status: 'already_running' }));
                    return;
                }

                loginInProgress = true;
                loginStarted = true;

                // Start gcloud login in background
                startGcloudLogin()
                    .then(() => { loginInProgress = false; })
                    .catch(() => { loginInProgress = false; });

                res.end(JSON.stringify({ status: 'started' }));
            }
            // Check auth status
            else if (pathname === '/check-auth') {
                setupState.userEmail = checkAuth();
                if (setupState.userEmail) {
                    setupState.projects = listProjects();
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ loggedIn: !!setupState.userEmail, email: setupState.userEmail }));
            }
            // Projects page
            else if (pathname === '/projects') {
                if (!setupState.userEmail) {
                    res.writeHead(302, { Location: '/' });
                    res.end();
                    return;
                }
                setupState.projects = listProjects();
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(projectsPage());
            }
            // Select project
            else if (pathname === '/select-project') {
                const projectId = parsedUrl.searchParams.get('id');
                setupState.selectedProject = projectId;
                gcloudExec(`config set project ${projectId}`);
                console.log(`✅ ${t.consoleProjectSelected}: ${projectId}`);
                res.writeHead(302, { Location: '/api' });
                res.end();
            }
            // Create project
            else if (pathname === '/create-project') {
                const projectId = parsedUrl.searchParams.get('id');
                try {
                    gcloudExec(`projects create ${projectId} --name="${projectId}"`, false);
                    setupState.selectedProject = projectId;
                    gcloudExec(`config set project ${projectId}`);
                    console.log(`✅ ${t.consoleProjectCreated}: ${projectId}`);
                    // Wait briefly
                    await new Promise(r => setTimeout(r, 2000));
                    res.writeHead(302, { Location: '/api' });
                    res.end();
                } catch (e) {
                    setupState.projects = listProjects();
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(projectsPage(`${t.projectsCreateFailed}: ${e.message}`));
                }
            }
            // API activation page
            else if (pathname === '/api') {
                if (!setupState.selectedProject) {
                    res.writeHead(302, { Location: '/projects' });
                    res.end();
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(apiPage());
            }
            // Check API activation
            else if (pathname === '/check-api') {
                const enabled = checkApiEnabled(setupState.selectedProject);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ enabled }));
            }
            // Antigravity choice page
            else if (pathname === '/antigravity-choice') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(antigravityChoicePage());
            }
            // Antigravity auth page
            else if (pathname === '/antigravity-auth') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(antigravityAuthPage());
            }
            // Skip Antigravity
            else if (pathname === '/antigravity-skip') {
                setupState.antigravitySkipped = true;
                setupState.antigravityEnabled = false;
                console.log(`⏭️ ${t.antigravitySkipped}`);
                res.writeHead(302, { Location: '/complete' });
                res.end();
            }
            // Start Antigravity OAuth
            else if (pathname === '/start-antigravity-auth') {
                res.writeHead(200, { 'Content-Type': 'application/json' });

                if (!antigravityAuthInProgress) {
                    antigravityAuthInProgress = true;

                    // Build OAuth URL
                    const authUrl = new URL(ANTIGRAVITY_ENDPOINTS.auth);
                    authUrl.searchParams.set('client_id', ANTIGRAVITY_CLIENT_ID);
                    authUrl.searchParams.set('response_type', 'code');
                    authUrl.searchParams.set('redirect_uri', ANTIGRAVITY_REDIRECT_URI);
                    authUrl.searchParams.set('scope', ANTIGRAVITY_SCOPES.join(' '));
                    authUrl.searchParams.set('access_type', 'offline');
                    authUrl.searchParams.set('prompt', 'consent');

                    console.log(`🔐 ${t.consoleOpeningAntigravityOAuth}`);
                    openBrowser(authUrl.toString());
                }

                res.end(JSON.stringify({ status: 'started' }));
            }
            // Check Antigravity auth
            else if (pathname === '/check-antigravity-auth') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ authenticated: setupState.antigravityEnabled }));
            }
            // Antigravity OAuth callback
            else if (pathname === '/antigravity-callback') {
                const code = parsedUrl.searchParams.get('code');
                const error = parsedUrl.searchParams.get('error');

                if (error) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`<h1>❌ Error: ${error}</h1><script>setTimeout(() => window.close(), 3000);</script>`);
                    antigravityAuthInProgress = false;
                    return;
                }

                if (code) {
                    try {
                        // Exchange code for tokens
                        const tokenResponse = await fetch(ANTIGRAVITY_ENDPOINTS.token, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                client_id: ANTIGRAVITY_CLIENT_ID,
                                client_secret: ANTIGRAVITY_CLIENT_SECRET,
                                code: code,
                                grant_type: 'authorization_code',
                                redirect_uri: ANTIGRAVITY_REDIRECT_URI,
                            }).toString()
                        });

                        const tokens = await tokenResponse.json();

                        if (tokens.access_token) {
                            // Fetch project ID via loadCodeAssist
                            let projectId = '';
                            const loadEndpoints = [ANTIGRAVITY_ENDPOINTS.daily, ANTIGRAVITY_ENDPOINTS.autopush, ANTIGRAVITY_ENDPOINTS.prod];

                            for (const endpoint of loadEndpoints) {
                                try {
                                    const endpointName = endpoint.includes('daily') ? 'daily' :
                                                       endpoint.includes('autopush') ? 'autopush' : 'prod';
                                    console.log(`  📡 ${t.consoleTryingLoadCodeAssist}: ${endpointName}...`);

                                    const loadResponse = await fetch(endpoint + '/v1internal:loadCodeAssist', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': 'Bearer ' + tokens.access_token,
                                            'Content-Type': 'application/json',
                                            'User-Agent': 'antigravity/1.11.5 windows/amd64',
                                            'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
                                            'Client-Metadata': JSON.stringify({
                                                ideType: 'IDE_UNSPECIFIED',
                                                platform: 'PLATFORM_UNSPECIFIED',
                                                pluginType: 'GEMINI'
                                            })
                                        },
                                        body: JSON.stringify({
                                            metadata: {
                                                ideType: 'IDE_UNSPECIFIED',
                                                platform: 'PLATFORM_UNSPECIFIED',
                                                pluginType: 'GEMINI'
                                            }
                                        })
                                    });

                                    if (loadResponse.ok) {
                                        const loadData = await loadResponse.json();
                                        projectId = loadData.cloudaicompanionProject?.id || loadData.cloudaicompanionProject || '';
                                        if (projectId) {
                                            console.log(`  ✅ ${t.consoleProjectIdFound}: ${projectId}`);
                                            break;
                                        }
                                    }
                                } catch (e) {
                                    console.log(`  ⚠️ ${t.consoleLoadCodeAssistError}: ${e.message}`);
                                }
                            }

                            // Save tokens with project_id
                            const tokenData = {
                                access_token: tokens.access_token,
                                refresh_token: tokens.refresh_token,
                                expiry_date: Date.now() + (tokens.expires_in * 1000),
                                token_type: tokens.token_type,
                                project_id: projectId
                            };

                            if (!fs.existsSync(CONFIG_DIR)) {
                                fs.mkdirSync(CONFIG_DIR, { recursive: true });
                            }
                            fs.writeFileSync(ANTIGRAVITY_TOKEN_PATH, JSON.stringify(tokenData, null, 2));

                            setupState.antigravityEnabled = true;
                            console.log(`✅ ${t.consoleAntigravityAuthSuccess} (Project: ${projectId || 'N/A'})`);

                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(`
                                <html>
                                <head><style>
                                    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                                    .card { background: white; padding: 48px; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.25); }
                                </style></head>
                                <body>
                                    <div class="card">
                                        <h1>✅ ${t.antigravityComplete}</h1>
                                        <p>${t.consoleCanCloseWindow}</p>
                                    </div>
                                    <script>setTimeout(() => window.close(), 2000);</script>
                                </body>
                                </html>
                            `);
                        } else {
                            throw new Error(tokens.error || 'Token exchange failed');
                        }
                    } catch (e) {
                        console.error(`${t.consoleAntigravityOAuthError}:`, e.message);
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<h1>❌ Error: ${e.message}</h1>`);
                    }
                    antigravityAuthInProgress = false;
                }
            }
            // Complete
            else if (pathname === '/complete') {
                const skillsResult = saveTokens(setupState.selectedProject);
                // Auto-install MCP settings for all CLIs
                const mcpResults = saveAllMcpSettings(setupState.selectedProject);
                console.log(`✅ ${t.consoleSetupComplete}: ${setupState.selectedProject}`);
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(completePage(skillsResult, mcpResults));

                // Close server
                setTimeout(() => {
                    console.log(`\n🎉 ${t.consoleSetupComplete}`);
                    console.log(`   ${t.consoleProject}: ${setupState.selectedProject}`);
                    console.log(`   ${t.consoleTokens}: ${TOKEN_PATH}`);
                    console.log(`   ${t.consoleImageGeneration}: ${setupState.antigravityEnabled ? t.consoleAntigravityEnabled : t.consoleAntigravitySkipped}`);
                    console.log(`\n   ${t.consoleCommandsInstalled}:`);
                    console.log(`   ├─ Claude Code: ${CLI_TARGETS.claude}`);
                    console.log(`   ├─ Gemini CLI:  ${CLI_TARGETS.gemini}`);
                    console.log(`   └─ Codex CLI:   ${CLI_TARGETS.codex}`);
                    if (skillsResult && skillsResult.claude && skillsResult.claude.installed.length > 0) {
                        console.log(`\n   ${t.consoleAvailableCommands}:`);
                        console.log(`   ├─ Claude Code: /${skillsResult.claude.installed.join(', /')}`);
                        console.log(`   ├─ Gemini CLI:  /stitch:${skillsResult.gemini.installed.join(', /stitch:')}`);
                        console.log(`   └─ Codex CLI:   $stitch-${skillsResult.codex.installed.join(', $stitch-')}`);
                    }
                    process.exit(0);
                }, 3000);
            }
            else {
                res.writeHead(404);
                res.end('Not Found');
            }
        } catch (e) {
            console.error(`${t.consoleServerError}:`, e);
            res.writeHead(500);
            res.end('Error: ' + e.message);
        }
    });

    server.listen(PORT, () => {
        const setupUrl = `http://localhost:${PORT}`;
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ${t.consoleSetupTitle.padEnd(47)}║
╚══════════════════════════════════════════════════════════════╝

🌐 ${t.consoleBrowserOpening}
   ${setupUrl}

⏳ ${t.consoleAutoClose}
   ${t.consoleCtrlC}
`);
        openBrowser(setupUrl);
    });
}

// Main
startServer();
