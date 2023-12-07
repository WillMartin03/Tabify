function updateCache(setting, newValue)
{
	// Send a message to update the cache in background.js
	chrome.runtime.sendMessage({
		action: 'updateCache',
		setting: setting,
		value: newValue
	});
}

function checkAllDuplicates()
{
	// Send a message to update the cache in background.js
	chrome.runtime.sendMessage({
		action: 'checkAllDuplicates'
	});
}

document.addEventListener('DOMContentLoaded', function () {
	// Load the saved settings when the popup is opened
	chrome.storage.sync.get(['strip_question_mark'], function (result) {
		if (result.strip_question_mark !== undefined) {
			document.getElementById('stripCheckbox').checked = result.strip_question_mark;
		}
	});
	chrome.storage.sync.get(['extensionEnabled'], function (result) {
		if (result.extensionEnabled !== undefined) {
			document.getElementById('extensionEnableCheckbox').checked = result.extensionEnabled;
		}
	});

	// Add `change` event handlers
	document.getElementById('stripCheckbox').addEventListener('change', function () {
		const newSettingValue = this.checked;
		chrome.storage.sync.set({ 'strip_question_mark': newSettingValue }, function () {
			updateCache('strip_question_mark', newSettingValue);
			console.log('[SETTING]: strip_question_mark ->', newSettingValue);
		});
	});
	document.getElementById('extensionEnableCheckbox').addEventListener('change', function () {
		const newSettingValue = this.checked;
		chrome.storage.sync.set({ 'extensionEnabled': newSettingValue }, function () {
			updateCache('extensionEnabled', newSettingValue);
			console.log('[SETTING]: extensionEnabled ->', newSettingValue);
			if (newSettingValue === true)
				checkAllDuplicates();
		});
	});
});
