/**
 * HTML for the OAuth consent screen.
 *
 * Rendered by GET /api/authorize and re-rendered with an error message
 * after a failed POST. Styled per the visual identity guide:
 * warm coral #D97757, cream #FAF9F6, Source Serif 4 headings, Inter UI.
 *
 * The form posts back to /api/authorize with the same hidden fields plus
 * the entered passphrase.
 */

interface ConsentParams {
  clientId: string;
  clientName: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  errorMessage?: string;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderConsentPage(params: ConsentParams): string {
  const errorBlock = params.errorMessage
    ? `<div class="error">${escape(params.errorMessage)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Authorize ${escape(params.clientName)} — todolist</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --coral: #D97757;
    --coral-dark: #B85E40;
    --cream: #FAF9F6;
    --ink: #1F1B16;
    --muted: #6B645B;
    --rule: #E8E2D7;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--cream); color: var(--ink);
    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .wrap {
    max-width: 480px; margin: 0 auto; padding: 64px 24px;
  }
  h1 {
    font-family: "Source Serif 4", Georgia, serif;
    font-weight: 700; font-size: 32px; line-height: 1.2;
    margin: 0 0 8px;
  }
  .lede {
    font-size: 15px; color: var(--muted); margin: 0 0 32px;
  }
  .card {
    background: white; border: 1px solid var(--rule); border-radius: 12px;
    padding: 28px; margin-bottom: 24px;
  }
  .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
  .row + .row { border-top: 1px solid var(--rule); }
  .row .k { color: var(--muted); }
  .row .v { color: var(--ink); font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; word-break: break-all; text-align: right; max-width: 60%; }
  label { display: block; font-size: 13px; font-weight: 500; color: var(--ink); margin-bottom: 8px; }
  input[type="password"] {
    width: 100%; padding: 12px 14px; border: 1px solid var(--rule); border-radius: 8px;
    background: white; font-family: inherit; font-size: 15px; color: var(--ink);
    -webkit-appearance: none; appearance: none;
  }
  input[type="password"]:focus { outline: none; border-color: var(--coral); box-shadow: 0 0 0 3px rgba(217,119,87,0.15); }
  button {
    width: 100%; margin-top: 16px; padding: 13px 20px;
    background: var(--coral); color: white; border: 0; border-radius: 8px;
    font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
  }
  button:hover { background: var(--coral-dark); }
  .error {
    background: #FDECE7; color: var(--coral-dark); border: 1px solid #F4C5B0;
    padding: 12px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 14px;
  }
  .footer { font-size: 12px; color: var(--muted); text-align: center; margin-top: 24px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Authorize access</h1>
  <p class="lede"><strong>${escape(params.clientName)}</strong> is requesting access to your todolist.</p>

  <div class="card">
    <div class="row"><span class="k">Client</span><span class="v">${escape(params.clientId)}</span></div>
    <div class="row"><span class="k">Scope</span><span class="v">${escape(params.scope || "mcp")}</span></div>
    <div class="row"><span class="k">Resource</span><span class="v">${escape(params.resource)}</span></div>
    <div class="row"><span class="k">Redirect</span><span class="v">${escape(params.redirectUri)}</span></div>
  </div>

  ${errorBlock}

  <form method="POST" action="/api/authorize">
    <input type="hidden" name="client_id" value="${escape(params.clientId)}" />
    <input type="hidden" name="redirect_uri" value="${escape(params.redirectUri)}" />
    <input type="hidden" name="response_type" value="${escape(params.responseType)}" />
    <input type="hidden" name="scope" value="${escape(params.scope)}" />
    <input type="hidden" name="state" value="${escape(params.state)}" />
    <input type="hidden" name="code_challenge" value="${escape(params.codeChallenge)}" />
    <input type="hidden" name="code_challenge_method" value="${escape(params.codeChallengeMethod)}" />
    <input type="hidden" name="resource" value="${escape(params.resource)}" />
    <label for="passphrase">Consent passphrase</label>
    <input id="passphrase" name="passphrase" type="password" autocomplete="off" autofocus required />
    <button type="submit">Approve</button>
  </form>

  <p class="footer">todolist-mcp-server · single-user mode</p>
</div>
</body>
</html>`;
}
