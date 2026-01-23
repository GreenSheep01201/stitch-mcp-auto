#!/usr/bin/env node

/**
 * stitch-mcp v2.3.0 - 완전 자동화 Stitch MCP Server
 * gcloud CLI 연동 + 브라우저 기반 설정 마법사 제공
 *
 * 인증 우선순위:
 * 1. gcloud CLI 토큰 (권장)
 * 2. 저장된 OAuth 토큰
 * 3. 브라우저 OAuth 로그인
 *
 * 사용자 경험:
 * 1. node setup.js 실행 (gcloud 자동 설치/인증)
 * 2. 또는 브라우저 마법사에서 안내에 따라 클릭
 * 3. 완료!
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const url = require("url");
const fetch = require("node-fetch");
const sharp = require("sharp");

const STITCH_URL = "https://stitch.googleapis.com/mcp";
const TIMEOUT_MS = 180000;

// OAuth 설정 - Google Cloud CLI 공개 클라이언트
const GOOGLE_OAUTH_CLIENT_ID = '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com';
const GOOGLE_OAUTH_CLIENT_SECRET = 'd-FL95Q19q7MQmFpd7hHD0Ty';

const OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email'
];

// ============= Antigravity OAuth 설정 (이미지 생성용) =============
const ANTIGRAVITY_CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const ANTIGRAVITY_CLIENT_SECRET = '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';
const ANTIGRAVITY_REDIRECT_URI = 'http://localhost:51121/oauth-callback';
const ANTIGRAVITY_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog',
    'https://www.googleapis.com/auth/experimentsandconfigs'
];
const ANTIGRAVITY_ENDPOINTS = {
    daily: 'https://daily-cloudcode-pa.sandbox.googleapis.com',
    autopush: 'https://autopush-cloudcode-pa.sandbox.googleapis.com',
    prod: 'https://cloudcode-pa.googleapis.com'
};
const ANTIGRAVITY_TOKEN_PATH = path.join(os.homedir(), '.stitch-mcp-auto', 'antigravity_tokens.json');

// 설정 경로
const CONFIG_DIR = path.join(os.homedir(), '.stitch-mcp-auto');
const TOKEN_PATH = path.join(CONFIG_DIR, 'tokens.json');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// 포트 설정
const AUTH_PORT = 8085;
const SETUP_PORT = 8086;

// ============= 시스템 로케일 감지 =============
function getSystemLocale() {
    // 환경 변수에서 언어 감지 (우선순위: LANG > LC_ALL > LC_MESSAGES)
    const langEnv = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || '';
    if (langEnv.toLowerCase().startsWith('ko')) return 'ko';

    // Windows 시스템 로케일 확인
    if (os.platform() === 'win32') {
        try {
            const locale = execSync('powershell -command "[System.Globalization.CultureInfo]::CurrentCulture.Name"', {
                encoding: 'utf8',
                stdio: 'pipe',
                timeout: 3000
            }).trim();
            if (locale.toLowerCase().startsWith('ko')) return 'ko';
        } catch (e) {}
    }

    return 'en';
}

// 현재 시스템 로케일 캐시
const systemLocale = getSystemLocale();

// 로그 메시지 i18n
const logMessages = {
    en: {
        browserGoogleLogin: 'Google login in browser...',
        authWaiting: 'Waiting for authentication...',
        usingGcloudToken: 'Using gcloud CLI token',
        couldNotFetchAntigravityProjectId: 'Could not fetch Antigravity project ID',
        antigravityOAuthServerStarted: 'Antigravity OAuth server started (port 51121)',
        openUrlInBrowser: 'Please open the following URL in your browser:',
        antigravityTokenRefreshFailed: 'Antigravity token refresh failed, re-authentication required',
        backgroundRemovalComplete: 'Background removal complete - Original: {0}KB → Result: {1}KB',
        backgroundRemovalFailed: 'Background removal failed: {0}',
        detectedBackgroundColor: 'Detected background color: RGB({0}, {1}, {2})',
        autoBackgroundRemovalComplete: 'Auto background removal complete',
        autoBackgroundRemovalFailed: 'Auto background removal failed: {0}',
        endpointFailed: 'Endpoint {0} failed: {1}',
        setupWizardStarting: 'Starting setup wizard...',
        usingExistingConfig: 'Using existing config: {0}',
        existingProjectFound: 'Existing project found: {0}',
        projectVerified: 'Project verified: {0}',
        setupWizardUrl: 'Setup wizard: http://localhost:{0}',
        serverVersion: 'Stitch MCP Server v2.2.0 - {0}',
        oauthAuthenticating: 'OAuth authenticating...',
        oauthComplete: 'OAuth authentication complete',
        projectConfiguring: 'Configuring project...',
        projectSet: 'Project: {0}',
        mcpServerStarting: 'Starting MCP server...',
        imageGenStarting: '🎨 Starting image generation: {0}{1}',
        withBackgroundRemoval: ' (background removal enabled)',
        antigravityGenerating: '  📡 Generating image with Antigravity/Gemini 3 Pro...',
        antigravityAuthStarting: '  🔐 Starting Antigravity authentication (browser)...',
        processingBackgroundRemoval: '  🔲 Processing background removal...',
        backgroundRemovalDone: '  ✅ Background removal complete',
        backgroundRemovalWarn: '  ⚠️ Background removal failed: {0}',
        imageSaved: 'Image saved: {0}',
        orchestrationStarting: '🎭 Starting design orchestration: {0}',
        autoBackgroundRemovalDone: '    🔲 Auto background removal complete',
        autoBackgroundRemovalWarn: '    ⚠️ Background removal failed: {0}',
        antigravityGeneratingAssets: '  📡 Generating image assets with Antigravity/Gemini 3 Pro...',
        antigravityAuthStartingAssets: '  🔐 Starting Antigravity authentication (browser)...',
        antigravityNotAuthSkipping: '  ⚠️ Antigravity not authenticated - skipping asset generation, creating UI only.',
        antigravityNotAuthTip: '  💡 To generate assets, use the forceAntigravityAuth: true option.',
        generatingLogo: '  🎨 Generating logo...',
        logoGenComplete: '  ✅ Logo generation complete: {0}',
        generatingHero: '  🎨 Generating hero image...',
        heroGenComplete: '  ✅ Hero image generation complete: {0}',
        generatingIcon: '  🎨 Generating icon...',
        iconGenComplete: '  ✅ Icon generation complete: {0}',
        generatingCustomAsset: '  🎨 Generating custom asset: {0}',
        customAssetGenComplete: '  ✅ Custom asset generation complete: {0}',
        generatingUIWithStitch: '  🖼️ Generating UI with Stitch API...',
        orchestrationComplete: '🎭 Design orchestration complete!',
        serverError: 'Server error: {0}',
        ready: 'Ready! ({0})',
        fatal: 'Fatal: {0}',
        // Workspace project messages
        workspaceProjectFound: '📂 Found existing project in workspace: {0}',
        workspaceProjectSaved: '💾 Project saved to workspace: {0}',
        workspaceProjectCleared: '🗑️ Workspace project cleared',
        noWorkspaceProject: '📂 No project found in current workspace'
    },
    ko: {
        browserGoogleLogin: '브라우저에서 Google 로그인...',
        authWaiting: '인증 대기 중...',
        usingGcloudToken: 'gcloud CLI 토큰 사용',
        couldNotFetchAntigravityProjectId: 'Antigravity 프로젝트 ID를 가져올 수 없습니다',
        antigravityOAuthServerStarted: 'Antigravity OAuth 서버 시작 (포트 51121)',
        openUrlInBrowser: '브라우저에서 다음 URL을 열어주세요:',
        antigravityTokenRefreshFailed: 'Antigravity 토큰 갱신 실패, 재인증 필요',
        backgroundRemovalComplete: '배경 제거 완료 - 원본: {0}KB → 결과: {1}KB',
        backgroundRemovalFailed: '배경 제거 실패: {0}',
        detectedBackgroundColor: '감지된 배경색: RGB({0}, {1}, {2})',
        autoBackgroundRemovalComplete: '자동 배경 제거 완료',
        autoBackgroundRemovalFailed: '자동 배경 제거 실패: {0}',
        endpointFailed: 'Endpoint {0} 실패: {1}',
        setupWizardStarting: '설정 마법사 시작...',
        usingExistingConfig: '기존 설정 사용: {0}',
        existingProjectFound: '기존 프로젝트 발견: {0}',
        projectVerified: '프로젝트 확인됨: {0}',
        setupWizardUrl: '설정 마법사: http://localhost:{0}',
        serverVersion: 'Stitch MCP Server v2.2.0 - {0}',
        oauthAuthenticating: 'OAuth 인증...',
        oauthComplete: 'OAuth 인증 완료',
        projectConfiguring: '프로젝트 설정...',
        projectSet: '프로젝트: {0}',
        mcpServerStarting: 'MCP 서버 시작...',
        imageGenStarting: '🎨 이미지 생성 시작: {0}{1}',
        withBackgroundRemoval: ' (배경 제거 활성화)',
        antigravityGenerating: '  📡 Antigravity/Gemini 3 Pro로 이미지 생성...',
        antigravityAuthStarting: '  🔐 Antigravity 인증 시작 (브라우저)...',
        processingBackgroundRemoval: '  🔲 배경 제거 처리 중...',
        backgroundRemovalDone: '  ✅ 배경 제거 완료',
        backgroundRemovalWarn: '  ⚠️ 배경 제거 실패: {0}',
        imageSaved: '이미지 저장: {0}',
        orchestrationStarting: '🎭 디자인 오케스트레이션 시작: {0}',
        autoBackgroundRemovalDone: '    🔲 배경 자동 제거 완료',
        autoBackgroundRemovalWarn: '    ⚠️ 배경 제거 실패: {0}',
        antigravityGeneratingAssets: '  📡 Antigravity/Gemini 3 Pro로 이미지 에셋 생성...',
        antigravityAuthStartingAssets: '  🔐 Antigravity 인증 시작 (브라우저)...',
        antigravityNotAuthSkipping: '  ⚠️ Antigravity 미인증 - 에셋 생성 건너뜀, UI만 생성합니다.',
        antigravityNotAuthTip: '  💡 에셋 생성을 원하면 forceAntigravityAuth: true 옵션을 사용하세요.',
        generatingLogo: '  🎨 로고 생성 중...',
        logoGenComplete: '  ✅ 로고 생성 완료: {0}',
        generatingHero: '  🎨 히어로 이미지 생성 중...',
        heroGenComplete: '  ✅ 히어로 이미지 생성 완료: {0}',
        generatingIcon: '  🎨 아이콘 생성 중...',
        iconGenComplete: '  ✅ 아이콘 생성 완료: {0}',
        generatingCustomAsset: '  🎨 커스텀 에셋 생성 중: {0}',
        customAssetGenComplete: '  ✅ 커스텀 에셋 생성 완료: {0}',
        generatingUIWithStitch: '  🖼️ Stitch API로 UI 생성 중...',
        orchestrationComplete: '🎭 디자인 오케스트레이션 완료!',
        serverError: '서버 오류: {0}',
        ready: '준비 완료! ({0})',
        fatal: '치명적 오류: {0}',
        // Workspace project messages
        workspaceProjectFound: '📂 워크스페이스에서 기존 프로젝트 발견: {0}',
        workspaceProjectSaved: '💾 프로젝트가 워크스페이스에 저장됨: {0}',
        workspaceProjectCleared: '🗑️ 워크스페이스 프로젝트 초기화됨',
        noWorkspaceProject: '📂 현재 워크스페이스에 프로젝트가 없습니다'
    }
};

// 로그 메시지 번역 함수
function logT(key, ...args) {
    let text = logMessages[systemLocale]?.[key] || logMessages.en[key] || key;
    args.forEach((arg, i) => {
        text = text.replace(`{${i}}`, arg);
    });
    return text;
}

// 로깅
const log = {
    info: (msg) => console.error(`[stitch-mcp] ℹ️  ${msg}`),
    success: (msg) => console.error(`[stitch-mcp] ✅ ${msg}`),
    warn: (msg) => console.error(`[stitch-mcp] ⚠️  ${msg}`),
    error: (msg) => console.error(`[stitch-mcp] ❌ ${msg}`),
    step: (msg) => console.error(`[stitch-mcp] 🔧 ${msg}`),
};

// ============= 유틸리티 =============

function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function loadTokens() {
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        } catch (e) {
            return null;
        }
    }
    return null;
}

function saveTokens(tokens) {
    ensureConfigDir();
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveConfig(config) {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// ============= gcloud CLI 연동 =============

function getGcloudPath() {
    const platform = os.platform();
    const paths = [];

    if (platform === 'win32') {
        paths.push(
            path.join(process.env.LOCALAPPDATA || '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
            path.join(process.env.PROGRAMFILES || '', 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
            'gcloud'
        );
    } else {
        paths.push(
            path.join(os.homedir(), 'google-cloud-sdk', 'bin', 'gcloud'),
            '/usr/local/bin/gcloud',
            '/usr/bin/gcloud',
            '/snap/bin/gcloud',
            'gcloud'
        );
    }

    for (const p of paths) {
        try {
            if (fs.existsSync(p)) return p;
            execSync(`which "${p}" 2>/dev/null || where "${p}" 2>nul`, { encoding: 'utf8', stdio: 'pipe' });
            return p;
        } catch (e) {}
    }
    return null;
}

function getGcloudToken() {
    const gcloudPath = getGcloudPath();
    if (!gcloudPath) return null;

    try {
        const token = execSync(`"${gcloudPath}" auth print-access-token 2>/dev/null || "${gcloudPath}" auth print-access-token 2>nul`, {
            encoding: 'utf8',
            stdio: 'pipe',
            timeout: 10000
        }).trim();

        if (token && token.startsWith('ya29.')) {
            return token;
        }
    } catch (e) {}
    return null;
}

// ============= OAuth 인증 =============

async function refreshAccessToken(refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GOOGLE_OAUTH_CLIENT_ID,
            client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });

    if (!response.ok) {
        throw new Error('토큰 갱신 실패');
    }

    const data = await response.json();
    return {
        access_token: data.access_token,
        refresh_token: refreshToken,
        expiry_date: Date.now() + (data.expires_in * 1000)
    };
}

async function authenticateWithBrowser() {
    const state = Math.random().toString(36).substring(2);
    const redirectUri = `http://localhost:${AUTH_PORT}`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_OAUTH_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', OAUTH_SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    log.info(logT('browserGoogleLogin'));

    const open = (await import('open')).default;
    await open(authUrl.toString());

    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                const parsedUrl = url.parse(req.url, true);
                const code = parsedUrl.query.code;

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(HTML.authSuccess());

                    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: GOOGLE_OAUTH_CLIENT_ID,
                            client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
                            code: code,
                            redirect_uri: redirectUri,
                            grant_type: 'authorization_code'
                        })
                    });

                    if (!tokenResponse.ok) {
                        throw new Error('토큰 교환 실패');
                    }

                    const tokenData = await tokenResponse.json();
                    const tokens = {
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token,
                        expiry_date: Date.now() + (tokenData.expires_in * 1000)
                    };

                    saveTokens(tokens);
                    server.close();
                    resolve(tokens);
                } else {
                    const error = parsedUrl.query.error || 'Unknown error';
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(HTML.error(`인증 실패: ${error}`));
                    server.close();
                    reject(new Error(`OAuth 실패: ${error}`));
                }
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Error: ${e.message}`);
                server.close();
                reject(e);
            }
        });

        server.listen(AUTH_PORT, () => log.info(logT('authWaiting')));
        setTimeout(() => { server.close(); reject(new Error('인증 타임아웃')); }, 180000);
    });
}

async function getAccessToken() {
    // 1. gcloud CLI 토큰 시도 (가장 권장)
    const gcloudToken = getGcloudToken();
    if (gcloudToken) {
        log.info(logT('usingGcloudToken'));
        // 토큰 파일에 저장하여 동기화
        saveTokens({
            access_token: gcloudToken,
            managed_by: 'gcloud',
            expiry_date: Date.now() + 3600000
        });
        return gcloudToken;
    }

    // 2. 저장된 토큰 시도
    let tokens = loadTokens();

    if (tokens) {
        // gcloud로 관리되는 토큰인 경우 gcloud에서 갱신 시도
        if (tokens.managed_by === 'gcloud') {
            const newToken = getGcloudToken();
            if (newToken) {
                saveTokens({ ...tokens, access_token: newToken, expiry_date: Date.now() + 3600000 });
                return newToken;
            }
        }

        // 토큰 만료 확인 및 갱신
        if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
            if (tokens.refresh_token) {
                try {
                    tokens = await refreshAccessToken(tokens.refresh_token);
                    saveTokens(tokens);
                } catch (e) {
                    tokens = await authenticateWithBrowser();
                }
            } else {
                tokens = await authenticateWithBrowser();
            }
        }
        return tokens.access_token;
    }

    // 3. 브라우저 OAuth 인증
    tokens = await authenticateWithBrowser();
    return tokens.access_token;
}

// ============= Antigravity OAuth (이미지 생성용) =============

function loadAntigravityTokens() {
    if (fs.existsSync(ANTIGRAVITY_TOKEN_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(ANTIGRAVITY_TOKEN_PATH, 'utf8'));
        } catch (e) {
            return null;
        }
    }
    return null;
}

function saveAntigravityTokens(tokens) {
    ensureConfigDir();
    fs.writeFileSync(ANTIGRAVITY_TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

async function refreshAntigravityToken(refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: ANTIGRAVITY_CLIENT_ID,
            client_secret: ANTIGRAVITY_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });

    if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return {
        access_token: data.access_token,
        refresh_token: refreshToken,
        expiry_date: Date.now() + (data.expires_in * 1000)
    };
}

// PKCE 생성 함수
function generatePKCE() {
    const verifier = require('crypto').randomBytes(32).toString('base64url');
    const challenge = require('crypto')
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
    return { verifier, challenge };
}

async function authenticateAntigravityWithBrowser() {
    return new Promise((resolve, reject) => {
        const pkce = generatePKCE();
        const state = Buffer.from(JSON.stringify({ verifier: pkce.verifier })).toString('base64url');

        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', ANTIGRAVITY_CLIENT_ID);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('redirect_uri', ANTIGRAVITY_REDIRECT_URI);
        authUrl.searchParams.set('scope', ANTIGRAVITY_SCOPES.join(' '));
        authUrl.searchParams.set('code_challenge', pkce.challenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');

        const server = http.createServer(async (req, res) => {
            const reqUrl = new URL(req.url, `http://localhost:51121`);

            if (reqUrl.pathname === '/oauth-callback') {
                const code = reqUrl.searchParams.get('code');
                const returnedState = reqUrl.searchParams.get('state');

                if (!code) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>인증 실패</h1><p>코드가 없습니다.</p>');
                    server.close();
                    reject(new Error('No authorization code'));
                    return;
                }

                try {
                    const decodedState = JSON.parse(Buffer.from(returnedState, 'base64url').toString('utf8'));

                    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: ANTIGRAVITY_CLIENT_ID,
                            client_secret: ANTIGRAVITY_CLIENT_SECRET,
                            code: code,
                            grant_type: 'authorization_code',
                            redirect_uri: ANTIGRAVITY_REDIRECT_URI,
                            code_verifier: decodedState.verifier
                        })
                    });

                    if (!tokenResponse.ok) {
                        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
                    }

                    const tokenData = await tokenResponse.json();

                    // Project ID 가져오기 (daily 엔드포인트 먼저 시도)
                    let projectId = '';
                    const loadEndpoints = [
                        ANTIGRAVITY_ENDPOINTS.daily,
                        ANTIGRAVITY_ENDPOINTS.autopush,
                        ANTIGRAVITY_ENDPOINTS.prod
                    ];

                    for (const endpoint of loadEndpoints) {
                        try {
                            log.info(`  📡 loadCodeAssist: ${endpoint.includes('daily') ? 'daily' : endpoint.includes('autopush') ? 'autopush' : 'prod'}...`);
                            const loadResponse = await fetch(`${endpoint}/v1internal:loadCodeAssist`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${tokenData.access_token}`,
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
                                log.info(`  ✅ Antigravity Project ID: ${projectId}`);
                                break;
                            } else {
                                log.warn(`  ⚠️ loadCodeAssist failed: ${loadResponse.status}`);
                            }
                        } catch (e) {
                            log.warn(`  ⚠️ loadCodeAssist error: ${e.message}`);
                        }
                    }

                    if (!projectId) {
                        log.warn(logT('couldNotFetchAntigravityProjectId'));
                    }

                    const tokens = {
                        access_token: tokenData.access_token,
                        refresh_token: tokenData.refresh_token,
                        expiry_date: Date.now() + (tokenData.expires_in * 1000),
                        project_id: projectId
                    };

                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <html><body style="font-family: system-ui; text-align: center; padding: 50px;">
                            <h1>✅ Antigravity 인증 성공!</h1>
                            <p>이미지 생성 기능이 활성화되었습니다.</p>
                            <p>이 창을 닫아도 됩니다.</p>
                        </body></html>
                    `);

                    server.close();
                    resolve(tokens);

                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`<h1>오류</h1><p>${err.message}</p>`);
                    server.close();
                    reject(err);
                }
            }
        });

        server.listen(51121, () => {
            log.info(logT('antigravityOAuthServerStarted'));
            log.info(`${logT('openUrlInBrowser')}\n${authUrl.toString()}`);

            // 브라우저 자동 열기 시도 (WSL에서는 Windows 브라우저 사용)
            let openCmd;
            const isWSL = process.platform === 'linux' &&
                         (fs.existsSync('/proc/version') &&
                          fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft'));

            if (process.platform === 'win32') {
                openCmd = 'start';
            } else if (process.platform === 'darwin') {
                openCmd = 'open';
            } else if (isWSL) {
                // WSL에서는 cmd.exe를 통해 Windows 브라우저 열기
                openCmd = 'cmd.exe /c start';
            } else {
                openCmd = 'xdg-open';
            }

            try {
                execSync(`${openCmd} "${authUrl.toString()}"`, { stdio: 'ignore' });
            } catch (e) {
                // 브라우저 열기 실패 시 URL만 출력
                log.info('브라우저 자동 열기 실패. 위 URL을 수동으로 열어주세요.');
            }
        });

        // 5분 타임아웃
        setTimeout(() => {
            server.close();
            reject(new Error('Authentication timeout'));
        }, 300000);
    });
}

// Antigravity 인증 상태 확인 (브라우저 인증 프롬프트 없음)
function isAntigravityAuthenticated() {
    const tokens = loadAntigravityTokens();
    if (!tokens || !tokens.access_token) {
        return false;
    }
    // 토큰 만료 확인 (refresh_token이 있으면 갱신 가능)
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
        return !!tokens.refresh_token; // refresh_token이 있으면 갱신 가능
    }
    return true;
}

// Antigravity 토큰 가져오기 (선택적 인증 프롬프트)
async function getAntigravityToken(promptIfNeeded = true) {
    let tokens = loadAntigravityTokens();

    if (tokens) {
        // 토큰 만료 확인 및 갱신
        if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
            if (tokens.refresh_token) {
                try {
                    tokens = await refreshAntigravityToken(tokens.refresh_token);
                    saveAntigravityTokens(tokens);
                } catch (e) {
                    log.warn(logT('antigravityTokenRefreshFailed'));
                    if (promptIfNeeded) {
                        tokens = await authenticateAntigravityWithBrowser();
                        saveAntigravityTokens(tokens);
                    } else {
                        return null;
                    }
                }
            } else {
                if (promptIfNeeded) {
                    tokens = await authenticateAntigravityWithBrowser();
                    saveAntigravityTokens(tokens);
                } else {
                    return null;
                }
            }
        }
        return tokens.access_token;
    }

    // 새로운 인증 (promptIfNeeded가 false면 null 반환)
    if (promptIfNeeded) {
        tokens = await authenticateAntigravityWithBrowser();
        saveAntigravityTokens(tokens);
        return tokens.access_token;
    }
    return null;
}

// ============= 이미지 후처리 (배경 제거) =============

/**
 * 흰색 배경을 투명하게 변환하는 함수
 * @param {Buffer} imageBuffer - 원본 이미지 버퍼
 * @param {Object} options - 옵션
 * @param {number} options.threshold - 흰색 판단 임계값 (기본: 240)
 * @param {boolean} options.smoothEdges - 가장자리 스무딩 (기본: true)
 * @returns {Promise<Buffer>} - 투명 배경 이미지 버퍼
 */
async function removeWhiteBackground(imageBuffer, options = {}) {
    const { threshold = 240, smoothEdges = true } = options;

    try {
        // 이미지 메타데이터 확인
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;

        // raw 픽셀 데이터 추출 (RGBA)
        const { data, info } = await sharp(imageBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const pixelArray = new Uint8Array(data);

        // 흰색 픽셀을 투명으로 변환
        for (let i = 0; i < pixelArray.length; i += 4) {
            const r = pixelArray[i];
            const g = pixelArray[i + 1];
            const b = pixelArray[i + 2];

            // 흰색 또는 거의 흰색인 픽셀 검사
            if (r > threshold && g > threshold && b > threshold) {
                pixelArray[i + 3] = 0; // 알파 채널을 0으로 (투명)
            }
        }

        // 수정된 픽셀 데이터로 새 이미지 생성
        let outputImage = sharp(Buffer.from(pixelArray), {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        });

        // 가장자리 스무딩 적용 (선택적)
        if (smoothEdges) {
            outputImage = outputImage.median(1); // 미디안 필터로 가장자리 정리
        }

        // PNG로 출력 (투명도 지원)
        const outputBuffer = await outputImage.png().toBuffer();

        log.success(logT('backgroundRemovalComplete', (imageBuffer.length / 1024).toFixed(1), (outputBuffer.length / 1024).toFixed(1)));
        return outputBuffer;

    } catch (err) {
        log.error(logT('backgroundRemovalFailed', err.message));
        // 실패 시 원본 이미지 반환
        return imageBuffer;
    }
}

/**
 * 배경색 자동 감지 후 제거 (흰색이 아닌 단색 배경도 처리)
 * @param {Buffer} imageBuffer - 원본 이미지 버퍼
 * @param {Object} options - 옵션
 * @param {number} options.tolerance - 색상 허용 오차 (기본: 30)
 * @param {number} options.edgeSampleSize - 가장자리 샘플링 크기 (기본: 10)
 * @returns {Promise<Buffer>} - 투명 배경 이미지 버퍼
 */
async function removeBackgroundAuto(imageBuffer, options = {}) {
    const { tolerance = 30, edgeSampleSize = 10 } = options;

    try {
        const metadata = await sharp(imageBuffer).metadata();
        const { width, height } = metadata;

        const { data, info } = await sharp(imageBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const pixelArray = new Uint8Array(data);

        // 가장자리에서 배경색 추출 (네 모서리 평균)
        const corners = [
            0, // 좌상단
            (width - 1) * 4, // 우상단
            (height - 1) * width * 4, // 좌하단
            ((height - 1) * width + (width - 1)) * 4 // 우하단
        ];

        let bgR = 0, bgG = 0, bgB = 0;
        for (const idx of corners) {
            bgR += pixelArray[idx];
            bgG += pixelArray[idx + 1];
            bgB += pixelArray[idx + 2];
        }
        bgR = Math.round(bgR / 4);
        bgG = Math.round(bgG / 4);
        bgB = Math.round(bgB / 4);

        log.info(logT('detectedBackgroundColor', bgR, bgG, bgB));

        // 배경색과 유사한 픽셀을 투명으로 변환
        for (let i = 0; i < pixelArray.length; i += 4) {
            const r = pixelArray[i];
            const g = pixelArray[i + 1];
            const b = pixelArray[i + 2];

            // 배경색과의 거리 계산
            const distance = Math.sqrt(
                Math.pow(r - bgR, 2) +
                Math.pow(g - bgG, 2) +
                Math.pow(b - bgB, 2)
            );

            if (distance < tolerance) {
                pixelArray[i + 3] = 0;
            }
        }

        const outputBuffer = await sharp(Buffer.from(pixelArray), {
            raw: {
                width: info.width,
                height: info.height,
                channels: 4
            }
        }).png().toBuffer();

        log.success(logT('autoBackgroundRemovalComplete'));
        return outputBuffer;

    } catch (err) {
        log.error(logT('autoBackgroundRemovalFailed', err.message));
        return imageBuffer;
    }
}

// ============= Gemini 3 Pro 이미지 생성 =============

// Stitch API를 사용한 이미지 생성 폴백
async function generateImageWithStitch(prompt, options = {}, accessToken) {
    try {
        const { assetType = 'illustration', style = 'modern' } = options;

        // Stitch API로 에셋 스타일의 디자인 화면 생성
        let designPrompt = `Create a ${style} style design featuring: ${prompt}. `;

        switch (assetType) {
            case 'logo':
                designPrompt += 'Focus on the logo design, centered, with clean background. Show only the logo prominently.';
                break;
            case 'icon':
                designPrompt += 'Display a clean, simple icon in the center with minimal background.';
                break;
            case 'hero':
                designPrompt += 'Create a wide hero banner image suitable for website header.';
                break;
            case 'wireframe':
                designPrompt += 'Create a low-fidelity wireframe sketch with boxes and placeholder elements.';
                break;
            default:
                designPrompt += 'Create an artistic illustration or design element.';
        }

        const stitchProjectId = process.env.GOOGLE_CLOUD_PROJECT || 'stitch-mcp-auto';

        // Stitch API 호출
        const response = await fetch(`https://stitch.googleapis.com/v1/projects/${stitchProjectId}/screens:generateFromText`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: designPrompt,
                deviceType: 'MOBILE'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stitch API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // 화면 이미지 가져오기
        if (data.screen && data.screen.name) {
            const screenName = data.screen.name;
            const imageUrl = `https://stitch.googleapis.com/v1/${screenName}:fetchImage?imageType=PREVIEW`;

            const imageResponse = await fetch(imageUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (imageResponse.ok) {
                const imageBuffer = await imageResponse.buffer();
                return {
                    success: true,
                    imageData: imageBuffer.toString('base64'),
                    mimeType: 'image/png',
                    prompt: prompt,
                    source: 'stitch'
                };
            }
        }

        return {
            success: false,
            error: 'Stitch API 폴백 생성 실패',
            source: 'stitch'
        };

    } catch (err) {
        return {
            success: false,
            error: `Stitch 폴백 오류: ${err.message}`,
            source: 'stitch'
        };
    }
}

async function generateImageWithGemini(prompt, options = {}, forceAuth = true) {
    const token = await getAntigravityToken(forceAuth);

    // 디버그: 어떤 토큰을 사용하는지 확인
    log.info(`  🔑 Using Antigravity token: ${token ? token.substring(0, 20) + '...' : 'null'}`);

    // 토큰이 없으면 Antigravity 인증이 필요함을 알림
    if (!token) {
        return {
            success: false,
            error: 'Antigravity 인증이 필요합니다. check_antigravity_auth 도구로 인증 상태를 확인하세요.',
            needsAuth: true,
            source: 'antigravity'
        };
    }

    const {
        model = 'gemini-3-pro',  // Antigravity OAuth를 통한 gemini-3-pro 모델 (이미지 생성 지원)
        style = 'auto'
    } = options;

    // Antigravity 토큰에서 project ID 가져오기
    const tokens = loadAntigravityTokens();
    const projectId = tokens?.project_id;

    if (!projectId) {
        log.warn('  ⚠️ No Antigravity project ID. Re-authentication required.');
        return {
            success: false,
            error: 'Antigravity project ID not found. Please re-authenticate with Antigravity.',
            needsAuth: true,
            source: 'antigravity'
        };
    }

    log.info(`  🔑 Using Antigravity project: ${projectId}`);

    // Antigravity 엔드포인트 Fallback 순서 (daily 먼저!)
    const endpointFallbacks = [
        ANTIGRAVITY_ENDPOINTS.daily,
        ANTIGRAVITY_ENDPOINTS.autopush,
        ANTIGRAVITY_ENDPOINTS.prod
    ];

    // Antigravity 헤더 (Client-Metadata 포함)
    const antigravityHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'antigravity/1.11.5 windows/amd64',
        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
        'Client-Metadata': JSON.stringify({
            ideType: 'IDE_UNSPECIFIED',
            platform: 'PLATFORM_UNSPECIFIED',
            pluginType: 'GEMINI'
        })
    };

    const requestBody = {
        project: projectId,
        model: model,
        request: {
            contents: [{
                role: 'user',
                parts: [{
                    text: `Generate an image: ${prompt}${style !== 'auto' ? `. Style: ${style}` : ''}`
                }]
            }],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
            }
        },
        requestType: 'agent',
        userAgent: 'antigravity',
        requestId: `agent-${require('crypto').randomUUID()}`
    };

    let lastError = null;

    for (const endpoint of endpointFallbacks) {
        try {
            const apiUrl = `${endpoint}/v1internal:generateContent`;
            const endpointName = endpoint.includes('daily') ? 'daily' : endpoint.includes('autopush') ? 'autopush' : 'prod';
            log.info(`  📡 Trying ${endpointName}: ${model}...`);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: antigravityHeaders,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                lastError = `API error ${response.status}: ${errorText}`;
                log.warn(`  ⚠️ ${endpointName} failed: ${response.status}`);
                continue; // 다음 엔드포인트 시도
            }

            const data = await response.json();

            // Antigravity API는 response 객체 안에 결과를 래핑함
            const responseData = data.response || data;
            const candidates = responseData.candidates || [];

            // 이미지 데이터 추출
            for (const candidate of candidates) {
                const parts = candidate.content?.parts || [];
                for (const part of parts) {
                    if (part.inlineData) {
                        log.info(`  ✅ Image generated via ${endpointName}`);
                        return {
                            success: true,
                            imageData: part.inlineData.data,
                            mimeType: part.inlineData.mimeType || 'image/png',
                            prompt: prompt,
                            source: 'antigravity',
                            model: model
                        };
                    }
                }
            }

            // 응답은 있지만 이미지가 없음 - 텍스트 응답일 수 있음
            const textContent = candidates[0]?.content?.parts?.[0]?.text;
            if (textContent) {
                log.info(`  ✅ Text response received via ${endpointName}`);
                return {
                    success: true,
                    text: textContent,
                    prompt: prompt,
                    source: 'antigravity',
                    model: model
                };
            }

            lastError = 'No image or text data in response';
            log.warn(`  ⚠️ ${endpointName}: No content in response`);
            continue; // 다음 엔드포인트 시도

        } catch (err) {
            lastError = err.message;
            log.warn(`  ⚠️ Endpoint error: ${err.message}`);
            continue; // 다음 엔드포인트 시도
        }
    }

    // 모든 엔드포인트 실패
    return {
        success: false,
        error: `All endpoints failed. Last error: ${lastError}`,
        source: 'antigravity'
    };
}

// ============= 다국어 지원 =============

const i18n = {
    en: {
        loginSuccess: 'Login Successful!',
        loginSuccessDesc: 'Setup will continue shortly...',
        windowClose: 'This window will close automatically...',
        error: 'Error',
        welcome: 'Stitch MCP Setup',
        welcomeSubtitle: 'AI-powered UI generation tool',
        welcomeDesc: 'Set up your Google Cloud project and Stitch API.<br>Click the button below to get started.',
        getStarted: 'Get Started →',
        needProject: 'Google Cloud Project Required',
        needProjectDesc: 'A Google Cloud project is required to use Stitch API.',
        step1: 'Click the button below to open Google Cloud Console',
        step2: 'Enter a project name and click "Create"',
        step3: 'Copy the Project ID when created',
        step4: 'Return here and enter the Project ID',
        createProject: 'Create Project in Google Cloud →',
        projectIdLabel: 'Enter Project ID:',
        projectIdPlaceholder: 'my-project-123',
        confirmProjectId: 'Confirm Project ID →',
        projectIdTip: '💡 Project ID is shown in small text below the project name',
        enableApi: 'API Activation Required',
        enableApiStep1: 'Click the button below',
        enableApiStep2: 'Click "Enable" in Google Cloud Console',
        enableApiStep3: 'Return here and refresh after activation',
        openApiPage: 'Open API Activation Page →',
        checkStatus: '🔄 Check Status',
        apiNote: '* It may take up to 1 minute for activation to reflect',
        checking: 'Checking settings...',
        pleaseWait: 'Please wait',
        complete: 'Setup Complete!',
        completeDesc: 'Stitch MCP is ready.',
        project: 'Project',
        closeWindow: 'Close Window',
        projectNotFound: 'Project not found',
        projectNotFoundDesc: 'Could not verify project ID',
        tryAgain: 'Try Again →',
        stepOf: 'Step {0} of {1}'
    },
    ko: {
        loginSuccess: '로그인 성공!',
        loginSuccessDesc: '잠시 후 설정이 계속됩니다...',
        windowClose: '이 창은 자동으로 닫힙니다...',
        error: '오류',
        welcome: 'Stitch MCP 설정',
        welcomeSubtitle: 'AI 기반 UI 생성 도구',
        welcomeDesc: 'Google Cloud 프로젝트와 Stitch API를 설정합니다.<br>아래 버튼을 눌러 시작하세요.',
        getStarted: '설정 시작하기 →',
        needProject: 'Google Cloud 프로젝트 필요',
        needProjectDesc: 'Stitch API를 사용하려면 Google Cloud 프로젝트가 필요합니다.',
        step1: '아래 버튼을 클릭하여 Google Cloud Console을 엽니다',
        step2: '프로젝트 이름을 입력하고 "만들기"를 클릭합니다',
        step3: '프로젝트가 생성되면 프로젝트 ID를 복사합니다',
        step4: '이 페이지로 돌아와서 프로젝트 ID를 입력합니다',
        createProject: 'Google Cloud에서 프로젝트 만들기 →',
        projectIdLabel: '프로젝트 ID 입력:',
        projectIdPlaceholder: 'my-project-123',
        confirmProjectId: '프로젝트 ID 확인 →',
        projectIdTip: '💡 프로젝트 ID는 프로젝트 이름 아래에 작은 글씨로 표시됩니다',
        enableApi: 'API 활성화 필요',
        enableApiStep1: '아래 버튼을 클릭합니다',
        enableApiStep2: 'Google Cloud Console에서 "사용" 또는 "Enable" 버튼을 클릭합니다',
        enableApiStep3: '활성화가 완료되면 이 페이지로 돌아와 새로고침합니다',
        openApiPage: 'API 활성화 페이지 열기 →',
        checkStatus: '🔄 상태 확인하기',
        apiNote: '* 활성화 후 반영까지 최대 1분 정도 소요될 수 있습니다',
        checking: '설정 확인 중...',
        pleaseWait: '잠시만 기다려주세요',
        complete: '설정 완료!',
        completeDesc: 'Stitch MCP가 준비되었습니다.',
        project: '프로젝트',
        closeWindow: '창 닫기',
        projectNotFound: '프로젝트를 찾을 수 없습니다',
        projectNotFoundDesc: '프로젝트 ID를 확인할 수 없습니다',
        tryAgain: '다시 시도 →',
        stepOf: '{0}단계 / {1}단계'
    }
};

// Accept-Language 헤더에서 언어 감지
function detectLanguage(req) {
    const acceptLang = req?.headers?.['accept-language'] || '';
    if (acceptLang.toLowerCase().includes('ko')) return 'ko';
    return 'en';
}

// 텍스트 번역 함수
function t(lang, key, ...args) {
    let text = i18n[lang]?.[key] || i18n.en[key] || key;
    args.forEach((arg, i) => {
        text = text.replace(`{${i}}`, arg);
    });
    return text;
}

// ============= HTML 템플릿 =============

const HTML = {
    base: (title, content, autoRefresh = false, lang = 'en') => `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    ${autoRefresh ? '<meta http-equiv="refresh" content="5">' : ''}
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        }
        .card {
            background: rgba(255,255,255,0.95); padding: 48px; border-radius: 24px; text-align: center;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
            max-width: 640px; width: 100%; backdrop-filter: blur(10px);
        }
        h1 { color: #1a1a2e; margin-bottom: 12px; font-size: 32px; font-weight: 700; }
        h2 { color: #667eea; margin-bottom: 24px; font-size: 18px; font-weight: 500; }
        p { color: #555; line-height: 1.7; margin: 16px 0; }
        .emoji { font-size: 72px; margin-bottom: 24px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)); }
        .step-badge {
            display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; padding: 10px 24px; border-radius: 24px; font-weight: 600;
            margin-bottom: 24px; font-size: 14px; letter-spacing: 0.5px;
        }
        .btn {
            display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 16px 36px; border-radius: 12px; text-decoration: none;
            font-weight: 600; font-size: 16px; margin: 12px 6px; border: none; cursor: pointer;
            transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102,126,234,0.3);
        }
        .btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(102,126,234,0.4); }
        .btn-secondary { background: linear-gradient(135deg, #e0e0e0, #c0c0c0); color: #333; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .btn-success { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 4px 15px rgba(34,197,94,0.3); }
        .input-group { margin: 24px 0; text-align: left; }
        .input-group label { display: block; color: #333; font-weight: 600; margin-bottom: 10px; }
        .input-group input {
            width: 100%; padding: 16px 18px; border: 2px solid #e8e8e8; border-radius: 12px;
            font-size: 16px; transition: all 0.3s ease; background: #fafafa;
        }
        .input-group input:focus { outline: none; border-color: #667eea; background: white; box-shadow: 0 0 0 4px rgba(102,126,234,0.1); }
        .instructions {
            background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
            border-radius: 16px; padding: 24px; margin: 24px 0; text-align: left;
            border: 1px solid rgba(102,126,234,0.1);
        }
        .instructions ol { padding-left: 24px; }
        .instructions li { margin: 12px 0; color: #444; line-height: 1.6; }
        .instructions strong { color: #667eea; }
        .note { color: #888; font-size: 14px; margin-top: 24px; }
        .spinner {
            width: 56px; height: 56px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea;
            border-radius: 50%; animation: spin 0.8s linear infinite; margin: 24px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .api-badge {
            display: inline-block; background: linear-gradient(135deg, #f0f0f0, #e8e8e8); padding: 10px 20px;
            border-radius: 10px; font-family: 'SF Mono', Monaco, monospace; margin: 8px; font-size: 14px;
            border: 1px solid rgba(0,0,0,0.05);
        }
        .lang-switch { position: absolute; top: 20px; right: 20px; }
        .lang-switch a { color: rgba(255,255,255,0.7); text-decoration: none; padding: 8px 12px; font-size: 14px; }
        .lang-switch a:hover { color: white; }
        .lang-switch a.active { color: white; font-weight: bold; }
    </style>
</head>
<body>
    <div class="lang-switch">
        <a href="?lang=en" class="${lang === 'en' ? 'active' : ''}">EN</a> |
        <a href="?lang=ko" class="${lang === 'ko' ? 'active' : ''}">한국어</a>
    </div>
    <div class="card">${content}</div>
</body>
</html>`,

    authSuccess: (lang = 'ko') => HTML.base('Stitch MCP', `
        <div class="emoji">✅</div>
        <h1>${t(lang, 'loginSuccess')}</h1>
        <p>${t(lang, 'loginSuccessDesc')}</p>
        <p class="note">${t(lang, 'windowClose')}</p>
        <script>setTimeout(() => window.close(), 2000);</script>
    `, false, lang),

    error: (msg, lang = 'ko') => HTML.base(`Stitch MCP - ${t(lang, 'error')}`, `
        <div class="emoji">❌</div>
        <h1 class="error">${msg}</h1>
    `, false, lang),

    welcome: (lang = 'ko') => HTML.base(t(lang, 'welcome'), `
        <div class="emoji">🚀</div>
        <h1>${t(lang, 'welcome')}</h1>
        <h2>${t(lang, 'welcomeSubtitle')}</h2>
        <p>${t(lang, 'welcomeDesc')}</p>
        <a href="/setup/check" class="btn">${t(lang, 'getStarted')}</a>
    `, false, lang),

    needProject: (lang = 'ko') => HTML.base(t(lang, 'welcome'), `
        <div class="step-badge">${t(lang, 'stepOf', '1', '3')}</div>
        <h1>🏗️ ${t(lang, 'needProject')}</h1>
        <p>${t(lang, 'needProjectDesc')}</p>

        <div class="instructions">
            <ol>
                <li><strong>${t(lang, 'step1')}</strong></li>
                <li><strong>${t(lang, 'step2')}</strong></li>
                <li><strong>${t(lang, 'step3')}</strong></li>
                <li><strong>${t(lang, 'step4')}</strong></li>
            </ol>
        </div>

        <a href="https://console.cloud.google.com/projectcreate" target="_blank" class="btn">
            ${t(lang, 'createProject')}
        </a>

        <form action="/setup/project" method="GET" style="margin-top: 30px;">
            <div class="input-group">
                <label for="projectId">${t(lang, 'projectIdLabel')}</label>
                <input type="text" id="projectId" name="projectId" placeholder="${t(lang, 'projectIdPlaceholder')}" required>
            </div>
            <button type="submit" class="btn btn-success">${t(lang, 'confirmProjectId')}</button>
        </form>

        <p class="note">${t(lang, 'projectIdTip')}</p>
    `, false, lang),

    enableApi: (apiName, apiId, projectId, step, total, lang = 'ko') => HTML.base(t(lang, 'welcome'), `
        <div class="step-badge">${t(lang, 'stepOf', step, total)}</div>
        <h1>🔌 ${t(lang, 'enableApi')}</h1>
        <div class="api-badge">${apiName}</div>

        <div class="instructions">
            <ol>
                <li><strong>${t(lang, 'enableApiStep1')}</strong></li>
                <li><strong>${t(lang, 'enableApiStep2')}</strong></li>
                <li><strong>${t(lang, 'enableApiStep3')}</strong></li>
            </ol>
        </div>

        <a href="https://console.cloud.google.com/apis/library/${apiId}?project=${projectId}" target="_blank" class="btn">
            ${t(lang, 'openApiPage')}
        </a>

        <a href="/setup/check" class="btn btn-secondary" style="margin-top: 20px;">
            ${t(lang, 'checkStatus')}
        </a>

        <p class="note">${t(lang, 'apiNote')}</p>
    `, true, lang),

    checking: (lang = 'ko') => HTML.base(t(lang, 'welcome'), `
        <div class="spinner"></div>
        <h1>${t(lang, 'checking')}</h1>
        <p>${t(lang, 'pleaseWait')}</p>
    `, true, lang),

    complete: (projectId, lang = 'ko') => HTML.base(t(lang, 'complete'), `
        <div class="emoji">🎉</div>
        <h1 class="success">${t(lang, 'complete')}</h1>
        <p>${t(lang, 'completeDesc')}</p>
        <div class="api-badge">${t(lang, 'project')}: ${projectId}</div>
        <p style="margin-top: 30px;">${lang === 'ko' ? '이 창을 닫고 Claude Code를 사용하세요.' : 'Close this window and use Claude Code.'}</p>
        <button onclick="window.close()" class="btn btn-success">${t(lang, 'closeWindow')}</button>
        <script>setTimeout(() => window.close(), 5000);</script>
    `, false, lang),

    projectNotFound: (projectId, lang = 'ko') => HTML.base(t(lang, 'welcome'), `
        <div class="emoji">⚠️</div>
        <h1>${t(lang, 'projectNotFound')}</h1>
        <p>${t(lang, 'projectNotFoundDesc')} "<strong>${projectId}</strong>"</p>
        <a href="/setup/check" class="btn">${t(lang, 'tryAgain')}</a>
    `, false, lang)
};

// ============= API 체크 함수 =============

async function checkApiEnabled(accessToken, projectId, apiId) {
    try {
        const response = await fetch(
            `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${apiId}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (!response.ok) return false;
        const data = await response.json();
        return data.state === 'ENABLED';
    } catch (e) {
        return false;
    }
}

async function listUserProjects(accessToken) {
    try {
        const response = await fetch(
            'https://cloudresourcemanager.googleapis.com/v1/projects?filter=lifecycleState:ACTIVE',
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (!response.ok) return [];
        const data = await response.json();
        return data.projects || [];
    } catch (e) {
        return [];
    }
}

async function verifyProject(accessToken, projectId) {
    try {
        const response = await fetch(
            `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        return response.ok;
    } catch (e) {
        return false;
    }
}

// ============= 브라우저 기반 설정 마법사 =============

async function runSetupWizard(accessToken) {
    log.step(logT('setupWizardStarting'));

    const config = loadConfig();

    // 이미 설정 완료된 경우
    if (config.projectId && config.setupComplete) {
        const isStitchEnabled = await checkApiEnabled(accessToken, config.projectId, 'stitch.googleapis.com');
        if (isStitchEnabled) {
            log.success(logT('usingExistingConfig', config.projectId));
            return config.projectId;
        }
    }

    const REQUIRED_APIS = [
        { name: 'Service Usage API', id: 'serviceusage.googleapis.com' },
        { name: 'Stitch API', id: 'stitch.googleapis.com' }
    ];

    return new Promise(async (resolve, reject) => {
        let currentProjectId = config.projectId || null;
        let resolved = false;

        // 프로젝트 목록 확인
        if (!currentProjectId) {
            const projects = await listUserProjects(accessToken);
            if (projects.length > 0) {
                currentProjectId = projects[0].projectId;
                log.info(logT('existingProjectFound', currentProjectId));
                saveConfig({ projectId: currentProjectId, setupComplete: false });
            }
        }

        const server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const pathname = parsedUrl.pathname;

            // 언어 감지: 쿼리 파라미터 > Accept-Language 헤더
            const lang = parsedUrl.query.lang || detectLanguage(req);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');

            // 홈
            if (pathname === '/' || pathname === '/setup') {
                res.end(HTML.welcome(lang));
                return;
            }

            // 프로젝트 ID 입력 처리
            if (pathname === '/setup/project') {
                const inputProjectId = parsedUrl.query.projectId;
                if (inputProjectId) {
                    const isValid = await verifyProject(accessToken, inputProjectId);
                    if (isValid) {
                        currentProjectId = inputProjectId;
                        saveConfig({ projectId: currentProjectId, setupComplete: false });
                        log.success(logT('projectVerified', currentProjectId));
                        res.writeHead(302, { Location: `/setup/check?lang=${lang}` });
                        res.end();
                        return;
                    } else {
                        res.end(HTML.projectNotFound(inputProjectId, lang));
                        return;
                    }
                }
                res.writeHead(302, { Location: `/setup/check?lang=${lang}` });
                res.end();
                return;
            }

            // 상태 체크
            if (pathname === '/setup/check') {
                // 프로젝트 없으면 프로젝트 생성 안내
                if (!currentProjectId) {
                    const projects = await listUserProjects(accessToken);
                    if (projects.length > 0) {
                        currentProjectId = projects[0].projectId;
                        saveConfig({ projectId: currentProjectId, setupComplete: false });
                    } else {
                        res.end(HTML.needProject(lang));
                        return;
                    }
                }

                // API 활성화 상태 확인
                for (let i = 0; i < REQUIRED_APIS.length; i++) {
                    const api = REQUIRED_APIS[i];
                    const isEnabled = await checkApiEnabled(accessToken, currentProjectId, api.id);

                    if (!isEnabled) {
                        res.end(HTML.enableApi(api.name, api.id, currentProjectId, i + 2, REQUIRED_APIS.length + 1, lang));
                        return;
                    }
                }

                // 모든 설정 완료
                resolved = true;
                saveConfig({ projectId: currentProjectId, setupComplete: true });
                res.end(HTML.complete(currentProjectId, lang));

                setTimeout(() => {
                    server.close();
                    resolve(currentProjectId);
                }, 3000);
                return;
            }

            // 404
            res.writeHead(302, { Location: '/' });
            res.end();
        });

        server.listen(SETUP_PORT, async () => {
            log.info(logT('setupWizardUrl', SETUP_PORT));
            const open = (await import('open')).default;
            await open(`http://localhost:${SETUP_PORT}`);
        });

        // 10분 타임아웃
        setTimeout(() => {
            if (!resolved) {
                server.close();
                reject(new Error('설정 타임아웃 (10분)'));
            }
        }, 600000);
    });
}

// ============= 로컬 워크스페이스 프로젝트 관리 =============

const LOCAL_PROJECT_FILE = '.stitch-project.json';

// 현재 세션의 활성 프로젝트 (메모리)
let activeProject = null;

function getLocalProjectPath() {
    return path.join(process.cwd(), LOCAL_PROJECT_FILE);
}

function loadLocalProject() {
    const projectPath = getLocalProjectPath();
    if (fs.existsSync(projectPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
            return data;
        } catch (e) {
            return null;
        }
    }
    return null;
}

function saveLocalProject(projectData) {
    const projectPath = getLocalProjectPath();
    fs.writeFileSync(projectPath, JSON.stringify(projectData, null, 2));
    // 활성 프로젝트도 업데이트
    activeProject = projectData;
}

function clearLocalProject() {
    const projectPath = getLocalProjectPath();
    if (fs.existsSync(projectPath)) {
        fs.unlinkSync(projectPath);
        activeProject = null;
        return true;
    }
    return false;
}

// 프로젝트 ID 자동 해결: args.projectId > activeProject > localProject
function resolveProjectId(argsProjectId) {
    // 1. 명시적으로 전달된 projectId 사용
    if (argsProjectId) {
        return { projectId: argsProjectId, source: 'argument' };
    }

    // 2. 현재 세션의 활성 프로젝트 사용
    if (activeProject && activeProject.projectId) {
        return { projectId: activeProject.projectId, source: 'session', projectName: activeProject.projectName };
    }

    // 3. 로컬 워크스페이스에서 불러오기
    const localProject = loadLocalProject();
    if (localProject && localProject.projectId) {
        // 로컬에서 불러온 프로젝트를 활성 프로젝트로 설정
        activeProject = localProject;
        log.info(logT('workspaceProjectFound', localProject.projectName || localProject.projectId));
        return { projectId: localProject.projectId, source: 'workspace', projectName: localProject.projectName };
    }

    // 4. 프로젝트 없음
    return { projectId: null, source: 'none' };
}

// 프로젝트가 필요할 때 반환할 에러 응답 생성
function createProjectRequiredResponse() {
    const message = systemLocale === 'ko'
        ? `⚠️ 프로젝트가 설정되지 않았습니다.

다음 중 하나를 선택해주세요:
1. **기존 프로젝트 사용**: list_projects로 프로젝트 목록을 확인하고 projectId를 전달
2. **새 프로젝트 생성**: create_project로 새 프로젝트 생성

프로젝트가 설정되면 자동으로 현재 워크스페이스에 저장되어 다음 세션에서도 사용됩니다.`
        : `⚠️ No project is set.

Please choose one of the following:
1. **Use existing project**: Check project list with list_projects and pass projectId
2. **Create new project**: Create a new project with create_project

Once a project is set, it will be automatically saved to the current workspace for future sessions.`;

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                error: "PROJECT_REQUIRED",
                message: message,
                suggestions: [
                    { action: "list_projects", description: systemLocale === 'ko' ? "프로젝트 목록 확인" : "List available projects" },
                    { action: "create_project", description: systemLocale === 'ko' ? "새 프로젝트 생성" : "Create new project" }
                ],
                workspacePath: process.cwd()
            }, null, 2)
        }],
        isError: true
    };
}

// 프로젝트 설정 및 저장
function setActiveProject(projectId, projectName = null) {
    const projectData = {
        projectId: projectId,
        projectName: projectName,
        lastUsed: new Date().toISOString(),
        workspacePath: process.cwd()
    };
    saveLocalProject(projectData);
    log.success(logT('workspaceProjectSaved', projectName || projectId));
    return projectData;
}

// ============= Stitch API 호출 =============

async function callStitchAPI(method, params, projectId, accessToken) {
    const body = {
        jsonrpc: "2.0",
        method,
        params,
        id: Date.now()
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(STITCH_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-Goog-User-Project": projectId
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const text = await response.text();
            throw { code: -32000, message: `HTTP ${response.status}: ${text}` };
        }

        return await response.json();

    } catch (error) {
        clearTimeout(timeout);
        if (error.name === 'AbortError') throw { code: -32002, message: "Request timeout" };
        if (error.code) throw error;
        throw { code: -32603, message: error.message || "Internal error" };
    }
}

// ============= MCP Server =============

async function main() {
    try {
        log.info(logT('serverVersion', os.platform()));

        // 1. OAuth 인증
        log.step(logT('oauthAuthenticating'));
        const accessToken = await getAccessToken();
        log.success(logT('oauthComplete'));

        // 2. 설정 마법사
        log.step(logT('projectConfiguring'));
        const projectId = await runSetupWizard(accessToken);
        log.success(logT('projectSet', projectId));

        // 3. MCP 서버 시작
        log.step(logT('mcpServerStarting'));

        const server = new Server(
            { name: "stitch", version: "2.2.0" },
            { capabilities: { tools: {}, prompts: {} } }
        );

        const {
            ListToolsRequestSchema,
            CallToolRequestSchema,
            ListPromptsRequestSchema,
            GetPromptRequestSchema
        } = require("@modelcontextprotocol/sdk/types.js");

        // ========== MCP Prompts 정의 (슬래시 명령어) ==========
        const MCP_PROMPTS = [
            {
                name: "design",
                description: "Smart UI design generation with automatic style detection and trend application",
                arguments: [
                    { name: "prompt", description: "Screen description (e.g., 'login page', 'dashboard')", required: true },
                    { name: "device", description: "Device type: MOBILE, DESKTOP, or TABLET", required: false },
                    { name: "style", description: "Design style: glassmorphism, dark, minimal, bento-grid, etc.", required: false }
                ]
            },
            {
                name: "design-system",
                description: "Create new screens while maintaining existing design style for brand consistency",
                arguments: [
                    { name: "prompt", description: "New screen description", required: true },
                    { name: "reference_screen_id", description: "Screen ID to use as design reference", required: false }
                ]
            },
            {
                name: "design-flow",
                description: "Generate multiple screens for complete user flows with consistent design",
                arguments: [
                    { name: "flow", description: "Flow description (e.g., 'onboarding: welcome -> signup -> complete')", required: true },
                    { name: "device", description: "Device type: MOBILE, DESKTOP, or TABLET", required: false }
                ]
            },
            {
                name: "design-qa",
                description: "Comprehensive design quality, accessibility (WCAG 2.1), and consistency checks",
                arguments: [
                    { name: "screen_id", description: "Screen ID to analyze (or 'all' for entire project)", required: true },
                    { name: "level", description: "WCAG level: A, AA, or AAA", required: false }
                ]
            },
            {
                name: "design-export",
                description: "Generate design system packages for developer handoff (tokens, components, docs)",
                arguments: [
                    { name: "token_format", description: "Token format: css-variables, tailwind, scss, json", required: false },
                    { name: "component_format", description: "Component format: react, vue, html, json", required: false }
                ]
            }
        ];

        // ========== 커스텀 도구 정의 ==========
        const CUSTOM_TOOLS = [
            // ========== 워크스페이스 프로젝트 관리 도구 ==========
            {
                name: "get_workspace_project",
                description: "🔍 Checks if there is an existing Stitch project associated with the current workspace/folder. Returns project info if found, or null if no project is set. Use this at the start of a session to check for existing projects and ask the user if they want to continue with it.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            },
            {
                name: "set_workspace_project",
                description: "💾 Associates a Stitch project with the current workspace/folder. This allows continuing work on the same project in future sessions. The project info is stored in .stitch-project.json in the current directory.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The Stitch project ID (e.g., 'projects/1234567890')" },
                        projectName: { type: "string", description: "Human-readable project name for display" }
                    },
                    required: ["projectId"]
                }
            },
            {
                name: "clear_workspace_project",
                description: "🗑️ Removes the Stitch project association from the current workspace/folder. Use this when the user wants to start fresh or switch to a different project.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            },

            // 기존 도구
            {
                name: "fetch_screen_code",
                description: "Retrieves the actual HTML/Code content of a screen.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The screen ID" }
                    },
                    required: ["projectId", "screenId"]
                }
            },
            {
                name: "fetch_screen_image",
                description: "Retrieves the screenshot/preview image of a screen.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The screen ID" }
                    },
                    required: ["projectId", "screenId"]
                }
            },

            // ========== 웹 디자인 전문 도구 (P0: Core) ==========
            {
                name: "extract_design_context",
                description: "Extracts design DNA from an existing screen including colors, typography, spacing, layout patterns, and component styles. Use this to maintain visual consistency across multiple screens.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The screen ID to extract design context from" },
                        includeComponents: { type: "boolean", description: "Include component-level analysis (buttons, cards, forms, etc.)", default: true },
                        includeTypography: { type: "boolean", description: "Include typography analysis (fonts, sizes, weights)", default: true },
                        includeColors: { type: "boolean", description: "Include color palette extraction", default: true },
                        includeSpacing: { type: "boolean", description: "Include spacing/layout pattern analysis", default: true }
                    },
                    required: ["projectId", "screenId"]
                }
            },
            {
                name: "apply_design_context",
                description: "Generates a new screen using a previously extracted design context to ensure visual consistency. Combines the power of design context with a new screen description.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        designContext: { type: "object", description: "The design context object from extract_design_context" },
                        prompt: { type: "string", description: "Description of the new screen to generate" },
                        deviceType: { type: "string", enum: ["MOBILE", "DESKTOP", "TABLET"], description: "Target device type", default: "MOBILE" }
                    },
                    required: ["projectId", "designContext", "prompt"]
                }
            },

            // ========== 웹 디자인 전문 도구 (P1: Productivity) ==========
            {
                name: "generate_design_tokens",
                description: "Generates design tokens (CSS variables, Tailwind config, or design system JSON) from an existing screen's design. Useful for maintaining consistency and integrating with development workflows.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The screen ID to generate tokens from" },
                        format: { type: "string", enum: ["css-variables", "tailwind", "json", "scss"], description: "Output format for design tokens", default: "css-variables" },
                        includeSemanticNames: { type: "boolean", description: "Use semantic names (primary, secondary) vs literal (blue-500)", default: true }
                    },
                    required: ["projectId", "screenId"]
                }
            },
            {
                name: "generate_responsive_variant",
                description: "Creates a responsive variant of an existing screen for a different device type while maintaining the same design language and content.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The source screen ID" },
                        targetDevice: { type: "string", enum: ["MOBILE", "DESKTOP", "TABLET"], description: "Target device type for the variant" },
                        adaptationStrategy: { type: "string", enum: ["reflow", "reorganize", "simplify"], description: "How to adapt the design: reflow (same content, different layout), reorganize (restructure for device), simplify (remove non-essential elements)", default: "reflow" }
                    },
                    required: ["projectId", "screenId", "targetDevice"]
                }
            },
            {
                name: "batch_generate_screens",
                description: "Generates multiple related screens in a single operation with consistent design language. Ideal for creating complete user flows or page sets.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screens: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "Screen name identifier" },
                                    prompt: { type: "string", description: "Description for this screen" }
                                },
                                required: ["name", "prompt"]
                            },
                            description: "Array of screens to generate"
                        },
                        sharedDesignContext: { type: "object", description: "Optional shared design context for all screens" },
                        deviceType: { type: "string", enum: ["MOBILE", "DESKTOP", "TABLET"], description: "Device type for all screens", default: "MOBILE" }
                    },
                    required: ["projectId", "screens"]
                }
            },

            // ========== 웹 디자인 전문 도구 (P2: Analysis & Quality) ==========
            {
                name: "analyze_accessibility",
                description: "Analyzes a screen for WCAG 2.1 accessibility compliance. Checks color contrast, text sizes, touch targets, semantic structure, and provides actionable recommendations.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The screen ID to analyze" },
                        level: { type: "string", enum: ["A", "AA", "AAA"], description: "WCAG conformance level to check against", default: "AA" },
                        includeRecommendations: { type: "boolean", description: "Include fix recommendations", default: true }
                    },
                    required: ["projectId", "screenId"]
                }
            },
            {
                name: "compare_designs",
                description: "Compares two screens to identify design differences, inconsistencies, and suggest harmonization opportunities. Useful for design system audits.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId1: { type: "string", description: "First screen ID" },
                        screenId2: { type: "string", description: "Second screen ID" },
                        compareAspects: {
                            type: "array",
                            items: { type: "string", enum: ["colors", "typography", "spacing", "components", "layout"] },
                            description: "Aspects to compare",
                            default: ["colors", "typography", "spacing", "components", "layout"]
                        }
                    },
                    required: ["projectId", "screenId1", "screenId2"]
                }
            },
            {
                name: "extract_components",
                description: "Extracts reusable UI component patterns from a screen. Identifies buttons, cards, forms, navigation elements, etc. with their styles and variants.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The screen ID" },
                        componentTypes: {
                            type: "array",
                            items: { type: "string", enum: ["buttons", "cards", "forms", "navigation", "lists", "modals", "inputs", "all"] },
                            description: "Types of components to extract",
                            default: ["all"]
                        },
                        outputFormat: { type: "string", enum: ["json", "react", "html", "vue"], description: "Output format for component definitions", default: "json" }
                    },
                    required: ["projectId", "screenId"]
                }
            },

            // ========== 웹 디자인 전문 도구 (P3: Trends & Enhancement) ==========
            {
                name: "suggest_trending_design",
                description: "Suggests and applies modern UI/UX design trends to a screen prompt. Includes glassmorphism, bento-grid, gradient meshes, micro-interactions, and more.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        prompt: { type: "string", description: "Base screen description" },
                        trends: {
                            type: "array",
                            items: {
                                type: "string",
                                enum: [
                                    "glassmorphism",
                                    "bento-grid",
                                    "gradient-mesh",
                                    "aurora-gradients",
                                    "3d-elements",
                                    "micro-interactions",
                                    "dark-mode",
                                    "minimalist",
                                    "brutalist",
                                    "neomorphism",
                                    "retro-futurism",
                                    "organic-shapes",
                                    "bold-typography"
                                ]
                            },
                            description: "Design trends to apply"
                        },
                        intensity: { type: "string", enum: ["subtle", "moderate", "bold"], description: "How strongly to apply the trends", default: "moderate" },
                        deviceType: { type: "string", enum: ["MOBILE", "DESKTOP", "TABLET"], description: "Target device type", default: "MOBILE" }
                    },
                    required: ["projectId", "prompt", "trends"]
                }
            },
            {
                name: "generate_style_guide",
                description: "Generates a comprehensive style guide/design documentation screen from an existing design. Creates a visual reference of colors, typography, components, and usage guidelines.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenId: { type: "string", description: "The source screen ID" },
                        sections: {
                            type: "array",
                            items: { type: "string", enum: ["colors", "typography", "spacing", "components", "icons", "guidelines"] },
                            description: "Sections to include in the style guide",
                            default: ["colors", "typography", "spacing", "components"]
                        },
                        format: { type: "string", enum: ["visual", "documentation", "both"], description: "Output format: visual (rendered screen), documentation (markdown), both", default: "visual" }
                    },
                    required: ["projectId", "screenId"]
                }
            },
            {
                name: "export_design_system",
                description: "Exports a complete design system package from project screens including tokens, components, documentation, and assets. Ready for developer handoff.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "The project ID" },
                        screenIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "Screen IDs to include (leave empty for all screens)"
                        },
                        includeTokens: { type: "boolean", description: "Include design tokens", default: true },
                        includeComponents: { type: "boolean", description: "Include component definitions", default: true },
                        includeDocumentation: { type: "boolean", description: "Include usage documentation", default: true },
                        tokenFormat: { type: "string", enum: ["css-variables", "tailwind", "json", "scss"], description: "Format for design tokens", default: "css-variables" },
                        componentFormat: { type: "string", enum: ["react", "vue", "html", "json"], description: "Format for components", default: "react" }
                    },
                    required: ["projectId"]
                }
            },

            // ========== 이미지 생성 도구 (Antigravity/Gemini 전용) ==========
            {
                name: "generate_design_asset",
                description: "🎨 Generates design assets (logo, icon, illustration, hero image, wireframe) using Gemini via Antigravity OAuth. Supports gemini-3-pro (default), gemini-2.5-pro. Use check_antigravity_auth to verify auth status first.",
                inputSchema: {
                    type: "object",
                    properties: {
                        assetType: {
                            type: "string",
                            enum: ["logo", "icon", "illustration", "hero", "wireframe", "background", "pattern"],
                            description: "Type of asset to generate"
                        },
                        prompt: { type: "string", description: "Detailed description of the asset to generate" },
                        model: {
                            type: "string",
                            enum: ["gemini-3-pro", "gemini-2.5-pro"],
                            description: "Gemini model to use for image generation. gemini-3-pro is recommended for best quality.",
                            default: "gemini-3-pro"
                        },
                        style: {
                            type: "string",
                            enum: ["minimal", "modern", "playful", "corporate", "organic", "flat", "3d", "gradient", "auto"],
                            description: "Visual style for the asset",
                            default: "auto"
                        },
                        colorScheme: { type: "string", description: "Color scheme hint (e.g., 'blue gradient', 'earth tones', '#4CAF50')" },
                        aspectRatio: {
                            type: "string",
                            enum: ["1:1", "16:9", "9:16", "4:3", "3:4"],
                            description: "Aspect ratio of the generated image",
                            default: "1:1"
                        },
                        saveToFile: { type: "boolean", description: "Save generated image to file", default: true },
                        forceAntigravityAuth: { type: "boolean", description: "Force Antigravity browser authentication for better image quality (optional)", default: false },
                        removeBackground: {
                            type: "boolean",
                            description: "Automatically remove white/solid background and make transparent (recommended for logos, icons)",
                            default: false
                        },
                        backgroundRemovalMode: {
                            type: "string",
                            enum: ["white", "auto"],
                            description: "Background removal mode: 'white' for white backgrounds, 'auto' for auto-detecting solid colors",
                            default: "white"
                        },
                        backgroundThreshold: {
                            type: "number",
                            description: "Threshold for background detection (0-255, higher = more aggressive). Default: 240 for white mode, 30 tolerance for auto mode",
                            default: 240
                        }
                    },
                    required: ["assetType", "prompt"]
                }
            },
            {
                name: "orchestrate_design",
                description: "🎭 Full design orchestration: Generates assets (logo, icons, hero) via Antigravity/Gemini 3 Pro with auto background removal, then creates complete UI with Stitch API. Requires both Stitch (gcloud) and Antigravity auth for full functionality. One prompt to complete design!",
                inputSchema: {
                    type: "object",
                    properties: {
                        description: { type: "string", description: "Full description of the screen/page to create (e.g., '친환경 쇼핑몰 메인 페이지, 녹색 테마')" },
                        projectId: { type: "string", description: "Stitch project ID to create the screen in" },
                        autoGenerateAssets: { type: "boolean", description: "Automatically generate required assets before UI creation", default: true },
                        assetHints: {
                            type: "object",
                            properties: {
                                needsLogo: { type: "boolean", description: "Generate a logo", default: true },
                                needsHeroImage: { type: "boolean", description: "Generate a hero/banner image", default: true },
                                needsIcons: { type: "boolean", description: "Generate icon set", default: false },
                                customAssets: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Additional custom assets to generate"
                                }
                            }
                        },
                        designPreferences: {
                            type: "object",
                            properties: {
                                style: { type: "string", description: "Overall design style (modern, minimal, playful, etc.)" },
                                colorScheme: { type: "string", description: "Primary color scheme" },
                                mood: { type: "string", description: "Design mood (professional, friendly, luxurious, etc.)" }
                            }
                        },
                        deviceType: { type: "string", enum: ["MOBILE", "DESKTOP", "TABLET"], description: "Target device", default: "MOBILE" },
                        forceAntigravityAuth: { type: "boolean", description: "Force Antigravity browser authentication for better image quality (optional)", default: false }
                    },
                    required: ["description", "projectId"]
                }
            },
            {
                name: "check_antigravity_auth",
                description: "Checks Antigravity (Gemini 3 Pro) auth status. Required for image asset generation (logo, icon, illustration). Stitch auth (gcloud) is separate and used for UI page generation.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        ];

        // 도구 목록
        server.setRequestHandler(ListToolsRequestSchema, async () => {
            try {
                const token = await getAccessToken();
                const result = await callStitchAPI("tools/list", {}, projectId, token);
                const tools = result.result ? result.result.tools : [];
                return { tools: [...tools, ...CUSTOM_TOOLS] };
            } catch (error) {
                return { tools: [...CUSTOM_TOOLS] };
            }
        });

        // 도구 호출
        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const token = await getAccessToken();

            // ========== 프로젝트가 필요한 도구 목록 ==========
            const TOOLS_REQUIRING_PROJECT = [
                'get_screen', 'list_screens', 'generate_screen_from_text', 'fetch_screen_code', 'fetch_screen_image',
                'extract_design_context', 'apply_design_context', 'compare_designs',
                'generate_design_tokens', 'generate_responsive_variant', 'batch_generate_screens',
                'analyze_accessibility', 'extract_components', 'suggest_trending_design',
                'generate_style_guide', 'export_design_system', 'orchestrate_design'
            ];

            // ========== 프로젝트 자동 해결 ==========
            // projectId가 필요한 도구에서 자동으로 프로젝트를 해결
            if (TOOLS_REQUIRING_PROJECT.includes(name)) {
                const resolved = resolveProjectId(args?.projectId);

                if (!resolved.projectId) {
                    // 프로젝트가 없으면 에러 반환
                    return createProjectRequiredResponse();
                }

                // args에 해결된 projectId 설정
                if (!args) {
                    args = {};
                }
                if (!args.projectId) {
                    args.projectId = resolved.projectId;
                    if (resolved.source !== 'argument') {
                        log.info(systemLocale === 'ko'
                            ? `📂 프로젝트 자동 사용: ${resolved.projectName || resolved.projectId} (${resolved.source})`
                            : `📂 Auto-using project: ${resolved.projectName || resolved.projectId} (${resolved.source})`);
                    }
                }
            }

            // ========== 워크스페이스 프로젝트 관리 도구 ==========

            // get_workspace_project - 현재 워크스페이스의 프로젝트 확인
            if (name === "get_workspace_project") {
                try {
                    const localProject = loadLocalProject();

                    if (localProject && localProject.projectId) {
                        log.info(logT('workspaceProjectFound', localProject.projectName || localProject.projectId));

                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    found: true,
                                    projectId: localProject.projectId,
                                    projectName: localProject.projectName || null,
                                    lastUsed: localProject.lastUsed || null,
                                    workspacePath: process.cwd(),
                                    message: systemLocale === 'ko'
                                        ? `기존 프로젝트를 발견했습니다: ${localProject.projectName || localProject.projectId}. 이어서 진행하시겠습니까?`
                                        : `Found existing project: ${localProject.projectName || localProject.projectId}. Would you like to continue with this project?`,
                                    options: systemLocale === 'ko'
                                        ? { continue: "예, 이어서 진행", newProject: "아니오, 새 프로젝트 생성" }
                                        : { continue: "Yes, continue", newProject: "No, create new project" }
                                }, null, 2)
                            }]
                        };
                    } else {
                        log.info(logT('noWorkspaceProject'));

                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    found: false,
                                    workspacePath: process.cwd(),
                                    message: systemLocale === 'ko'
                                        ? "현재 워크스페이스에 연결된 프로젝트가 없습니다. 새 프로젝트를 생성하거나 기존 프로젝트를 선택해주세요."
                                        : "No project associated with current workspace. Please create a new project or select an existing one."
                                }, null, 2)
                            }]
                        };
                    }
                } catch (err) {
                    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
                }
            }

            // set_workspace_project - 워크스페이스에 프로젝트 연결
            if (name === "set_workspace_project") {
                try {
                    const projectData = {
                        projectId: args.projectId,
                        projectName: args.projectName || null,
                        lastUsed: new Date().toISOString(),
                        workspacePath: process.cwd()
                    };

                    saveLocalProject(projectData);
                    log.success(logT('workspaceProjectSaved', args.projectName || args.projectId));

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                projectId: args.projectId,
                                projectName: args.projectName || null,
                                savedTo: path.join(process.cwd(), LOCAL_PROJECT_FILE),
                                message: systemLocale === 'ko'
                                    ? `프로젝트가 워크스페이스에 저장되었습니다. 다음 세션에서 자동으로 이 프로젝트를 불러옵니다.`
                                    : `Project saved to workspace. This project will be automatically loaded in future sessions.`
                            }, null, 2)
                        }]
                    };
                } catch (err) {
                    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
                }
            }

            // clear_workspace_project - 워크스페이스 프로젝트 초기화
            if (name === "clear_workspace_project") {
                try {
                    const cleared = clearLocalProject();
                    log.info(logT('workspaceProjectCleared'));

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                cleared: cleared,
                                workspacePath: process.cwd(),
                                message: systemLocale === 'ko'
                                    ? "워크스페이스 프로젝트 연결이 해제되었습니다."
                                    : "Workspace project association has been cleared."
                            }, null, 2)
                        }]
                    };
                } catch (err) {
                    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
                }
            }

            // fetch_screen_code
            if (name === "fetch_screen_code") {
                try {
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId: args.screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch screen details");

                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);

                    if (!downloadUrl) return { content: [{ type: "text", text: "No code URL found." }], isError: true };

                    const res = await fetch(downloadUrl);
                    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                    return { content: [{ type: "text", text: await res.text() }] };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
                }
            }

            // fetch_screen_image
            if (name === "fetch_screen_image") {
                try {
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId: args.screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch screen details");

                    let imageUrl = null;
                    const findImg = (obj) => {
                        if (imageUrl || !obj || typeof obj !== 'object') return;
                        if (obj.screenshot?.downloadUrl) { imageUrl = obj.screenshot.downloadUrl; return; }
                        const isImg = (s) => typeof s === "string" && (s.includes(".png") || s.includes(".jpg") ||
                            (s.includes("googleusercontent.com") && !s.includes("contribution.usercontent")));
                        if (obj.downloadUrl && isImg(obj.downloadUrl)) { imageUrl = obj.downloadUrl; return; }
                        for (const key in obj) findImg(obj[key]);
                    };
                    findImg(screenRes.result);

                    if (!imageUrl) return { content: [{ type: "text", text: "No image URL found." }], isError: true };

                    const imgRes = await fetch(imageUrl);
                    if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);

                    const buffer = Buffer.from(await imgRes.arrayBuffer());
                    const fileName = `screen_${args.screenId}.png`;
                    fs.writeFileSync(path.join(process.cwd(), fileName), buffer);

                    return {
                        content: [
                            { type: "text", text: `Saved: ${fileName}` },
                            { type: "image", data: buffer.toString('base64'), mimeType: "image/png" }
                        ]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
                }
            }

            // ========== 웹 디자인 도구 핸들러 ==========

            // extract_design_context - 디자인 DNA 추출
            if (name === "extract_design_context") {
                try {
                    // 스크린 코드 가져오기
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId: args.screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch screen details");

                    // HTML 코드 다운로드
                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);

                    let htmlContent = "";
                    if (downloadUrl) {
                        const res = await fetch(downloadUrl);
                        if (res.ok) htmlContent = await res.text();
                    }

                    // CSS 분석을 위한 패턴 추출
                    const designContext = {
                        extractedFrom: { projectId: args.projectId, screenId: args.screenId },
                        extractedAt: new Date().toISOString(),
                        colors: { primary: [], secondary: [], neutral: [], accent: [] },
                        typography: { fontFamilies: [], fontSizes: [], fontWeights: [], lineHeights: [] },
                        spacing: { margins: [], paddings: [], gaps: [] },
                        borderRadius: [],
                        shadows: [],
                        components: [],
                        layoutPatterns: []
                    };

                    // 색상 추출 (hex, rgb, hsl)
                    if (args.includeColors !== false) {
                        const hexColors = htmlContent.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
                        const rgbColors = htmlContent.match(/rgb\([^)]+\)/gi) || [];
                        const rgbaColors = htmlContent.match(/rgba\([^)]+\)/gi) || [];
                        const hslColors = htmlContent.match(/hsl\([^)]+\)/gi) || [];
                        const allColors = [...new Set([...hexColors, ...rgbColors, ...rgbaColors, ...hslColors])];

                        // 색상 분류 (밝기 기준)
                        allColors.forEach(color => {
                            const lowerColor = color.toLowerCase();
                            if (lowerColor.includes('fff') || lowerColor.includes('255') || lowerColor.includes('f5f5') || lowerColor.includes('e5e5')) {
                                designContext.colors.neutral.push(color);
                            } else if (lowerColor.includes('000') || lowerColor.includes('111') || lowerColor.includes('222') || lowerColor.includes('333')) {
                                designContext.colors.neutral.push(color);
                            } else if (designContext.colors.primary.length < 3) {
                                designContext.colors.primary.push(color);
                            } else if (designContext.colors.secondary.length < 3) {
                                designContext.colors.secondary.push(color);
                            } else {
                                designContext.colors.accent.push(color);
                            }
                        });
                    }

                    // 타이포그래피 추출
                    if (args.includeTypography !== false) {
                        const fontFamilies = htmlContent.match(/font-family:\s*([^;]+)/gi) || [];
                        const fontSizes = htmlContent.match(/font-size:\s*([^;]+)/gi) || [];
                        const fontWeights = htmlContent.match(/font-weight:\s*([^;]+)/gi) || [];
                        const lineHeights = htmlContent.match(/line-height:\s*([^;]+)/gi) || [];

                        designContext.typography.fontFamilies = [...new Set(fontFamilies.map(f => f.replace(/font-family:\s*/i, '').trim()))];
                        designContext.typography.fontSizes = [...new Set(fontSizes.map(f => f.replace(/font-size:\s*/i, '').trim()))];
                        designContext.typography.fontWeights = [...new Set(fontWeights.map(f => f.replace(/font-weight:\s*/i, '').trim()))];
                        designContext.typography.lineHeights = [...new Set(lineHeights.map(f => f.replace(/line-height:\s*/i, '').trim()))];
                    }

                    // 간격 추출
                    if (args.includeSpacing !== false) {
                        const margins = htmlContent.match(/margin[^:]*:\s*([^;]+)/gi) || [];
                        const paddings = htmlContent.match(/padding[^:]*:\s*([^;]+)/gi) || [];
                        const gaps = htmlContent.match(/gap:\s*([^;]+)/gi) || [];

                        designContext.spacing.margins = [...new Set(margins.map(m => m.split(':')[1]?.trim()).filter(Boolean))].slice(0, 10);
                        designContext.spacing.paddings = [...new Set(paddings.map(p => p.split(':')[1]?.trim()).filter(Boolean))].slice(0, 10);
                        designContext.spacing.gaps = [...new Set(gaps.map(g => g.split(':')[1]?.trim()).filter(Boolean))];
                    }

                    // border-radius 추출
                    const borderRadii = htmlContent.match(/border-radius:\s*([^;]+)/gi) || [];
                    designContext.borderRadius = [...new Set(borderRadii.map(b => b.split(':')[1]?.trim()).filter(Boolean))];

                    // box-shadow 추출
                    const shadows = htmlContent.match(/box-shadow:\s*([^;]+)/gi) || [];
                    designContext.shadows = [...new Set(shadows.map(s => s.split(':')[1]?.trim()).filter(Boolean))].slice(0, 5);

                    // 컴포넌트 패턴 감지
                    if (args.includeComponents !== false) {
                        if (htmlContent.includes('<button') || htmlContent.includes('btn')) designContext.components.push('button');
                        if (htmlContent.includes('<input') || htmlContent.includes('<form')) designContext.components.push('form');
                        if (htmlContent.includes('<nav') || htmlContent.includes('navbar')) designContext.components.push('navigation');
                        if (htmlContent.includes('card') || htmlContent.includes('<article')) designContext.components.push('card');
                        if (htmlContent.includes('modal') || htmlContent.includes('dialog')) designContext.components.push('modal');
                        if (htmlContent.includes('<img') || htmlContent.includes('hero')) designContext.components.push('hero');
                        if (htmlContent.includes('grid') || htmlContent.includes('flex')) designContext.layoutPatterns.push('grid-system');
                    }

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                designContext,
                                usage: "Use this design context with 'apply_design_context' tool to generate new screens with consistent styling."
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error extracting design context: ${err.message}` }], isError: true };
                }
            }

            // apply_design_context - 디자인 컨텍스트로 새 화면 생성
            if (name === "apply_design_context") {
                try {
                    const { designContext, prompt, deviceType = "MOBILE" } = args;

                    // 디자인 컨텍스트를 프롬프트에 통합
                    const styleDescription = [];

                    if (designContext.colors?.primary?.length > 0) {
                        styleDescription.push(`Primary colors: ${designContext.colors.primary.slice(0, 3).join(', ')}`);
                    }
                    if (designContext.colors?.secondary?.length > 0) {
                        styleDescription.push(`Secondary colors: ${designContext.colors.secondary.slice(0, 3).join(', ')}`);
                    }
                    if (designContext.typography?.fontFamilies?.length > 0) {
                        styleDescription.push(`Fonts: ${designContext.typography.fontFamilies.slice(0, 2).join(', ')}`);
                    }
                    if (designContext.borderRadius?.length > 0) {
                        styleDescription.push(`Border radius style: ${designContext.borderRadius[0]}`);
                    }
                    if (designContext.shadows?.length > 0) {
                        styleDescription.push(`Shadow style: ${designContext.shadows[0]}`);
                    }

                    const enhancedPrompt = `${prompt}

IMPORTANT: Apply the following design system for visual consistency:
${styleDescription.join('\n')}

Maintain the same visual language, spacing rhythm, and component styles as the reference design.`;

                    // Stitch API로 화면 생성
                    const result = await callStitchAPI("tools/call", {
                        name: "generate_screen_from_text",
                        arguments: {
                            projectId: args.projectId,
                            prompt: enhancedPrompt,
                            deviceType
                        }
                    }, projectId, token);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: "Screen generated with applied design context",
                                appliedStyles: styleDescription,
                                result: result.result
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error applying design context: ${err.message}` }], isError: true };
                }
            }

            // generate_design_tokens - 디자인 토큰 생성
            if (name === "generate_design_tokens") {
                try {
                    // 먼저 디자인 컨텍스트 추출
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId: args.screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch screen details");

                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);

                    let htmlContent = "";
                    if (downloadUrl) {
                        const res = await fetch(downloadUrl);
                        if (res.ok) htmlContent = await res.text();
                    }

                    // 토큰 추출
                    const colors = [...new Set((htmlContent.match(/#[0-9A-Fa-f]{3,8}\b/g) || []))];
                    const fontSizes = [...new Set((htmlContent.match(/font-size:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()).filter(Boolean))];
                    const spacings = [...new Set((htmlContent.match(/(margin|padding|gap):\s*([^;]+)/gi) || []).map(s => s.split(':')[1]?.trim()).filter(Boolean))];
                    const radii = [...new Set((htmlContent.match(/border-radius:\s*([^;]+)/gi) || []).map(b => b.split(':')[1]?.trim()).filter(Boolean))];

                    let output = "";
                    const format = args.format || "css-variables";
                    const semantic = args.includeSemanticNames !== false;

                    if (format === "css-variables") {
                        output = `:root {\n  /* Colors */\n`;
                        colors.slice(0, 10).forEach((c, i) => {
                            const name = semantic ? `--color-${i < 2 ? 'primary' : i < 4 ? 'secondary' : 'neutral'}-${i % 3 + 1}` : `--color-${i + 1}`;
                            output += `  ${name}: ${c};\n`;
                        });
                        output += `\n  /* Font Sizes */\n`;
                        fontSizes.slice(0, 6).forEach((s, i) => {
                            const name = semantic ? `--font-size-${['xs', 'sm', 'base', 'lg', 'xl', '2xl'][i] || i}` : `--font-size-${i + 1}`;
                            output += `  ${name}: ${s};\n`;
                        });
                        output += `\n  /* Spacing */\n`;
                        spacings.slice(0, 8).forEach((s, i) => {
                            output += `  --spacing-${i + 1}: ${s};\n`;
                        });
                        output += `\n  /* Border Radius */\n`;
                        radii.slice(0, 4).forEach((r, i) => {
                            const name = semantic ? `--radius-${['sm', 'md', 'lg', 'full'][i] || i}` : `--radius-${i + 1}`;
                            output += `  ${name}: ${r};\n`;
                        });
                        output += `}\n`;
                    } else if (format === "tailwind") {
                        output = `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n`;
                        colors.slice(0, 10).forEach((c, i) => {
                            const name = semantic ? `${i < 2 ? 'primary' : i < 4 ? 'secondary' : 'neutral'}${i % 3 + 1}00` : `custom${i + 1}`;
                            output += `        '${name}': '${c}',\n`;
                        });
                        output += `      },\n      spacing: {\n`;
                        spacings.slice(0, 8).forEach((s, i) => {
                            output += `        '${i + 1}': '${s}',\n`;
                        });
                        output += `      },\n      borderRadius: {\n`;
                        radii.slice(0, 4).forEach((r, i) => {
                            output += `        '${['sm', 'md', 'lg', 'full'][i] || i}': '${r}',\n`;
                        });
                        output += `      }\n    }\n  }\n};\n`;
                    } else if (format === "scss") {
                        output = `// Design Tokens\n\n// Colors\n`;
                        colors.slice(0, 10).forEach((c, i) => {
                            const name = semantic ? `$color-${i < 2 ? 'primary' : i < 4 ? 'secondary' : 'neutral'}-${i % 3 + 1}` : `$color-${i + 1}`;
                            output += `${name}: ${c};\n`;
                        });
                        output += `\n// Font Sizes\n`;
                        fontSizes.slice(0, 6).forEach((s, i) => {
                            output += `$font-size-${i + 1}: ${s};\n`;
                        });
                        output += `\n// Spacing\n`;
                        spacings.slice(0, 8).forEach((s, i) => {
                            output += `$spacing-${i + 1}: ${s};\n`;
                        });
                        output += `\n// Border Radius\n`;
                        radii.slice(0, 4).forEach((r, i) => {
                            output += `$radius-${i + 1}: ${r};\n`;
                        });
                    } else {
                        output = JSON.stringify({
                            colors: colors.slice(0, 10),
                            fontSizes: fontSizes.slice(0, 6),
                            spacing: spacings.slice(0, 8),
                            borderRadius: radii.slice(0, 4)
                        }, null, 2);
                    }

                    return {
                        content: [{
                            type: "text",
                            text: `Design Tokens (${format}):\n\n${output}`
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error generating design tokens: ${err.message}` }], isError: true };
                }
            }

            // generate_responsive_variant - 반응형 변형 생성
            if (name === "generate_responsive_variant") {
                try {
                    const { screenId, targetDevice, adaptationStrategy = "reflow" } = args;

                    // 원본 화면 정보 가져오기
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch source screen");

                    // 원본 화면에서 콘텐츠 설명 추출
                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);

                    let htmlContent = "";
                    if (downloadUrl) {
                        const res = await fetch(downloadUrl);
                        if (res.ok) htmlContent = await res.text();
                    }

                    // 콘텐츠 분석하여 프롬프트 생성
                    const hasNav = htmlContent.includes('<nav') || htmlContent.includes('navbar');
                    const hasHero = htmlContent.includes('hero') || htmlContent.includes('banner');
                    const hasCards = htmlContent.includes('card');
                    const hasForms = htmlContent.includes('<form') || htmlContent.includes('<input');
                    const hasFooter = htmlContent.includes('<footer');

                    let adaptationPrompt = "";
                    if (adaptationStrategy === "reflow") {
                        adaptationPrompt = "Maintain all content but reflow the layout appropriately for the target device.";
                    } else if (adaptationStrategy === "reorganize") {
                        adaptationPrompt = "Reorganize content structure to optimize for the target device's interaction patterns.";
                    } else if (adaptationStrategy === "simplify") {
                        adaptationPrompt = "Simplify the design by prioritizing essential content and removing secondary elements.";
                    }

                    const components = [];
                    if (hasNav) components.push("navigation bar");
                    if (hasHero) components.push("hero section");
                    if (hasCards) components.push("card components");
                    if (hasForms) components.push("form elements");
                    if (hasFooter) components.push("footer");

                    const prompt = `Create a ${targetDevice.toLowerCase()} version of a screen that contains: ${components.join(", ") || "standard UI elements"}.

${adaptationPrompt}

Maintain the same visual design language (colors, typography, component styles) but adapt the layout for ${targetDevice.toLowerCase()} screen dimensions and interaction patterns.`;

                    const result = await callStitchAPI("tools/call", {
                        name: "generate_screen_from_text",
                        arguments: {
                            projectId: args.projectId,
                            prompt,
                            deviceType: targetDevice
                        }
                    }, projectId, token);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: `Responsive ${targetDevice} variant generated`,
                                sourceScreen: screenId,
                                adaptationStrategy,
                                detectedComponents: components,
                                result: result.result
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error generating responsive variant: ${err.message}` }], isError: true };
                }
            }

            // batch_generate_screens - 배치 화면 생성
            if (name === "batch_generate_screens") {
                try {
                    const { screens, sharedDesignContext, deviceType = "MOBILE" } = args;
                    const results = [];

                    // 공유 디자인 컨텍스트가 있으면 스타일 설명 생성
                    let stylePrefix = "";
                    if (sharedDesignContext) {
                        const styles = [];
                        if (sharedDesignContext.colors?.primary?.length > 0) {
                            styles.push(`Primary colors: ${sharedDesignContext.colors.primary.slice(0, 2).join(', ')}`);
                        }
                        if (sharedDesignContext.typography?.fontFamilies?.length > 0) {
                            styles.push(`Font: ${sharedDesignContext.typography.fontFamilies[0]}`);
                        }
                        if (styles.length > 0) {
                            stylePrefix = `Apply this design system: ${styles.join('. ')}. `;
                        }
                    }

                    for (const screen of screens) {
                        try {
                            const enhancedPrompt = stylePrefix + screen.prompt;
                            const result = await callStitchAPI("tools/call", {
                                name: "generate_screen_from_text",
                                arguments: {
                                    projectId: args.projectId,
                                    prompt: enhancedPrompt,
                                    deviceType
                                }
                            }, projectId, token);

                            results.push({
                                name: screen.name,
                                status: "success",
                                result: result.result
                            });
                        } catch (err) {
                            results.push({
                                name: screen.name,
                                status: "failed",
                                error: err.message
                            });
                        }
                    }

                    const successCount = results.filter(r => r.status === "success").length;

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: `Batch generation complete: ${successCount}/${screens.length} screens created`,
                                deviceType,
                                results
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error in batch generation: ${err.message}` }], isError: true };
                }
            }

            // analyze_accessibility - 접근성 분석
            if (name === "analyze_accessibility") {
                try {
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId: args.screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch screen details");

                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);

                    let htmlContent = "";
                    if (downloadUrl) {
                        const res = await fetch(downloadUrl);
                        if (res.ok) htmlContent = await res.text();
                    }

                    const level = args.level || "AA";
                    const issues = [];
                    const passes = [];

                    // 이미지 alt 텍스트 검사
                    const imgWithoutAlt = (htmlContent.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
                    const imgWithAlt = (htmlContent.match(/<img[^>]*alt=/gi) || []).length;
                    if (imgWithoutAlt > 0) {
                        issues.push({ criterion: "1.1.1", severity: "critical", issue: `${imgWithoutAlt} image(s) missing alt attribute`, recommendation: "Add descriptive alt text to all images" });
                    } else if (imgWithAlt > 0) {
                        passes.push({ criterion: "1.1.1", check: "All images have alt attributes" });
                    }

                    // 버튼/링크 텍스트 검사
                    const emptyButtons = (htmlContent.match(/<button[^>]*>\s*<\/button>/gi) || []).length;
                    const emptyLinks = (htmlContent.match(/<a[^>]*>\s*<\/a>/gi) || []).length;
                    if (emptyButtons > 0 || emptyLinks > 0) {
                        issues.push({ criterion: "2.4.4", severity: "serious", issue: `${emptyButtons + emptyLinks} interactive element(s) with no accessible name`, recommendation: "Add visible text or aria-label to buttons and links" });
                    }

                    // 폼 레이블 검사
                    const inputsWithoutLabel = (htmlContent.match(/<input(?![^>]*aria-label)[^>]*(?<!id=")[^>]*>/gi) || []).length;
                    if (inputsWithoutLabel > 0) {
                        issues.push({ criterion: "3.3.2", severity: "serious", issue: "Form inputs may be missing labels", recommendation: "Associate labels with form inputs using 'for' attribute or aria-label" });
                    }

                    // 제목 구조 검사
                    const h1Count = (htmlContent.match(/<h1/gi) || []).length;
                    if (h1Count === 0) {
                        issues.push({ criterion: "1.3.1", severity: "moderate", issue: "No H1 heading found", recommendation: "Add a main heading (H1) for page structure" });
                    } else if (h1Count > 1) {
                        issues.push({ criterion: "1.3.1", severity: "minor", issue: `Multiple H1 headings (${h1Count}) found`, recommendation: "Consider using only one H1 per page" });
                    } else {
                        passes.push({ criterion: "1.3.1", check: "Single H1 heading present" });
                    }

                    // 언어 속성 검사
                    if (!htmlContent.includes('lang=')) {
                        issues.push({ criterion: "3.1.1", severity: "moderate", issue: "Language attribute not set", recommendation: "Add lang attribute to html element" });
                    } else {
                        passes.push({ criterion: "3.1.1", check: "Language attribute present" });
                    }

                    // 뷰포트 검사
                    if (!htmlContent.includes('viewport')) {
                        issues.push({ criterion: "1.4.4", severity: "moderate", issue: "Viewport meta tag not found", recommendation: "Add responsive viewport meta tag" });
                    }

                    // 결과 요약
                    const criticalCount = issues.filter(i => i.severity === "critical").length;
                    const seriousCount = issues.filter(i => i.severity === "serious").length;
                    const score = Math.max(0, 100 - (criticalCount * 25) - (seriousCount * 15) - (issues.length - criticalCount - seriousCount) * 5);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                wcagLevel: level,
                                accessibilityScore: score,
                                summary: {
                                    totalIssues: issues.length,
                                    critical: criticalCount,
                                    serious: seriousCount,
                                    moderate: issues.filter(i => i.severity === "moderate").length,
                                    minor: issues.filter(i => i.severity === "minor").length,
                                    passes: passes.length
                                },
                                issues: args.includeRecommendations !== false ? issues : issues.map(({ recommendation, ...rest }) => rest),
                                passes,
                                note: "This is an automated check. Manual testing is recommended for complete accessibility compliance."
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error analyzing accessibility: ${err.message}` }], isError: true };
                }
            }

            // compare_designs - 디자인 비교
            if (name === "compare_designs") {
                try {
                    const { screenId1, screenId2, compareAspects = ["colors", "typography", "spacing", "components", "layout"] } = args;

                    // 두 화면의 코드 가져오기
                    const getScreenCode = async (screenId) => {
                        const res = await callStitchAPI("tools/call", {
                            name: "get_screen",
                            arguments: { projectId: args.projectId, screenId }
                        }, projectId, token);

                        if (!res.result) return "";

                        let downloadUrl = null;
                        const findUrl = (obj) => {
                            if (downloadUrl || !obj || typeof obj !== 'object') return;
                            if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                            for (const key in obj) findUrl(obj[key]);
                        };
                        findUrl(res.result);

                        if (downloadUrl) {
                            const htmlRes = await fetch(downloadUrl);
                            if (htmlRes.ok) return await htmlRes.text();
                        }
                        return "";
                    };

                    const [html1, html2] = await Promise.all([
                        getScreenCode(screenId1),
                        getScreenCode(screenId2)
                    ]);

                    const comparison = {
                        screens: { screen1: screenId1, screen2: screenId2 },
                        differences: [],
                        similarities: [],
                        recommendations: []
                    };

                    // 색상 비교
                    if (compareAspects.includes("colors")) {
                        const colors1 = new Set((html1.match(/#[0-9A-Fa-f]{3,8}\b/g) || []));
                        const colors2 = new Set((html2.match(/#[0-9A-Fa-f]{3,8}\b/g) || []));
                        const sharedColors = [...colors1].filter(c => colors2.has(c));
                        const uniqueToScreen1 = [...colors1].filter(c => !colors2.has(c));
                        const uniqueToScreen2 = [...colors2].filter(c => !colors1.has(c));

                        if (sharedColors.length > 0) {
                            comparison.similarities.push({ aspect: "colors", detail: `${sharedColors.length} shared colors`, values: sharedColors.slice(0, 5) });
                        }
                        if (uniqueToScreen1.length > 0 || uniqueToScreen2.length > 0) {
                            comparison.differences.push({
                                aspect: "colors",
                                screen1Only: uniqueToScreen1.slice(0, 5),
                                screen2Only: uniqueToScreen2.slice(0, 5)
                            });
                            if (uniqueToScreen1.length > 3 || uniqueToScreen2.length > 3) {
                                comparison.recommendations.push("Consider consolidating color palette for visual consistency");
                            }
                        }
                    }

                    // 타이포그래피 비교
                    if (compareAspects.includes("typography")) {
                        const fonts1 = new Set((html1.match(/font-family:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()));
                        const fonts2 = new Set((html2.match(/font-family:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()));
                        const sizes1 = new Set((html1.match(/font-size:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()));
                        const sizes2 = new Set((html2.match(/font-size:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()));

                        const sharedFonts = [...fonts1].filter(f => fonts2.has(f));
                        if (sharedFonts.length > 0) {
                            comparison.similarities.push({ aspect: "typography", detail: "Shared font families", values: sharedFonts });
                        }
                        if (fonts1.size !== fonts2.size || [...fonts1].some(f => !fonts2.has(f))) {
                            comparison.differences.push({
                                aspect: "typography",
                                screen1Fonts: [...fonts1],
                                screen2Fonts: [...fonts2],
                                screen1Sizes: [...sizes1].slice(0, 5),
                                screen2Sizes: [...sizes2].slice(0, 5)
                            });
                        }
                    }

                    // 간격 비교
                    if (compareAspects.includes("spacing")) {
                        const spacing1 = new Set((html1.match(/(margin|padding|gap):\s*([^;]+)/gi) || []).map(s => s.split(':')[1]?.trim()));
                        const spacing2 = new Set((html2.match(/(margin|padding|gap):\s*([^;]+)/gi) || []).map(s => s.split(':')[1]?.trim()));
                        const sharedSpacing = [...spacing1].filter(s => spacing2.has(s));

                        if (sharedSpacing.length > spacing1.size * 0.5) {
                            comparison.similarities.push({ aspect: "spacing", detail: `${Math.round(sharedSpacing.length / spacing1.size * 100)}% spacing consistency` });
                        } else {
                            comparison.differences.push({ aspect: "spacing", detail: "Inconsistent spacing values detected" });
                            comparison.recommendations.push("Establish a consistent spacing scale (e.g., 4px, 8px, 16px, 24px, 32px)");
                        }
                    }

                    // 컴포넌트 비교
                    if (compareAspects.includes("components")) {
                        const components1 = [];
                        const components2 = [];
                        const componentPatterns = [
                            { name: "button", pattern: /<button|btn/gi },
                            { name: "card", pattern: /card|<article/gi },
                            { name: "form", pattern: /<form|<input/gi },
                            { name: "navigation", pattern: /<nav|navbar/gi },
                            { name: "modal", pattern: /modal|dialog/gi }
                        ];

                        componentPatterns.forEach(({ name, pattern }) => {
                            if (pattern.test(html1)) components1.push(name);
                            if (pattern.test(html2)) components2.push(name);
                        });

                        const sharedComponents = components1.filter(c => components2.includes(c));
                        if (sharedComponents.length > 0) {
                            comparison.similarities.push({ aspect: "components", detail: "Shared component types", values: sharedComponents });
                        }
                    }

                    // 레이아웃 비교
                    if (compareAspects.includes("layout")) {
                        const usesGrid1 = /display:\s*grid/i.test(html1);
                        const usesGrid2 = /display:\s*grid/i.test(html2);
                        const usesFlex1 = /display:\s*flex/i.test(html1);
                        const usesFlex2 = /display:\s*flex/i.test(html2);

                        if (usesGrid1 === usesGrid2 && usesFlex1 === usesFlex2) {
                            comparison.similarities.push({ aspect: "layout", detail: "Same layout system (grid/flex)" });
                        } else {
                            comparison.differences.push({
                                aspect: "layout",
                                screen1: { usesGrid: usesGrid1, usesFlex: usesFlex1 },
                                screen2: { usesGrid: usesGrid2, usesFlex: usesFlex2 }
                            });
                        }
                    }

                    // 일관성 점수 계산
                    const consistencyScore = Math.round(
                        (comparison.similarities.length / (comparison.similarities.length + comparison.differences.length)) * 100
                    ) || 0;

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                consistencyScore,
                                ...comparison
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error comparing designs: ${err.message}` }], isError: true };
                }
            }

            // extract_components - 컴포넌트 추출
            if (name === "extract_components") {
                try {
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId: args.screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch screen details");

                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);

                    let htmlContent = "";
                    if (downloadUrl) {
                        const res = await fetch(downloadUrl);
                        if (res.ok) htmlContent = await res.text();
                    }

                    const componentTypes = args.componentTypes || ["all"];
                    const extractAll = componentTypes.includes("all");
                    const components = [];

                    // 버튼 추출
                    if (extractAll || componentTypes.includes("buttons")) {
                        const buttonMatches = htmlContent.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
                        buttonMatches.slice(0, 5).forEach((btn, i) => {
                            const classMatch = btn.match(/class="([^"]*)"/);
                            const styleMatch = btn.match(/style="([^"]*)"/);
                            components.push({
                                type: "button",
                                variant: `button-${i + 1}`,
                                html: btn,
                                classes: classMatch ? classMatch[1] : "",
                                inlineStyles: styleMatch ? styleMatch[1] : ""
                            });
                        });
                    }

                    // 카드 추출
                    if (extractAll || componentTypes.includes("cards")) {
                        const cardMatches = htmlContent.match(/<[^>]*class="[^"]*card[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi) || [];
                        cardMatches.slice(0, 3).forEach((card, i) => {
                            const classMatch = card.match(/class="([^"]*)"/);
                            components.push({
                                type: "card",
                                variant: `card-${i + 1}`,
                                html: card.substring(0, 500) + (card.length > 500 ? "..." : ""),
                                classes: classMatch ? classMatch[1] : ""
                            });
                        });
                    }

                    // 입력 필드 추출
                    if (extractAll || componentTypes.includes("inputs")) {
                        const inputMatches = htmlContent.match(/<input[^>]*>/gi) || [];
                        inputMatches.slice(0, 5).forEach((input, i) => {
                            const typeMatch = input.match(/type="([^"]*)"/);
                            const classMatch = input.match(/class="([^"]*)"/);
                            components.push({
                                type: "input",
                                variant: typeMatch ? typeMatch[1] : "text",
                                html: input,
                                classes: classMatch ? classMatch[1] : ""
                            });
                        });
                    }

                    // 출력 형식 변환
                    const outputFormat = args.outputFormat || "json";
                    let output;

                    if (outputFormat === "json") {
                        output = JSON.stringify({ components }, null, 2);
                    } else if (outputFormat === "react") {
                        output = components.map(c => {
                            const name = `${c.type.charAt(0).toUpperCase()}${c.type.slice(1)}${c.variant.split('-')[1] || ''}`;
                            return `// ${name} Component\nexport const ${name} = ({ children, ...props }) => (\n  ${c.html.replace(/class=/g, 'className=')}\n);`;
                        }).join('\n\n');
                    } else if (outputFormat === "vue") {
                        output = components.map(c => {
                            const name = `${c.type.charAt(0).toUpperCase()}${c.type.slice(1)}${c.variant.split('-')[1] || ''}`;
                            return `<!-- ${name} Component -->\n<template>\n  ${c.html}\n</template>\n\n<script>\nexport default {\n  name: '${name}'\n}\n</script>`;
                        }).join('\n\n');
                    } else {
                        output = components.map(c => `<!-- ${c.type} - ${c.variant} -->\n${c.html}`).join('\n\n');
                    }

                    return {
                        content: [{
                            type: "text",
                            text: `Extracted ${components.length} components (${outputFormat} format):\n\n${output}`
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error extracting components: ${err.message}` }], isError: true };
                }
            }

            // suggest_trending_design - 트렌드 디자인 제안
            if (name === "suggest_trending_design") {
                try {
                    const { prompt, trends, intensity = "moderate", deviceType = "MOBILE" } = args;

                    const trendDescriptions = {
                        "glassmorphism": "frosted glass effect with backdrop blur, semi-transparent backgrounds, subtle borders",
                        "bento-grid": "asymmetric grid layout with varied card sizes, Japanese-inspired minimalist organization",
                        "gradient-mesh": "complex multi-color gradient backgrounds with smooth color transitions",
                        "aurora-gradients": "flowing, aurora borealis-inspired gradient animations",
                        "3d-elements": "subtle 3D transforms, depth, and perspective effects",
                        "micro-interactions": "small animated feedback on hover, click, and state changes",
                        "dark-mode": "dark color scheme with high contrast accents, reduced eye strain",
                        "minimalist": "clean, uncluttered design with generous whitespace",
                        "brutalist": "raw, bold typography, stark contrasts, intentionally unpolished aesthetic",
                        "neomorphism": "soft UI with subtle shadows creating extruded/pressed effect",
                        "retro-futurism": "blend of vintage aesthetics with futuristic elements, neon accents",
                        "organic-shapes": "fluid, blob-like shapes and curved elements",
                        "bold-typography": "large, impactful typography as the main visual element"
                    };

                    const intensityModifiers = {
                        "subtle": "Use these styles subtly and sparingly - hints and accents only.",
                        "moderate": "Apply these styles as notable design features while maintaining usability.",
                        "bold": "Make these styles the dominant visual language - dramatic and immersive."
                    };

                    const selectedTrends = trends.map(t => trendDescriptions[t]).filter(Boolean);

                    const enhancedPrompt = `${prompt}

DESIGN DIRECTION - Apply 2024-2025 UI/UX trends:
${selectedTrends.map((t, i) => `${i + 1}. ${t}`).join('\n')}

INTENSITY: ${intensityModifiers[intensity]}

Create a visually striking, modern design that feels fresh and contemporary while maintaining excellent usability.`;

                    const result = await callStitchAPI("tools/call", {
                        name: "generate_screen_from_text",
                        arguments: {
                            projectId: args.projectId,
                            prompt: enhancedPrompt,
                            deviceType
                        }
                    }, projectId, token);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: "Trending design generated",
                                appliedTrends: trends,
                                intensity,
                                result: result.result
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error generating trending design: ${err.message}` }], isError: true };
                }
            }

            // generate_style_guide - 스타일 가이드 생성
            if (name === "generate_style_guide") {
                try {
                    const { screenId, sections = ["colors", "typography", "spacing", "components"], format = "visual" } = args;

                    // 원본 화면에서 디자인 추출
                    const screenRes = await callStitchAPI("tools/call", {
                        name: "get_screen",
                        arguments: { projectId: args.projectId, screenId }
                    }, projectId, token);

                    if (!screenRes.result) throw new Error("Could not fetch screen details");

                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);

                    let htmlContent = "";
                    if (downloadUrl) {
                        const res = await fetch(downloadUrl);
                        if (res.ok) htmlContent = await res.text();
                    }

                    // 디자인 요소 추출
                    const colors = [...new Set((htmlContent.match(/#[0-9A-Fa-f]{3,8}\b/g) || []))].slice(0, 10);
                    const fonts = [...new Set((htmlContent.match(/font-family:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()))];
                    const sizes = [...new Set((htmlContent.match(/font-size:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()))];
                    const spacings = [...new Set((htmlContent.match(/(margin|padding):\s*([^;]+)/gi) || []).map(s => s.split(':')[1]?.trim()))].slice(0, 8);

                    if (format === "documentation" || format === "both") {
                        let doc = "# Style Guide\n\n";

                        if (sections.includes("colors")) {
                            doc += "## Colors\n\n";
                            colors.forEach((c, i) => {
                                doc += `- **Color ${i + 1}**: \`${c}\`\n`;
                            });
                            doc += "\n";
                        }

                        if (sections.includes("typography")) {
                            doc += "## Typography\n\n### Font Families\n";
                            fonts.forEach(f => doc += `- ${f}\n`);
                            doc += "\n### Font Sizes\n";
                            sizes.forEach(s => doc += `- ${s}\n`);
                            doc += "\n";
                        }

                        if (sections.includes("spacing")) {
                            doc += "## Spacing\n\n";
                            spacings.forEach((s, i) => doc += `- **Space ${i + 1}**: ${s}\n`);
                            doc += "\n";
                        }

                        if (format === "documentation") {
                            return { content: [{ type: "text", text: doc }] };
                        }
                    }

                    // 시각적 스타일 가이드 화면 생성
                    const sectionPrompts = [];
                    if (sections.includes("colors")) {
                        sectionPrompts.push(`Color palette section showing these colors: ${colors.slice(0, 6).join(', ')}`);
                    }
                    if (sections.includes("typography")) {
                        sectionPrompts.push(`Typography section showing font samples with different sizes and weights`);
                    }
                    if (sections.includes("spacing")) {
                        sectionPrompts.push(`Spacing scale visualization`);
                    }
                    if (sections.includes("components")) {
                        sectionPrompts.push(`Component library showing buttons, inputs, cards in different states`);
                    }

                    const styleGuidePrompt = `Create a comprehensive style guide / design system documentation page with:

${sectionPrompts.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Use a clean, organized layout with clear section headers. This should serve as a visual reference for developers and designers to maintain consistency.`;

                    const result = await callStitchAPI("tools/call", {
                        name: "generate_screen_from_text",
                        arguments: {
                            projectId: args.projectId,
                            prompt: styleGuidePrompt,
                            deviceType: "DESKTOP"
                        }
                    }, projectId, token);

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: "Style guide generated",
                                extractedElements: { colors: colors.length, fonts: fonts.length, spacings: spacings.length },
                                sections,
                                result: result.result
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error generating style guide: ${err.message}` }], isError: true };
                }
            }

            // export_design_system - 디자인 시스템 내보내기
            if (name === "export_design_system") {
                try {
                    const {
                        screenIds = [],
                        includeTokens = true,
                        includeComponents = true,
                        includeDocumentation = true,
                        tokenFormat = "css-variables",
                        componentFormat = "react"
                    } = args;

                    // 프로젝트의 모든 화면 가져오기
                    let screens = screenIds;
                    if (screens.length === 0) {
                        const listRes = await callStitchAPI("tools/call", {
                            name: "list_screens",
                            arguments: { projectId: args.projectId }
                        }, projectId, token);

                        if (listRes.result?.content) {
                            const match = JSON.stringify(listRes.result).match(/screenId['"]\s*:\s*['"]([^'"]+)/g);
                            if (match) {
                                screens = match.map(m => m.split(/['"]/)[2]).filter(Boolean).slice(0, 5);
                            }
                        }
                    }

                    const exportPackage = {
                        projectId: args.projectId,
                        exportedAt: new Date().toISOString(),
                        screens: screens.length,
                        tokens: null,
                        components: [],
                        documentation: null
                    };

                    // 첫 번째 화면에서 토큰 추출
                    if (includeTokens && screens.length > 0) {
                        const screenRes = await callStitchAPI("tools/call", {
                            name: "get_screen",
                            arguments: { projectId: args.projectId, screenId: screens[0] }
                        }, projectId, token);

                        if (screenRes.result) {
                            let downloadUrl = null;
                            const findUrl = (obj) => {
                                if (downloadUrl || !obj || typeof obj !== 'object') return;
                                if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                                for (const key in obj) findUrl(obj[key]);
                            };
                            findUrl(screenRes.result);

                            if (downloadUrl) {
                                const htmlRes = await fetch(downloadUrl);
                                if (htmlRes.ok) {
                                    const html = await htmlRes.text();
                                    const colors = [...new Set((html.match(/#[0-9A-Fa-f]{3,8}\b/g) || []))].slice(0, 10);
                                    const sizes = [...new Set((html.match(/font-size:\s*([^;]+)/gi) || []).map(f => f.split(':')[1]?.trim()))].slice(0, 6);
                                    const spacings = [...new Set((html.match(/(margin|padding|gap):\s*([^;]+)/gi) || []).map(s => s.split(':')[1]?.trim()))].slice(0, 8);
                                    const radii = [...new Set((html.match(/border-radius:\s*([^;]+)/gi) || []).map(b => b.split(':')[1]?.trim()))].slice(0, 4);

                                    if (tokenFormat === "css-variables") {
                                        let cssTokens = `:root {\n`;
                                        colors.forEach((c, i) => cssTokens += `  --color-${i + 1}: ${c};\n`);
                                        sizes.forEach((s, i) => cssTokens += `  --font-size-${i + 1}: ${s};\n`);
                                        spacings.forEach((s, i) => cssTokens += `  --spacing-${i + 1}: ${s};\n`);
                                        radii.forEach((r, i) => cssTokens += `  --radius-${i + 1}: ${r};\n`);
                                        cssTokens += `}\n`;
                                        exportPackage.tokens = cssTokens;
                                    } else {
                                        exportPackage.tokens = { colors, fontSizes: sizes, spacing: spacings, borderRadius: radii };
                                    }
                                }
                            }
                        }
                    }

                    // 컴포넌트 추출
                    if (includeComponents && screens.length > 0) {
                        for (const screenId of screens.slice(0, 3)) {
                            const screenRes = await callStitchAPI("tools/call", {
                                name: "get_screen",
                                arguments: { projectId: args.projectId, screenId }
                            }, projectId, token);

                            if (screenRes.result) {
                                let downloadUrl = null;
                                const findUrl = (obj) => {
                                    if (downloadUrl || !obj || typeof obj !== 'object') return;
                                    if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                                    for (const key in obj) findUrl(obj[key]);
                                };
                                findUrl(screenRes.result);

                                if (downloadUrl) {
                                    const htmlRes = await fetch(downloadUrl);
                                    if (htmlRes.ok) {
                                        const html = await htmlRes.text();
                                        const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
                                        buttons.slice(0, 2).forEach((btn, i) => {
                                            exportPackage.components.push({
                                                type: "button",
                                                source: screenId,
                                                html: btn
                                            });
                                        });
                                    }
                                }
                            }
                        }
                    }

                    // 문서 생성
                    if (includeDocumentation) {
                        exportPackage.documentation = `# Design System Export

## Project: ${args.projectId}
## Exported: ${exportPackage.exportedAt}

### Tokens
${typeof exportPackage.tokens === 'string' ? '```css\n' + exportPackage.tokens + '\n```' : '```json\n' + JSON.stringify(exportPackage.tokens, null, 2) + '\n```'}

### Components
${exportPackage.components.length} components extracted.

### Usage
1. Import tokens into your project
2. Use component patterns as reference
3. Maintain consistency with extracted values
`;
                    }

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: `Design system exported from ${screens.length} screen(s)`,
                                package: exportPackage
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error exporting design system: ${err.message}` }], isError: true };
                }
            }

            // ========== 이미지 생성 도구 핸들러 (Antigravity/Gemini 3 Pro + Stitch 폴백) ==========

            // check_antigravity_auth - Antigravity 인증 상태 확인
            if (name === "check_antigravity_auth") {
                try {
                    const antigravityTokens = loadAntigravityTokens();

                    if (antigravityTokens && antigravityTokens.access_token) {
                        const isExpired = antigravityTokens.expiry_date && Date.now() >= antigravityTokens.expiry_date;

                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    authenticated: true,
                                    status: isExpired ? "expired" : "valid",
                                    projectId: antigravityTokens.project_id || "unknown",
                                    imageGenerationMethod: "Gemini 3 Pro (Antigravity)",
                                    message: isExpired
                                        ? "토큰이 만료되었습니다. 이미지 생성 시 자동으로 갱신됩니다."
                                        : "✅ Antigravity 인증 완료. Gemini 3 Pro로 고품질 이미지 생성이 가능합니다.",
                                    capabilities: ["generate_design_asset", "orchestrate_design"]
                                }, null, 2)
                            }]
                        };
                    }

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                authenticated: false,
                                status: "not_authenticated",
                                message: "⚠️ Antigravity 미인증 상태입니다.",
                                availableFeatures: {
                                    withoutAuth: [
                                        "Stitch API - UI 화면/페이지 생성 (generate_screen_from_text)",
                                        "Stitch API - 프로젝트 관리, 디자인 시스템 등"
                                    ],
                                    requiresAuth: [
                                        "이미지 에셋 생성 (generate_design_asset) - 로고, 아이콘, 일러스트",
                                        "배경 제거 기능",
                                        "오케스트레이션 (orchestrate_design) - 에셋 자동 생성 + UI 배치"
                                    ]
                                },
                                instructions: [
                                    "📌 Antigravity 인증 방법:",
                                    "1. generate_design_asset 호출 시 forceAntigravityAuth: true 옵션 사용",
                                    "2. 브라우저에서 Google 계정으로 로그인",
                                    "3. 인증 완료 후 Gemini 3 Pro로 이미지 생성 가능"
                                ],
                                note: "UI 화면 생성은 인증 없이도 Stitch API로 가능합니다."
                            }, null, 2)
                        }]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error checking auth: ${err.message}` }], isError: true };
                }
            }

            // generate_design_asset - 이미지 에셋 생성
            if (name === "generate_design_asset") {
                try {
                    const {
                        assetType,
                        prompt,
                        model = "gemini-3-pro",  // 사용자 선택 모델 (gemini-3-pro 또는 gemini-2.5-pro)
                        style = "auto",
                        colorScheme,
                        aspectRatio = "1:1",
                        saveToFile = true,
                        forceAntigravityAuth = false,
                        removeBackground = false,
                        backgroundRemovalMode = "white",
                        backgroundThreshold = 240
                    } = args;

                    log.info(logT('imageGenStarting', assetType, removeBackground ? logT('withBackgroundRemoval') : ''));

                    // 프롬프트 구성
                    let enhancedPrompt = `Create a ${assetType}`;

                    switch (assetType) {
                        case "logo":
                            enhancedPrompt = `Design a professional logo: ${prompt}. Make it clean, scalable, and memorable.`;
                            break;
                        case "icon":
                            enhancedPrompt = `Create a simple, clear icon: ${prompt}. Suitable for UI, flat style, high contrast.`;
                            break;
                        case "illustration":
                            enhancedPrompt = `Create an illustration: ${prompt}. Artistic and visually appealing.`;
                            break;
                        case "hero":
                            enhancedPrompt = `Create a hero/banner image: ${prompt}. Wide format, impactful, suitable for website header.`;
                            break;
                        case "wireframe":
                            enhancedPrompt = `Create a low-fidelity wireframe sketch: ${prompt}. Simple boxes, lines, placeholder text style.`;
                            break;
                        case "background":
                            enhancedPrompt = `Create a background pattern/texture: ${prompt}. Seamless, subtle, suitable for UI background.`;
                            break;
                        case "pattern":
                            enhancedPrompt = `Create a seamless pattern: ${prompt}. Tileable, decorative.`;
                            break;
                        default:
                            enhancedPrompt = `Create a ${assetType}: ${prompt}`;
                    }

                    if (colorScheme) {
                        enhancedPrompt += ` Use color scheme: ${colorScheme}.`;
                    }

                    // Antigravity 인증 확인 후 Gemini 3 Pro로 이미지 생성
                    let result = null;

                    // 인증 상태 확인
                    if (!isAntigravityAuthenticated() && !forceAntigravityAuth) {
                        // 미인증 상태이고 인증 강제도 아닌 경우
                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    success: false,
                                    error: "Antigravity 인증이 필요합니다.",
                                    message: "이미지 에셋 생성은 Antigravity/Gemini 3 Pro 인증이 필요합니다.",
                                    hint: "forceAntigravityAuth: true 옵션으로 브라우저 인증을 시작하거나, check_antigravity_auth 도구로 인증 상태를 확인하세요.",
                                    authRequired: true,
                                    suggestion: "UI 화면 생성은 Stitch API(generate_screen_from_text)를 사용하세요. 이미지 에셋(로고, 아이콘)은 Antigravity 인증 후 사용 가능합니다."
                                }, null, 2)
                            }],
                            isError: true
                        };
                    }

                    if (isAntigravityAuthenticated()) {
                        log.info(logT('antigravityGenerating'));
                        log.info(`  📦 Using model: ${model}`);
                        result = await generateImageWithGemini(enhancedPrompt, { model, style, aspectRatio }, false);
                    } else if (forceAntigravityAuth) {
                        // 사용자가 명시적으로 Antigravity 인증을 요청한 경우
                        log.info(logT('antigravityAuthStarting'));
                        log.info(`  📦 Using model: ${model}`);
                        result = await generateImageWithGemini(enhancedPrompt, { model, style, aspectRatio }, true);
                    }

                    if (!result || !result.success) {
                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    success: false,
                                    error: result?.error || "이미지 생성 실패",
                                    message: `${model} 이미지 생성에 실패했습니다.`,
                                    model: model,
                                    hint: result?.needsAuth ? "브라우저에서 Antigravity 인증을 완료해주세요." : "다시 시도해주세요. 쿼터 소진 시 다른 모델(gemini-2.5-pro)을 시도해보세요."
                                }, null, 2)
                            }],
                            isError: true
                        };
                    }

                    // 배경 제거 처리
                    let backgroundRemoved = false;
                    if (removeBackground && result.imageData) {
                        log.info(logT('processingBackgroundRemoval'));
                        try {
                            const originalBuffer = Buffer.from(result.imageData, 'base64');

                            let processedBuffer;
                            if (backgroundRemovalMode === "auto") {
                                // 자동 배경색 감지 모드
                                processedBuffer = await removeBackgroundAuto(originalBuffer, {
                                    tolerance: backgroundThreshold > 100 ? 30 : backgroundThreshold // auto 모드에서는 tolerance로 사용
                                });
                            } else {
                                // 흰색 배경 제거 모드
                                processedBuffer = await removeWhiteBackground(originalBuffer, {
                                    threshold: backgroundThreshold,
                                    smoothEdges: true
                                });
                            }

                            result.imageData = processedBuffer.toString('base64');
                            result.backgroundRemoved = true;
                            backgroundRemoved = true;
                            log.success(logT('backgroundRemovalDone'));
                        } catch (bgErr) {
                            log.warn(logT('backgroundRemovalWarn', bgErr.message));
                        }
                    }

                    // 파일로 저장
                    let savedPath = null;
                    if (saveToFile && result.imageData) {
                        const timestamp = Date.now();
                        const fileName = `${assetType}_${timestamp}.png`;
                        savedPath = path.join(process.cwd(), fileName);
                        fs.writeFileSync(savedPath, Buffer.from(result.imageData, 'base64'));
                        log.success(logT('imageSaved', fileName));
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: true,
                                    assetType,
                                    prompt: result.prompt,
                                    style,
                                    savedPath,
                                    generatedBy: "Gemini 3 Pro (Antigravity)",
                                    backgroundRemoved: backgroundRemoved,
                                    backgroundRemovalMode: backgroundRemoved ? backgroundRemovalMode : null,
                                    message: `✅ ${assetType} 이미지가 ${usedMethod === "antigravity" ? "Gemini 3 Pro" : "Stitch API"}로 생성되었습니다.${backgroundRemoved ? ' (배경 투명 처리됨)' : ''}`
                                }, null, 2)
                            },
                            ...(result.imageData ? [{
                                type: "image",
                                data: result.imageData,
                                mimeType: result.mimeType || "image/png"
                            }] : [])
                        ]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error generating asset: ${err.message}` }], isError: true };
                }
            }

            // orchestrate_design - 오케스트레이션 (에셋 생성 + UI 생성)
            if (name === "orchestrate_design") {
                try {
                    const {
                        description,
                        autoGenerateAssets = true,
                        assetHints = {},
                        designPreferences = {},
                        deviceType = "MOBILE",
                        forceAntigravityAuth = false
                    } = args;

                    log.info(logT('orchestrationStarting', description));

                    const orchestrationResult = {
                        stage: "analysis",
                        description,
                        generatedAssets: [],
                        screenResult: null,
                        errors: [],
                        imageGenerationMethod: "none"
                    };

                    // 이미지 생성 헬퍼 함수 (Antigravity/Gemini 3 Pro 전용)
                    const generateAssetImage = async (prompt, options = {}) => {
                        // Antigravity 인증 확인
                        if (isAntigravityAuthenticated()) {
                            const result = await generateImageWithGemini(prompt, options, false);
                            if (result.success) {
                                orchestrationResult.imageGenerationMethod = "antigravity";

                                // 배경 제거 적용 (로고, 아이콘에 자동 적용)
                                if (options.assetType === "logo" || options.assetType === "icon") {
                                    try {
                                        const originalBuffer = Buffer.from(result.imageData, 'base64');
                                        const processedBuffer = await removeWhiteBackground(originalBuffer, { threshold: 240 });
                                        result.imageData = processedBuffer.toString('base64');
                                        result.backgroundRemoved = true;
                                        log.info(logT('autoBackgroundRemovalDone'));
                                    } catch (e) {
                                        log.warn(logT('autoBackgroundRemovalWarn', e.message));
                                    }
                                }
                                return result;
                            }
                            return result;
                        } else if (forceAntigravityAuth) {
                            const result = await generateImageWithGemini(prompt, options, true);
                            if (result.success) {
                                orchestrationResult.imageGenerationMethod = "antigravity";
                                // 배경 제거
                                if (options.assetType === "logo" || options.assetType === "icon") {
                                    try {
                                        const originalBuffer = Buffer.from(result.imageData, 'base64');
                                        const processedBuffer = await removeWhiteBackground(originalBuffer, { threshold: 240 });
                                        result.imageData = processedBuffer.toString('base64');
                                        result.backgroundRemoved = true;
                                    } catch (e) {}
                                }
                            }
                            return result;
                        }

                        // Antigravity 미인증 - 에셋 생성 불가
                        return {
                            success: false,
                            error: "Antigravity 인증이 필요합니다.",
                            needsAuth: true
                        };
                    };

                    // 1. 필요한 에셋 분석 및 생성
                    if (autoGenerateAssets) {
                        orchestrationResult.stage = "asset_generation";

                        const {
                            needsLogo = true,
                            needsHeroImage = true,
                            needsIcons = false,
                            customAssets = []
                        } = assetHints;

                        const { style = "modern", colorScheme = "", mood = "" } = designPreferences;

                        // 이미지 생성 방식 안내
                        if (isAntigravityAuthenticated()) {
                            log.info(logT('antigravityGeneratingAssets'));
                        } else if (forceAntigravityAuth) {
                            log.info(logT('antigravityAuthStartingAssets'));
                        } else {
                            log.warn(logT('antigravityNotAuthSkipping'));
                            log.info(logT('antigravityNotAuthTip'));
                        }

                        // 로고 생성
                        if (needsLogo) {
                            log.info(logT('generatingLogo'));
                            const logoPrompt = `Logo for: ${description}. ${mood ? `Mood: ${mood}.` : ""} ${colorScheme ? `Colors: ${colorScheme}.` : ""}`;
                            const logoResult = await generateAssetImage(logoPrompt, { style, assetType: "logo" });

                            if (logoResult.success) {
                                const fileName = `logo_${Date.now()}.png`;
                                fs.writeFileSync(path.join(process.cwd(), fileName), Buffer.from(logoResult.imageData, 'base64'));
                                orchestrationResult.generatedAssets.push({
                                    type: "logo",
                                    fileName,
                                    imageData: logoResult.imageData,
                                    source: logoResult.source || "unknown"
                                });
                                log.success(logT('logoGenComplete', fileName));
                            } else {
                                orchestrationResult.errors.push({ type: "logo", error: logoResult.error });
                            }
                        }

                        // 히어로 이미지 생성
                        if (needsHeroImage) {
                            log.info(logT('generatingHero'));
                            const heroPrompt = `Hero banner image for: ${description}. ${mood ? `Mood: ${mood}.` : ""} ${colorScheme ? `Colors: ${colorScheme}.` : ""} Wide format, impactful.`;
                            const heroResult = await generateAssetImage(heroPrompt, { style, aspectRatio: "16:9", assetType: "hero" });

                            if (heroResult.success) {
                                const fileName = `hero_${Date.now()}.png`;
                                fs.writeFileSync(path.join(process.cwd(), fileName), Buffer.from(heroResult.imageData, 'base64'));
                                orchestrationResult.generatedAssets.push({
                                    type: "hero",
                                    fileName,
                                    imageData: heroResult.imageData,
                                    source: heroResult.source || "unknown"
                                });
                                log.success(logT('heroGenComplete', fileName));
                            } else {
                                orchestrationResult.errors.push({ type: "hero", error: heroResult.error });
                            }
                        }

                        // 아이콘 세트 생성
                        if (needsIcons) {
                            log.info(logT('generatingIcon'));
                            const iconPrompt = `Icon set for: ${description}. Simple, flat, UI icons. ${colorScheme ? `Colors: ${colorScheme}.` : ""}`;
                            const iconResult = await generateAssetImage(iconPrompt, { style: "flat", assetType: "icon" });

                            if (iconResult.success) {
                                const fileName = `icons_${Date.now()}.png`;
                                fs.writeFileSync(path.join(process.cwd(), fileName), Buffer.from(iconResult.imageData, 'base64'));
                                orchestrationResult.generatedAssets.push({
                                    type: "icons",
                                    fileName,
                                    imageData: iconResult.imageData,
                                    source: iconResult.source || "unknown"
                                });
                                log.success(logT('iconGenComplete', fileName));
                            } else {
                                orchestrationResult.errors.push({ type: "icons", error: iconResult.error });
                            }
                        }

                        // 커스텀 에셋 생성
                        for (const customAsset of customAssets) {
                            log.info(logT('generatingCustomAsset', customAsset));
                            const customResult = await generateAssetImage(`${customAsset} for: ${description}`, { style, assetType: "illustration" });

                            if (customResult.success) {
                                const fileName = `custom_${Date.now()}.png`;
                                fs.writeFileSync(path.join(process.cwd(), fileName), Buffer.from(customResult.imageData, 'base64'));
                                orchestrationResult.generatedAssets.push({
                                    type: "custom",
                                    description: customAsset,
                                    fileName,
                                    imageData: customResult.imageData,
                                    source: customResult.source || "unknown"
                                });
                                log.success(logT('customAssetGenComplete', fileName));
                            } else {
                                orchestrationResult.errors.push({ type: "custom", description: customAsset, error: customResult.error });
                            }
                        }
                    }

                    // 2. Stitch API로 UI 생성
                    orchestrationResult.stage = "ui_generation";
                    log.info(logT('generatingUIWithStitch'));

                    // 생성된 에셋 정보를 프롬프트에 포함
                    let enhancedPrompt = description;
                    if (orchestrationResult.generatedAssets.length > 0) {
                        const assetList = orchestrationResult.generatedAssets.map(a => a.type).join(", ");
                        enhancedPrompt += ` (Generated assets available: ${assetList})`;
                    }
                    if (designPreferences.style) {
                        enhancedPrompt += ` Style: ${designPreferences.style}.`;
                    }
                    if (designPreferences.colorScheme) {
                        enhancedPrompt += ` Colors: ${designPreferences.colorScheme}.`;
                    }

                    const screenResult = await callStitchAPI("tools/call", {
                        name: "generate_screen_from_text",
                        arguments: {
                            projectId: args.projectId,
                            text: enhancedPrompt,
                            deviceType: deviceType
                        }
                    }, args.projectId, token);

                    orchestrationResult.screenResult = screenResult.result;
                    orchestrationResult.stage = "complete";

                    log.success(logT('orchestrationComplete'));

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: true,
                                    message: "🎭 디자인 오케스트레이션 완료!",
                                    summary: {
                                        assetsGenerated: orchestrationResult.generatedAssets.length,
                                        assetTypes: orchestrationResult.generatedAssets.map(a => a.type),
                                        errors: orchestrationResult.errors.length
                                    },
                                    generatedAssets: orchestrationResult.generatedAssets.map(a => ({
                                        type: a.type,
                                        fileName: a.fileName
                                    })),
                                    screenResult: orchestrationResult.screenResult,
                                    errors: orchestrationResult.errors
                                }, null, 2)
                            },
                            // 생성된 에셋 이미지들 첨부
                            ...orchestrationResult.generatedAssets.map(asset => ({
                                type: "image",
                                data: asset.imageData,
                                mimeType: "image/png"
                            }))
                        ]
                    };

                } catch (err) {
                    return { content: [{ type: "text", text: `Error in orchestration: ${err.message}` }], isError: true };
                }
            }

            // 기본 Stitch API
            try {
                const result = await callStitchAPI("tools/call", { name, arguments: args || {} }, projectId, token);

                // ========== create_project 후 자동 저장 ==========
                if (name === 'create_project' && result.result) {
                    // 생성된 프로젝트 정보 추출
                    let newProjectId = null;
                    let newProjectName = null;

                    // result.result 구조에서 프로젝트 ID와 이름 찾기
                    const findProjectInfo = (obj) => {
                        if (!obj || typeof obj !== 'object') return;
                        if (obj.name && typeof obj.name === 'string' && obj.name.includes('projects/')) {
                            newProjectId = obj.name;
                        }
                        if (obj.displayName && typeof obj.displayName === 'string') {
                            newProjectName = obj.displayName;
                        }
                        if (obj.title && typeof obj.title === 'string' && !newProjectName) {
                            newProjectName = obj.title;
                        }
                        for (const key in obj) {
                            if (typeof obj[key] === 'object') findProjectInfo(obj[key]);
                        }
                    };
                    findProjectInfo(result.result);

                    // 프로젝트 정보를 워크스페이스에 저장
                    if (newProjectId) {
                        setActiveProject(newProjectId, newProjectName || args?.title);
                        log.success(systemLocale === 'ko'
                            ? `✨ 새 프로젝트가 생성되고 워크스페이스에 저장되었습니다: ${newProjectName || newProjectId}`
                            : `✨ New project created and saved to workspace: ${newProjectName || newProjectId}`);
                    }
                }

                // ========== list_projects에 워크스페이스 프로젝트 정보 추가 ==========
                if (name === 'list_projects' && result.result) {
                    const localProject = loadLocalProject();
                    if (localProject) {
                        // 응답에 워크스페이스 프로젝트 정보 추가
                        result.result._workspaceProject = {
                            projectId: localProject.projectId,
                            projectName: localProject.projectName,
                            lastUsed: localProject.lastUsed,
                            hint: systemLocale === 'ko'
                                ? "💡 이 워크스페이스에 저장된 프로젝트입니다. projectId를 생략하면 자동으로 사용됩니다."
                                : "💡 This project is saved in the current workspace. It will be used automatically if projectId is omitted."
                        };
                    }
                }

                // 자동 다운로드
                if (result.result) {
                    const processObject = async (obj) => {
                        if (!obj || typeof obj !== 'object') return;
                        if (obj.downloadUrl && typeof obj.downloadUrl === 'string') {
                            try {
                                const res = await fetch(obj.downloadUrl);
                                if (res.ok) obj.content = await res.text();
                            } catch (e) { }
                        }
                        for (const key in obj) await processObject(obj[key]);
                    };
                    await processObject(result.result);
                }

                if (result.result) return result.result;
                if (result.error) return { content: [{ type: "text", text: `Error: ${result.error.message}` }], isError: true };
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };

            } catch (error) {
                return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
            }
        });

        // ========== MCP Prompts Handlers ==========

        // List available prompts (슬래시 메뉴에 표시됨)
        server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return { prompts: MCP_PROMPTS };
        });

        // Get prompt content (슬래시 명령어 실행 시 호출됨)
        server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const prompt = MCP_PROMPTS.find(p => p.name === name);

            if (!prompt) {
                throw new Error(`Unknown prompt: ${name}`);
            }

            // 각 prompt에 대한 상세 instructions 반환 (Skills 파일 수준의 상세 워크플로우)
            let instructions = '';

            switch (name) {
                case 'design':
                    instructions = `# /design - AI-Powered Smart UI Design Generation

Create trendy, professional UI designs instantly from simple descriptions.
Automatically detects desired styles and applies modern design trends.

## User Request
- **Prompt:** ${args?.prompt || 'No prompt provided'}
- **Device:** ${args?.device || 'MOBILE (default)'}
- **Style:** ${args?.style || 'auto-detect from prompt'}

## Workflow

### Step 1: Project Preparation

**Check existing projects:**
\`\`\`
mcp__stitch__list_projects
\`\`\`

**If no suitable project exists:**
\`\`\`
mcp__stitch__create_project
- title: "My Designs" or contextual name
\`\`\`

### Step 2: Style Keyword Detection

Analyze the user's prompt for style keywords:

| Keywords | Style | Trends to Apply |
|----------|-------|-----------------|
| dark, night, midnight | Dark Mode | dark-mode, gradient-mesh |
| glass, blur, transparent | Glassmorphism | glassmorphism, aurora-gradients |
| minimal, clean, simple | Minimalist | minimalist, bold-typography |
| grid, card, dashboard | Bento Grid | bento-grid, 3d-elements |
| retro, vintage, 80s/90s | Retro | retro-futurism |
| soft, neumorphic, 3d-soft | Neomorphism | neomorphism |
| organic, nature, fluid | Organic | organic-shapes, gradient-mesh |

### Step 3: Prompt Enhancement

**Enhance the original prompt with:**
- Specific UI elements (buttons, inputs, cards)
- Layout structure (header, content, footer)
- Visual hierarchy suggestions
- Modern design patterns

**Template:**
\`\`\`
[Original prompt]
Design with:
- Clear visual hierarchy
- Modern [detected style] aesthetics
- Intuitive user interface
- Consistent spacing and alignment
\`\`\`

### Step 4: Generate Screen

**If trending style detected:**
\`\`\`
mcp__stitch__suggest_trending_design
- projectId: selected project
- prompt: enhanced prompt
- trends: [detected trends array]
- deviceType: ${args?.device || 'MOBILE'}
- intensity: "moderate"
\`\`\`

**Otherwise (standard generation):**
\`\`\`
mcp__stitch__generate_screen_from_text
- projectId: selected project
- prompt: enhanced prompt
- deviceType: ${args?.device || 'MOBILE'}
\`\`\`

### Step 5: Display Results

**Fetch the preview image:**
\`\`\`
mcp__stitch__fetch_screen_image
- projectId: project ID
- screenId: generated screen ID
\`\`\`

**Response Format:**
\`\`\`
✅ Design Generated Successfully!

🎨 Screen: [Screen Name]
📱 Device: ${args?.device || 'MOBILE'}
🎯 Style: [Detected/Applied Style]

[Preview Image]

📝 Design Notes:
- [Key design decisions made]
- [Style elements applied]

💡 Next Steps:
- "Generate another variant" → create alternative
- "Add [element]" → modify current design
- "/design-system [new screen]" → create consistent screen
- "/design-export" → export for development
\`\`\`

## Advanced Options

### Force Specific Trends
\`\`\`
/design login page --style glassmorphism,dark-mode
\`\`\`

### Different Device Types
\`\`\`
/design dashboard --device DESKTOP
/design checkout flow --device TABLET
\`\`\`

### Intensity Control
- subtle: Gentle application of trends
- moderate: Balanced modern look (default)
- bold: Strong, statement design`;
                    break;

                case 'design-system':
                    instructions = `# /design-system - Design Consistency Workflow

Create new screens while maintaining existing design style.
Ensures brand consistency across all screens by extracting and applying design DNA.

## User Request
- **New Screen:** ${args?.prompt || 'No prompt provided'}
- **Reference Screen:** ${args?.reference_screen_id || 'auto-select from project'}

## Workflow

### Step 1: Find Reference Screen

**If reference_screen_id provided:**
Use the specified screen directly.

**If not provided, find existing screens:**
\`\`\`
mcp__stitch__list_projects
→ Select user's project

mcp__stitch__list_screens
- projectId: selected project
→ List all screens and let user choose or auto-select most recent
\`\`\`

### Step 2: Extract Design Context

\`\`\`
mcp__stitch__extract_design_context
- projectId: project ID
- screenId: reference screen ID
- includeComponents: true
- includeTypography: true
- includeColors: true
- includeSpacing: true
\`\`\`

**Extracted Design DNA includes:**
- **Colors:** Primary, secondary, accent, background, text colors
- **Typography:** Font families, sizes, weights, line heights
- **Spacing:** Margins, paddings, gaps (8px grid system)
- **Components:** Button styles, card styles, input styles
- **Layout:** Grid structure, alignment patterns

### Step 3: Generate with Design Context

\`\`\`
mcp__stitch__apply_design_context
- projectId: project ID
- designContext: extracted context object
- prompt: "${args?.prompt || 'new screen description'}"
- deviceType: same as reference screen
\`\`\`

### Step 4: Verify Consistency

**Compare the new screen with reference:**
\`\`\`
mcp__stitch__compare_designs
- projectId: project ID
- screenId1: reference screen
- screenId2: new screen
- compareAspects: ["colors", "typography", "spacing", "components"]
\`\`\`

### Step 5: Display Results

**Fetch preview images:**
\`\`\`
mcp__stitch__fetch_screen_image (for both screens)
\`\`\`

**Response Format:**
\`\`\`
✅ Screen Generated with Design Consistency!

📱 Reference Screen: [Name] | New Screen: [Name]

[Side-by-side preview images]

🎨 Design Consistency Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| Aspect     | Match Score |
|------------|-------------|
| Colors     | 95%         |
| Typography | 100%        |
| Spacing    | 92%         |
| Components | 88%         |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall: 94% ✅

💡 Applied Design Elements:
- Primary color: #667eea
- Font family: Inter
- Spacing system: 8px grid
- Button style: Rounded with gradient

💡 Next Steps:
- "/design-system [another screen]" → add more screens
- "/design-qa" → check accessibility
- "/design-export" → export design system
\`\`\`

## Advanced Usage

### Create Multiple Consistent Screens
\`\`\`
/design-system settings page
/design-system profile page
/design-system notifications page
\`\`\`
(Each command automatically uses the same design context)

### Specify Exact Reference
\`\`\`
/design-system checkout page --reference_screen_id abc123
\`\`\``;
                    break;

                case 'design-flow':
                    instructions = `# /design-flow - User Flow Generation

Generate multiple screens for complete user flows with consistent design at once.
Creates entire user journeys with shared design language.

## User Request
- **Flow:** ${args?.flow || 'No flow provided'}
- **Device:** ${args?.device || 'MOBILE (default)'}

## Flow Syntax

**Arrow Syntax:**
\`\`\`
[flow name]: screen1 -> screen2 -> screen3
\`\`\`

**Examples:**
\`\`\`
onboarding: welcome -> features -> signup -> complete
checkout: cart -> shipping -> payment -> confirmation
auth: login -> forgot password -> reset -> success
\`\`\`

## Workflow

### Step 1: Parse Flow Description

Extract from "${args?.flow || 'user-provided flow'}":
- **Flow Name:** e.g., "onboarding"
- **Screens:** e.g., ["welcome", "features", "signup", "complete"]

### Step 2: Prepare Project

\`\`\`
mcp__stitch__list_projects
→ Find or create appropriate project

mcp__stitch__create_project
- title: "[Flow Name] Flow" (if needed)
\`\`\`

### Step 3: Check for Design Context

**If existing screens in project:**
\`\`\`
mcp__stitch__extract_design_context
- screenId: first/best screen in project
→ Use for consistency
\`\`\`

### Step 4: Batch Generate Screens

\`\`\`
mcp__stitch__batch_generate_screens
- projectId: project ID
- screens: [
    { "name": "welcome", "prompt": "Welcome screen with app introduction, value proposition, and get started button" },
    { "name": "features", "prompt": "Features showcase screen highlighting 3-4 key features with icons" },
    { "name": "signup", "prompt": "Sign up screen with email, password fields and social login options" },
    { "name": "complete", "prompt": "Completion/success screen with confirmation message and next steps" }
  ]
- sharedDesignContext: extracted context (if available)
- deviceType: "${args?.device || 'MOBILE'}"
\`\`\`

### Step 5: Display Flow Results

**Fetch all preview images:**
\`\`\`
mcp__stitch__fetch_screen_image (for each screen)
\`\`\`

**Response Format:**
\`\`\`
✅ User Flow Generated Successfully!

📱 Flow: [Flow Name] (${args?.device || 'MOBILE'})
📄 Screens: 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ Welcome
[Preview Image]
"Welcome to [App] - Your journey starts here"

    ↓

2️⃣ Features
[Preview Image]
"Discover amazing features"

    ↓

3️⃣ Signup
[Preview Image]
"Create your account"

    ↓

4️⃣ Complete
[Preview Image]
"You're all set!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 Design Consistency: 96%
- Shared color palette: ✅
- Consistent typography: ✅
- Unified spacing: ✅
- Button style match: ✅

💡 Next Steps:
- "Add [screen] between [A] and [B]" → insert screen
- "Regenerate [screen name]" → recreate specific screen
- "/design-qa all" → check entire flow
- "/design-export" → export all screens
\`\`\`

## Advanced Options

### Add Shared Design Context
\`\`\`
/design-flow checkout: cart -> payment -> confirm --reference_screen_id existing123
\`\`\`

### Branching Flows (described naturally)
\`\`\`
/design-flow auth: login -> (success -> home) | (forgot -> reset -> login)
\`\`\`
→ Parsed as: login, home, forgot, reset screens

### Custom Screen Descriptions
For more control, describe each screen:
\`\`\`
/design-flow e-commerce:
  product detail with image carousel and reviews ->
  cart with item list and total ->
  checkout with address and payment form ->
  order confirmation with tracking info
\`\`\``;
                    break;

                case 'design-qa':
                    instructions = `# /design-qa - Design Quality Assurance

Comprehensively checks accessibility, design consistency, and component quality of screens.
Used for pre-release quality assurance and design system audits.

## User Request
- **Target:** ${args?.screen_id || 'all screens in project'}
- **WCAG Level:** ${args?.level || 'AA (default)'}

## Check Items

### 1. Accessibility (WCAG 2.1)

| Level | Check Items |
|-------|-------------|
| A | Image alt text, form labels, language attributes |
| AA | Color contrast (4.5:1), touch targets (44px), font size (16px+) |
| AAA | Color contrast (7:1), extended text requirements |

**Detailed Checks:**
- \`1.1.1\` Image alternative text
- \`1.3.1\` Semantic HTML structure (H1 presence)
- \`1.4.3\` Color contrast ratio
- \`2.4.4\` Link/button text
- \`3.1.1\` Language attribute
- \`3.3.2\` Form labels

### 2. Consistency (Multi-Screen)
- Color palette uniformity
- Typography system compliance
- Spacing/margin pattern consistency
- Component style uniformity
- Layout system (Grid/Flex)

### 3. Components
- Button variants count and styles
- Card component consistency
- Form element styles
- Navigation patterns

## Workflow

### Step 1: Collect Target Screens

**Specific screen:**
\`\`\`
mcp__stitch__get_screen
- screenId: ${args?.screen_id || 'specified screen ID'}
\`\`\`

**Entire project (if 'all'):**
\`\`\`
mcp__stitch__list_screens
- projectId: current project
→ Collect all screen IDs
\`\`\`

### Step 2: Accessibility Analysis

\`\`\`
mcp__stitch__analyze_accessibility
- projectId: project ID
- screenId: screen ID
- level: "${args?.level || 'AA'}"
- includeRecommendations: true
\`\`\`

### Step 3: Consistency Check (2+ screens)

\`\`\`
mcp__stitch__compare_designs
- projectId: project ID
- screenId1: screen A
- screenId2: screen B
- compareAspects: ["colors", "typography", "spacing", "components", "layout"]
\`\`\`

### Step 4: Component Analysis

\`\`\`
mcp__stitch__extract_components
- projectId: project ID
- screenId: screen ID
- componentTypes: ["all"]
- outputFormat: "json"
\`\`\`

### Step 5: Generate Comprehensive Report

**Response Format:**
\`\`\`
📊 Design QA Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Target: {screen count} screens
📅 Date: {date}
📏 WCAG Level: ${args?.level || 'AA'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Overall Scores

| Item          | Score    | Status              |
|---------------|----------|---------------------|
| Accessibility | 85/100   | ⚠️ Needs Improvement |
| Consistency   | 92/100   | ✅ Good              |
| Components    | 78/100   | ⚠️ Needs Improvement |
| **Overall**   | **85/100** | **⚠️**             |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Accessibility Issues

### 🔴 Critical (1 issue)
- \`1.1.1\` 3 images missing alt text
  → Recommendation: Add descriptive alt text to all images

### 🟠 Serious (2 issues)
- \`1.4.3\` 2 text colors lack contrast (current 3.2:1, required 4.5:1)
  → Recommendation: Darken text or lighten background
- \`3.3.2\` Form inputs missing labels
  → Recommendation: Add connected labels to all input fields

### 🟡 Moderate (1 issue)
- \`1.3.1\` Duplicate H1 tags (2 found)
  → Recommendation: Use only one H1 per page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Consistency Analysis

### Colors
- Shared colors: 8 ✅
- Screen1 only: 2
- Screen2 only: 3
→ Recommendation: Review color palette integration

### Typography
- Font family match: ✅
- Font size variants: 6 (appropriate)

### Spacing
- Spacing consistency: 72%
→ Recommendation: Apply 8px base spacing system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Component Analysis

| Component  | Count | Variants | Status                  |
|------------|-------|----------|-------------------------|
| Button     | 8     | 3        | ✅                       |
| Card       | 5     | 4        | ⚠️ Needs consolidation   |
| Input      | 6     | 2        | ✅                       |
| Navigation | 2     | 2        | ⚠️ Needs consolidation   |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Priority Improvements

### 🔴 Fix Immediately (Critical)
1. Add alt text to all images

### 🟠 Quick Fixes (Serious)
2. Improve text color contrast
3. Add form labels

### 🟡 Recommended (Moderate)
4. Remove duplicate H1 tags
5. Consolidate card component styles
6. Consolidate navigation styles

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Next Steps:
- "Add image alt text" → fix accessibility
- "Improve color contrast" → enhance readability
- "/design-export" → export improved designs
\`\`\``;
                    break;

                case 'design-export':
                    instructions = `# /design-export - Developer Handoff

Generates complete packages for delivering designs to developers.
Exports design tokens, component code, and usage documentation all at once.

## User Request
- **Token Format:** ${args?.token_format || 'css-variables (default)'}
- **Component Format:** ${args?.component_format || 'react (default)'}
- **Screens:** ${args?.screens || 'all screens in project'}

## Output Package Structure

\`\`\`
design-system-export/
├── tokens/
│   ├── variables.css       # CSS Custom Properties
│   ├── tailwind.config.js  # Tailwind Config
│   ├── _variables.scss     # SCSS Variables
│   └── tokens.json         # JSON Tokens
├── components/
│   ├── react/
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   └── index.js
│   ├── vue/
│   │   └── *.vue
│   └── html/
│       └── *.html
├── screens/
│   └── [screen-name]/
│       ├── index.html
│       ├── styles.css
│       └── preview.png
└── docs/
    ├── README.md           # Getting Started Guide
    ├── style-guide.md      # Style Guide
    ├── colors.md           # Colors Documentation
    ├── typography.md       # Typography Documentation
    └── components.md       # Component Usage
\`\`\`

## Workflow

### Step 1: Collect Target Screens

**List all screens:**
\`\`\`
mcp__stitch__list_screens
- projectId: current project
\`\`\`

### Step 2: Generate Design Tokens

\`\`\`
mcp__stitch__generate_design_tokens
- projectId: project ID
- screenId: representative screen
- format: "${args?.token_format || 'css-variables'}"
- includeSemanticNames: true
\`\`\`

**CSS Variables Example:**
\`\`\`css
:root {
  /* Colors */
  --color-primary-1: #667eea;
  --color-primary-2: #764ba2;
  --color-secondary-1: #f8f9ff;
  --color-neutral-1: #1a1a2e;

  /* Font Sizes */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 16px;
  --spacing-4: 24px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
}
\`\`\`

### Step 3: Extract Components

\`\`\`
mcp__stitch__extract_components
- projectId: project ID
- screenId: each screen
- componentTypes: ["all"]
- outputFormat: "${args?.component_format || 'react'}"
\`\`\`

### Step 4: Generate Style Guide

\`\`\`
mcp__stitch__generate_style_guide
- projectId: project ID
- screenId: representative screen
- sections: ["colors", "typography", "spacing", "components"]
- format: "documentation"
\`\`\`

### Step 5: Collect Screen Assets

For each screen:
\`\`\`
mcp__stitch__fetch_screen_code → HTML/CSS code
mcp__stitch__fetch_screen_image → Preview image
\`\`\`

### Step 6: Create Integrated Package

\`\`\`
mcp__stitch__export_design_system
- projectId: project ID
- screenIds: all screen IDs
- includeTokens: true
- includeComponents: true
- includeDocumentation: true
- tokenFormat: "${args?.token_format || 'css-variables'}"
- componentFormat: "${args?.component_format || 'react'}"
\`\`\`

### Step 7: Display Results

**Response Format:**
\`\`\`
✅ Design System Export Complete!

📦 Package Contents:
├── 📁 tokens/
│   └── 4 files (CSS, Tailwind, SCSS, JSON)
├── 📁 components/
│   └── 8 components (${args?.component_format || 'React'} format)
├── 📁 screens/
│   └── 5 screens (HTML + preview)
└── 📁 docs/
    └── 5 documents

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Token Summary
- Colors: 10
- Font sizes: 6
- Spacing: 8
- Border-radius: 4

## Component List
- Button (3 variants)
- Card (2 variants)
- Input (2 variants)
- Navigation
- Modal

## Screen List
1. Login (login.html)
2. Dashboard (dashboard.html)
3. Profile (profile.html)
4. Settings (settings.html)
5. Checkout (checkout.html)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 How to Use:
1. Import tokens/variables.css into your project
2. Copy components/ folder to src/
3. See docs/README.md for detailed guide
\`\`\`

## Format-Specific Outputs

### Tailwind Config
\`\`\`javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'primary': '#667eea',
        'primary-dark': '#764ba2',
      },
      spacing: { '1': '4px', '2': '8px', '3': '16px' },
      borderRadius: { 'sm': '4px', 'md': '8px', 'lg': '16px' }
    }
  }
};
\`\`\`

### Vue Component
\`\`\`vue
<template>
  <button :class="['btn', \\\`btn-\${variant}\\\`]">
    <slot></slot>
  </button>
</template>
\`\`\`

## Advanced Options

### Export Specific Screens
\`\`\`
/design-export screen_login,screen_signup,screen_home
\`\`\`

### Export Tokens Only
\`\`\`
/design-export --component_format none --include_docs false
\`\`\`

### Export All Formats
\`\`\`
/design-export --token_format all --component_format all
\`\`\``;
                    break;

                default:
                    instructions = `Execute the ${name} prompt with provided arguments.`;
            }

            return {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: instructions
                        }
                    }
                ]
            };
        });

        server.onerror = (err) => log.error(logT('serverError', err));

        const transport = new StdioServerTransport();
        await server.connect(transport);
        log.success(logT('ready', projectId));

    } catch (error) {
        log.error(logT('fatal', error.message));
        process.exit(1);
    }
}

main();
