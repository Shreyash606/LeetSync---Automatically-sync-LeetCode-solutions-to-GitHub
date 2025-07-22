// LeetSync Popup Script - Handles settings and configuration

document.addEventListener("DOMContentLoaded", async () => {
  const githubUsername = document.getElementById("githubUsername");
  const githubRepo = document.getElementById("githubRepo");
  const githubToken = document.getElementById("githubToken");
  const enableToggle = document.getElementById("enableToggle");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");
  const setupSection = document.getElementById("setup-section");

  // Load existing configuration
  const result = await chrome.storage.sync.get([
    "leetsyncConfig",
    "leetsyncEnabled",
  ]);
  const config = result.leetsyncConfig || {};
  const isEnabled = result.leetsyncEnabled || false;

  // Populate form with existing values
  githubUsername.value = config.githubUsername || "";
  githubRepo.value = config.githubRepo || "";
  githubToken.value = config.githubToken || "";

  // Set toggle state
  if (isEnabled) {
    enableToggle.classList.add("active");
  }

  // Hide setup guide if already configured
  if (config.githubUsername && config.githubRepo && config.githubToken) {
    setupSection.style.display = "none";
  }

  // Toggle functionality
  enableToggle.addEventListener("click", () => {
    enableToggle.classList.toggle("active");
  });

  // Save configuration
  saveBtn.addEventListener("click", async () => {
    const username = githubUsername.value.trim();
    const repo = githubRepo.value.trim();
    const token = githubToken.value.trim();
    const enabled = enableToggle.classList.contains("active");

    // Validation
    if (enabled && (!username || !repo || !token)) {
      showStatus("Please fill in all fields before enabling LeetSync", "error");
      return;
    }

    if (
      token &&
      !token.startsWith("ghp_") &&
      !token.startsWith("github_pat_")
    ) {
      showStatus(
        "Invalid GitHub token format. Please check your token.",
        "error"
      );
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      // Test GitHub API connection if credentials are provided
      if (username && repo && token) {
        const testResponse = await fetch(
          `https://api.github.com/repos/${username}/${repo}`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (!testResponse.ok) {
          if (testResponse.status === 404) {
            throw new Error(
              `Repository "${username}/${repo}" not found. Please check the repository name or create it first.`
            );
          } else if (testResponse.status === 401) {
            throw new Error(
              "Invalid GitHub token. Please check your token permissions."
            );
          } else {
            throw new Error(`GitHub API error: ${testResponse.status}`);
          }
        }
      }

      // Save configuration
      const newConfig = {
        githubUsername: username,
        githubRepo: repo,
        githubToken: token,
      };

      await chrome.storage.sync.set({
        leetsyncConfig: newConfig,
        leetsyncEnabled: enabled,
      });

      // Hide setup guide after successful configuration
      if (username && repo && token) {
        setupSection.style.display = "none";
      }

      showStatus(
        enabled
          ? "✅ LeetSync enabled! Start solving problems on LeetCode."
          : "💾 Configuration saved. Enable LeetSync when ready.",
        "success"
      );

      // Notify content script of configuration change
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab && tab.url && tab.url.includes("leetcode.com")) {
          chrome.tabs
            .sendMessage(tab.id, {
              action: "configUpdated",
              config: newConfig,
              enabled: enabled,
            })
            .catch(() => {
              // Content script might not be ready, that's okay
            });
        }
      } catch (error) {
        // Tab messaging is optional
      }
    } catch (error) {
      showStatus(`❌ Error: ${error.message}`, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Configuration";
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";

    // Hide status after 5 seconds for success messages
    if (type === "success") {
      setTimeout(() => {
        status.style.display = "none";
      }, 5000);
    }
  }

  // Handle configuration updates from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "showStatus") {
      showStatus(message.message, message.type);
    }
  });
});
