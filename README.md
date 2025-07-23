# 🔄 LeetSync

**Automatically sync your accepted LeetCode solutions to GitHub with zero manual effort!**

![LeetSync Demo](https://img.shields.io/badge/LeetCode-Automated-brightgreen) ![GitHub](https://img.shields.io/badge/GitHub-Integration-blue) ![Chrome](https://img.shields.io/badge/Chrome-Extension-orange)

## ✨ Features

- 🎯 **One-Click Sync**: Just click submit - LeetSync handles the rest
- ✅ **Smart Detection**: Only syncs accepted solutions
- 📁 **Organized Structure**: Auto-creates clean folder structure by topic/difficulty
- 🔒 **Private & Secure**: Your GitHub token stays local
- 💾 **Local Backup**: Solutions saved locally even if sync fails
- 🚀 **Zero Config**: Works out of the box once set up

## 🚀 Quick Start

### 1. Install Extension

1. Download/clone this repository
2. Open Chrome → Extensions → Enable Developer Mode
3. Click "Load unpacked" → Select the `leetsync` folder

### 2. Configure GitHub

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` permissions
2. Create a repository for your solutions (e.g., `leetcode-solutions`)
3. Click the LeetSync extension icon and enter your credentials

### 3. Start Solving!

- Navigate to any LeetCode problem
- Write your solution and click **Submit**
- LeetSync automatically detects accepted submissions and syncs to GitHub! 🎉

## 📂 Generated Structure

```
your-repo/
├── arrays/
│   ├── two_sum.py
│   └── maximum_subarray.js
├── dynamic_programming/
│   └── climbing_stairs.cpp
└── trees/
    └── binary_tree_traversal.java
```

## 🔧 How It Works

1. **Click Submit** → LeetSync detects the button click
2. **Wait for Result** → Waits 3 seconds for LeetCode to process
3. **Check Success** → Only proceeds if submission is "Accepted"
4. **Extract Data** → Captures problem title, code, language, and metadata
5. **Sync to GitHub** → Creates organized file and commits automatically

## 🛡️ Privacy & Security

- ✅ All data processing happens locally in your browser
- ✅ GitHub token encrypted and stored locally only
- ✅ No external servers or third-party services
- ✅ You maintain full control of your code and credentials

## 📋 Requirements

- Google Chrome browser
- GitHub account
- GitHub Personal Access Token with `repo` permissions

## 🎯 Supported Languages

Python • Java • JavaScript • TypeScript • C++ • C • Go • Rust • Swift • Kotlin • Scala • Ruby • PHP

## 🔍 Troubleshooting

**Extension not syncing?**

- Check GitHub token permissions
- Verify repository exists and is accessible
- Look for error notifications in top-right corner

**Code not extracted properly?**

- Solution is saved locally as backup in browser storage
- Check browser console for extraction logs
- Manually add missing code to GitHub if needed

## 📈 Stats Tracking

Track your progress with built-in statistics:

- Total problems synced
- Last sync timestamp
- Local backup count

## 🤝 Contributing

Found a bug or want to add a feature? Pull requests welcome!

1. Fork the repository
2. Create your feature branch
3. Submit a pull request

## 📜 License

MIT License - Feel free to use and modify as needed!

---

**Made with ❤️ for the coding community**

_Happy coding and may your solutions always be accepted!_ 🚀
