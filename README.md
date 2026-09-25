# 3-Tier Application with Jenkins CI/CD — Beginner Guide

Stack:
- **Tier 1 — Presentation:** static HTML/CSS/JS served by Nginx
- **Tier 2 — Application:** Node.js + Express REST API
- **Tier 3 — Data:** MySQL

---

## 0. Prerequisites

Install on your machine (or EC2 instance):

```bash
# Check versions (install if missing)
git --version
docker --version
docker compose version
node --version
```

If any are missing on Ubuntu/Amazon Linux:

```bash
sudo apt update && sudo apt install -y git docker.io docker-compose-plugin nodejs npm   # Ubuntu
# or
sudo dnf install -y git docker nodejs npm                                              # Amazon Linux
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER   # log out/in after this
```

---

## 1. Run the app locally first (sanity check before CI/CD)

From the project root:

```bash
docker compose up -d --build
```

Wait ~15 seconds for MySQL to initialize, then check:

```bash
docker ps                          # all 3 containers should be "Up"
curl http://localhost:5000/health  # {"status":"ok","service":"backend"}
```

Open `http://localhost` (or your EC2 public IP) in a browser — you should see the Contact Book form. Add a contact and confirm it appears in the list.

To stop everything:

```bash
docker compose down
```

---

## 2. Push the source code to GitHub

```bash
cd threetier-jenkins-demo
git init
git add .
git commit -m "Initial 3-tier app: frontend, backend, database, Jenkinsfile"

# Create the repo first on github.com, then:
git remote add origin https://github.com/<your-username>/threetier-jenkins-demo.git
git branch -M main
git push -u origin main
```

Files that should be in the repo (this is your project layout):

```
threetier-jenkins-demo/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── nginx.conf
│   └── Dockerfile
├── backend/
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── database/
│   └── init.sql
├── docker-compose.yml
├── Jenkinsfile
└── README.md
```

---

## 3. Install Jenkins (on an EC2 instance or any Linux VM)

```bash
sudo apt update
sudo apt install -y openjdk-17-jre

curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update
sudo apt install -y jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

Let Jenkins run Docker commands:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

Get the initial admin password and open the setup wizard:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Go to `http://<your-server-ip>:8080`, paste the password, install **suggested plugins**, and create your admin user.

---

## 4. Add Docker Hub credentials in Jenkins

1. **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
2. Kind: **Username with password**
3. Username/password: your Docker Hub username and an [access token](https://hub.docker.com/settings/security)
4. **ID: `dockerhub-creds`** (must match the `credentialsId` in the Jenkinsfile)

Edit `Jenkinsfile` in your repo and change:

```groovy
DOCKERHUB_USER = "YOUR_DOCKERHUB_USERNAME"   // <-- your real Docker Hub username
```

Push that change:

```bash
git add Jenkinsfile
git commit -m "Set Docker Hub username"
git push
```

---

## 5. Create the Jenkins Pipeline job

1. Jenkins dashboard → **New Item**
2. Name it `threetier-pipeline`, choose **Pipeline**, click OK
3. Under **Pipeline** section:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/<your-username>/threetier-jenkins-demo.git`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
4. Save.

---

## 6. Run the pipeline

Click **Build Now**. Jenkins will:

1. **Checkout** — pull your code from GitHub
2. **Install Backend Dependencies** — `npm install`
3. **Run Tests** — `npm test` (placeholder; add real tests later)
4. **Build Docker Images** — builds `backend` and `frontend` images
5. **Push Images to Docker Hub** — logs in and pushes both images
6. **Deploy** — `docker compose up -d --build` on the Jenkins host

Watch progress under **Build History → Console Output**.

Once it succeeds, visit `http://<jenkins-server-ip>` — the app should be live, now deployed by Jenkins instead of by hand.

---

## 7. (Optional) Auto-trigger on every GitHub push

1. In the GitHub repo: **Settings → Webhooks → Add webhook**
   - Payload URL: `http://<jenkins-server-ip>:8080/github-webhook/`
   - Content type: `application/json`
   - Event: **Just the push event**
2. In the Jenkins job: **Configure → Build Triggers → GitHub hook trigger for GITScm polling**

Now every `git push` to `main` automatically re-runs the pipeline.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `permission denied` on `docker` commands in Jenkins log | jenkins user not in docker group | `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins` |
| Backend can't connect to MySQL | MySQL not ready yet | `docker compose` already waits via `healthcheck`; if running manually, wait ~15s before starting backend |
| `502` from frontend when calling `/api/...` | nginx proxying to wrong service name | Confirm `nginx.conf` points to `http://backend:5000` and both are on the same Docker network |
| Jenkins push to Docker Hub fails with `unauthorized` | Wrong credentials ID or expired token | Recheck `dockerhub-creds` ID and generate a fresh Docker Hub access token |
| Port 8080 already in use | Jenkins port conflict | `sudo systemctl status jenkins` then reassign port in `/etc/default/jenkins` |

---

## 9. What each tier is doing (quick recap for your review)

- **Frontend (Tier 1):** pure static files, no logic beyond calling the API and rendering results.
- **Backend (Tier 2):** stateless REST API; all business rules and validation live here; can be scaled by running more containers.
- **Database (Tier 3):** the only place data is persisted; only the backend can reach it (enforced here by the Docker network, and by security groups in a real AWS deployment).
- **Jenkins:** automates build → test → containerize → push → deploy, replacing the manual steps you'd otherwise run by hand every time you change code.
