const { spawn } = require("child_process");
const path = require("path");
const readline = require("readline");

// PowerShell-based tray for Windows (AV-safe, zero binary deps)

let psProcess = null;
let clickHandler = null;

/**
 * Send JSON command to PowerShell tray process via stdin
 */
function sendCommand(cmd) {
  if (psProcess && psProcess.stdin.writable) {
    psProcess.stdin.write(`${JSON.stringify(cmd)}\n`, "utf8");
  }
}

/**
 * Initialize Windows tray using PowerShell NotifyIcon
 * @param {Object} options - { iconPath, tooltip, items, onClick }
 *   items: [{ title, enabled }]
 * @returns {Object|null} controller with sendAction/kill
 */
function initWinTray(options) {
  const { iconPath, tooltip, items, onClick } = options;
  clickHandler = onClick;

  const scriptPath = path.join(__dirname, "tray.ps1");

  try {
    psProcess = spawn(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy", "Bypass",
        "-WindowStyle", "Hidden",
        "-InputFormat", "Text",
        "-OutputFormat", "Text",
        "-File", scriptPath,
        "-IconPath", iconPath,
        "-Tooltip", tooltip
      ],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch (err) {
    process.stderr.write(`[polyrouter] failed to spawn tray process: ${err.message}\n`);
    return null;
  }

  const rl = readline.createInterface({ input: psProcess.stdout });
  rl.on("line", (line) => {
    try {
      const evt = JSON.parse(line);
      if (evt.type === "click" && clickHandler) {
        clickHandler(evt.index);
      } else if (evt.type === "error" && evt.message) {
        process.stderr.write(`[polyrouter] tray error: ${evt.message}\n`);
      }
    } catch (e) {}
  });

  psProcess.on("error", (err) => {
    process.stderr.write(`[polyrouter] tray process error: ${err.message}\n`);
  });
  psProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) {
      process.stderr.write(`[polyrouter] tray: ${msg}\n`);
    }
  });

  // Send initial menu items
  items.forEach((item, index) => {
    sendCommand({ action: "add-item", index, title: item.title, enabled: item.enabled });
  });

  return {
    updateItem(index, title, enabled) {
      sendCommand({ action: "update-item", index, title, enabled });
    },
    setTooltip(text) {
      sendCommand({ action: "set-tooltip", text });
    },
    kill() {
      return new Promise((resolve) => {
        try {
          sendCommand({ action: "kill" });
        } catch (e) {}

        const proc = psProcess;
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          psProcess = null;
          resolve();
        };

        const timer = setTimeout(() => {
          if (proc && !proc.killed) {
            try { proc.kill(); } catch (e) {}
          }
          done();
        }, 300);

        if (proc) {
          proc.once("exit", () => {
            clearTimeout(timer);
            done();
          });
        } else {
          clearTimeout(timer);
          done();
        }
      });
    }
  };
}

module.exports = { initWinTray };
