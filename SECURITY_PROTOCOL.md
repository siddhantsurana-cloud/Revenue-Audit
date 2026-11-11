# Security Protocol: Enterprise Codebase Integrity and Authorization

To prevent unauthorized changes to the production codebase, a multi-layered security protocol is established for the Apollo Hospitals Revenue Assurance platform. This protocol ensures that only authorized engineers and CI/CD pipelines from the Apollo Organization are permitted on production branches (`main`), while requiring peer reviews via Pull Requests.

---

## 1. Remote Protection: GitHub Branch Protection Rules (Apollo Enterprise)
GitHub provides server-side branch protection that cannot be bypassed by modifying local code. Follow these steps to secure the repository within the Apollo GitHub Organization:

1. Open the repository in your Apollo GitHub Organization: `https://github.com/<apollo-organization>/Revenue-Audit`
2. Click on **Settings** -> **Branches** (in the left sidebar).
3. Under **Branch protection rules**, click **Add branch protection rule**.
4. In the **Branch name pattern** field, enter `main`.
5. Enable the following enterprise governance options:
   * **Require a pull request before merging**: Prevents direct pushes to `main`. All changes must be reviewed and approved via Pull Request.
   * **Require approvals**: Set to at least 1 or 2 required approvals from senior revenue audit leads.
   * **Require status checks to pass before merging**: Require CI workflows (e.g. `Repository Integrity Guard`) to pass before merge.
   * **Restrict who can push to matching branches**: Limit direct push rights to designated Apollo Organization DevOps Admins.
6. Click **Create** or **Save changes**.

---

## 2. Automated CI/CD Push Integrity Guard
An automated GitHub Actions workflow is active in `.github/workflows/integrity_guard.yml`. It automatically verifies that pushes originate from authorized organization actors and repository owners before allowing deployment or release triggers.

---

## 3. Local Developer Verification (Optional Git Hook)
To protect local development environments from committing or pushing changes with unverified credentials, a local Git pre-push hook can be installed:

```bash
# Create pre-push hook to verify authorized corporate email domain before push
HookPath=".git/hooks/pre-push"
cat << 'EOF' > $HookPath
#!/bin/sh
AUTHOR_EMAIL=$(git config user.email)
ALLOWED_DOMAIN="@apollohospitals.com"

if echo "$AUTHOR_EMAIL" | grep -qv "$ALLOWED_DOMAIN"; then
  echo "============================================================"
  echo "SECURITY NOTICE: Push from non-Apollo corporate email: $AUTHOR_EMAIL"
  echo "Please ensure git user.email is configured to your corporate address."
  echo "============================================================"
fi
exit 0
EOF
chmod +x $HookPath
```
