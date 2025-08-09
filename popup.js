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

document.addEventListener("DOMContentLoaded", function () {
	const extensionEnableCheckbox = document.getElementById("extensionEnableCheckbox");
	const stripCheckbox = document.getElementById("stripCheckbox");
	const anchorsCheckbox = document.getElementById("anchorsCheckbox");
	const switchToOriginalTabCheckbox = document.getElementById("switchToOriginalTabCheckbox");
	const ignoreWebsiteButton = document.getElementById("ignoreWebsiteButton");
	const clearWebsitesButton = document.getElementById("clearWebsitesButton");

	// Load the saved settings when the popup is opened
	chrome.storage.sync.get(["extensionEnabled"], function (result) {
		if (result.extensionEnabled !== undefined) {
			extensionEnableCheckbox.checked = result.extensionEnabled;
		}
	});
	chrome.storage.sync.get(["ignoreQueryStrings"], function (result) {
		if (result.ignoreQueryStrings !== undefined) {
			stripCheckbox.checked = result.ignoreQueryStrings;
		}
	});
	chrome.storage.sync.get(["ignoreAnchorTags"], function (result) {
		if (result.ignoreAnchorTags !== undefined) {
			anchorsCheckbox.checked = result.ignoreAnchorTags;
		}
	});
	chrome.storage.sync.get(["switchToOriginalTab"], function (result) {
		if (result.switchToOriginalTab !== undefined) {
			switchToOriginalTabCheckbox.checked = result.switchToOriginalTab;
		}
	});
	chrome.storage.sync.get(["ignoreWebsite"], function (result) {
		if (result.ignoreWebsite !== undefined) {
			ignoreWebsiteButton.enabled = result.ignoreWebsite;
		}
	});
	chrome.storage.sync.get(["ignoredWebsites"], function (result) {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			const currentUrl = tabs[0].url;
			const ignoredWebsites = result.ignoredWebsites || [];
			const index = ignoredWebsites.indexOf(currentUrl);

			if (index === -1) {
				ignoreWebsiteButton.innerText = "Ignore Website";
			} else {
				ignoreWebsiteButton.innerText = "Unignore Website";
			}
		});
	});

	// Add `change` event handlers
	extensionEnableCheckbox.addEventListener("change", function () {
		const newValue = this.checked;
		chrome.storage.sync.set({ "extensionEnabled": newValue }, function () {
			updateCache("extensionEnabled", newValue);
			console.log("[SETTING]: extensionEnabled ->", newValue);
			if (newValue === true)
				checkAllDuplicates();
		});
	});
	stripCheckbox.addEventListener("change", function () {
		const newValue = this.checked;
		chrome.storage.sync.set({ "ignoreQueryStrings": newValue }, function () {
			updateCache("ignoreQueryStrings", newValue);
			console.log("[SETTING]: ignoreQueryStrings ->", newValue);
			if (newValue === true)
				checkAllDuplicates();
		});
	});
	anchorsCheckbox.addEventListener("change", function () {
		const newValue = this.checked;
		chrome.storage.sync.set({ "ignoreAnchorTags": newValue }, function () {
			updateCache("ignoreAnchorTags", newValue);
			console.log("[SETTING]: ignoreAnchorTags ->", newValue);
			if (newValue === true)
				checkAllDuplicates();
		});
	});
	switchToOriginalTabCheckbox.addEventListener("change", function () {
		const newValue = this.checked;
		chrome.storage.sync.set({ "switchToOriginalTab": newValue }, function () {
			updateCache("switchToOriginalTab", newValue);
			console.log("[SETTING]: switchToOriginalTab ->", newValue);
		});
	});
	ignoreWebsiteButton.addEventListener("click", function () {
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
					console.log("ignoredWebsites ->\n", ignoredWebsites.join(",\n"));
				});
			});
		});
	});
	clearWebsitesButton.addEventListener("click", function () {
		chrome.storage.sync.set({ "ignoredWebsites": [] }, function () {
			updateCache("ignoreWebsite", []);
			console.log("ignoredWebsites ->\n", []);
		});
		ignoreWebsiteButton.innerText = "Ignore Website";
		clearWebsitesButton.innerText = "Cleared!";
		clearWebsitesButton.style.backgroundColor = "#ed3f54";
		setTimeout(function () {
			clearWebsitesButton.innerText = "Clear Excluded Websites";
			clearWebsitesButton.style.backgroundColor = "";
		}, 2000);
	});
});
