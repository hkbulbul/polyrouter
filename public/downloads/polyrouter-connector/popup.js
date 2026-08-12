document.getElementById("open-polyrouter").addEventListener("click", async () => {
  await chrome.tabs.create({ url: "http://localhost:20127/dashboard/providers" });
  window.close();
});

document.getElementById("open-chatgpt").addEventListener("click", async () => {
  await chrome.tabs.create({ url: "https://chatgpt.com/" });
  window.close();
});
