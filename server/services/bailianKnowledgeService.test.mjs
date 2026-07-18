import { describe, expect, it } from 'vitest'
import {
  formatSignatureProbeDiagnostic,
  mapBailianDocument,
  mapBailianRetrieveNode,
  normalizeBailianConnection,
  normalizeUploadHeaders,
} from './bailianKnowledgeService.mjs'

describe('bailianKnowledgeService helpers', () => {
  it('validates and trims connection fields', () => {
    expect(normalizeBailianConnection({
      accessKeyId: ' access-id ',
      accessKeySecret: ' secret ',
      workspaceId: ' workspace ',
    })).toEqual({
      accessKeyId: 'access-id',
      accessKeySecret: 'secret',
      workspaceId: 'workspace',
    })
    expect(() => normalizeBailianConnection({})).toThrow('请填写AccessKey ID')
  })

  it('maps remote document and retrieval payloads', () => {
    expect(mapBailianDocument({
      id: 'document',
      name: '产品.pdf',
      documentType: 'pdf',
      size: 1024,
      status: 'FINISH',
      gmtModified: 1_735_689_600_000,
    })).toMatchObject({
      id: 'document',
      name: '产品.pdf',
      type: 'pdf',
      size: 1024,
      status: 'FINISH',
    })
    expect(mapBailianRetrieveNode({
      metadata: JSON.stringify({
        nid: 'chunk',
        doc_id: 'document',
        doc_name: '产品.pdf',
      }),
      score: 0.88,
      text: '召回内容',
    }, 0)).toEqual({
      chunkId: 'chunk',
      content: '召回内容',
      documentId: 'document',
      documentName: '产品.pdf',
      score: 0.88,
    })
  })

  it('accepts object and string upload headers', () => {
    expect(normalizeUploadHeaders({ 'Content-Type': 'application/pdf' })).toEqual({
      'Content-Type': 'application/pdf',
    })
    expect(normalizeUploadHeaders(
      '"X-bailian-extra":"token","Content-Type":"application/pdf"',
    )).toEqual({
      'Content-Type': 'application/pdf',
      'X-bailian-extra': 'token',
    })
    expect(() => normalizeUploadHeaders('invalid')).toThrow('无效的上传请求头')
  })

  it('explains when both SDK and independent signatures are rejected', () => {
    const error = formatSignatureProbeDiagnostic({
      code: 'SignatureDoesNotMatch',
      requestId: 'independent-request-id',
    })

    expect(error.message).toContain('阿里云 SDK 和独立 ACS3 V3 签名')
    expect(error.message).toContain('当前进程收到的 AccessKey Secret')
    expect(error.message).toContain('independent-request-id')
    expect(error.message).not.toContain('test-access-key-secret')
  })

  it('distinguishes an SDK signing problem from invalid credentials', () => {
    expect(formatSignatureProbeDiagnostic({
      code: 'AccessDenied',
      requestId: 'accepted-signature-request-id',
    }).message).toContain('确认是当前 SDK 签名链路问题')

    expect(formatSignatureProbeDiagnostic({
      code: 'InvalidAccessKeyId.NotFound',
      requestId: 'invalid-key-request-id',
    }).message).toContain('没有接受当前 AccessKey ID')
  })
})
