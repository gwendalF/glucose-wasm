/// <reference types="vitest" />
/// <reference types="vite/client" />

import path from "node:path";
import { playwright } from "@vitest/browser-playwright";
import devtools from "solid-devtools/vite";
import sqlocal from "sqlocal/vite";
import UnoCSS from "unocss/vite";
import Icons from "unplugin-icons/vite";
import { VitePWA } from "vite-plugin-pwa";
import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		devtools(),
		// biome-ignore lint/suspicious/noExplicitAny: UnoCSS typing doesn't march plugin
		UnoCSS() as any,
		solidPlugin(),
		sqlocal(),
		Icons({ compiler: "solid" }),
		VitePWA({
			manifest: {
				name: "Glucose Tracker",
				short_name: "Glucose",
				theme_color: "#ffffff",
				icons: [
					{
						src: "maskable_icon_x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any maskable",
					},
					{
						src: "maskable_icon_x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
					{
						src: "android-chrome-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,wasm,svg,png}"],
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
			},
		}),
	],
	resolve: {
		alias: {
			"@domain": path.resolve("src/domain"),
			"@application": path.resolve("src/application"),
			"@ui": path.resolve("src/ui"),
			"@infra": path.resolve("src/infrastructure"),
		},
	},
	preview: {
		port: 4173,
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
	},
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
					name: "node",
					include: ["tests/**/*.{test,spec}.ts"],
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
