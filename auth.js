#!/usr/bin/env node

/**
 * Stitch MCP Auto - OAuth Authentication Helper
 * Usage:
 *   node auth.js --setup    : Initial setup guide
 *   node auth.js --login    : Browser login
 *   node auth.js --status   : Check auth status
 *   node auth.js --logout   : Delete tokens
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const url = require('url');
const fetch = require('node-fetch');

const CONFIG_DIR = path.join(os.homedir(), '.stitch-mcp-auto');
const TOKEN_PATH = path.join(CONFIG_DIR, 'tokens.json');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// Antigravity OAuth client (no setup required)
const GOOGLE_OAUTH_CLIENT_ID = '764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com';
const GOOGLE_OAUTH_CLIENT_SECRET = 'd-FL95Q19q7MQmFpd7hHD0Ty';

const OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];
const REDIRECT_PORT = 51121;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth-callback`;

const args = process.argv.slice(2);

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
        // Help
        helpTitle: 'Stitch MCP OAuth Authentication Helper',
        helpUsage: 'Usage:',
        helpLogin: 'Login with Google in browser',
        helpProject: 'Set project ID',
        helpStatus: 'Check current auth status',
        helpLogout: 'Delete saved tokens',
        helpSetup: 'Initial setup guide',
        helpConfigLocation: 'Config file locations:',
        helpTokens: 'Tokens',
        helpConfig: 'Config',

        // Setup
        setupTitle: 'OAuth Client Setup Guide',
        setupStep1: '1. Access Google Cloud Console',
        setupStep2: '2. Create OAuth 2.0 Client ID',
        setupStep2a: '- Click "Create Credentials" > "OAuth client ID"',
        setupStep2b: '- Application type: "Desktop app"',
        setupStep2c: '- Name: "Stitch MCP" (any name)',
        setupStep3: '3. Save Client ID and Secret (choose one)',
        setupMethodA: 'Method A: Environment Variables',
        setupMethodB: 'Method B: Download credentials.json',
        setupMethodBDesc: '- Click "Download JSON" in Google Cloud Console',
        setupMethodBSave: '- Save the file to:',
        setupStep4: '4. Run login',
        setupStep5: '5. MCP Config (.mcp.json)',

        // Status
        statusTitle: 'Auth Status Check',
        statusOAuthClient: 'OAuth Client:',
        statusOAuthOk: 'Using Google Cloud default OAuth client (no setup required)',
        statusAccessToken: 'Access Token:',
        statusTokenExists: 'Token exists',
        statusExpiry: 'Expiry',
        statusTimeRemaining: 'Time remaining',
        statusMinutes: 'minutes',
        statusTokenExpired: 'Token expired (auto-refresh available)',
        statusRefreshToken: 'Refresh token: available (auto-refresh available)',
        statusNoRefreshToken: 'Refresh token: none (re-login required)',
        statusTokenReadError: 'Token file read error',
        statusNoToken: 'No token. Run: node auth.js --login',
        statusProjectId: 'Project ID (optional):',
        statusEnvVar: '(environment variable)',
        statusSaved: '(saved)',
        statusNone: 'None - running in default mode',

        // Login
        loginTitle: 'Google OAuth Login',
        loginUsingDefault: 'Using Google Cloud default OAuth client',
        loginOpenBrowser: 'Opening Google login in browser...',
        loginWaiting: 'Waiting for callback...',
        loginExchanging: 'Exchanging tokens...',
        loginExchangeFailed: 'Token exchange failed',
        loginComplete: 'Authentication complete!',
        loginTokenSaved: 'Token saved',
        loginExpiry: 'Expiry',
        loginFailed: 'Login failed',
        loginTimeout: 'Timeout',

        // Logout
        logoutTitle: 'Logout',
        logoutSuccess: 'Token deleted',
        logoutNoToken: 'No saved token.',

        // Project
        projectTitle: 'Project Settings',
        projectEnterError: 'Please enter project ID: node auth.js --project <your-project-id>',
        projectSet: 'Project ID set',
        projectSavedAt: 'Saved at',
        projectNextSteps: 'Next steps:',
        projectStep1: '1. Enable Stitch API',
        projectStep2: '2. Restart Claude Code',

        // HTML Page
        htmlTitle: 'Stitch MCP Authentication Complete',
        htmlSuccess: 'Authentication Successful!',
        htmlReturn: 'Return to terminal.',
        htmlAutoClose: 'This window will close automatically...',
        htmlFailed: 'Authentication Failed',
    },
    ko: {
        // Help
        helpTitle: 'Stitch MCP OAuth 인증 도우미',
        helpUsage: '사용법:',
        helpLogin: '브라우저에서 Google 로그인',
        helpProject: '프로젝트 ID 설정',
        helpStatus: '현재 인증 상태 확인',
        helpLogout: '저장된 토큰 삭제',
        helpSetup: '초기 설정 안내',
        helpConfigLocation: '설정 파일 위치:',
        helpTokens: '토큰',
        helpConfig: '설정',

        // Setup
        setupTitle: 'OAuth 클라이언트 설정 가이드',
        setupStep1: '1. Google Cloud Console 접속',
        setupStep2: '2. OAuth 2.0 클라이언트 ID 생성',
        setupStep2a: '- "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"',
        setupStep2b: '- 애플리케이션 유형: "데스크톱 앱"',
        setupStep2c: '- 이름: "Stitch MCP" (아무 이름이나 가능)',
        setupStep3: '3. 클라이언트 ID와 시크릿 저장 (둘 중 하나 선택)',
        setupMethodA: '방법 A: 환경변수 설정',
        setupMethodB: '방법 B: credentials.json 파일 다운로드',
        setupMethodBDesc: '- Google Cloud Console에서 "JSON 다운로드" 클릭',
        setupMethodBSave: '- 파일을 다음 위치에 저장:',
        setupStep4: '4. 로그인 실행',
        setupStep5: '5. MCP 설정 (.mcp.json)',

        // Status
        statusTitle: '인증 상태 확인',
        statusOAuthClient: 'OAuth 클라이언트:',
        statusOAuthOk: 'Google Cloud 기본 OAuth 클라이언트 사용 (설정 불필요)',
        statusAccessToken: '액세스 토큰:',
        statusTokenExists: '토큰 존재',
        statusExpiry: '만료',
        statusTimeRemaining: '남은 시간',
        statusMinutes: '분',
        statusTokenExpired: '토큰 만료됨 (자동 갱신 가능)',
        statusRefreshToken: '리프레시 토큰: 있음 (자동 갱신 가능)',
        statusNoRefreshToken: '리프레시 토큰: 없음 (재로그인 필요)',
        statusTokenReadError: '토큰 파일 읽기 실패',
        statusNoToken: '토큰 없음. node auth.js --login 실행',
        statusProjectId: '프로젝트 ID (선택적):',
        statusEnvVar: '(환경변수)',
        statusSaved: '(저장됨)',
        statusNone: '없음 - 기본 모드로 동작',

        // Login
        loginTitle: 'Google OAuth 로그인',
        loginUsingDefault: 'Google Cloud 기본 OAuth 클라이언트 사용',
        loginOpenBrowser: '브라우저에서 Google 로그인을 진행합니다...',
        loginWaiting: '콜백 대기 중...',
        loginExchanging: '토큰 교환 중...',
        loginExchangeFailed: '토큰 교환 실패',
        loginComplete: '인증 완료!',
        loginTokenSaved: '토큰 저장됨',
        loginExpiry: '만료',
        loginFailed: '로그인 실패',
        loginTimeout: '타임아웃',

        // Logout
        logoutTitle: '로그아웃',
        logoutSuccess: '토큰 삭제됨',
        logoutNoToken: '저장된 토큰이 없습니다.',

        // Project
        projectTitle: '프로젝트 설정',
        projectEnterError: '프로젝트 ID를 입력하세요: node auth.js --project <your-project-id>',
        projectSet: '프로젝트 ID 설정됨',
        projectSavedAt: '저장 위치',
        projectNextSteps: '다음 단계:',
        projectStep1: '1. Stitch API 활성화',
        projectStep2: '2. Claude Code 재시작',

        // HTML Page
        htmlTitle: 'Stitch MCP 인증 완료',
        htmlSuccess: '인증 성공!',
        htmlReturn: '터미널로 돌아가세요.',
        htmlAutoClose: '이 창은 자동으로 닫힙니다...',
        htmlFailed: '인증 실패',
    }
};

const t = i18n[LANG];

// ============================================================
// Functions
// ============================================================

function printHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ${t.helpTitle.padEnd(47)}║
╚══════════════════════════════════════════════════════════════╝

${t.helpUsage}
  node auth.js --login              ${t.helpLogin}
  node auth.js --project <id>       ${t.helpProject}
  node auth.js --status             ${t.helpStatus}
  node auth.js --logout             ${t.helpLogout}
  node auth.js --setup              ${t.helpSetup}

${t.helpConfigLocation}
  ${t.helpTokens}: ${TOKEN_PATH}
  ${t.helpConfig}: ${CONFIG_PATH}
`);
}

function printSetup() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ${t.setupTitle.padEnd(47)}║
╚══════════════════════════════════════════════════════════════╝

${t.setupStep1}
   https://console.cloud.google.com/apis/credentials

${t.setupStep2}
   ${t.setupStep2a}
   ${t.setupStep2b}
   ${t.setupStep2c}

${t.setupStep3}

   ${t.setupMethodA}
   ─────────────────────
   export GOOGLE_OAUTH_CLIENT_ID="your_client_id"
   export GOOGLE_OAUTH_CLIENT_SECRET="your_client_secret"
   export GOOGLE_CLOUD_PROJECT="your_project_id"

   ${t.setupMethodB}
   ─────────────────────────────────────
   ${t.setupMethodBDesc}
   ${t.setupMethodBSave}
     ${CONFIG_DIR}/credentials.json

${t.setupStep4}
   node auth.js --login

${t.setupStep5}
   {
     "mcpServers": {
       "stitch": {
         "command": "npx",
         "args": ["-y", "stitch-mcp-auto"],
         "env": {
           "GOOGLE_CLOUD_PROJECT": "your_project_id"
         }
       }
     }
   }
`);
}

function checkStatus() {
    console.log(`\n📋 ${t.statusTitle}\n`);

    // OAuth client check
    console.log(`🔑 ${t.statusOAuthClient}`);
    console.log(`   ✅ ${t.statusOAuthOk}`);

    // Token check
    console.log(`\n🎫 ${t.statusAccessToken}`);
    if (fs.existsSync(TOKEN_PATH)) {
        try {
            const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            const expiry = new Date(tokens.expiry_date);
            const now = new Date();

            if (tokens.access_token) {
                console.log(`   ✅ ${t.statusTokenExists}`);
                console.log(`   📅 ${t.statusExpiry}: ${expiry.toLocaleString()}`);

                if (now < expiry) {
                    const remaining = Math.round((expiry - now) / 60000);
                    console.log(`   ⏱️  ${t.statusTimeRemaining}: ${remaining}${t.statusMinutes}`);
                } else {
                    console.log(`   ⚠️  ${t.statusTokenExpired}`);
                }

                if (tokens.refresh_token) {
                    console.log(`   🔄 ${t.statusRefreshToken}`);
                } else {
                    console.log(`   ⚠️  ${t.statusNoRefreshToken}`);
                }
            }
        } catch (e) {
            console.log(`   ❌ ${t.statusTokenReadError}: ${e.message}`);
        }
    } else {
        console.log(`   ❌ ${t.statusNoToken}`);
    }

    // Project ID check
    console.log(`\n📁 ${t.statusProjectId}`);
    if (process.env.GOOGLE_CLOUD_PROJECT) {
        console.log(`   ✅ ${process.env.GOOGLE_CLOUD_PROJECT} ${t.statusEnvVar}`);
    } else if (process.env.GCLOUD_PROJECT) {
        console.log(`   ✅ ${process.env.GCLOUD_PROJECT} ${t.statusEnvVar}`);
    } else if (fs.existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            if (config.projectId) {
                console.log(`   ✅ ${config.projectId} ${t.statusSaved}`);
            } else {
                console.log(`   ✅ ${t.statusNone}`);
            }
        } catch (e) {
            console.log(`   ✅ ${t.statusNone}`);
        }
    } else {
        console.log(`   ✅ ${t.statusNone}`);
    }

    console.log('');
}

async function login() {
    console.log(`\n🔐 ${t.loginTitle}\n`);

    const credentials = {
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        client_secret: GOOGLE_OAUTH_CLIENT_SECRET
    };
    console.log(`✅ ${t.loginUsingDefault}`);

    // Generate auth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', credentials.client_id);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', OAUTH_SCOPES.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log(`🌐 ${t.loginOpenBrowser}\n`);

    // Open browser
    const open = (await import('open')).default;
    await open(authUrl.toString());

    // Callback server
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                const parsedUrl = url.parse(req.url, true);

                if (parsedUrl.pathname === '/oauth-callback') {
                    const code = parsedUrl.query.code;

                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`
                            <html>
                            <head><title>${t.htmlTitle}</title></head>
                            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; min-height: 100vh; margin: 0;">
                                <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; display: inline-block;">
                                    <h1 style="font-size: 48px; margin-bottom: 20px;">✅</h1>
                                    <h2>${t.htmlSuccess}</h2>
                                    <p>${t.htmlReturn}</p>
                                    <p style="opacity: 0.7; font-size: 14px;">${t.htmlAutoClose}</p>
                                </div>
                                <script>setTimeout(() => window.close(), 3000);</script>
                            </body>
                            </html>
                        `);

                        // Token exchange
                        console.log(`🔄 ${t.loginExchanging}`);

                        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                client_id: credentials.client_id,
                                client_secret: credentials.client_secret,
                                code: code,
                                redirect_uri: REDIRECT_URI,
                                grant_type: 'authorization_code'
                            })
                        });

                        if (!tokenResponse.ok) {
                            const error = await tokenResponse.text();
                            throw new Error(`${t.loginExchangeFailed}: ${error}`);
                        }

                        const tokenData = await tokenResponse.json();

                        // Save tokens
                        if (!fs.existsSync(CONFIG_DIR)) {
                            fs.mkdirSync(CONFIG_DIR, { recursive: true });
                        }

                        const tokens = {
                            access_token: tokenData.access_token,
                            refresh_token: tokenData.refresh_token,
                            expiry_date: Date.now() + (tokenData.expires_in * 1000)
                        };

                        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

                        console.log(`\n✅ ${t.loginComplete}`);
                        console.log(`📁 ${t.loginTokenSaved}: ${TOKEN_PATH}`);
                        console.log(`⏱️  ${t.loginExpiry}: ${new Date(tokens.expiry_date).toLocaleString()}`);

                        server.close();
                        resolve();
                    } else {
                        const error = parsedUrl.query.error || 'Unknown error';
                        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<h1>❌ ${t.htmlFailed}: ${error}</h1>`);
                        server.close();
                        reject(new Error(error));
                    }
                }
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Error: ${e.message}`);
                server.close();
                reject(e);
            }
        });

        server.listen(REDIRECT_PORT, () => {
            console.log(`⏳ ${t.loginWaiting} (http://localhost:${REDIRECT_PORT})`);
        });

        // 3 minute timeout
        setTimeout(() => {
            server.close();
            reject(new Error(t.loginTimeout));
        }, 180000);
    });
}

function logout() {
    console.log(`\n🚪 ${t.logoutTitle}\n`);

    if (fs.existsSync(TOKEN_PATH)) {
        fs.unlinkSync(TOKEN_PATH);
        console.log(`✅ ${t.logoutSuccess}`);
    } else {
        console.log(`ℹ️  ${t.logoutNoToken}`);
    }
}

function setProject(projectId) {
    console.log(`\n📁 ${t.projectTitle}\n`);

    if (!projectId) {
        console.error(`❌ ${t.projectEnterError}`);
        process.exit(1);
    }

    // Save config
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    let config = {};
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        } catch (e) {}
    }

    config.projectId = projectId;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log(`✅ ${t.projectSet}: ${projectId}`);
    console.log(`📁 ${t.projectSavedAt}: ${CONFIG_PATH}`);
    console.log(`\n${t.projectNextSteps}`);
    console.log(`${t.projectStep1}: https://console.developers.google.com/apis/api/stitch.googleapis.com/overview?project=${projectId}`);
    console.log(t.projectStep2);
}

// Main
(async () => {
    if (args.includes('--help') || args.includes('-h') || args.length === 0) {
        printHelp();
    } else if (args.includes('--setup')) {
        printSetup();
    } else if (args.includes('--status')) {
        checkStatus();
    } else if (args.includes('--login')) {
        try {
            await login();
            process.exit(0);
        } catch (e) {
            console.error(`\n❌ ${t.loginFailed}: ${e.message}`);
            process.exit(1);
        }
    } else if (args.includes('--logout')) {
        logout();
    } else if (args.includes('--project')) {
        const idx = args.indexOf('--project');
        const projectId = args[idx + 1];
        setProject(projectId);
    } else {
        printHelp();
    }
})();
