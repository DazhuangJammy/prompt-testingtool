# 阿里百炼知识库接入

## 支持范围

- 仅接入阿里云百炼中国站华北 2（北京）地域。
- 当前仅支持连接已有的“文档搜索”知识库。
- 项目内支持远程文件列表、上传、删除、状态同步和召回测试。
- 百炼是远程文件和召回结果的唯一数据来源，本地只保存连接信息与文件列表缓存。

## 创建连接

在项目内新建知识库时选择“阿里百炼”，填写：

- 知识库 ID
- 业务空间 ID
- AccessKey ID
- AccessKey Secret

这里使用的是阿里云 AccessKey，不是 DashScope API Key。调用由本机 API 代理通过阿里云百炼 SDK 完成，浏览器不会直接请求阿里云 OpenAPI。

RAM 子账号需要：

- `AliyunBailianDataFullAccess` 权限策略
- 加入目标知识库所属的业务空间

## 删除语义

- 顶部“删除知识库”只会解除本项目中的连接，不删除阿里百炼线上知识库。
- 文件列表中的“删除”会通过百炼 API 删除线上知识库中的对应文件。
- 远程知识库本身的删除仍在阿里百炼控制台完成。

## 凭据存储

连接凭据遵循项目现有模型服务密钥的本地存储方式，保存在当前设备的 IndexedDB 中。不要在共享电脑上保存生产账号的高权限 AccessKey；面向多人或公网部署前，应改用服务端密钥管理或操作系统安全存储。

## 官方文档

- [知识库 API 指南](https://help.aliyun.com/zh/model-studio/rag-knowledge-base-api-guide)
- [Retrieve - 检索知识库](https://help.aliyun.com/zh/model-studio/api-bailian-2023-12-29-retrieve)
