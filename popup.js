document.addEventListener('DOMContentLoaded', function () {
	// Load the saved setting when the popup is opened
	chrome.storage.sync.get(['strip_question_mark'], function (result) {
		// Update the checkbox based on the retrieved setting
		if (result.strip_question_mark !== undefined) {
			document.getElementById('stripCheckbox').checked = result.strip_question_mark;
		}
	});

	document.getElementById('stripCheckbox').addEventListener('change', function () {
		const newSettingValue = this.checked;
		chrome.storage.sync.set({ 'strip_question_mark': newSettingValue }, function () {
			console.log('[SETTING]: strip_question_mark changed to:', newSettingValue);
		});
	});
});
