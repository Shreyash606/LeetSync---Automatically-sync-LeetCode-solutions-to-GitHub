// LeetSync - Cleaned & Improved Version
// Ensures full code is captured and only syncs on Accepted submission

class LeetSync {
  constructor() {
    this.config = {};
    this.capturedCode = null;
    this.init();
  }

  async init() {
    const result = await chrome.storage.sync.get([
      "leetsyncConfig",
      "leetsyncEnabled",
    ]);
    this.config = result.leetsyncConfig || {};
    this.isEnabled = result.leetsyncEnabled || false;

    if (this.isEnabled && this.config.githubToken && this.config.githubRepo) {
      this.monitorSubmitButtons();
      console.log("🚀 LeetSync: Monitoring active");
    }
  }

  monitorSubmitButtons() {
    setInterval(() => {
      const buttons = document.querySelectorAll("button");

      buttons.forEach((button) => {
        const text = button.textContent?.toLowerCase().trim();

        if (text === "submit" && !button.dataset.leetsyncMonitored) {
          button.dataset.leetsyncMonitored = "true";

          button.addEventListener("click", () => {
            this.showNotification("📝 Submit clicked. Waiting for result...", "info");
            setTimeout(() => this.checkForAcceptance(), 3000);
          });

          console.log("📌 Listener added to Submit button");
        }
      });
    }, 2000);
  }

  checkForAcceptance() {
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(() => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        return;
      }

      const text = document.body.textContent?.toLowerCase();
      if (text.includes("accepted")) {
        clearInterval(interval);
        const codeData = this.getMonacoCode();
        if (codeData) {
          this.syncToGitHub(codeData);
        }
      }
    }, 1000);
  }

  getMonacoCode() {
    if (!window.monaco || !window.monaco.editor) return null;

    const editors = window.monaco.editor.getEditors();
    if (!editors.length) return null;

    const editor = editors[0];
    const model = editor.getModel();
    if (!model) return null;

    const code = model.getValue();
    if (!code || code.trim().length < 10) return null;

    const rawLang = model.getLanguageId();
    const language = rawLang?.toLowerCase() || "unknown";

    const title = document.title.replace(" - LeetCode", "").trim();
    const urlMatch = window.location.href.match(/(https:\/\/leetcode\.com\/problems\/[^\/\?]+)/);
    const url = urlMatch ? urlMatch[1] + "/" : window.location.href;

    return { code, title, url, language };
  }

  async syncToGitHub(data) {
    const { githubToken, githubRepo, githubUsername } = this.config;
    if (!githubToken || !githubRepo || !githubUsername) return;

    const fileName = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${this.getFileExtension(data.language)}`;
    const filePath = `solutions/${fileName}`;
    const content = this.generateFileContent(data);

    let existingSHA = null;
    try {
      const res = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filePath}`, {
        headers: { Authorization: `token ${githubToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        existingSHA = json.sha;
      }
    } catch (e) {}

    const body = {
      message: `Add solution: ${data.title}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: "main",
      ...(existingSHA && { sha: existingSHA })
    };

    const upload = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filePath}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify(body),
    });

    if (upload.ok) {
      this.showNotification(`✅ Synced: ${data.title}`, "success");
    } else {
      this.showNotification("❌ Sync failed", "error");
    }
  }

  generateFileContent({ code, title, url, language }) {
    const date = new Date().toLocaleString("en-US");
    const extension = this.getFileExtension(language);
    const codeLang = extension !== "txt" ? extension : "";
    return `# ${title}\n\n**Language:** ${language}\n**Date:** ${date}\n**Link:** ${url}\n\n## Solution\n\n\\`\\`\\`${codeLang}\n${code}\n\\`\\`\\`\n\n---\n*Auto-synced by LeetSync*`;
  }

  getFileExtension(lang) {
    const map = {
      python: "py",
      javascript: "js",
      typescript: "ts",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rust: "rs",
      swift: "swift",
      kotlin: "kt",
    };
    return map[lang] || "txt";
  }

  showNotification(msg, type) {
    const div = document.createElement("div");
    div.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 16px;
      background: ${type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#3b82f6"};
      color: white;
      border-radius: 8px;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }
}

new LeetSync();
