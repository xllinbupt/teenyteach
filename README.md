# TeenyTeach｜重生之我来当班主任

一个面向小学生的 AI 角色扮演主动学习 Demo。孩子先围绕主题与 AI 对话备课，再走进像素动物教室讲课；学生会提问、追问并给出即时反馈，让“假装当老师”成为主动学习的动力。

## 在线体验

[打开 DMIT 线上 Demo](https://teenyteach.64-186-244-156.sslip.io:2443/)

当前版本已部署到 DMIT 服务器并提供免登录 HTTPS 访问。正式域名完成 DNS 解析后，可将临时 `sslip.io` 地址替换为自有域名。

## 核心流程

1. 选择学习主题，与 AI 备课伙伴对话。
2. 用自己的话整理讲法、例子和可能被追问的问题。
3. 进入像素动物教室进行多轮讲课与问答。
4. 根据课堂表现获得反馈、成长值和班级排名。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中填写阿里云百炼 `DASHSCOPE_API_KEY` 后，可启用真实对话和 TTS；未配置时应用会使用离线体验模式。

## 验证

```bash
npm run build
npm run test:sites
```

## Docker 部署

```bash
cp .env.example .env
docker compose up -d --build
```

容器默认只映射到宿主机 `127.0.0.1:3010`，请通过 Caddy、Nginx 或其他 HTTPS 入口反向代理，不要直接暴露模型接口端口。

## 技术栈

- React 19 + Vite
- Cloudflare Workers 兼容服务端
- 阿里云百炼 `qwen-plus`
- 阿里云百炼 `qwen3-tts-flash`

## 安全说明

API Key 仅应配置在本地 `.env.local` 或托管平台的服务器端 Secret 中。不要把真实密钥提交到 Git。

## License

[MIT](./LICENSE)
