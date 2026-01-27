/// <reference types="vitest" />
/// <reference types="vite/client" />

import path from "node:path";
import sqlocal from "sqlocal/vite";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";
import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		// biome-ignore lint/suspicious/noExplicitAny: UnoCSS typing doesn't march plugin
		UnoCSS() as any,
		solidPlugin(),
		sqlocal(),
		Icons({ compiler: "solid" }),
	],
	server: {
		fs: {
			allow: ["../.."],
		},
	},
	resolve: {
		alias: {
			"@domain": path.resolve(__dirname, "src/domain"),
			"@application": path.resolve(__dirname, "src/application"),
			"@ui": path.resolve(__dirname, "src/ui"),
			"@infra": path.resolve(__dirname, "src/infrastructure"),
		},
	},
	test: {
		environment: "happy-dom",
		include: [
			"src/**/*.{test,spec}.ts",
			"src/**/*.{test,spec}.tsx",
			"tests/**/*.test.ts",
		],
	},
	build: {
		target: "esnext",
	},
});
