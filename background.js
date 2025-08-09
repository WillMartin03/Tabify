var tabArr = [];

var tabCheck = function () {
	console.log("Running tabCheck: checking all duplicates...");
	tabArr.forEach(function (tab) {
		checkForDuplicate(tab, true);
	});
};

function getSetting(setting) {
	return new Promise(resolve => {
		chrome.storage.sync.get(setting, result => {
			if (chrome.runtime.lastError) {
				console.error(`Error getting ${setting}:`, chrome.runtime.lastError);
				resolve(undefined);
			} else {
				resolve(result[setting]);
			}
		});
	});
}

// LISTENER FOR COMMUNICATION WITH `popup.js`
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action === "checkAllDuplicates") {
		tabArr.forEach(function (tab) {
			checkForDuplicate(tab, true);
		});
	}
});

function initializeExtension() {
	// Add existing tabs to tabArr
	chrome.tabs.query({}, function (existingTabs) {
		existingTabs.forEach(function (tab) {
			tabArr.push(tab);
			console.log("Add tab", tab.id, tab);
		});
	});

	setTimeout(function () {
		// Check for duplicate tabs in tabArr
		tabArr.forEach(function (tab) {
			checkForDuplicate(tab);
		});
	}, 10000); // Wait a couple seconds to allow the browser to start up and load pages before activating the plugin

	console.log("Extension Loaded.\ntabArr: ", tabArr);
	return;
}

async function checkForDuplicate(tab, preventSwitch = false) {
	console.log("Checking for duplicate tab:", tab.id, tab);

	// Skip NTP tabs
	if (tab.url.includes("://newtab")) {
		console.log(tab, "Cannot remove NTP tab.");
		return;
	}

	// Skip Bing search tabs
	if (tab.url.includes("search?") && tab.url.includes("bing.com")) {
		console.log(tab, "Ignoring bing search tab.");
		return;
	}

	// Load settings
	const [
		ignoredWebsites,
		ignoreQueryStrings,
		ignoreAnchorTags,
		switchToOriginalTab
	] = await Promise.all([
		getSetting("ignoredWebsites").then(v => Array.isArray(v) ? v : []),
		getSetting("ignoreQueryStrings").then(v => !!v),
		getSetting("ignoreAnchorTags").then(v => !!v),
		getSetting("switchToOriginalTab").then(v => !!v)
	]);

	// Check if tab is ignored
	if (Array.isArray(ignoredWebsites) && ignoredWebsites.includes(tab.url)) {
		console.log(tab.url, "is ignored, not checking for duplicates.");
		return;
	}

	// Check for duplicates
	let isDuplicate = tabArr.some(t => t.url === tab.url && t !== tab);
	console.log("isDuplicate:", isDuplicate);

	if (!isDuplicate && ignoreQueryStrings) {
		isDuplicate = tabArr.some(t => t.url.split("?")[0] === tab.url.split("?")[0] && t !== tab);
		console.log("Query-stripped isDuplicate:", isDuplicate);
	}

	if (!isDuplicate && ignoreAnchorTags) {
		isDuplicate = tabArr.some(t => t.url.split("#")[0] === tab.url.split("#")[0] && t !== tab);
		console.log("Anchor-stripped isDuplicate:", isDuplicate);
	}

	const pendingURL = tab.pendingUrl !== undefined
		? tabArr.some(t => t.url === tab.pendingUrl && t !== tab)
		: false;

	if (isDuplicate || pendingURL) {
		chrome.tabs.remove(tab.id, function () {
			console.log("Closed duplicate tab:", tab.id, tab);
			if (preventSwitch) return;

			const originalTab = tabArr.find(t => t.url === tab.url && t !== tab);
			if (switchToOriginalTab && originalTab) {
				chrome.tabs.update(originalTab.id, { active: true }, function (updatedTab) {
					console.log("Setting Active Tab:", updatedTab.id, updatedTab);
				});
			}
		});
	}
}

chrome.runtime.onInstalled.addListener((reason) => {
	// Create welcome page
	if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
		chrome.tabs.create({
			url: "welcome.html"
		});
	}
	initializeExtension();
});

chrome.runtime.onStartup.addListener(() => {
	initializeExtension();
});

// CREATE TAB LISTENER
chrome.tabs.onCreated.addListener(function (newTab) {
	tabArr.push(newTab);
	console.log("New tab", newTab.id);
});

// UPDATE TAB LISTENER
chrome.tabs.onUpdated.addListener(async function (tabID, changeInfo, updatedTab) {
	const isEnabled = await getSetting("extensionEnabled").then(v => !!v);

	// Ignore favIcon, title changes, and loading tabs
	if (changeInfo.favIconUrl
		|| changeInfo.title
		|| (changeInfo.status && changeInfo.status === "loading"))
		return;

	console.log("changeInfo:", changeInfo);

	const tab = tabArr.findIndex(tab => tab.id === tabID);
	if (changeInfo.status === "complete" && tab !== -1) {
		tabArr[tab] = updatedTab;
		if (isEnabled)
			checkForDuplicate(tabArr[tab]);
	}
});

// REMOVE TAB LISTENER
chrome.tabs.onRemoved.addListener(function (tabID) {
	try {
		// Find the index of the tab in the array
		const index = tabArr.findIndex(tab => tab.id === tabID);
		// Remove the tab from the array
		if (index !== -1) {
			tabArr.splice(index, 1);
			console.log("Removed tab", tabID);
		}
	}
	catch (error) {
		console.log("ERROR:", error);
	}
});