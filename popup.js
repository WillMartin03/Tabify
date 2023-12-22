function updateCache(setting, newValue) {
	// Send a message to update the cache in background.js
	chrome.runtime.sendMessage({
		action: "updateCache",
		setting: setting,
		value: newValue
	});
}

function checkAllDuplicates() {
	// Send a message to update the cache in background.js
	chrome.runtime.sendMessage({
		action: "checkAllDuplicates"
	});
}

function tabifyConsoleLog(message, ...args) {
	const con = document.getElementById("console");
	con.innerText += message + " " + args.join(" ") + "\n";
	con.scrollTop = con.scrollHeight;
}

document.addEventListener("DOMContentLoaded", function () {
	// Load the saved settings when the popup is opened
	chrome.storage.sync.get(["ignoreQueryStrings"], function (result) {
		if (result.ignoreQueryStrings !== undefined) {
			document.getElementById("stripCheckbox").checked = result.ignoreQueryStrings;
		}
	});
	chrome.storage.sync.get(["extensionEnabled"], function (result) {
		if (result.extensionEnabled !== undefined) {
			document.getElementById("extensionEnableCheckbox").checked = result.extensionEnabled;
		}
	});
	chrome.storage.sync.get(["ignoreWebsite"], function (result) {
		if (result.ignoreWebsite !== undefined) {
			document.getElementById("ignoreWebsiteButton").enabled = result.ignoreWebsite;
		}
	});
	chrome.storage.sync.get(["ignoredWebsites"], function (result) {
		const button = document.getElementById("ignoreWebsiteButton");

		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			const currentUrl = tabs[0].url;
			const ignoredWebsites = result.ignoredWebsites || [];
			const index = ignoredWebsites.indexOf(currentUrl);

			if (index === -1) {
				button.innerText = "Ignore Website";
			} else {
				button.innerText = "Unignore Website";
			}
		});
	});

	// Add `change` event handlers
	document.getElementById("stripCheckbox").addEventListener("change", function () {
		const newSettingValue = this.checked;
		chrome.storage.sync.set({ "ignoreQueryStrings": newSettingValue }, function () {
			updateCache("ignoreQueryStrings", newSettingValue);
			tabifyConsoleLog("[SETTING]: ignoreQueryStrings ->", newSettingValue);
		});
	});
	document.getElementById("extensionEnableCheckbox").addEventListener("change", function () {
		const newSettingValue = this.checked;
		chrome.storage.sync.set({ "extensionEnabled": newSettingValue }, function () {
			updateCache("extensionEnabled", newSettingValue);
			tabifyConsoleLog("[SETTING]: extensionEnabled ->", newSettingValue);
			if (newSettingValue === true)
				checkAllDuplicates();
		});
	});
	document.getElementById("ignoreWebsiteButton").addEventListener("click", function () {
		const button = this;
		chrome.storage.sync.get(["ignoredWebsites"], function (result) {
			let ignoredWebsites = result.ignoredWebsites || [];
			chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
				const currentUrl = tabs[0].url;
				const index = ignoredWebsites.indexOf(currentUrl);
				if (index === -1) {
					ignoredWebsites.push(currentUrl);
					button.innerText = "Unignore Website";
				} else {
					ignoredWebsites.splice(index, 1);
					button.innerText = "Ignore Website";
				}
				chrome.storage.sync.set({ "ignoredWebsites": ignoredWebsites }, function () {
					updateCache("ignoreWebsite", ignoredWebsites);
					tabifyConsoleLog("ignoredWebsites ->\n", ignoredWebsites.join(",\n"));
				});
			});
		});
	});
});
