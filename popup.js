window.addEventListener('click', function (e) {
  if (e.target.href !== undefined) {
    chrome.tabs.create({ url: e.target.href });
  }
});

var disableMicInput = document.getElementById('disable-mic');
var disableVideoInput = document.getElementById('disable-video');
var autoJoinInput = document.getElementById('auto-join');
var countdownDurationInput = document.getElementById('countdown-duration');
var countdownDurationContainer = countdownDurationInput.parentElement;
var ttsIntervalInput = document.getElementById('tts-interval');
var ttsIntervalContainer = ttsIntervalInput.parentElement;
var tabCloseTimeoutInput = document.getElementById('tab-close-timeout');
console.log('test loaded popup');

// Function to toggle countdown input visibility
function toggleCountdownVisibility() {
  if (autoJoinInput.checked) {
    countdownDurationContainer.style.display = 'flex';
    ttsIntervalContainer.style.display = 'flex';
  } else {
    countdownDurationContainer.style.display = 'none';
    ttsIntervalContainer.style.display = 'none';
  }
}

chrome.storage.local.get(
  [
    'disableMic',
    'disableVideo',
    'autoJoin',
    'countdownDuration',
    'ttsAnnouncementInterval',
    'tabCloseTimeout',
  ],
  (res) => {
    disableVideoInput.checked = res.disableVideo;
    disableMicInput.checked = res.disableMic;
    autoJoinInput.checked = res.autoJoin;
    countdownDurationInput.value = res.countdownDuration || 10;
    ttsIntervalInput.value = res.ttsAnnouncementInterval || 5;
    tabCloseTimeoutInput.value = res.tabCloseTimeout !== undefined ? res.tabCloseTimeout : 3;
    toggleCountdownVisibility();

    console.log({ res });
  },
);

disableMicInput.addEventListener('click', (e) => {
  console.log({ checked: e.target.checked });
  chrome.storage.local.set({
    disableMic: e.target.checked,
  });
});
disableVideoInput.addEventListener('click', (e) => {
  console.log({ checked: e.target.checked });
  chrome.storage.local.set({
    disableVideo: e.target.checked,
  });
});

autoJoinInput.addEventListener('click', (e) => {
  console.log({ autoJoin: e.target.checked });
  chrome.storage.local.set({
    autoJoin: e.target.checked,
  });

  // Toggle countdown input visibility
  toggleCountdownVisibility();
});

countdownDurationInput.addEventListener('change', (e) => {
  const duration = parseInt(e.target.value, 10);
  console.log({ countdownDuration: duration });
  chrome.storage.local.set({
    countdownDuration: duration,
  });
});

ttsIntervalInput.addEventListener('change', (e) => {
  let v = parseInt(e.target.value, 10);
  if (isNaN(v) || v < 1) v = 1;
  if (v > 30) v = 30;
  ttsIntervalInput.value = v;
  chrome.storage.local.set({ ttsAnnouncementInterval: v });
});

tabCloseTimeoutInput.addEventListener('change', (e) => {
  let v = parseInt(e.target.value, 10);
  if (isNaN(v) || v < 0) v = 0;
  if (v > 30) v = 30;
  tabCloseTimeoutInput.value = v;
  chrome.storage.local.set({ tabCloseTimeout: v });
});
