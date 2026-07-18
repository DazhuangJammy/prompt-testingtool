import { createHash } from 'node:crypto'
import bailianModule from '@alicloud/bailian20231229'
import OpenApi from '@alicloud/openapi-client'
import Util from '@alicloud/tea-util'
import { probeBailianSignature } from './bailianSignatureProbe.mjs'

const {
  AddFileRequest,
  ApplyFileUploadLeaseRequest,
  DeleteIndexDocumentRequest,
  DescribeFileRequest,
  GetIndexJobStatusRequest,
  ListIndexDocumentsRequest,
  ListIndicesRequest,
  RetrieveRequest,
  SubmitIndexAddDocumentsJobRequest,
} = bailianModule
const BailianClient = bailianModule.default
const BAILIAN_ENDPOINT = 'bailian.cn-beijing.aliyuncs.com'
const DEFAULT_CATEGORY_ID = 'default'
const MAX_PAGE_SIZE = 100
const POLL_INTERVAL_MS = 2_000
const POLL_ATTEMPTS = 150

export async function connectBailianKnowledgeBase(input) {
  const connection = normalizeBailianConnection(input.connection)
  const knowledgeBaseId = requireText(input.knowledgeBaseId, '知识库 ID')
  try {
    const knowledgeBase = await getBailianKnowledgeBase(connection, knowledgeBaseId)
    const documents = await listBailianDocuments(connection, knowledgeBaseId)
    return { knowledgeBase, documents }
  } catch (error) {
    if (!isSignatureMismatch(error)) throw error
    throw await diagnoseSignatureMismatch(connection, error)
  }
}

export async function listBailianDocuments(connectionInput, knowledgeBaseIdInput) {
  const connection = normalizeBailianConnection(connectionInput)
  const knowledgeBaseId = requireText(knowledgeBaseIdInput, '知识库 ID')
  const client = createBailianClient(connection)
  const documents = []
  let pageNumber = 1

  while (pageNumber <= 100) {
    const request = new ListIndexDocumentsRequest({
      indexId: knowledgeBaseId,
      pageNumber,
      pageSize: MAX_PAGE_SIZE,
    })
    const body = responseBody(await client.listIndexDocumentsWithOptions(
      connection.workspaceId,
      request,
      {},
      runtimeOptions(),
    ))
    documents.push(...(body.data?.documents ?? []).map(mapBailianDocument))
    const total = body.data?.totalCount ?? documents.length
    if (documents.length >= total || !(body.data?.documents?.length)) break
    pageNumber += 1
  }

  return documents
}

export async function uploadBailianDocuments(connectionInput, knowledgeBaseIdInput, files) {
  const connection = normalizeBailianConnection(connectionInput)
  const knowledgeBaseId = requireText(knowledgeBaseIdInput, '知识库 ID')
  if (!files?.length) throw new Error('请选择要上传的文件')
  const client = createBailianClient(connection)
  const fileIds = []

  for (const file of files) {
    fileIds.push(await uploadAndParseFile(client, connection.workspaceId, file))
  }

  const request = new SubmitIndexAddDocumentsJobRequest({
    documentIds: fileIds,
    indexId: knowledgeBaseId,
    sourceType: 'DATA_CENTER_FILE',
  })
  const submitBody = responseBody(await client.submitIndexAddDocumentsJobWithOptions(
    connection.workspaceId,
    request,
    {},
    runtimeOptions(),
  ))
  const jobId = requireText(submitBody.data?.id, '索引任务 ID')
  await waitForIndexJob(client, connection.workspaceId, knowledgeBaseId, jobId)
  return listBailianDocuments(connection, knowledgeBaseId)
}

export async function deleteBailianDocuments(
  connectionInput,
  knowledgeBaseIdInput,
  documentIdsInput,
) {
  const connection = normalizeBailianConnection(connectionInput)
  const knowledgeBaseId = requireText(knowledgeBaseIdInput, '知识库 ID')
  const documentIds = Array.from(new Set(documentIdsInput?.filter(Boolean) ?? []))
  if (!documentIds.length) return listBailianDocuments(connection, knowledgeBaseId)
  const client = createBailianClient(connection)
  const request = new DeleteIndexDocumentRequest({
    documentIds,
    indexId: knowledgeBaseId,
  })
  responseBody(await client.deleteIndexDocumentWithOptions(
    connection.workspaceId,
    request,
    {},
    runtimeOptions(),
  ))
  return listBailianDocuments(connection, knowledgeBaseId)
}

export async function retrieveBailianKnowledge(input) {
  const connection = normalizeBailianConnection(input.connection)
  const knowledgeBaseId = requireText(input.knowledgeBaseId, '知识库 ID')
  const query = requireText(input.query, '检索内容')
  const topK = clampInteger(input.topK, 1, 20, 6)
  const client = createBailianClient(connection)
  const request = new RetrieveRequest({
    denseSimilarityTopK: Math.max(topK * 3, topK),
    enableReranking: Boolean(input.rerankEnabled),
    indexId: knowledgeBaseId,
    query,
    rerankMinScore: clampNumber(input.threshold, 0.01, 1, 0.18),
    rerankTopN: topK,
    saveRetrieverHistory: false,
    sparseSimilarityTopK: Math.max(topK * 2, topK),
  })
  const body = responseBody(await client.retrieveWithOptions(
    connection.workspaceId,
    request,
    {},
    runtimeOptions(),
  ))
  return (body.data?.nodes ?? []).map(mapBailianRetrieveNode)
}

async function getBailianKnowledgeBase(connection, knowledgeBaseId) {
  const client = createBailianClient(connection)
  let pageNumber = 1

  while (pageNumber <= 100) {
    const request = new ListIndicesRequest({
      pageNumber: String(pageNumber),
      pageSize: String(MAX_PAGE_SIZE),
    })
    const body = responseBody(await client.listIndicesWithOptions(
      connection.workspaceId,
      request,
      {},
      runtimeOptions(),
    ))
    const match = body.data?.indices?.find((item) => item.id === knowledgeBaseId)
    if (match) return { id: match.id, name: match.name ?? knowledgeBaseId }
    const loaded = pageNumber * MAX_PAGE_SIZE
    if (loaded >= (body.data?.totalCount ?? 0)) break
    pageNumber += 1
  }

  throw new Error('没有在该业务空间中找到这个知识库')
}

async function uploadAndParseFile(client, workspaceId, file) {
  const leaseRequest = new ApplyFileUploadLeaseRequest({
    fileName: file.originalname,
    md5: createHash('md5').update(file.buffer).digest('hex'),
    sizeInBytes: String(file.size),
  })
  const leaseBody = responseBody(await client.applyFileUploadLeaseWithOptions(
    DEFAULT_CATEGORY_ID,
    workspaceId,
    leaseRequest,
    {},
    runtimeOptions(),
  ))
  const leaseId = requireText(leaseBody.data?.fileUploadLeaseId, '上传租约 ID')
  const uploadUrl = requireText(leaseBody.data?.param?.url, '上传地址')
  const uploadResponse = await fetch(uploadUrl, {
    method: leaseBody.data?.param?.method || 'PUT',
    headers: normalizeUploadHeaders(leaseBody.data?.param?.headers),
    body: file.buffer,
  })
  if (!uploadResponse.ok) throw new Error(`文件上传失败（${uploadResponse.status}）`)

  const addRequest = new AddFileRequest({
    categoryId: DEFAULT_CATEGORY_ID,
    leaseId,
    parser: 'AUTO_SELECT',
  })
  const addBody = responseBody(await client.addFileWithOptions(
    workspaceId,
    addRequest,
    {},
    runtimeOptions(),
  ))
  const fileId = requireText(addBody.data?.fileId, '文件 ID')
  await waitForFileParse(client, workspaceId, fileId)
  return fileId
}

async function waitForFileParse(client, workspaceId, fileId) {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const body = responseBody(await client.describeFileWithOptions(
      workspaceId,
      fileId,
      new DescribeFileRequest(),
      {},
      runtimeOptions(),
    ))
    const status = body.data?.status
    if (status === 'PARSE_SUCCESS') return
    if (status && !['INIT', 'PARSING'].includes(status)) {
      throw new Error(body.data?.parseErrorMessage || `文件解析失败（${status}）`)
    }
    await delay(POLL_INTERVAL_MS)
  }
  throw new Error('文件解析时间过长，请稍后刷新知识库')
}

async function waitForIndexJob(client, workspaceId, knowledgeBaseId, jobId) {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const request = new GetIndexJobStatusRequest({ indexId: knowledgeBaseId, jobId })
    const body = responseBody(await client.getIndexJobStatusWithOptions(
      workspaceId,
      request,
      {},
      runtimeOptions(),
    ))
    if (body.data?.status === 'COMPLETED') return
    if (body.data?.status === 'FAILED') {
      const failed = body.data.documents?.find((item) => item.status === 'INSERT_ERROR')
      throw new Error(failed?.message || '知识库索引任务失败')
    }
    await delay(POLL_INTERVAL_MS)
  }
  throw new Error('知识库索引时间过长，请稍后刷新知识库')
}

export function normalizeBailianConnection(input = {}) {
  return {
    accessKeyId: requireText(input.accessKeyId, 'AccessKey ID'),
    accessKeySecret: requireText(input.accessKeySecret, 'AccessKey Secret'),
    workspaceId: requireText(input.workspaceId, '业务空间 ID'),
  }
}

export function mapBailianDocument(document) {
  return {
    id: document.id,
    name: document.name || document.id || '未命名文件',
    size: document.size,
    type: document.documentType,
    status: document.status,
    error: document.message,
    updatedAt: document.gmtModified
      ? new Date(document.gmtModified).toISOString()
      : new Date().toISOString(),
  }
}

export function mapBailianRetrieveNode(node, index) {
  const metadata = parseMetadata(node.metadata)
  return {
    chunkId: String(metadata.nid || `${metadata.doc_id || 'document'}-${index}`),
    content: node.text || String(metadata.content || ''),
    documentId: String(metadata.doc_id || ''),
    documentName: String(metadata.doc_name || metadata.title || '百炼资料'),
    score: Number(node.score || 0),
  }
}

export function normalizeUploadHeaders(headers) {
  if (!headers) return {}
  if (typeof headers === 'object') return headers
  const value = String(headers).trim()
  try {
    return JSON.parse(value.startsWith('{') ? value : `{${value}}`)
  } catch {
    throw new Error('百炼返回了无效的上传请求头')
  }
}

function createBailianClient(connection) {
  const config = new OpenApi.Config({
    accessKeyId: connection.accessKeyId,
    accessKeySecret: connection.accessKeySecret,
  })
  config.endpoint = BAILIAN_ENDPOINT
  return new BailianClient(config)
}

async function diagnoseSignatureMismatch(connection, sdkError) {
  const sdkRequestId = extractRequestId(sdkError)
  let probe
  try {
    probe = await probeBailianSignature(connection)
  } catch {
    return new Error([
      '百炼 SDK 返回签名不匹配，独立签名验证因网络原因未完成。',
      requestIdSuffix('原请求', sdkRequestId),
    ].filter(Boolean).join(' '))
  }

  return formatSignatureProbeDiagnostic(probe)
}

export function formatSignatureProbeDiagnostic(probe) {
  if (probe.code === 'SignatureDoesNotMatch') {
    return new Error([
      '已分别用阿里云 SDK 和独立 ACS3 V3 签名验证，阿里云都返回 SignatureDoesNotMatch。',
      '请求路径、业务空间和知识库 ID 不参与 Secret 校验结果；当前进程收到的 AccessKey Secret 与阿里云为该 AccessKey ID 保存的 Secret 不一致。',
      '请清空后重新粘贴完整 Secret；若仍相同，需要在 RAM AccessKey 页面创建一组新密钥（旧 Secret 无法再次查看）。',
      requestIdSuffix('独立验证', probe.requestId),
    ].filter(Boolean).join(' '))
  }

  if (probe.code.toLowerCase().includes('invalidaccesskey')) {
    return new Error([
      `独立签名验证返回 ${probe.code}，阿里云没有接受当前 AccessKey ID。`,
      requestIdSuffix('独立验证', probe.requestId),
    ].filter(Boolean).join(' '))
  }

  return new Error([
    '独立 ACS3 V3 签名已被阿里云接受，确认是当前 SDK 签名链路问题。',
    `独立验证结果：${probe.code}。`,
    requestIdSuffix('独立验证', probe.requestId),
  ].filter(Boolean).join(' '))
}

function isSignatureMismatch(error) {
  return error?.code === 'SignatureDoesNotMatch'
    || String(error?.message ?? '').includes('SignatureDoesNotMatch')
}

function extractRequestId(error) {
  return String(error?.data?.RequestId ?? error?.data?.requestId ?? '')
}

function requestIdSuffix(label, requestId) {
  return requestId ? `${label} Request ID：${requestId}` : ''
}

function responseBody(response) {
  const body = response?.body
  if (!body) throw new Error('百炼没有返回有效数据')
  if (body.success === false) throw new Error(body.message || body.code || '百炼请求失败')
  return body
}

function parseMetadata(metadata) {
  if (!metadata) return {}
  if (typeof metadata === 'object') return metadata
  try {
    return JSON.parse(metadata)
  } catch {
    return {}
  }
}

function runtimeOptions() {
  return new Util.RuntimeOptions({
    connectTimeout: 10_000,
    readTimeout: 60_000,
  })
}

function requireText(value, label) {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`请填写${label}`)
  return text
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
