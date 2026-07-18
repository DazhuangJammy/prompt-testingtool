import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  buildBailianListIndicesRequest,
  probeBailianSignature,
} from './bailianSignatureProbe.mjs'

const connection = {
  accessKeyId: 'test-access-key-id',
  accessKeySecret: 'test-access-key-secret',
  workspaceId: 'llm-test workspace',
}
const now = new Date('2026-07-18T14:15:37.123Z')
const nonce = '71823ab37768587654f9332dfb58396a'

describe('bailianSignatureProbe', () => {
  it('builds an ACS3 request without the SDK-only provider header', () => {
    const request = buildBailianListIndicesRequest(connection, { nonce, now })

    expect(request.url).toBe(
      'https://bailian.cn-beijing.aliyuncs.com/llm-test%20workspace/index/list_indices?PageNumber=1&PageSize=100',
    )
    expect(request.canonicalRequest).toContain([
      'GET',
      '/llm-test%20workspace/index/list_indices',
      'PageNumber=1&PageSize=100',
      'host:bailian.cn-beijing.aliyuncs.com',
    ].join('\n'))
    expect(request.canonicalRequest).not.toContain('x-acs-credentials-provider')
    expect(request.headers).not.toHaveProperty('host')
    expect(request.headers).not.toHaveProperty('x-acs-credentials-provider')
    expect(request.headers.authorization).toBe(
      'ACS3-HMAC-SHA256 Credential=test-access-key-id,SignedHeaders=host;x-acs-action;x-acs-content-sha256;x-acs-date;x-acs-signature-nonce;x-acs-version,Signature=9c61c547360bb1a6e4129288ba6f3d3dfc324fb1199044c232dd6a62d537273b',
    )
    expect(request.stringToSign).toBe(
      `ACS3-HMAC-SHA256\n${createHash('sha256').update(request.canonicalRequest).digest('hex')}`,
    )
  })

  it('returns only the status, code, and request id from a failed probe', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      Code: 'SignatureDoesNotMatch',
      Message: 'verbose signing details',
      RequestId: 'probe-request-id',
    }), { status: 400 }))

    await expect(probeBailianSignature(connection, {
      fetchImpl,
      nonce,
      now,
    })).resolves.toEqual({
      code: 'SignatureDoesNotMatch',
      ok: false,
      requestId: 'probe-request-id',
      status: 400,
    })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
