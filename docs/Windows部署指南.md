# FutureShares - Windows 服务器部署指南

## 目录

1. [环境准备](#1-环境准备)
2. [安装 Node.js](#2-安装-nodejs)
3. [安装 Git](#3-安装-git)
4. [项目部署](#4-项目部署)
5. [生产环境构建](#5-生产环境构建)
6. [使用 PM2 进程管理](#6-使用-pm2-进程管理)
7. [配置反向代理 (Nginx)](#7-配置反向代理-nginx)
8. [配置定时任务](#8-配置定时任务)
9. [安全配置](#9-安全配置)
10. [SSL 证书配置](#10-ssl-证书配置)
11. [防火墙设置](#11-防火墙设置)
12. [备份策略](#12-备份策略)
13. [故障排查](#13-故障排查)

---

## 1. 环境准备

### 推荐配置

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核心 | 4 核心以上 |
| 内存 | 2 GB | 4 GB 以上 |
| 磁盘 | 20 GB | 50 GB 以上 |
| 系统 | Windows Server 2016+ | Windows Server 2019/2022 |

### 确认系统信息

打开 PowerShell（管理员）：

```powershell
# 查看系统版本
winver

# 查看系统架构
$env:PROCESSOR_ARCHITECTURE

# 查看内存
Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory
```

---

## 2. 安装 Node.js

### 方式一：使用 Node.js 官方安装包（推荐）

1. 访问 [Node.js 官网](https://nodejs.org/)
2. 下载 **LTS 版本**（推荐 20.x 或 18.x）
3. 运行安装程序，勾选 "Add to PATH"
4. 验证安装：

```powershell
node --version
npm --version
```

### 方式二：使用 Chocolatey 安装

```powershell
# 安装 Chocolatey（如果未安装）
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 Node.js
choco install nodejs-lts -y

# 刷新环境变量并验证
refreshenv
node --version
npm --version
```

### 方式三：使用 NVM for Windows

适合需要管理多个 Node.js 版本的场景。

```powershell
# 下载并安装 nvm-setup.exe
# https://github.com/coreybutler/nvm-windows/releases

# 使用管理员身份打开新的 PowerShell
nvm install lts
nvm use lts
nvm on
```

---

## 3. 安装 Git

### 方式一：使用 Chocolatey

```powershell
choco install git -y
```

### 方式二：手动安装

1. 下载 [Git for Windows](https://git-scm.com/download/win)
2. 安装时选择：
   - ✅ 添加 Git 到 PATH
   - ✅ 使用 Windows 命令行风格
   - ✅ 使用 MinTTY（可选）

验证：

```powershell
git --version
```

---

## 4. 项目部署

### 4.1 拉取代码

创建部署目录并拉取项目：

```powershell
# 创建部署目录
mkdir D:\FutureShares
cd D:\FutureShares

# 克隆仓库（替换为您的仓库地址）
git clone https://your-repo-url/future-shares.git .

# 如果是首次克隆需要配置 Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 4.2 安装依赖

```powershell
# 安装项目依赖
npm install

# 可能需要设置 npm 镜像（国内服务器）
npm config set registry https://registry.npmmirror.com
npm install
```

### 4.3 配置环境变量

复制环境变量模板并配置：

```powershell
# 复制环境变量文件
copy .env.example .env

# 编辑环境变量
notepad .env
```

配置项说明：

```env
# 数据库路径（SQLite）
DATABASE_URL="file:./prod.db"

# 应用 URL（修改为您的域名或 IP）
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# 管理员密码（请使用强密码）
ADMIN_PASSWORD="YourSecurePassword123!"

# 会话密钥（请使用随机字符串）
SESSION_SECRET="your-random-secret-at-least-32-chars"

# Cron 密钥（用于验证定时任务请求）
CRON_SECRET="your-cron-secret-key"
```

### 4.4 初始化数据库

```powershell
# 生成 Prisma 客户端
npm run db:generate

# 推送数据库结构
npm run db:push

# 可选：重置数据库（清空所有数据）
npm run db:push -- --force-reset
```

---

## 5. 生产环境构建

### 5.1 构建应用

```powershell
# 设置 Node.js 环境为生产模式
$env:NODE_ENV = "production"

# 构建 Next.js 应用
npm run build
```

### 5.2 测试运行

```powershell
# 临时测试运行
npm run start

# 访问 http://localhost:3000 确认运行正常
# 按 Ctrl+C 停止
```

---

## 6. 使用 PM2 进程管理

PM2 是 Node.js 应用的进程管理器，支持自动重启、负载均衡等功能。

### 6.1 安装 PM2

```powershell
# 全局安装 PM2
npm install -g pm2
```

### 6.2 创建 PM2 配置文件

在项目根目录创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'future-shares',
      script: 'npm',
      args: 'start',
      cwd: '.',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
```

### 6.3 创建日志目录

```powershell
mkdir logs
```

### 6.4 启动应用

```powershell
# 启动应用
pm2 start ecosystem.config.js

# 查看运行状态
pm2 status

# 查看日志
pm2 logs future-shares

# 查看详细日志
pm2 logs future-shares --err --lines 100
```

### 6.5 PM2 常用命令

```powershell
# 重启应用
pm2 restart future-shares

# 停止应用
pm2 stop future-shares

# 删除应用
pm2 delete future-shares

# 监控资源使用
pm2 monit

# 保存进程列表（开机自启需要）
pm2 save

# 查看进程详情
pm2 show future-shares
```

### 6.6 设置开机自启

```powershell
# 生成启动脚本
pm2 startup

# 会提示运行一个命令，复制并执行该命令
# 例如：pm2 service installer
```

对于 Windows Server，推荐创建计划任务：

```powershell
# 创建计划任务 - 以 SYSTEM 权限启动 PM2
schtasks /create /tn "FutureShares PM2" /tr "powershell -Command 'cd D:\FutureShares; pm2 resurrect'" /sc onlogon /rl highest
```

---

## 7. 配置反向代理 (Nginx)

虽然 Next.js 可以直接处理 80/443 端口，但使用 Nginx 可以：
- 更好的静态文件缓存
- SSL 终止
- 负载均衡准备
- 访问日志和限流

### 7.1 安装 Nginx for Windows

1. 下载 [Nginx Windows 版本](http://nginx.org/en/download.html)
2. 解压到 `D:\nginx`

### 7.2 配置 Nginx

编辑 `D:\nginx\conf\nginx.conf`：

```nginx
worker_processes  1;
error_log  logs/error.log;
pid        logs/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    # 日志格式
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  logs/access.log  main;

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip  on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # 上游服务器
    upstream future_shares {
        server 127.0.0.1:3000;
        keepalive 64;
    }

    server {
        listen       80;
        server_name  your-domain.com;  # 替换为您的域名或 IP

        # HTTP 重定向到 HTTPS（可选）
        # return 301 https://$server_name$request_uri;

        # 根目录
        root D:\FutureShares\public;
        index index.html;

        # 安全头
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # 代理到 Next.js
        location / {
            proxy_pass http://future_shares;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # 超时设置
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # 静态资源缓存
        location /_next/static {
            proxy_pass http://future_shares;
            proxy_cache_valid 200 60m;
            add_header Cache-Control "public, immutable";
        }

        # API 代理
        location /api {
            proxy_pass http://future_shares;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 禁止访问敏感文件
        location ~ /\.env {
            deny all;
        }

        location ~ /\.git {
            deny all;
        }

        # 错误页面
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
}
```

### 7.3 启动 Nginx

```powershell
cd D:\nginx
start nginx

# 检查配置
nginx -t

# 重新加载配置
nginx -s reload

# 停止
nginx -s stop
```

---

## 8. 配置定时任务

### 8.1 Windows 计划任务

由于项目使用 Vercel Cron（`vercel.json` 配置），在 Windows 独立部署时需要手动配置定时任务。

```powershell
# 创建 PowerShell 脚本调用 Cron API
$scriptContent = @'
$headers = @{
    'Authorization' = 'Bearer YourCronSecret'
}
$response = Invoke-WebRequest -Uri 'http://localhost:3000/api/cron/daily-snapshot' -Method GET -Headers $headers
Write-Host "Cron executed at $(Get-Date): Status $($response.StatusCode)"
'@

# 保存脚本
Set-Content -Path "D:\FutureShares\cron-task.ps1" -Value $scriptContent -Encoding UTF8
```

创建计划任务（每天 15:00 北京时间执行）：

```powershell
# 创建计划任务
schtasks /create `
    /tn "FutureShares Daily Snapshot" `
    /tr "powershell.exe -ExecutionPolicy Bypass -File D:\FutureShares\cron-task.ps1" `
    /sc daily `
    /st 15:00 `
    /ru SYSTEM `
    /f

# 查看任务
schtasks /query /tn "FutureShares Daily Snapshot"

# 删除任务（如果需要）
schtasks /delete /tn "FutureShares Daily Snapshot" /f
```

### 8.2 使用 PM2 定时任务

```bash
# 安装 pm2-interval
npm install -g @platane/pm2-interval

# 在 ecosystem.config.js 中配置定时任务
```

---

## 9. 安全配置

### 9.1 环境变量安全

```powershell
# 确保 .env 文件不在 Web 根目录
# 检查 .gitignore 是否包含 .env
Get-Content .gitignore
```

### 9.2 防火墙规则

```powershell
# 只允许 80 和 443 端口入站
New-NetFirewallRule -DisplayName "FutureShares HTTP" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80
New-NetFirewallRule -DisplayName "FutureShares HTTPS" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443

# 如果使用远程管理
New-NetFirewallRule -DisplayName "RDP" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3389 -RemoteAddress 你的管理IP段
```

### 9.3 数据库文件权限

```powershell
# 只允许应用程序访问数据库文件
$dbPath = "D:\FutureShares\prod.db"
icacls $dbPath /inheritance:r /grant:r "NT AUTHORITY\SYSTEM:(F)" "BUILTIN\IIS_IUSRS:(R)" "DOMAIN\YourAppUser:(R)"
```

---

## 10. SSL 证书配置

### 10.1 使用 Let's Encrypt + Win-ACME

```powershell
# 下载 Win-ACME
# https://github.com/win-acme/win-acme/releases

# 以管理员身份运行
.\wacs.exe

# 按照提示创建证书
```

### 10.2 配置 HTTPS Nginx

在 nginx.conf 中添加 HTTPS server：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     D:\nginx\ssl\fullchain.pem;
    ssl_certificate_key D:\nginx\ssl\privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    # 其他配置同 HTTP server
    location / {
        proxy_pass http://127.0.0.1:3000;
        # ...
    }
}
```

### 10.3 HTTP 自动跳转 HTTPS

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 11. 防火墙设置

### 11.1 Windows 防火墙完整规则

```powershell
# 创建防火墙规则组
$ruleName = "FutureShares Web App"

# 入站规则
New-NetFirewallRule -DisplayName "$ruleName HTTP" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 80 `
    -Profile Any

New-NetFirewallRule -DisplayName "$ruleName HTTPS" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 443 `
    -Profile Any

# 如果需要远程管理（限制 IP）
New-NetFirewallRule -DisplayName "$ruleName RDP" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 3389 `
    -RemoteAddress 你的管理IP段

# 查看规则
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*FutureShares*"}
```

### 11.2 端口检查

```powershell
# 检查端口是否监听
netstat -an | findstr "3000"

# 检查防火墙状态
Get-NetFirewallProfile | Select-Object Name, Enabled
```

---

## 12. 备份策略

### 12.1 数据库备份脚本

创建备份脚本 `D:\FutureShares\backup.ps1`：

```powershell
# FutureShares 备份脚本
$backupDir = "D:\FutureShares\backups"
$dbPath = "D:\FutureShares\prisma\prod.db"
$date = Get-Date -Format "yyyyMMdd_HHmmss"

# 创建备份目录
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force
}

# 备份数据库
$backupFile = Join-Path $backupDir "futureshares_backup_$date.db"
Copy-Item $dbPath $backupFile -Force

# 压缩备份文件
$zipFile = "$backupFile.zip"
Compress-Archive -Path $backupFile -DestinationPath $zipFile -Force
Remove-Item $backupFile -Force

# 删除 7 天前的备份
$cutoffDate = (Get-Date).AddDays(-7)
Get-ChildItem $backupDir -Filter "futureshares_backup_*.zip" | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate } | 
    Remove-Item -Force

Write-Host "备份完成: $zipFile"
```

### 12.2 设置自动备份计划

```powershell
# 每天凌晨 2 点执行备份
schtasks /create `
    /tn "FutureShares Backup" `
    /tr "powershell.exe -ExecutionPolicy Bypass -File D:\FutureShares\backup.ps1" `
    /sc daily `
    /st 02:00 `
    /ru SYSTEM `
    /f
```

### 12.3 完整项目备份

```powershell
# 创建完整备份脚本
$backupDir = "D:\FutureShares\backups"
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "futureshares_full_$date.zip"

Compress-Archive `
    -Path "D:\FutureShares\*" `
    -DestinationPath $backupFile `
    -ExcludePath "D:\FutureShares\node_modules","D:\FutureShares\.next","D:\FutureShares\logs" `
    -Force

Write-Host "完整备份完成: $backupFile"
```

---

## 13. 故障排查

### 13.1 查看 PM2 日志

```powershell
# 查看所有日志
pm2 logs future-shares

# 查看最近 100 行
pm2 logs future-shares --lines 100 --nostream

# 清空日志
pm2 flush
```

### 13.2 检查端口占用

```powershell
# 检查 3000 端口
netstat -ano | findstr ":3000"

# 查看占用端口的进程
tasklist /FI "PID eq <PID号>"
```

### 13.3 常见问题

| 问题 | 解决方案 |
|------|----------|
| `EADDRINUSE` | 端口被占用，使用 `netstat` 查找并结束进程 |
| 数据库连接失败 | 检查 `.env` 中的 `DATABASE_URL` 是否正确 |
| 页面 500 错误 | 查看 PM2 日志获取详细错误信息 |
| 定时任务不执行 | 检查 Windows 计划任务是否创建成功 |
| PM2 重启后应用丢失 | 运行 `pm2 save` 保存当前进程列表 |

### 13.4 日志分析

```powershell
# 查看错误日志
Get-Content "D:\FutureShares\logs\error.log" -Tail 50

# 实时查看日志
Get-Content "D:\FutureShares\logs\out.log" -Wait -Tail 20
```

### 13.5 重启服务

```powershell
# 重启 PM2 应用
pm2 restart future-shares

# 重启 Nginx
nginx -s restart

# 检查服务状态
pm2 status
nginx -v
```

### 13.6 性能监控

```powershell
# PM2 监控
pm2 monit

# 系统资源
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
Get-Counter '\Processor(_Total)\% Processor Time'
Get-Counter '\Memory\Available MBytes'
```

---

## 快速部署清单

### 首次部署

- [ ] 安装 Node.js (LTS)
- [ ] 安装 Git
- [ ] 克隆项目代码
- [ ] 安装依赖 `npm install`
- [ ] 配置环境变量 `.env`
- [ ] 初始化数据库 `npm run db:push`
- [ ] 构建应用 `npm run build`
- [ ] 安装并配置 PM2
- [ ] 启动应用 `pm2 start`
- [ ] 配置 Nginx 反向代理
- [ ] 配置防火墙规则
- [ ] 配置定时任务
- [ ] 测试访问

### 更新部署

- [ ] 拉取新代码 `git pull`
- [ ] 安装新依赖 `npm install`
- [ ] 重新构建 `npm run build`
- [ ] 重启 PM2 `pm2 restart`

---

## 附录

### 相关资源链接

- [Node.js 下载](https://nodejs.org/)
- [PM2 文档](https://pm2.keymetrics.io/)
- [Nginx Windows](http://nginx.org/en/docs/windows.html)
- [Win-ACME (SSL证书)](https://github.com/win-acme/win-acme)
- [Let's Encrypt](https://letsencrypt.org/)

### 技术支持

如遇问题，请提供以下信息：

1. 错误日志完整内容
2. `pm2 status` 输出
3. 系统环境信息（`winver` 和 `node --version`）
4. 复现步骤

---

*本文档最后更新：2026年4月*
