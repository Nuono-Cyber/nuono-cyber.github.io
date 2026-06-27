import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CHUNK_RELOAD_KEY = "app_chunk_reload_once";

function shouldRecoverFromChunkError(reason: unknown) {
	const message = reason instanceof Error ? reason.message : String(reason || "");
	return (
		message.includes("Failed to fetch dynamically imported module") ||
		message.includes("Importing a module script failed") ||
		message.includes("ChunkLoadError")
	);
}

function reloadOnceForChunkError() {
	if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
		sessionStorage.removeItem(CHUNK_RELOAD_KEY);
		return;
	}

	sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
	window.location.reload();
}

window.addEventListener("error", (event) => {
	if (shouldRecoverFromChunkError(event.error)) {
		reloadOnceForChunkError();
	}
});

window.addEventListener("unhandledrejection", (event) => {
	if (shouldRecoverFromChunkError(event.reason)) {
		reloadOnceForChunkError();
	}
});

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').catch((error) => {
			console.warn('Service worker registration failed:', error);
		});
	});
}
