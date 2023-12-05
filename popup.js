document.addEventListener('DOMContentLoaded', function () {
	// Load the saved settings when the popup is opened
	chrome.storage.sync.get(['strip_question_mark'], function (result) {
		if (result.strip_question_mark !== undefined) {
			document.getElementById('stripCheckbox').checked = result.strip_question_mark;
		}
	});
	document.getElementById('stripCheckbox').addEventListener('change', function () {
		const newSettingValue = this.checked;
		chrome.storage.sync.set({ 'strip_question_mark': newSettingValue }, function () {
			console.log('[SETTING]: strip_question_mark ->', newSettingValue);
		});
	});

	chrome.storage.sync.get(['extensionEnabled'], function (result) {
		if (result.extensionEnabled !== undefined) {
			document.getElementById('extensionEnableCheckbox').checked = result.extensionEnabled;
		}
	});
	document.getElementById('extensionEnableCheckbox').addEventListener('change', function () {
		const newSettingValue = this.checked;
		chrome.storage.sync.set({ 'extensionEnabled': newSettingValue }, function () {
			console.log('[SETTING]: extensionEnabled ->', newSettingValue);
		});
	});
});
