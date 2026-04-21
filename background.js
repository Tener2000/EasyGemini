// 拡張アイコンクリックでサイドパネルを開く
chrome.action.onClicked.addListener(async (tab) => {
  try { await chrome.sidePanel.open({ tabId: tab.id }); } catch {}
});