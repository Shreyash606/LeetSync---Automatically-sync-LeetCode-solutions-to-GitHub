// LeetSync Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log("LeetSync extension installed");

  // Set default configuration
  chrome.storage.sync.set({
    leetsyncEnabled: false,
    leetsyncConfig: {},
  });
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  if (message.action === "syncSolution") {
    handleSolutionSync(message.data);
  }

  return true; // Keep message channel open for async response
});

async function handleSolutionSync(solutionData) {
  try {
    const result = await chrome.storage.sync.get(["leetsyncConfig"]);
    const config = result.leetsyncConfig;

    if (
      !config ||
      !config.githubToken ||
      !config.githubRepo ||
      !config.githubUsername
    ) {
      console.error("LeetSync: Missing configuration");
      return;
    }

    console.log(
      "Background: Processing solution sync for:",
      solutionData.title
    );

    // The actual GitHub API calls are handled in the content script
    // This background script can be used for additional logging, analytics, etc.
  } catch (error) {
    console.error("LeetSync Background Error:", error);
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // The popup will handle this, but we can add additional logic here if needed
  console.log("Extension icon clicked");
});
