# Deploy: push lên `main` là tự build và chạy trên server

Luồng: **push `main` → GitHub Actions build image → đẩy lên GHCR → SSH vào server `docker compose pull && up -d` → kiểm tra :3001**.
Server không build gì cả (chỉ còn ~3.9 GB RAM, không có swap).

```
Trình duyệt ── https://bloomcapital.market ──▶ nginx (server) ──▶ 127.0.0.1:3001 ──▶ container pocker-ai
                        │
                        └── API + WebSocket ──▶ https://api.bloomcapital.market  (backend Poker-BE, repo khác)
```

## 1. Cấu hình GitHub (làm một lần)

Repo → **Settings → Secrets and variables → Actions**.

**Variables** (giá trị công khai, được nướng vào bản build):

| Tên | Giá trị |
|---|---|
| `NEXT_PUBLIC_SUITED_SERVER` | `https://api.bloomcapital.market` |
| `NEXT_PUBLIC_SUITED_WS` | `wss://api.bloomcapital.market` (chỉ địa chỉ gốc, **không** có `/ws`) |
| `SUITED_BACKEND` | `https://api.bloomcapital.market` |
| `NEXT_PUBLIC_CHAIN_ID` | `46630` |
| `NEXT_PUBLIC_CHAIN_RPC_URL` | `https://rpc.testnet.chain.robinhood.com` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_CHAIN_EXPLORER_URL`, `NEXT_PUBLIC_WALLETCONNECT_ID` | để trống nếu chưa dùng |

**Secrets:**

| Tên | Giá trị |
|---|---|
| `SSH_HOST` | `34.70.77.230` |
| `SSH_USER` | `admin_auro_finance` |
| `SSH_PRIVATE_KEY` | khóa riêng **dành cho CI** (xem bước 2) |
| `SSH_KNOWN_HOSTS` | `34.70.77.230 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFS9r5eoLZvkyaUV/IYy+zy7IiCbJC3V81v3VR+GF2ui` (fingerprint `SHA256:KMm1hSzHjLWjont/fXYdpZGbN6FdnnHidjViGW4P1zc`, đã đối chiếu với chính server) |

## 2. Khóa SSH riêng cho CI

Đừng dùng khóa cá nhân. Tạo một khóa mới:

```bash
ssh-keygen -t ed25519 -f ./pocker-ai-ci -N "" -C "github-actions pocker-ai"
# thêm khóa công khai vào server (dùng khóa cá nhân của bạn để vào):
ssh -i ~/.ssh/wonk-be-testnet admin_auro_finance@34.70.77.230 \
  "cat >> ~/.ssh/authorized_keys" < ./pocker-ai-ci.pub
# dán NỘI DUNG file ./pocker-ai-ci (khóa riêng) vào secret SSH_PRIVATE_KEY, rồi XÓA file này khỏi máy:
rm ./pocker-ai-ci ./pocker-ai-ci.pub
```

Khi cần thu hồi quyền của CI: xóa dòng có comment `github-actions pocker-ai` trong `~/.ssh/authorized_keys` trên server.

## 3. DNS và HTTPS (làm một lần)

1. Trong Cloudflare, đặt bản ghi **A** `bloomcapital.market` → `34.70.77.230`. (Hiện tên miền này đang trả lỗi 522 vì máy chủ gốc không đáp ứng.)
2. Khi DNS đã trỏ về, cấp chứng chỉ trên server:
   ```bash
   sudo certbot --nginx -d bloomcapital.market
   ```
   Nếu dùng Cloudflare proxy (đám mây cam), đặt SSL mode là **Full (strict)** sau khi có chứng chỉ gốc.

Phía server đã có sẵn: `~/pocker-ai/docker-compose.yml` và khối nginx `/etc/nginx/sites-available/bloomcapital.market` (cổng 80, chuyển về `127.0.0.1:3001`).

## 4. Backend cần khớp

Trong `~/poker-be/.env.prod` trên server:
- `CORS_ORIGINS` phải chứa `https://bloomcapital.market` (hiện đã có).
- `PUBLIC_HOST` phải là **domain của frontend**: `bloomcapital.market` (hiện đang là `tamaptos.fun`, ví sẽ cảnh báo lệch domain khi ký). Sau khi đổi cần restart backend (`docker compose up -d --force-recreate api`, có drain tối đa 120 giây).

## 5. Vận hành

```bash
# trên server
cd ~/pocker-ai
docker compose ps
docker compose logs -f web
# quay lui về một bản cũ (tag là mã commit)
IMAGE=ghcr.io/chungit201/pocker-ai:<mã-commit> docker compose up -d web
```

Container bị giới hạn 512 MB RAM. Nếu bị dừng vì vượt giới hạn thì chỉ container FE bị ảnh hưởng, không phải các dịch vụ khác trên máy.

## 6. Khi `docker compose pull` bị từ chối trên server

Server dùng thông tin đăng nhập GHCR đã lưu sẵn (dùng chung với backend). Nếu token đó không đọc được package riêng của `chungit201`, có 2 cách: đăng nhập lại GHCR bằng token có quyền `read:packages` của chungit201, hoặc đặt package ở chế độ công khai (image không chứa bí mật nào vì các biến `NEXT_PUBLIC_*` vốn công khai). Đừng ghi đè đăng nhập mặc định bằng token ngắn hạn, vì nó làm hỏng `deploy.sh` của backend.
