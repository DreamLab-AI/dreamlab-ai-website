# Chapter 5: GitHub Pages: Your Free Portfolio Site

One of the most exciting features of [GitHub](https://github.com/) for creative technologists is **[GitHub Pages](https://pages.github.com/)**. It allows you to host a static website directly from your GitHub repository, completely free. This is perfect for portfolios, project showcases, documentation sites, or simple blogs.

The workshop highlighted this as "probably the most powerful bit from all of your point of view in terms of you can host your own stuff and it's free... everybody wants a free website, why wouldn't you?"

## 5.1 How GitHub Pages Works

GitHub Pages takes HTML, CSS, and JavaScript files (and Markdown files, which it can convert to HTML) from a specific branch and folder in your repository and publishes them as a website.

*   **Static Sites:** GitHub Pages is designed for static sites. This means the content is pre-built and served as-is to users. It doesn't support server-side languages like PHP, Python (e.g., Django/Flask), or Node.js backends directly in the way traditional web hosts do. However, you can build very rich interactive experiences using client-side JavaScript frameworks (like React, Vue, Angular) and then deploy the static build output to GitHub Pages.
*   **URL Structure:**
    *   **User/Organization Site:** If you name a repository `<username>.github.io` (where `<username>` is your GitHub username or organization name), the content from its `main` branch (usually from the root or a `/docs` folder) will be served at `https://<username>.github.io`. You can only have one such site per account/organization.
    *   **Project Site:** For any other repository, you can enable GitHub Pages. The site will typically be available at `https://<username>.github.io/<repository-name>/`.

## 5.2 Setting Up GitHub Pages for a Repository

Here's the general process, based on the `workshop.md` instructions:

1.  **Prepare Your Website Files:**
    *   Your website needs at least an `index.html` file at the root of where it will be served from. You can also have CSS files, JavaScript files, images, etc.
    *   For simplicity, you can place all your website files in the root of your repository or, more commonly, in a dedicated folder named `/docs` within your repository.

2.  **Push Your Files to GitHub:**
    *   Ensure your website files (e.g., `index.html`, CSS, JS) are committed to your local Git repository and pushed to GitHub.

3.  **Configure GitHub Pages Settings:**
    *   On GitHub, navigate to your repository.
    *   Click on the "**Settings**" tab for that repository.
    *   In the left sidebar of the Settings page, scroll down and click on "**Pages**".

4.  **Choose a Source:**
    *   Under "Build and deployment", for "Source", select "**Deploy from a branch**".
    *   **Branch:**
        *   Select the branch you want to deploy from (usually `main`).
        *   Select the folder within that branch:
            *   Choose `/(root)` if your website files are in the root of the branch.
            *   Choose `/docs` if your website files are in a folder named `docs` on that branch. This is a common and recommended practice.
    *   Click "**Save**".

5.  **Wait for Deployment:**
    *   GitHub will start building and deploying your site. This might take a few minutes.
    *   The Pages settings page will update to show the URL where your site is published (e.g., `https://<username>.github.io/<repository-name>/`).
    *   "Push any HTML/Markdown file into `/docs` – site goes live at `https://<username>.github.io/<repo>/`."

## 5.3 Example: Deploying a Simple Site

Let's imagine you have a repository named `my-portfolio`.

1.  Create a folder named `docs` in your local `my-portfolio` repository.
2.  Inside the `docs` folder, create an `index.html` file with simple content:
    ```html
    <!DOCTYPE html>
    <html>
    <head>
        <title>My Awesome Portfolio</title>
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
        <h1>Welcome to My Portfolio!</h1>
        <p>Check out my amazing projects.</p>
    </body>
    </html>
    ```
3.  Also inside `docs`, create a `style.css` file:
    ```css
    body {
        font-family: sans-serif;
        margin: 20px;
        background-color: #f0f0f0;
    }
    h1 {
        color: navy;
    }
    ```
4.  Commit these files and push them to GitHub:
    ```bash
    git add docs/index.html docs/style.css
    git commit -m "Add initial website files for GitHub Pages"
    git push
    ```
5.  Go to your `my-portfolio` repository settings on GitHub, then to "Pages."
6.  Set the source to "Deploy from a branch," choose the `main` branch, and the `/docs` folder. Save.
7.  After a few minutes, your site should be live at `https://yourusername.github.io/my-portfolio/`.

The `workshop.md` included an exercise: "> **Exercise** – Use the provided `template‑site/` folder. Copy it into `/docs`, push, share the link!" This encourages hands-on practice.

## 5.4 Using Custom Domains with GitHub Pages

While the default `yourusername.github.io/repository-name` URL is functional, using a custom domain (e.g., `www.yourcreativeproject.com` or `portfolio.yourname.art`) lends a more professional touch to your GitHub Pages site. This section details how to configure a custom domain.

### Prerequisites:
*   **A Registered Domain Name:** You need to have already purchased a domain name from a domain registrar (e.g., Namecheap, GoDaddy, Google Domains, Cloudflare Registrar).
*   **Access to DNS Settings:** You must be able to manage the DNS (Domain Name System) records for your domain through your registrar's control panel.

### Steps to Configure a Custom Domain:

**1. Add Your Custom Domain in GitHub Pages Settings:**

*   Navigate to your repository on GitHub.
*   Go to `Settings` → `Pages`.
*   In the "Custom domain" section, type your full custom domain (e.g., `www.yourcreativeproject.com` or `yourcreativeproject.com` if you're using an apex domain) into the input field.
*   Click `Save`.
    *   GitHub may attempt to verify your domain and might show "DNS check in progress" or "DNS check successful."
    *   This step might also create a `CNAME` file in the root of your publishing source (e.g., your `main` branch's `/docs` folder or the `gh-pages` branch) containing your custom domain. If you manage your site files locally, ensure this `CNAME` file is pulled to your local repository and not accidentally overwritten or deleted.

**2. Configure DNS Records with Your Domain Registrar:**

This is the most crucial and often trickiest part, as the interface varies between domain registrars. You'll need to add specific DNS records to point your domain to GitHub's servers.

**Types of DNS Records for GitHub Pages:**

*   **`A` Records (for Apex Domains):**
    *   An **apex domain** (also known as a root domain or naked domain) is like `yourcreativeproject.com` (without `www`).
    *   To configure an apex domain, you must use `A` records pointing to GitHub's IP addresses. GitHub provides specific IP addresses for this purpose.
    *   **GitHub's IP Addresses for `A` Records:**
        *   `185.199.108.153`
        *   `185.199.109.153`
        *   `185.199.110.153`
        *   `185.199.111.153`
    *   You should create **four** `A` records, one for each of these IP addresses.
    *   **Example `A` Record Configuration (at your registrar):**
        *   Type: `A`
        *   Host/Name: `@` (or leave blank, depending on your registrar – `@` usually signifies the apex domain)
        *   Value/Points to: `185.199.108.153`
        *   TTL (Time To Live): Typically 1 hour (or 3600 seconds), or your registrar's default.
        *   (Repeat for the other three IP addresses)

*   **`CNAME` Record (for Subdomains):**
    *   A **subdomain** is like `www.yourcreativeproject.com`, `blog.yourcreativeproject.com`, or `portfolio.yourname.art`.
    *   To configure a subdomain, you should use a `CNAME` (Canonical Name) record.
    *   The `CNAME` record should point to your default GitHub Pages domain (i.e., `yourusername.github.io`). **Do not include the repository name here.**
    *   **Example `CNAME` Record Configuration (at your registrar):**
        *   Type: `CNAME`
        *   Host/Name: `www` (or `blog`, `portfolio`, etc. – the part of the subdomain before your apex domain)
        *   Value/Points to: `yourusername.github.io` (replace `yourusername` with your actual GitHub username or organisation name)
        *   TTL: Typically 1 hour or default.

*   **`ALIAS`, `ANAME`, or `FLATTENING` Records (Alternative for Apex Domains):**
    *   Some DNS providers offer special record types like `ALIAS` (e.g., DNSimple, Namecheap), `ANAME` (e.g., DNS Made Easy), or CNAME Flattening (e.g., Cloudflare).
    *   These records behave like `CNAME` records but can be used at the apex domain level. If your provider supports this, you can often point your apex domain (`yourcreativeproject.com`) directly to `yourusername.github.io`. This is generally preferred over `A` records if available, as GitHub's IP addresses could theoretically change (though rarely).
    *   Consult your DNS provider's documentation to see if they support this and how to configure it.

**Which to Use?**

*   **For `www.yourdomain.com` (or any other subdomain):** Use a `CNAME` record pointing to `yourusername.github.io`.
*   **For `yourdomain.com` (apex domain):**
    *   **Preferred:** Use `ALIAS`, `ANAME`, or CNAME Flattening if your DNS provider supports it, pointing to `yourusername.github.io`.
    *   **Alternative:** Use four `A` records pointing to the GitHub IP addresses listed above.
*   **Using both `www` and apex (e.g., redirect `yourdomain.com` to `www.yourdomain.com`):**
    *   Configure your apex domain with `A` records (or `ALIAS`/`ANAME`).
    *   Configure your `www` subdomain with a `CNAME` record.
    *   GitHub Pages will typically handle redirecting traffic from the apex to the `www` version (or vice-versa) if both are configured and one is set as primary in the GitHub Pages settings, but this can sometimes depend on your registrar's forwarding options too.

**3. Wait for DNS Propagation:**

*   DNS changes are not instantaneous. They need to propagate across the internet, which can take anywhere from a few minutes to **24-48 hours** (though usually much faster).
*   You can use online tools like `dnschecker.org` to see how your DNS records are propagating across different global DNS servers.

**4. Verify and Enforce HTTPS:**

*   Once your custom domain is correctly configured and DNS has propagated, GitHub will automatically attempt to provision an SSL/TLS certificate for your custom domain to enable HTTPS. This is provided by Let's Encrypt.
*   In your repository's GitHub Pages settings (`Settings` → `Pages`), you should see a message indicating the status of your custom domain and HTTPS.
*   Once HTTPS is enabled (you might see "Your site is published at `https://www.yourcreativeproject.com`" and a green checkmark), you should **tick the "Enforce HTTPS" checkbox**. This ensures all visitors are redirected to the secure `https://` version of your site.

### Troubleshooting Custom Domains:

*   **DNS Check Fails in GitHub:**
    *   Wait longer for DNS propagation.
    *   Double-check your DNS records at your registrar for typos or incorrect values/types.
    *   Ensure the custom domain entered in GitHub Pages settings exactly matches what you're configuring (e.g., `www.domain.com` vs. `domain.com`).
*   **Site Not Loading or Certificate Errors:**
    *   Clear your browser cache or try an incognito window.
    *   Verify DNS propagation using an external tool.
    *   If HTTPS isn't enabling, ensure your DNS records are stable and correctly pointing to GitHub. Sometimes, removing and re-adding the custom domain in GitHub settings can trigger a new certificate provisioning attempt.
*   **`CNAME` File Issues:**
    *   If GitHub created a `CNAME` file in your repository, ensure it's present and contains only your custom domain (e.g., `www.yourcreativeproject.com`).

### Using Roo Code for DNS and Custom Domains:

While Roo Code can't directly configure your DNS settings (as that's done via your domain registrar's website), it can be a valuable assistant:

*   **Understanding DNS Concepts:**
    *   "Explain the difference between an A record and a CNAME record in DNS."
    *   "What is DNS propagation and why does it take time?"
    *   "What does TTL mean for a DNS record?"
*   **Generating Example Configurations (Conceptual):**
    *   "Show me an example of how to configure A records for an apex domain pointing to GitHub Pages IPs."
    *   "What should a CNAME record look like for pointing `blog.mydomain.com` to `myusername.github.io`?"
*   **Troubleshooting Guidance:**
    *   "My custom domain for GitHub Pages isn't working. I've set up A records. What are common things to check?"
    *   "GitHub says 'DNS check failed' for my custom domain. What steps can I take to diagnose this?"
*   **Explaining Registrar-Specific Instructions (if you provide them):**
    *   If you copy instructions from your domain registrar's help pages, you could ask Roo Code: "My registrar says to 'create an A record pointing to an IP address'. Can you explain what 'Host' and 'Value' fields typically mean in this context?"

Setting up a custom domain adds a layer of professionalism to your GitHub Pages site. While it involves interacting with DNS settings outside of GitHub, following these steps carefully will lead to a successful configuration.

## 5.5 Advanced: Publishing from a Private Repository using GitHub Actions

While GitHub Pages is excellent for public repositories, you might have scenarios where your website's source code needs to remain private, but you still want to publish the built static site publicly. This can be achieved using GitHub Actions to deploy from your private repository to a separate public repository dedicated to hosting the GitHub Pages site.

This approach ensures your source code, development history, and potentially sensitive information remain confidential, while the compiled static output (HTML, CSS, JavaScript) is made available to the world.

### Approach Overview

The core idea is to:
1.  Keep your website's source code in a **private** GitHub repository.
2.  Create a **public** GitHub repository that will host the GitHub Pages site (e.g., `yourusername/public-blog-site`).
3.  Set up a GitHub Actions workflow in your private repository. This workflow will:
    *   Trigger on pushes to your main branch (or any branch you designate).
    *   Build your static site (e.g., using Jekyll, Hugo, Next.js, or a simple HTML copy).
    *   Push the built static files to the `gh-pages` branch (or another designated branch) of your public repository.
4.  Configure GitHub Pages in the public repository to serve from that `gh-pages` branch.

### Step-by-Step Guide

Here’s how to set this up:

**1. Create a Personal Access Token (PAT)**

To allow your GitHub Actions workflow in the private repository to push to the public repository, it needs authentication. A Personal Access Token (PAT) with appropriate permissions is commonly used for this.

*   **Navigate to PAT Settings:** Go to your GitHub account settings (click your profile picture in the top-right) → Developer settings → Personal access tokens → Tokens (classic).
    *   *Alternatively, you can use Fine-grained personal access tokens, which offer more precise permission control, but "Tokens (classic)" are often simpler for this use case.*
*   **Generate New Token:** Click "Generate new token" (or "Generate new token (classic)").
*   **Permissions (Scopes):**
    *   Give your token a descriptive note (e.g., "GH Pages Deploy Private to Public").
    *   Select an expiration period.
    *   Crucially, assign the correct scopes:
        *   `repo`: This grants full control of repositories, which is needed to push to your public repository.
        *   `workflow`: This allows the token to be used in GitHub Actions workflows, specifically to update workflow files if your action does so (though less common for this specific deployment).
*   **Save the Token:** Click "Generate token". **Copy the token immediately and store it securely** (e.g., in a password manager). You will not be able to see it again after navigating away from the page. Let's assume your token is `TOKENXXX`.

**2. Configure the PAT in Your Private (Source) Repository**

You must add this PAT as a secret in your private repository so the GitHub Actions workflow can access it securely.

*   Go to your **private** repository on GitHub.
*   Navigate to `Settings` → `Secrets and variables` → `Actions`.
*   Click `New repository secret`.
*   **Name:** Choose a name for the secret, for example, `DEPLOY_TOKEN`.
*   **Value:** Paste the PAT (`TOKENXXX`) you copied earlier.
*   Click `Add secret`.

**3. Create the GitHub Actions Workflow File**

In your **private** repository, create a YAML file for your workflow. For example, `.github/workflows/deploy-to-public-ghpages.yml`:

```yaml
name: Deploy Website to Public GitHub Pages

on:
  push:
    branches:
      - main # Or your default branch, e.g., master

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4 # Checks out your private repository's code

      - name: Set up Node.js (Example for a Node-based SSG)
        if: true # Condition this step if needed, e.g., for specific SSGs
        uses: actions/setup-node@v4
        with:
          node-version: '20' # Specify your Node.js version

      - name: Build your static site
        run: |
          # Replace these commands with your actual build process
          # For a simple HTML/CSS/JS site, you might just copy files
          # mkdir ./public
          # cp -r * ./public/
          
          # Example for a Node.js project (e.g., Next.js, Vue, React)
          # npm install
          # npm run build # Ensure your build output goes to a directory like 'public', 'dist', or 'build'

          # Example for Hugo
          # hugo --minify # Assumes Hugo is installed or use peaceiris/actions-hugo

          echo "Build process complete. Files are in ./public" # Adjust if your output is elsewhere

      - name: Deploy to public repository's gh-pages branch
        uses: peaceiris/actions-gh-pages@v4
        with:
          personal_token: ${{ secrets.DEPLOY_TOKEN }}
          external_repository: yourusername/your-public-repo-name # IMPORTANT: Change this!
          publish_branch: gh-pages # The branch in the public repo to deploy to
          publish_dir: ./public # The directory containing your built static site
          # user_name: 'github-actions[bot]' # Optional: Custom committer name
          # user_email: 'github-actions[bot]@users.noreply.github.com' # Optional: Custom committer email
          commit_message: ${{ github.event.head_commit.message }} # Uses the commit message from the trigger
          # allow_empty_commit: false # Optional: Prevents empty commits if no changes
          # force_orphan: true # Optional: Creates a fresh branch history each time
```

**Key Configuration Notes for the Workflow:**

*   **`external_repository`**: **Crucially, replace `yourusername/your-public-repo-name`** with the actual path to your public repository (e.g., `CreativeTechUser/MyPublicPortfolio`).
*   **`publish_dir`**: Adjust `./public` to match the directory where your static site generator (SSG) or build process outputs the final static files (common alternatives include `./dist`, `./build`, `./_site` for Jekyll).
*   **Build Steps**: Customise the "Build your static site" step.
    *   If you're using a specific SSG like Hugo, Jekyll, Next.js, Eleventy, etc., you'll need to include steps to install its dependencies and run its build command.
    *   For Hugo, you might use an action like `peaceiris/actions-hugo` before your build command.
    *   For Node.js based SSGs, ensure you have a `actions/setup-node@v4` step.

**4. Enable GitHub Pages in the Public Repository**

Finally, configure your **public** repository to serve GitHub Pages from the branch your action deploys to:

*   Go to your **public** repository on GitHub.
*   Navigate to `Settings` → `Pages`.
*   Under "Build and deployment":
    *   For "Source", select "**Deploy from a branch**".
    *   For "Branch", select the `gh-pages` branch (or whatever `publish_branch` you specified in your workflow). Ensure the folder is set to `/(root)`.
*   Click `Save`.

Your site should be live at `https://yourusername.github.io/your-public-repo-name/` after the first successful workflow run.

### Leveraging Roo Code for This Workflow

Setting up GitHub Actions, especially for the first time, can be intricate. Here’s how Roo Code (powered by Gemini) can assist you:

*   **Generating the Workflow File:**
    *   Prompt Roo Code: "Create a GitHub Actions workflow to build a [Your SSG, e.g., Hugo, Next.js] site from this private repository and deploy it to the `gh-pages` branch of a public repository named `yourusername/public-repo-name` using a PAT stored as `DEPLOY_TOKEN`. The build output is in the `./build` directory."
    *   Roo Code can generate a well-structured starting point for your `deploy-to-public-ghpages.yml` file.
*   **Understanding YAML and Actions Syntax:**
    *   Select a part of the YAML file and ask Roo Code: "Explain what `uses: actions/checkout@v4` does in this GitHub Action."
*   **Customising Build Steps:**
    *   If you're unsure about the build commands for your specific SSG, ask: "What are the typical build commands for a [Your SSG] project, and how do I ensure the output goes to a `./public` directory?"
*   **Finding Specific Actions:**
    *   "I need to use Hugo to build my site in a GitHub Action. Is there a recommended action for setting up Hugo?" (Roo Code might suggest `peaceiris/actions-hugo`).
*   **Troubleshooting Workflow Failures:**
    *   If your GitHub Action fails, copy the error messages from the Actions log and paste them into Roo Code: "My GitHub Action failed with this error: `[paste error log]`. What could be the cause, and how can I fix it?"
    *   Roo Code can help decipher cryptic error messages related to PAT permissions, incorrect paths, or build failures.
*   **PAT Security and Scopes:**
    *   "What are the security best practices for using Personal Access Tokens in GitHub Actions?"
    *   "Explain the `repo` and `workflow` scopes for a GitHub PAT."

### Troubleshooting Common Issues

*   **Permission Errors:**
    *   Double-check that your PAT has the `repo` scope.
    *   Ensure the PAT was correctly copied and added as the `DEPLOY_TOKEN` secret in the private repository's Actions settings.
    *   Verify the `external_repository` name is exact.
*   **Empty Deployments or "File Not Found":**
    *   Confirm that the `publish_dir` in your workflow YAML correctly points to the directory where your build process outputs the static files. Inspect the build logs in your GitHub Actions run to see where files are being placed.
*   **Workflow Not Triggering:**
    *   Ensure the `on: push: branches:` section in your workflow correctly lists the branch you are pushing to in your private repository (e.g., `main`).
*   **SSH-based Deployments (Alternative):**
    *   For SSH key-based deployments (instead of PATs), you would use `deploy_key` in the `peaceiris/actions-gh-pages` action and configure SSH deploy keys. This is generally more complex to set up initially.

This advanced method provides a robust way to manage private source code while still leveraging the power and convenience of GitHub Pages for public-facing sites. Remember to commit your workflow file to your private repository to activate it. Subsequent pushes to your specified branch will then trigger the automated deployment.

---

Next: [Chapter 6: AI-Powered Workflows with Roo Code](./06_ai_workflows_roo_code.md)