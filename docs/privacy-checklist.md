# 隐私排查清单

每次准备推送或公开前，先跑这一页。

## 不能进入 Git 的内容

- `config.local.json`
- WeFlow token、decrypt key、`WeFlow-config.json`
- 真实聊天记录 JSON
- 原始头像缓存
- 真实社群名、成员昵称、原话摘录
- 真实头像海报、带真实群名的成品图
- 本机绝对路径，例如 `C:\Users\...`、`D:\users\...`
- Codex/Claude 记忆、会话日志、`.codex/generated_images`

## PowerShell 检查

```powershell
git status --short
```

确认没有这些路径：

```text
config.local.json
private-results/
reports/raw/
reports/visual-daily/
avatar-cache/
```

## 敏感字符串扫描

```powershell
rg -n "C:\\Users|D:\\users|wxid_|@chatroom|ghp_|github_pat_|safe:|decryptKey|httpApiToken" -S .
```

允许出现的情况：

- 文档里出现占位词，例如 `xxx@chatroom`
- 代码变量名，例如 `token`
- 模板里的 `PUT_YOUR_LOCAL_TOKEN_HERE`

不允许出现：

- 真实路径
- 真实 token
- 真实 `wxid_...`
- 真实群聊 `@chatroom`

## 文件编码检查

```powershell
node -e "const fs=require('fs'),path=require('path');let bad=[];function walk(d){for(const n of fs.readdirSync(d)){if(['.git','node_modules'].includes(n))continue;const p=path.join(d,n),st=fs.statSync(p);if(st.isDirectory())walk(p);else if(/\.(md|json|mjs|ps1|yaml|yml)$/i.test(n)){const s=fs.readFileSync(p,'utf8');if(s.includes('\uFFFD'))bad.push(p)}}}walk('.');console.log(bad);process.exit(bad.length?1:0)"
```

输出空数组才算通过。
