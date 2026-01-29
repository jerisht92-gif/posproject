# Push POS Project to GitHub (overwrite remote)

Run these commands in **PowerShell** or **Command Prompt** from your project folder.  
If you already have a working repo and remote, skip to step 4.

---

## 1. Open terminal and go to project folder

```powershell
cd "d:\POS_Project_Latest\Pos project"
```

---

## 2. Fix broken .git (if you see "not a git repository" or "config.lock")

**Option A – Remove only the lock file:**
```powershell
Remove-Item -Force ".git\config.lock" -ErrorAction SilentlyContinue
```

**Option B – If repo is still broken, remove .git and start fresh (close Cursor/IDE first if you get "Access denied"):**
```powershell
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
git init
```

---

## 3. If you did not have a repo yet (first time)

```powershell
git init
```

---

## 4. Stage all files and commit

```powershell
git add .
git status
git commit -m "Update POS project - overwrite with latest code"
```

---

## 5. Add your GitHub repo as remote (only once)

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repository name:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

If you already added `origin` and want to change the URL:

```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

---

## 6. Push and overwrite remote

**If your branch is `main`:**
```powershell
git branch -M main
git push -u origin main --force
```

**If your branch is `master`:**
```powershell
git push -u origin master --force
```

`--force` overwrites the remote branch with your local code (as you requested).

---

## Summary (copy-paste after replacing the URL)

```powershell
cd "d:\POS_Project_Latest\Pos project"
Remove-Item -Force ".git\config.lock" -ErrorAction SilentlyContinue
git add .
git commit -m "Update POS project"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main --force
```

If `origin` already exists, use `git remote set-url origin https://github.com/...` instead of `git remote add origin ...`.
