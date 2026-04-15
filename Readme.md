## Games LeaderBoard

### Scalable and Optimized for million of Users

### GitHub Actions Deploy To VM

This repository includes `.github/workflows/deploy-vm.yml` to deploy directly to your VM on each push to `main`/`master`.

#### 1) Add GitHub repository secrets

- `VM_HOST` - public IP or domain of VM
- `VM_USER` - SSH username
- `VM_PORT` - usually `22`
- `VM_SSH_PRIVATE_KEY` - private key content used by GitHub Action
- `VM_APP_DIR` - absolute path to project on VM (example: `/home/ubuntu/LeaderBoard`)
- `ENV_FILE` - full production `.env` content (multi-line supported)

#### 2) One-time VM setup

- Install Node.js and npm
- Install PM2 globally: `npm install -g pm2`
- Clone repo once at `VM_APP_DIR`
- Start first time from VM:
  - `cd <VM_APP_DIR>`
  - `npm ci`
  - `pm2 start npm --name leaderboard -- run start:prod`
  - `pm2 save`

#### 3) Deploy flow

On push, action will:

- SSH into VM
- `git pull` latest branch code
- run `npm ci --omit=dev`
- write `.env` from `ENV_FILE` secret
- restart PM2 process `leaderboard`

