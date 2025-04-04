const queryParams = new URLSearchParams(window.location.search);
const qsLocalServer = queryParams.get("localserver");

if (qsLocalServer) {
	// console.log("Processing ?localserver= support...");
	window.localServerProcessing = true;

	var basePath = document.querySelector("base")?.getAttribute("href") ?? "/";

	const getCacheBusterQueryString = () => {
		var now = new Date();
		return "c=" +
			now.getFullYear() +
			("0" + now.getMonth()).slice(-2) +
			("0" + now.getDay()).slice(-2) +
			("0" + now.getHours()).slice(-2) +
			("0" + now.getMinutes()).slice(-2) +
			("0" + now.getSeconds()).slice(-2);
	};

	(async () => {
		const scripts = document.querySelectorAll("script[localserver-src]");
		let loadedScripts = 0;
		
		const getLocalServerProtocol = async protocol => {
			const localServerCheckUrl = `${protocol}://${qsLocalServer}/js/ping.js`;
			try {
				const response = await fetch(localServerCheckUrl, { method: "HEAD" });
				return response.ok ? protocol : undefined;
			} catch (error) {
				return undefined;
			}
		};
		const getLocalResourceUrl = async (protocol, src) => {
			if (protocol) {
				const localSrc = src.split("?")[0].substring(basePath.length - 1);
				const localServerScript = `${protocol}://${qsLocalServer}${localSrc}`;
				const response = await fetch(localServerScript, { method: "HEAD" });
				if (response.ok) {
					src = `${localServerScript}?${getCacheBusterQueryString()}`;
				}
			}
			return src;
		};

		const protocol = "https";
		const localServerProtocol =
			await getLocalServerProtocol(protocol.slice(0, -1)) ??
			await getLocalServerProtocol(protocol);
		
		if (localServerProtocol) {
			// Simply replace href on link elements and they can just 'reload/refresh' in place instead of being intercepted
			document.querySelectorAll("link[kat-localserver='true']").forEach(async link => {
				const origHref = link.getAttribute("href");
				const href = await getLocalResourceUrl(localServerProtocol, origHref);
				if (origHref !== href) {
					link.setAttribute("href", href);
				}
			});
		}
		
		scripts.forEach(async script => {
			const src = await getLocalResourceUrl(localServerProtocol, script.getAttribute("localserver-src"));

			// console.log("Loading script: " + src);
		
			script.onload = () => {
				//console.log("Loaded script: " + src);

				loadedScripts++;
				if (loadedScripts === scripts.length) {

					delete window.camelotLocalServer;
					if (localServerProtocol) {
						camelot.configuration.localServer = `${localServerProtocol}://${qsLocalServer}`;
					}

					camelot.utility.useLocalImages();

					// console.log("All scripts loaded. Dispatching camelot.on.ready event.");
					document.dispatchEvent(new CustomEvent('camelot.on.ready'));
				}
			};
		
			script.onerror = () => {
				console.error("Failed to load script: " + src);
			};
	
			script.removeAttribute("localserver-src");
			script.setAttribute("src", src);
		});
	})();
}