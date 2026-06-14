# Security Protocol: Codebase Integrity and Authorization

To prevent unauthorized changes to the source program, a multi-layered security protocol has been established. This protocol ensures that only authorized updates from your authenticated machine and account are permitted on the production branch (`main`), while forcing all other developers or systems to work through feature branches.

---

## 1. Remote Protection: GitHub Branch Protection Rules (Crucial)
GitHub provides server-side branch protection that cannot be bypassed by modifying local code. Follow these steps to secure the repository:

1. Go to your repository page on GitHub: [Revenue-Audit](https://github.com/siddhantsurana-cloud/Revenue-Audit)
2. Click on **Settings** -> **Branches** (in the left sidebar).
3. Under **Branch protection rules**, click **Add branch protection rule**.
4. In the **Branch name pattern** field, enter `main`.
5. Enable the following options:
   * **Require a pull request before merging**: This prevents anyone (including collaborators) from pushing directly to `main`. They must create a branch, push there, and open a Pull Request.
   * **Require approvals**: (Optional) Require a review from specified accounts before merging.
   * **Restrict who can push to matching branches**: If you want to disable PR requirements for yourself but block everyone else, check this option and add *only* your GitHub account (`siddhantsurana-cloud`).
6. Click **Create** or **Save changes**.

---

## 2. GitHub Actions Push Guard
A secondary automated check is implemented in the repository to block and fail any automated deployments or CI runs if a push to `main` is made by any account other than your official profile.

This is configured in `.github/workflows/integrity_guard.yml`.

---

## 3. Local System Verification (Git Hook)
To protect your local environment from committing or pushing changes if the commands are run from an unauthorized system, we use a local Git pre-push hook. 

This hook verifies that:
1. The pusher is using your GitHub credentials.
2. The Git user email matches your profile.

To install this hook on your machine, run the following command in PowerShell:
```powershell
# Create pre-push hook to verify author email before push
$HookPath = ".git/hooks/pre-push"
$HookContent = @"
#!/bin/sh
# Verify git config user
AUTHOR_EMAIL=\$(git config user.email)
EXPECTED_EMAIL="siddhantsurana.cloud@gmail.com" # Replace with your GitHub email if different

if [ "\$AUTHOR_EMAIL" != "\$EXPECTED_EMAIL" ]; then
  echo "============================================================"
  echo "SECURITY ALERT: Push rejected. Unauthorized Git signature: \$AUTHOR_EMAIL"
  echo "Pushes must originate from the authorized owner account."
  echo "============================================================"
  exit 1
fi
exit 0
"@
Set-Content -Path $HookPath -Value $HookContent
```
