const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MESSAGE_TYPE = 'https://purl.imsglobal.org/spec/lti/claim/message_type';
const VERSION = 'https://purl.imsglobal.org/spec/lti/claim/version';
const DEPLOYMENT_ID = 'https://purl.imsglobal.org/spec/lti/claim/deployment_id';
const RESOURCE_LINK = 'https://purl.imsglobal.org/spec/lti/claim/resource_link';
const CUSTOM = 'https://purl.imsglobal.org/spec/lti/claim/custom';
const DEEP_LINKING_SETTINGS = 'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings';

const SESSION_TTL_MS = 10 * 60 * 1000;
const launches = new Map();
const deepLinkSessions = new Map();
let cachedJwks = null;
let cachedJwksAt = 0;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Ungültiges LTI-Token');
  try {
    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')),
      payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')),
      signed: `${parts[0]}.${parts[1]}`,
      signature: Buffer.from(parts[2], 'base64url')
    };
  } catch {
    throw new Error('Ungültiges LTI-Token');
  }
}

function randomId() {
  return crypto.randomBytes(32).toString('base64url');
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function prune(map) {
  const now = Date.now();
  for (const [key, value] of map) {
    if (value.expiresAt <= now) map.delete(key);
  }
}

function readPlatformConfig() {
  const issuer = process.env.LTI_PLATFORM_ISSUER;
  const clientId = process.env.LTI_PLATFORM_CLIENT_ID;
  const authorizationEndpoint = process.env.LTI_PLATFORM_AUTHORIZATION_ENDPOINT;
  const jwksUrl = process.env.LTI_PLATFORM_JWKS_URL;
  const deploymentId = process.env.LTI_PLATFORM_DEPLOYMENT_ID;
  const toolOrigin = process.env.LTI_TOOL_ORIGIN;

  if (!issuer || !clientId || !authorizationEndpoint || !jwksUrl || !deploymentId || !toolOrigin) return null;
  return { issuer, clientId, authorizationEndpoint, jwksUrl, deploymentId, toolOrigin: toolOrigin.replace(/\/$/, '') };
}

function getPrivateKey() {
  const configured = process.env.LTI_PRIVATE_KEY;
  if (!configured) return null;
  return configured.includes('BEGIN') ? configured.replace(/\\n/g, '\n') : fs.readFileSync(configured, 'utf8');
}

async function getJwks(config) {
  if (cachedJwks && Date.now() - cachedJwksAt < 10 * 60 * 1000) return cachedJwks;
  const response = await fetch(config.jwksUrl);
  if (!response.ok) throw new Error('Die öffentlichen Moodle-Schlüssel konnten nicht geladen werden');
  const body = await response.json();
  if (!Array.isArray(body.keys)) throw new Error('Ungültige Moodle-Schlüssel');
  cachedJwks = body.keys;
  cachedJwksAt = Date.now();
  return cachedJwks;
}

async function verifyLaunch(token, config) {
  const parsed = parseJwt(token);
  if (parsed.header.alg !== 'RS256' || !parsed.header.kid) throw new Error('Nicht unterstütztes LTI-Signaturverfahren');
  const keys = await getJwks(config);
  const jwk = keys.find(key => key.kid === parsed.header.kid);
  if (!jwk) throw new Error('Unbekannter Moodle-Signaturschlüssel');
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  if (!crypto.verify('RSA-SHA256', Buffer.from(parsed.signed), publicKey, parsed.signature)) {
    throw new Error('Ungültige LTI-Signatur');
  }
  const claims = parsed.payload;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== config.issuer || !audiences.includes(config.clientId) ||
      (audiences.length > 1 && claims.azp !== config.clientId) || claims[DEPLOYMENT_ID] !== config.deploymentId) {
    throw new Error('LTI-Token gehört nicht zu dieser Moodle-Integration');
  }
  if (!claims.exp || claims.exp < nowSeconds() || !claims.iat || claims.iat > nowSeconds() + 60) {
    throw new Error('Abgelaufenes oder ungültig datiertes LTI-Token');
  }
  return claims;
}

function signJwt(claims, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT', kid: process.env.LTI_KEY_ID || 'math4speed-key-1' };
  const signed = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  return `${signed}.${crypto.sign('RSA-SHA256', Buffer.from(signed), privateKey).toString('base64url')}`;
}

function activityFile() {
  return process.env.LTI_ACTIVITY_FILE || path.join(__dirname, 'lti-activities.json');
}

function loadActivities() {
  try {
    return JSON.parse(fs.readFileSync(activityFile(), 'utf8'));
  } catch {
    return {};
  }
}

function saveActivities(activities) {
  fs.writeFileSync(activityFile(), JSON.stringify(activities, null, 2));
}

function sanitizeSettings(input) {
  const categories = Object.keys(require('../shared/categories.json'));
  const category = categories.includes(input.category) ? input.category : 'einmaleins';
  const durationSeconds = Number(input.durationSeconds);
  const maxScore = Number(input.maxScore);
  return {
    category,
    durationSeconds: Number.isInteger(durationSeconds) && durationSeconds >= 60 && durationSeconds <= 7200 ? durationSeconds : 300,
    assessmentMode: Boolean(input.assessmentMode),
    sebRequired: Boolean(input.sebRequired),
    maxScore: Number.isInteger(maxScore) && maxScore >= 1 && maxScore <= 1000 ? maxScore : 20
  };
}

function launchPageError(res, status, message) {
  res.status(status).type('html').send(`<!doctype html><html lang="de"><meta charset="utf-8"><title>Math4Speed – LTI</title><body><main><h1>Math4Speed konnte nicht gestartet werden</h1><p>${message}</p></main></body></html>`);
}

function attachLtiRoutes(app) {
  app.get('/.well-known/jwks.json', (_req, res) => {
    const privateKey = getPrivateKey();
    if (!privateKey) return res.status(503).json({ error: 'LTI ist noch nicht konfiguriert' });
    const publicJwk = crypto.createPublicKey(privateKey).export({ format: 'jwk' });
    res.json({ keys: [{ ...publicJwk, kid: process.env.LTI_KEY_ID || 'math4speed-key-1', use: 'sig', alg: 'RS256' }] });
  });

  app.get('/lti/configuration', (_req, res) => {
    const config = readPlatformConfig();
    if (!config) return res.status(503).json({ error: 'LTI ist noch nicht konfiguriert' });
    res.json({
      title: 'Math4Speed',
      description: 'Mathematikübungen und Prüfungen',
      oidc_initiation_url: `${config.toolOrigin}/lti/login`,
      target_link_uri: `${config.toolOrigin}/lti/launch`,
      deep_linking_url: `${config.toolOrigin}/lti/deep-link`,
      public_jwk_url: `${config.toolOrigin}/.well-known/jwks.json`,
      scopes: ['https://purl.imsglobal.org/spec/lti-ags/scope/score']
    });
  });

  function initiateLogin(req, res) {
    const config = readPlatformConfig();
    if (!config) return launchPageError(res, 503, 'Die LTI-Integration ist noch nicht eingerichtet.');
    // Moodle sends the OIDC login-initiation parameters as a form POST when
    // opening the Deep Linking content selector. Standard launches may use GET.
    const parameters = req.method === 'POST' ? req.body : req.query;
    const { iss, login_hint: loginHint, target_link_uri: targetLinkUri, lti_message_hint: messageHint, client_id: clientId } = parameters;
    const allowedTargets = new Set([`${config.toolOrigin}/lti/launch`, `${config.toolOrigin}/lti/deep-link`]);
    if (iss !== config.issuer || clientId !== config.clientId || !loginHint || !allowedTargets.has(targetLinkUri)) {
      return launchPageError(res, 400, 'Ungültige LTI-Startanfrage.');
    }
    prune(launches);
    const state = randomId();
    const nonce = randomId();
    launches.set(state, { nonce, targetLinkUri, expiresAt: Date.now() + SESSION_TTL_MS });
    const authorizationUrl = new URL(config.authorizationEndpoint);
    authorizationUrl.searchParams.set('scope', 'openid');
    authorizationUrl.searchParams.set('response_type', 'id_token');
    authorizationUrl.searchParams.set('response_mode', 'form_post');
    authorizationUrl.searchParams.set('prompt', 'none');
    authorizationUrl.searchParams.set('client_id', config.clientId);
    authorizationUrl.searchParams.set('redirect_uri', targetLinkUri);
    authorizationUrl.searchParams.set('login_hint', loginHint);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('nonce', nonce);
    if (messageHint) authorizationUrl.searchParams.set('lti_message_hint', messageHint);
    res.redirect(302, authorizationUrl.toString());
  }

  app.get('/lti/login', initiateLogin);
  app.post('/lti/login', initiateLogin);

  async function receiveLaunch(req, res, expectedMessageType) {
    const config = readPlatformConfig();
    if (!config) return launchPageError(res, 503, 'Die LTI-Integration ist noch nicht eingerichtet.');
    try {
      prune(launches);
      const launch = launches.get(req.body.state);
      if (!launch || launch.targetLinkUri !== `${config.toolOrigin}${req.path}`) throw new Error('Ungültiger oder abgelaufener LTI-Start');
      launches.delete(req.body.state);
      const claims = await verifyLaunch(req.body.id_token, config);
      if (claims.nonce !== launch.nonce || claims[MESSAGE_TYPE] !== expectedMessageType || claims[VERSION] !== '1.3.0') {
        throw new Error('Die LTI-Startdaten passen nicht zur Anfrage');
      }
      return claims;
    } catch (error) {
      launchPageError(res, 401, error.message);
      return null;
    }
  }

  app.post('/lti/deep-link', async (req, res) => {
    const claims = await receiveLaunch(req, res, 'LtiDeepLinkingRequest');
    if (!claims) return;
    const deepLinking = claims[DEEP_LINKING_SETTINGS];
    if (!deepLinking?.deep_link_return_url) return launchPageError(res, 400, 'Moodle hat keine Deep-Linking-Rücksprungadresse übermittelt.');
    prune(deepLinkSessions);
    const id = randomId();
    deepLinkSessions.set(id, {
      claims,
      returnUrl: deepLinking.deep_link_return_url,
      data: deepLinking.data,
      expiresAt: Date.now() + SESSION_TTL_MS
    });
    res.redirect(303, `/lti/configure/${id}`);
  });

  app.get('/api/lti/configuration-session/:id', (req, res) => {
    prune(deepLinkSessions);
    const session = deepLinkSessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Die Konfigurationssitzung ist abgelaufen.' });
    res.json({ course: session.claims.context?.title || 'Moodle-Kurs', teacher: session.claims.name || 'Lehrkraft' });
  });

  app.post('/api/lti/configuration-session/:id/activity', (req, res) => {
    prune(deepLinkSessions);
    const session = deepLinkSessions.get(req.params.id);
    const config = readPlatformConfig();
    const privateKey = getPrivateKey();
    if (!session || !config || !privateKey) return res.status(404).json({ error: 'Die Konfigurationssitzung ist abgelaufen.' });
    const settings = sanitizeSettings(req.body || {});
    const activityId = crypto.randomUUID();
    const activities = loadActivities();
    activities[activityId] = {
      id: activityId,
      title: String(req.body.title || `Math4Speed – ${settings.category}`).trim().slice(0, 120),
      settings,
      createdAt: new Date().toISOString(),
      platform: config.issuer,
      deploymentId: session.claims[DEPLOYMENT_ID],
      contextId: session.claims.context?.id || null
    };
    saveActivities(activities);
    const responseClaims = {
      iss: config.clientId,
      aud: config.issuer,
      iat: nowSeconds(),
      exp: nowSeconds() + 300,
      nonce: crypto.randomUUID(),
      [DEPLOYMENT_ID]: session.claims[DEPLOYMENT_ID],
      [MESSAGE_TYPE]: 'LtiDeepLinkingResponse',
      [VERSION]: '1.3.0',
      'https://purl.imsglobal.org/spec/lti-dl/claim/data': session.data,
      'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': [{
        type: 'ltiResourceLink',
        title: activities[activityId].title,
        text: `Math4Speed: ${settings.category}, ${Math.round(settings.durationSeconds / 60)} Minuten`,
        url: `${config.toolOrigin}/lti/launch`,
        custom: { math4speed_activity_id: activityId },
        lineItem: { scoreMaximum: settings.maxScore, label: activities[activityId].title, resourceId: activityId }
      }]
    };
    deepLinkSessions.delete(req.params.id);
    res.json({ returnUrl: session.returnUrl, jwt: signJwt(responseClaims, privateKey) });
  });

  app.post('/lti/launch', async (req, res) => {
    const claims = await receiveLaunch(req, res, 'LtiResourceLinkRequest');
    if (!claims) return;
    const activityId = claims[CUSTOM]?.math4speed_activity_id;
    const activities = loadActivities();
    const activity = activities[activityId];
    if (!activity || activity.platform !== claims.iss || activity.deploymentId !== claims[DEPLOYMENT_ID]) {
      return launchPageError(res, 404, 'Die ausgewählte Math4Speed-Aktivität wurde nicht gefunden.');
    }
    const id = randomId();
    launches.set(id, {
      activity,
      user: { id: claims.sub, name: claims.name || null, roles: claims['https://purl.imsglobal.org/spec/lti/claim/roles'] || [] },
      resourceLinkId: claims[RESOURCE_LINK]?.id || null,
      expiresAt: Date.now() + SESSION_TTL_MS
    });
    res.redirect(303, `/lti/play/${id}`);
  });

  app.get('/api/lti/launch-session/:id', (req, res) => {
    prune(launches);
    const launch = launches.get(req.params.id);
    if (!launch?.activity) return res.status(404).json({ error: 'Die LTI-Sitzung ist abgelaufen.' });
    res.json({ activity: launch.activity, user: launch.user });
  });
}

module.exports = { attachLtiRoutes };
