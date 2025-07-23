// content/content.js
(function () {
  "use strict";

  // Prevent multiple initializations
  if (window.leetSyncActive) {
    return;
  }
  window.leetSyncActive = true;

  console.log("🔄 LeetSync: Ready to capture submissions");

  class LeetSyncSubmitHandler {
    constructor() {
      this.setupSubmitListener();
    }

    setupSubmitListener() {
      // Listen for clicks on submit buttons
      document.addEventListener(
        "click",
        (event) => {
          const target = event.target;

          // Check if it's a submit button
          if (this.isSubmitButton(target)) {
            console.log("🚀 LeetSync: Submit button clicked!");

            // Show immediate notification that we're processing
            this.showNotification(`🔄 Processing submission...`, "#6b7280");

            // Wait a moment for the submission to process, then check for success
            setTimeout(() => {
              this.checkAndSyncSubmission();
            }, 3000); // Wait 3 seconds for submission to complete
          }
        },
        true
      ); // Use capture phase to catch all clicks
    }

    isSubmitButton(element) {
      if (!element) return false;

      // Safe className handling - it might be an object (SVGAnimatedString) or string
      let className = "";
      try {
        if (typeof element.className === "string") {
          className = element.className.toLowerCase();
        } else if (element.className && element.className.baseVal) {
          className = element.className.baseVal.toLowerCase();
        } else if (
          element.className &&
          typeof element.className.toString === "function"
        ) {
          className = element.className.toString().toLowerCase();
        }
      } catch (e) {
        // If className access fails, just continue with empty string
        className = "";
      }

      const id = element.id?.toLowerCase() || "";

      // Check for submit button indicators
      return (
        text.includes("submit") ||
        className.includes("submit") ||
        id.includes("submit") ||
        element.type === "submit" ||
        (element.tagName === "BUTTON" && text.trim() === "submit")
      );
    }

    async checkAndSyncSubmission() {
      try {
        // Check if submission was accepted
        if (this.isSubmissionAccepted()) {
          console.log("✅ LeetSync: Accepted submission detected!");

          const submissionData = await this.extractSubmissionData();
          if (submissionData) {
            await this.syncToGitHub(submissionData);
          }
        } else {
          console.log("⏭️ LeetSync: Submission not accepted, skipping sync");
          this.showNotification(
            `❌ Submission not accepted - no sync performed`,
            "#ef4444"
          );
        }
      } catch (error) {
        console.error("LeetSync: Error processing submission:", error);
        this.showNotification(
          `❌ Error processing submission: ${error.message}`,
          "#ef4444"
        );
      }
    }

    isSubmissionAccepted() {
      const bodyText = document.body.textContent;

      // Look for acceptance indicators
      const acceptanceIndicators = [
        () => bodyText.includes("Accepted") && bodyText.includes("Runtime:"),
        () => bodyText.includes("Accepted") && bodyText.includes("ms"),
        () =>
          document
            .querySelector('.text-green-s, [class*="text-green"]')
            ?.textContent?.includes("Accepted"),
        () => document.querySelector('[data-e2e-locator*="accepted"]'),
        () => bodyText.includes("Status: Accepted"),
      ];

      return acceptanceIndicators.some((check) => check());
    }

    async extractSubmissionData() {
      try {
        const data = {
          title: this.extractTitle(),
          url: window.location.href.split("?")[0],
          difficulty: this.extractDifficulty(),
          language: this.extractLanguage(),
          code: await this.extractCode(),
          tags: this.extractTags(),
          timestamp: new Date().toISOString(),
          problemId: this.extractProblemId(),
        };

        console.log("📝 LeetSync: Extracted submission data:", {
          title: data.title,
          language: data.language,
          codeLength: data.code.length,
        });

        return data;
      } catch (error) {
        console.error("LeetSync: Error extracting submission data:", error);
        return null;
      }
    }

    extractTitle() {
      const selectors = [
        "h1",
        '[data-cy="question-title"]',
        ".text-title-large",
        ".question-title",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }

      // Extract from URL
      const urlMatch = window.location.href.match(/\/problems\/([^\/]+)/);
      if (urlMatch) {
        return urlMatch[1]
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      }

      return "Unknown Problem";
    }

    extractDifficulty() {
      const text = document.body.textContent.toLowerCase();
      if (text.includes("easy")) return "Easy";
      if (text.includes("medium")) return "Medium";
      if (text.includes("hard")) return "Hard";
      return "Unknown";
    }

    extractLanguage() {
      // Look for language selector
      const langElement = document.querySelector(
        '[data-cy="lang-select"] .ant-select-selection-item, .ant-select-selection-item'
      );
      if (langElement) {
        const langText = langElement.textContent.toLowerCase();
        return this.mapLanguageToExtension(langText);
      }

      // Fallback: detect from code content
      const text = document.body.textContent.toLowerCase();
      const languages = {
        python: ["def ", "class solution:", "self.", "python"],
        java: ["public class", "public static", "java"],
        javascript: ["function", "var ", "let ", "const ", "javascript"],
        cpp: ["#include", "vector<", "std::", "c++"],
        c: ["#include <stdio.h>", "int main", "printf"],
        go: ["package main", "func ", "fmt."],
        rust: ["fn main", "println!", "impl"],
        swift: ["func ", "var ", "print("],
        kotlin: ["fun ", "println("],
        ruby: ["def ", "puts "],
        php: ["<?php", "echo "],
      };

      for (const [lang, indicators] of Object.entries(languages)) {
        if (indicators.some((indicator) => text.includes(indicator))) {
          return this.mapLanguageToExtension(lang);
        }
      }

      return "py"; // Default to Python
    }

    mapLanguageToExtension(language) {
      const extensions = {
        python: "py",
        python3: "py",
        java: "java",
        javascript: "js",
        typescript: "ts",
        "c++": "cpp",
        cpp: "cpp",
        c: "c",
        go: "go",
        golang: "go",
        rust: "rs",
        swift: "swift",
        kotlin: "kt",
        scala: "scala",
        ruby: "rb",
        php: "php",
      };
      return extensions[language.toLowerCase()] || "txt";
    }

    async extractCode() {
      // Try multiple methods to get the submitted code
      let code = "";

      // Method 1: Monaco editor
      if (window.monaco && window.monaco.editor) {
        try {
          const models = window.monaco.editor.getModels();
          if (models.length > 0) {
            code = models[0].getValue();
            if (code && code.trim().length > 10) {
              return code;
            }
          }
        } catch (e) {
          // Continue to next method
        }
      }

      // Method 2: Look for code elements
      const codeSelectors = [
        ".monaco-editor .view-lines",
        "pre code",
        ".view-lines",
        ".highlight pre",
        '[class*="code"]',
      ];

      for (const selector of codeSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          code = this.extractTextFromElement(element);
          if (code && code.trim().length > 10) {
            return code;
          }
        }
      }

      // Method 3: Try to find code in the page content
      const pageText = document.body.textContent;
      const codePatterns = [
        /class Solution[\s\S]*?(?=\n\s*$|\n[A-Z]|\n\n)/m,
        /def \w+[\s\S]*?(?=\n\s*$|\ndef |\n[A-Z]|\n\n)/m,
        /function \w+[\s\S]*?(?=\n\s*$|\nfunction |\n[A-Z]|\n\n)/m,
        /public [\s\S]*?}(?=\n\s*$|\npublic |\n[A-Z]|\n\n)/m,
      ];

      for (const pattern of codePatterns) {
        const match = pageText.match(pattern);
        if (match && match[0].trim().length > 20) {
          return match[0].trim();
        }
      }

      return "// Code could not be extracted automatically\n// Please add your solution manually";
    }

    extractTextFromElement(element) {
      // Handle Monaco editor lines
      const lines = element.querySelectorAll(".view-line");
      if (lines.length > 0) {
        return Array.from(lines)
          .map((line) => line.textContent)
          .join("\n");
      }

      return element.textContent || element.innerText || "";
    }

    extractTags() {
      const tags = [];
      const tagElements = document.querySelectorAll(
        '[data-cy="topic-tag"], .topic-tag, [class*="tag"]'
      );

      for (const element of tagElements) {
        const tag = element.textContent.trim();
        if (tag && tag.length > 1 && tag.length < 30) {
          tags.push(tag);
        }
      }

      return tags.slice(0, 5);
    }

    extractProblemId() {
      const urlMatch = window.location.href.match(/\/problems\/([^\/]+)/);
      return urlMatch ? urlMatch[1] : "unknown";
    }

    async syncToGitHub(submissionData) {
      console.log("🚀 LeetSync: Syncing to GitHub...");

      // Store locally first
      this.storeLocally(submissionData);

      // Try to sync with extension
      try {
        if (
          typeof chrome !== "undefined" &&
          chrome.runtime &&
          chrome.runtime.sendMessage
        ) {
          await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              {
                action: "syncToGitHub",
                data: submissionData,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }

                if (response && response.success) {
                  resolve(response);
                } else {
                  reject(new Error(response?.error || "Sync failed"));
                }
              }
            );
          });

          // Replace the processing notification with success
          this.showNotification(
            `✅ ${submissionData.title} synced to GitHub!`,
            "#10b981"
          );
          console.log("✅ LeetSync: Successfully synced to GitHub");
        } else {
          throw new Error("Extension not available");
        }
      } catch (error) {
        console.error("LeetSync: Sync error:", error);
        // Replace the processing notification with error
        this.showNotification(`⚠️ Sync failed: ${error.message}`, "#ef4444");
      }
    }

    showNotification(message, bgColor = "#10b981") {
      // Remove existing notifications
      document
        .querySelectorAll(".leetsync-notification")
        .forEach((el) => el.remove());

      const notification = document.createElement("div");
      notification.className = "leetsync-notification";
      notification.textContent = message;

      notification.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: ${bgColor} !important;
        color: white !important;
        padding: 12px 16px !important;
        border-radius: 8px !important;
        z-index: 999999 !important;
        font-family: system-ui !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        max-width: 350px !important;
        word-wrap: break-word !important;
        transform: translateX(100%) !important;
        transition: transform 0.3s ease !important;
      `;

      document.body.appendChild(notification);

      // Animate in
      setTimeout(() => {
        notification.style.transform = "translateX(0)";
      }, 100);

      // Auto remove
      setTimeout(() => {
        notification.style.transform = "translateX(100%)";
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }, 5000);
    }
  }

  // Initialize only on LeetCode problem pages
  if (
    window.location.hostname === "leetcode.com" &&
    window.location.pathname.includes("/problems/")
  ) {
    const init = () => {
      new LeetSyncSubmitHandler();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      setTimeout(init, 500);
    }
  }
})();
