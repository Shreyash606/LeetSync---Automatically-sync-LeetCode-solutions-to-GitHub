// LeetSync Content Script - Monitors submissions and extracts solution data

class LeetSync {
  constructor() {
    this.isEnabled = false;
    this.config = {};
    this.init();
  }

  async init() {
    // Load user configuration
    const result = await chrome.storage.sync.get([
      "leetsyncConfig",
      "leetsyncEnabled",
    ]);
    this.config = result.leetsyncConfig || {};
    this.isEnabled = result.leetsyncEnabled || false;

    if (this.isEnabled && this.config.githubToken && this.config.githubRepo) {
      this.startMonitoring();
      console.log("🚀 LeetSync is active and monitoring submissions...");
    }
  }

  startMonitoring() {
    // Intercept network requests to catch successful submissions
    this.interceptNetworkRequests();

    // Also monitor DOM changes for success messages
    this.observeSubmissionResults();
  }

  interceptNetworkRequests() {
    // Override fetch to intercept LeetCode API calls
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Check if this is a submission request
      if (
        args[0]?.includes("/submissions/detail/") ||
        args[0]?.includes("/submit/")
      ) {
        const responseClone = response.clone();
        try {
          const data = await responseClone.json();

          // Check if submission was accepted
          if (data.state === "SUCCESS" && data.status_msg === "Accepted") {
            console.log("✅ Accepted solution detected!");
            await this.handleAcceptedSubmission(data);
          }
        } catch (error) {
          console.log("LeetSync: Error parsing submission response:", error);
        }
      }

      return response;
    };
  }

  observeSubmissionResults() {
    // Watch for success messages in the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Look for acceptance confirmation
            const acceptedElements =
              node.querySelectorAll?.('[data-e2e-locator="console-result"]') ||
              [];
            acceptedElements.forEach((element) => {
              if (element.textContent?.includes("Accepted")) {
                console.log("✅ DOM: Accepted solution detected!");
                setTimeout(() => this.extractAndSubmitSolution(), 2000);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  async handleAcceptedSubmission(submissionData) {
    // Give LeetCode a moment to update the UI
    setTimeout(() => this.extractAndSubmitSolution(), 1500);
  }

  async extractAndSubmitSolution() {
    try {
      const solutionData = this.extractSolutionFromPage();
      if (solutionData) {
        await this.pushToGitHub(solutionData);
      }
    } catch (error) {
      console.error("LeetSync Error:", error);
      this.showNotification("❌ Failed to sync solution", "error");
    }
  }

  extractSolutionFromPage() {
    // Extract problem information
    const titleElement =
      document.querySelector('[data-cy="question-title"]') ||
      document.querySelector("h1") ||
      document.querySelector(".css-v3d350");

    if (!titleElement) {
      console.log("Could not find problem title");
      return null;
    }

    const problemTitle = titleElement.textContent.trim();
    const problemUrl = window.location.href;

    // Extract solution code from Monaco editor
    let solutionCode = "";
    let language = "";

    // Try different selectors for the code editor
    const codeEditor =
      document.querySelector(".monaco-editor textarea") ||
      document.querySelector("[data-mode-id] textarea") ||
      document.querySelector(".CodeMirror-code");

    if (codeEditor) {
      if (codeEditor.tagName === "TEXTAREA") {
        solutionCode = codeEditor.value;
      } else {
        // For CodeMirror
        solutionCode = codeEditor.textContent;
      }
    }

    // Try to get code from Monaco editor model if available
    if (!solutionCode && window.monaco) {
      const models = monaco.editor.getModels();
      if (models.length > 0) {
        solutionCode = models[0].getValue();
        language = models[0].getLanguageId();
      }
    }

    // Extract language from dropdown if not found
    if (!language) {
      const langButton =
        document.querySelector('[id*="lang"]') ||
        document.querySelector(".ant-select-selection-item");
      if (langButton) {
        language = langButton.textContent.trim().toLowerCase();
      }
    }

    // Extract difficulty and tags
    const difficultyElement =
      document.querySelector("[diff]") ||
      document.querySelector(".text-olive") ||
      document.querySelector(".text-yellow") ||
      document.querySelector(".text-pink");

    const difficulty = difficultyElement?.textContent?.trim() || "Unknown";

    // Extract tags
    const tagElements =
      document.querySelectorAll('[class*="tag"]') ||
      document.querySelectorAll(".topic-tag");
    const tags = Array.from(tagElements)
      .map((tag) => tag.textContent.trim())
      .filter(Boolean);

    if (!solutionCode) {
      console.log("Could not extract solution code");
      return null;
    }

    return {
      title: problemTitle,
      url: problemUrl,
      code: solutionCode,
      language: language || "unknown",
      difficulty,
      tags,
      date: new Date().toISOString(),
    };
  }

  async pushToGitHub(solutionData) {
    const { githubToken, githubRepo, githubUsername } = this.config;

    // Generate filename and path
    const sanitizedTitle = solutionData.title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .toLowerCase();

    const fileExtension = this.getFileExtension(solutionData.language);
    const primaryTag =
      solutionData.tags[0]?.toLowerCase().replace(/\s+/g, "_") || "misc";
    const fileName = `${sanitizedTitle}.${fileExtension}`;
    const filePath = `${primaryTag}/${fileName}`;

    // Create file content with metadata
    const fileContent = this.generateFileContent(solutionData);

    // Commit message
    const commitMessage = `Add solution: ${solutionData.title} (${solutionData.difficulty})`;

    try {
      // Check if file already exists
      const existingFile = await this.githubApiCall(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filePath}`,
        "GET",
        githubToken
      ).catch(() => null);

      // Prepare the request body
      const requestBody = {
        message: commitMessage,
        content: btoa(unescape(encodeURIComponent(fileContent))), // Base64 encode
        branch: "main",
      };

      // If file exists, include the SHA for update
      if (existingFile && existingFile.sha) {
        requestBody.sha = existingFile.sha;
      }

      // Create or update the file
      const response = await this.githubApiCall(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filePath}`,
        "PUT",
        githubToken,
        requestBody
      );

      console.log("✅ Successfully pushed to GitHub:", response);
      this.showNotification(`✅ Synced: ${solutionData.title}`, "success");
    } catch (error) {
      console.error("GitHub API Error:", error);
      this.showNotification(`❌ Sync failed: ${error.message}`, "error");
    }
  }

  async githubApiCall(url, method, token, body = null) {
    const headers = {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  generateFileContent(solutionData) {
    return `# ${solutionData.title}

**Difficulty:** ${solutionData.difficulty}
**Date:** ${new Date(solutionData.date).toLocaleDateString()}
**URL:** ${solutionData.url}
**Tags:** ${solutionData.tags.join(", ")}

## Solution

\`\`\`${solutionData.language}
${solutionData.code}
\`\`\`

---
*Generated by [LeetSync](https://github.com/your-repo/leetsync)*
`;
  }

  getFileExtension(language) {
    const extensions = {
      python: "py",
      python3: "py",
      javascript: "js",
      typescript: "ts",
      java: "java",
      "c++": "cpp",
      cpp: "cpp",
      c: "c",
      go: "go",
      rust: "rs",
      swift: "swift",
      kotlin: "kt",
      scala: "scala",
      ruby: "rb",
      php: "php",
      sql: "sql",
    };
    return extensions[language.toLowerCase()] || "md";
  }

  showNotification(message, type) {
    // Create and show a notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === "success" ? "#22c55e" : "#ef4444"};
      color: white;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      font-family: system-ui, -apple-system, sans-serif;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Initialize LeetSync
new LeetSync();
