// background/background.js
class GitHubSync {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "syncToGitHub") {
        this.handleGitHubSync(message.data)
          .then((result) => sendResponse(result))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
        return true; // Will respond asynchronously
      }
    });
  }

  async handleGitHubSync(problemData) {
    try {
      // Get user settings
      const settings = await this.getSettings();

      if (!settings.githubToken || !settings.repoName) {
        throw new Error("GitHub token or repository not configured");
      }

      // Generate file structure
      const fileInfo = this.generateFileStructure(problemData);

      // Create/update file on GitHub
      await this.createOrUpdateFile(settings, fileInfo, problemData);

      return { success: true };
    } catch (error) {
      console.error("GitHub sync error:", error);
      return { success: false, error: error.message };
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["githubToken", "repoName", "repoOwner", "folderStructure"],
        resolve
      );
    });
  }

  generateFileStructure(problemData) {
    const { title, difficulty, tags, language, problemNumber } = problemData;

    // Clean title for filename
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    // Determine folder based on tags or difficulty
    let folder = "algorithms";
    if (tags.length > 0) {
      folder = tags[0].toLowerCase().replace(/\s+/g, "_");
    } else if (difficulty) {
      folder = difficulty.toLowerCase();
    }

    const filename = `${cleanTitle}.${language}`;
    const path = `${folder}/${filename}`;

    return { folder, filename, path };
  }

  async createOrUpdateFile(settings, fileInfo, problemData) {
    const { githubToken, repoOwner, repoName } = settings;
    const { path } = fileInfo;

    // Generate file content
    const content = this.generateFileContent(problemData);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // Check if file exists
    const fileExists = await this.checkFileExists(
      githubToken,
      repoOwner,
      repoName,
      path
    );

    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;

    const payload = {
      message: `Add solution: ${problemData.title}`,
      content: encodedContent,
      branch: "main",
    };

    if (fileExists) {
      payload.sha = fileExists.sha;
      payload.message = `Update solution: ${problemData.title}`;
    }

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
        "User-Agent": "LeetSync-Extension",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message}`);
    }

    return await response.json();
  }

  async checkFileExists(token, owner, repo, path) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${token}`,
            "User-Agent": "LeetSync-Extension",
          },
        }
      );

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  generateFileContent(problemData) {
    const { title, url, difficulty, code, language, tags, timestamp } =
      problemData;

    const header = `"""
Problem: ${title}
URL: ${url}
Difficulty: ${difficulty}
Tags: ${tags.join(", ") || "None"}
Date: ${new Date(timestamp).toLocaleDateString()}

LeetSync - Automated submission
"""

`;

    return header + code;
  }
}

// Initialize GitHub sync handler
new GitHubSync();
