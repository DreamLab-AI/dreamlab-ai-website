# Chapter 2a: Creating Your GitHub Account

⏱️ **Time:** 10 minutes | 🎯 **Difficulty:** 🟢 Beginner

Your [GitHub](https://github.com) account serves as your gateway to a vast ecosystem of code, collaboration, and open-source projects. It will also be central to managing your own projects and contributions. This chapter walks you through account creation, profile configuration, and SSH key setup.

## 2a.1 Creating Your Account (approx. 5 minutes)

Follow these steps to set up your GitHub account:

1. **Navigate to GitHub's Sign-up Page:**
   - Open your web browser and visit [https://github.com/signup](https://github.com/signup).

2. **Enter Your Email Address:**
   - Provide a valid email address that you check regularly. GitHub will use this for verification, notifications, and — importantly — to link your Git commits to your account.

> **💡 Tip:** Use your institutional email if you are a student or academic. This makes it easier to verify your student status later for free GitHub Copilot access and other GitHub Education benefits.

3. **Create a Strong Password:**
   - Choose a secure, unique password. A password manager (such as Bitwarden or 1Password) is highly recommended.

4. **Select a Username:**
   - Your username will form part of your public profile URL (e.g., `https://github.com/yourusername`) and your [GitHub Pages](./05_github_pages.md) URL (e.g., `https://yourusername.github.io/project-name`).
   - **Choose wisely** — this becomes your professional identity in the development world. Keep it clean, memorable, and reasonably short.
   - Avoid joke names or overly cryptic handles if you intend to use this profile professionally.
   - Popular usernames may already be taken, so you might need to try a few variations.

5. **Set Email Preferences:**
   - Decide whether you wish to receive product updates and announcements from GitHub. You can change this later in your notification settings.

6. **Verify Your Account:**
   - Complete any verification steps (such as solving a visual puzzle) to confirm you are a human.

7. **Click "Create account":**
   - Proceed by clicking the "Create account" button.

8. **Verify Your Email Address:**
   - GitHub will send a verification email to the address you provided. Open that email and click the verification link. You must complete this step before you can use most GitHub features.

9. **Personalisation (Optional):**
   - GitHub may ask you questions about your interests and intended use. You can answer these or skip them entirely.

10. **Choose Your Plan:**
    - Select the **Free** plan. It provides unlimited public and private repositories, 2,000 GitHub Actions minutes per month, and GitHub Pages hosting — more than sufficient for this workshop and beyond.

## 2a.2 Configuring Your Profile

Once your account is created, take a few minutes to set up your profile. This is optional but worthwhile, especially if you plan to share your work publicly.

1. **Go to your profile:** Click your avatar in the top-right corner, then "Your profile."
2. **Add a profile picture:** A real photo or a distinctive avatar helps collaborators recognise you.
3. **Write a short bio:** A sentence or two about your interests or role (e.g., "Researcher in spatial computing and creative AI").
4. **Add your location and website** (optional): These help people find and identify you.

### Creating a Profile README (Optional, Intermediate)

GitHub lets you create a special repository named after your username (e.g., `yourusername/yourusername`) with a `README.md` that appears on your profile page. This is a nice way to introduce yourself:

1. Create a new repository with the exact name of your username.
2. Tick "Add a README file."
3. Edit the `README.md` to introduce yourself, list your interests, or showcase your projects.

You can return to this after completing the workshop — it makes more sense once you have a few repositories to link to.

## 2a.3 Email Privacy Settings

By default, your email address may be visible in your Git commits. If you prefer to keep it private:

1. Go to **Settings** > **Emails**.
2. Tick **"Keep my email addresses private"**.
3. Tick **"Block command line pushes that expose my email"** (optional but recommended).
4. Note the `noreply` email address GitHub provides (e.g., `12345678+yourusername@users.noreply.github.com`). Use this as your Git email if you enable privacy:

```bash
git config --global user.email "12345678+yourusername@users.noreply.github.com"
```

## 2a.4 Setting Up SSH Keys (Recommended)

SSH keys provide a secure, password-free way to authenticate with GitHub when pushing and pulling code. This avoids typing your password every time you interact with a remote repository.

### Why SSH?

- **Convenience:** No password prompts when pushing or pulling.
- **Security:** SSH keys use public-key cryptography, which is more secure than password-based access.
- **Standard practice:** Most professional development workflows use SSH keys.

### Generating an SSH Key

Open your terminal (on macOS: Terminal; on Windows: Git Bash, which was installed with Git) and run:

```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

- Replace `your@email.com` with the email associated with your GitHub account.
- When prompted for a file location, press Enter to accept the default (`~/.ssh/id_ed25519`).
- When prompted for a passphrase, you may enter one for extra security or press Enter for none.

### Adding Your SSH Key to GitHub

1. **Copy your public key to the clipboard:**

   macOS:
   ```bash
   pbcopy < ~/.ssh/id_ed25519.pub
   ```

   Windows (Git Bash):
   ```bash
   clip < ~/.ssh/id_ed25519.pub
   ```

   Linux:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   Then manually select and copy the output.

2. **Add the key to GitHub:**
   - Go to [github.com](https://github.com) > click your avatar > **Settings** > **SSH and GPG keys** > **New SSH key**.
   - Give it a descriptive title (e.g., "My Laptop" or "Work Desktop").
   - Paste your public key into the "Key" field.
   - Click **Add SSH key**.

3. **Test the connection:**

```bash
ssh -T git@github.com
```

You should see a message like: `Hi yourusername! You've successfully authenticated, but GitHub does not provide shell access.`

> **📝 Note:** If you prefer not to set up SSH keys right now, you can use HTTPS instead. GitHub will prompt you for your username and a Personal Access Token when you push or pull. SSH is recommended for convenience, but HTTPS works fine for getting started.

## 2a.5 Two-Factor Authentication (Recommended)

GitHub strongly recommends (and may require) two-factor authentication (2FA) for account security:

1. Go to **Settings** > **Password and authentication** > **Two-factor authentication**.
2. Choose your preferred method: an authenticator app (recommended) or SMS.
3. Follow the setup prompts and save your recovery codes securely.

## Importance of Your GitHub Presence

Establishing a GitHub presence is beneficial for several reasons:

- **Professional Visibility:** Employers, collaborators, and funding bodies increasingly review GitHub profiles to assess skills and contributions.
- **Community Engagement:** GitHub is central to open-source software development, providing opportunities to collaborate on and contribute to community projects.
- **Portfolio Building:** Your repositories, contributions, and commit history tell a story about your technical journey — one that a traditional CV cannot.
- **Free Infrastructure:** GitHub provides free hosting (Pages), free CI/CD (Actions), free project management (Issues, Projects), and free collaboration tools (Pull Requests).

<details>
<summary>🎯 Knowledge Check</summary>

Before moving forward, ensure you can answer:
1. What is the difference between your GitHub username and your display name?
2. Why might you use the GitHub noreply email address for commits?
3. What does an SSH key allow you to do?
4. How do you test that your SSH key is working with GitHub?

**Answers:**
1. Your username is your unique identifier in URLs and @mentions; your display name is the human-readable name shown on your profile and commits.
2. To keep your real email address private while still having commits linked to your GitHub account.
3. Authenticate with GitHub securely without typing a password each time you push or pull.
4. Run `ssh -T git@github.com` and look for the success message.

</details>

---

**Next**: [Chapter 2b: Installing Git & VS Code](./02_b_install_git_vscode.md)
