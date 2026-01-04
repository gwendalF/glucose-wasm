/// <reference types="vitest" />
/// <reference types="vite/client" />

import { playwright } from "@vitest/browser-playwright";
import devtools from "solid-devtools/vite";
import sqlocal from "sqlocal/vite";
import UnoCSS from "unocss/vite";
import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
	// biome-ignore lint/suspicious/noExplicitAny: UnoCSS typing doesn't march plugin
	plugins: [devtools(), UnoCSS() as any, solidPlugin(), sqlocal()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					include: ["src/**/*.{test,spec}.ts"],
				},
			},
			{
				extends: true,
				test: {
					name: "ui",
					environment: "happy-dom",
					include: ["src/**/*.{test,spec}.tsx"],
				},
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["tests/**/*.{test,spec}.ts"],
					browser: {
						enabled: true,
						instances: [{ browser: "firefox" }],
						provider: playwright(),
					},
				},
			},
		],
	},
	build: {
		target: "esnext",
	},
});
