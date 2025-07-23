// popup/popup.js
class LeetSyncPopup {
  constructor() {
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadSettings();
    await this.loadStats();
  }

  setupEventListeners() {
    document.getElementById("settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveSettings();
    });
  }

  async loadSettings() {
    const settings = await this.getStoredSettings();

    if (settings.githubToken) {
      document.getElementById("githubToken").value = settings.githubToken;
    }
    if (settings.repoOwner) {
      document.getElementById("repoOwner").value = settings.repoOwner;
    }
    if (settings.repoName) {
      document.getElementById("repoName").value = settings.repoName;
    }
  }

  async loadStats() {
    const stats = await this.getStoredStats();

    document.getElementById("syncCount").textContent = stats.syncCount || 0;

    if (stats.lastSync) {
      const lastSyncDate = new Date(stats.lastSync);
      document.getElementById("lastSync").textContent =
        lastSyncDate.toLocaleDateString();
    }
  }

  async saveSettings() {
    const saveButton = document.getElementById("saveButton");
    const status = document.getElementById("status");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const settings = {
      githubToken: document.getElementById("githubToken").value.trim(),
      repoOwner: document.getElementById("repoOwner").value.trim(),
      repoName: document.getElementById("repoName").value.trim(),
    };

    // Validate settings
    if (!settings.githubToken || !settings.repoOwner || !settings.repoName) {
      this.showStatus("Please fill in all required fields", "error");
      saveButton.disabled = false;
      saveButton.textContent = "Save Configuration";
      return;
    }

    try {
      // Test GitHub API connection
      await this.testGitHubConnection(settings);

      // Save to storage
      await chrome.storage.sync.set(settings);

      this.showStatus("✅ Configuration saved successfully!", "success");
    } catch (error) {
      this.showStatus(`❌ Error: ${error.message}`, "error");
    }

    saveButton.disabled = false;
    saveButton.textContent = "Save Configuration";
  }

  async testGitHubConnection(settings) {
    const response = await fetch(
      `https://api.github.com/repos/${settings.repoOwner}/${settings.repoName}`,
      {
        headers: {
          Authorization: `token ${settings.githubToken}`,
          "User-Agent": "LeetSync-Extension",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid GitHub token");
      } else if (response.status === 404) {
        throw new Error("Repository not found or no access");
      } else {
        throw new Error(`GitHub API error: ${response.status}`);
      }
    }
  }

  showStatus(message, type) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";

    setTimeout(() => {
      status.style.display = "none";
    }, 5000);
  }

  getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ["githubToken", "repoOwner", "repoName"],
        resolve
      );
    });
  }

  getStoredStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["syncCount", "lastSync"], resolve);
    });
  }
}

// Initialize popup
new LeetSyncPopup();
