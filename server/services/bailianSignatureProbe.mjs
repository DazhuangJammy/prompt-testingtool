import { createHash, createHmac, randomUUID } from 'node:crypto'

const SIGNATURE_ALGORITHM = 'ACS3-HMAC-SHA256'
const BAILIAN_ENDPOINT = 'bailian.cn-beijing.aliyuncs.com'
const API_VERSION = '2023-12-29'
const EMPTY_PAYLOAD_HASH = createHash('sha256').update('').digest('hex')

export function buildBailianListIndicesRequest(connection, options = {}) {
  const timestamp = formatAcsTimestamp(options.now ?? new Date())
  const nonce = options.nonce ?? randomUUID().replaceAll('-', '')
  const pathname = `/${percentEncode(connection.workspaceId)}/index/list_indices`
  const query = canonicalizeQuery({ PageNumber: '1', PageSize: '100' })
  const signingHeaders = {
    host: BAILIAN_ENDPOINT,
    'x-acs-action': 'ListIndices',
    'x-acs-content-sha256': EMPTY_PAYLOAD_HASH,
    'x-acs-date': timestamp,
    'x-acs-signature-nonce': nonce,
    'x-acs-version': API_VERSION,
  }
  const signedHeaders = Object.keys(signingHeaders).sort()
  const canonicalHeaders = signedHeaders
    .map((name) => `${name}:${normalizeHeaderValue(signingHeaders[name])}\n`)
    .join('')
  const canonicalRequest = [
    'GET',
    pathname,
    query,
    canonicalHeaders,
    signedHeaders.join(';'),
    EMPTY_PAYLOAD_HASH,
  ].join('\n')
  const stringToSign = [
    SIGNATURE_ALGORITHM,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')
  const signature = createHmac('sha256', connection.accessKeySecret)
    .update(stringToSign)
    .digest('hex')
  const authorization = [
    `${SIGNATURE_ALGORITHM} Credential=${connection.accessKeyId}`,
    `SignedHeaders=${signedHeaders.join(';')}`,
    `Signature=${signature}`,
  ].join(',')

  const { host: _host, ...requestHeaders } = signingHeaders
  return {
    canonicalRequest,
    headers: { ...requestHeaders, authorization },
    stringToSign,
    url: `https://${BAILIAN_ENDPOINT}${pathname}?${query}`,
  }
}

export async function probeBailianSignature(connection, options = {}) {
  const request = buildBailianListIndicesRequest(connection, options)
  const response = await (options.fetchImpl ?? fetch)(request.url, {
    method: 'GET',
    headers: request.headers,
    signal: options.signal ?? AbortSignal.timeout(10_000),
  })
  const body = await readResponseBody(response)

  return {
    code: String(body.Code ?? body.code ?? (response.ok ? 'OK' : `HTTP_${response.status}`)),
    ok: response.ok,
    requestId: String(body.RequestId ?? body.requestId ?? ''),
    status: response.status,
  }
}

function canonicalizeQuery(query) {
  return Object.entries(query)
    .map(([key, value]) => [percentEncode(key), percentEncode(value)])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

function percentEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ))
}

function normalizeHeaderValue(value) {
  return String(value).trim().replace(/\s+/g, ' ')
}

function formatAcsTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('无效的签名时间')
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

async function readResponseBody(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
