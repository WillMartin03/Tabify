let runningCheck = false;
var tabArr = [];
var ignoredWebsites = [];

var tabCheck = function () {
	console.log("Running tabCheck: checking all duplicates...");
	checkAllDuplicates();
};

var tabsIgnored = function () {
	console.log("Ignored Websites:", ignoredWebsites);
}

async function checkAllDuplicates() {
	if (runningCheck) return;
	runningCheck = true;
	console.log("Running sequential duplicate check...");

	//const currentTabs = await chrome.tabs.query({});
	//tabArr = currentTabs;

	//for (const tab of currentTabs) {
	for (const tab of tabArr) {
		await checkForDuplicate(tab, true);
	}
	runningCheck = false;
}

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
	const act = request.action;
	if (act === "checkAllDuplicates") {
		checkAllDuplicates();
	}
	if (act === "updateCache" && request.setting === "extensionEnabled") {
		const iconPath = request.value
			? "assets/images/blue_happy_128.png"
			: "assets/images/disabled_sad_128.png";

		chrome.action.setIcon({ path: iconPath }, () => {
			console.log(`[ICON]: Updated to ${iconPath}`);
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
		checkAllDuplicates();
	}, 10000); // Wait a couple seconds to allow the browser to start up and load pages before activating the plugin

	console.log("Extension Loaded.\ntabArr: ", tabArr);
	return;
}

async function checkForDuplicate(tab, preventSwitch = false) {
	if (runningCheck) return;
	runningCheck = true;
	console.log("Checking for duplicate tab:", tab.id, tab);

	// Skip NTP tabs
	if (tab.url.includes("://newtab")) {
		console.log(tab, "Cannot remove NTP tab.");
		runningCheck = false;
		return;
	}

	// Skip Bing search tabs
	if (tab.url.includes("search?") && tab.url.includes("bing.com")) {
		console.log(tab, "Ignoring bing search tab.");
		runningCheck = false;
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
		runningCheck = false;
		return;
	}

	// Check for exact URL duplicates
	let isDuplicate = tabArr.some(t => t.url === tab.url && t.id !== tab.id);
	console.log("Exact match isDuplicate:", isDuplicate);

	// Check for query-stripped duplicates
	if (!isDuplicate && ignoreQueryStrings) {
		const baseUrl = tab.url.split("?")[0];
		isDuplicate = tabArr.some(t => t.url.split("?")[0] === baseUrl && t.id !== tab.id);
		console.log("Query-stripped isDuplicate:", baseUrl, isDuplicate);
	}

	// Check for anchor-stripped duplicates
	if (!isDuplicate && ignoreAnchorTags) {
		const baseUrl = tab.url.split("#")[0];
		isDuplicate = tabArr.some(t => t.url.split("#")[0] === baseUrl && t.id !== tab.id);
		console.log("Anchor-stripped isDuplicate:", baseUrl, isDuplicate);
	}

	// Check for pending URL duplicates
	const pendingURL = tab.pendingUrl !== undefined
		? tabArr.some(t => t.url === tab.pendingUrl && t.id !== tab.id)
		: false;

	if (isDuplicate || pendingURL) {
		chrome.tabs.remove(tab.id, function () {
			const originalTab = tabArr.find(t => t.url === tab.url && t.id !== tab.id);

			if (!originalTab || preventSwitch) return;

			if (switchToOriginalTab) {
				chrome.tabs.update(originalTab.id, { active: true }, function (updatedTab) {
					console.log("Setting Active Tab:", updatedTab.id, updatedTab);
				});
			}

			console.log("Closed duplicate tab:", tab.id, tab, "Dup of:", originalTab?.id, originalTab);
		});
	}

	runningCheck = false;
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