import { defineConfig, presetWind4 } from "unocss";
import { presetAnimations } from "unocss-preset-animations";
import { presetShadcn } from "unocss-preset-shadcn";

export default defineConfig({
	// biome-ignore lint/suspicious/noExplicitAny: Theme preset typescript
	presets: [presetWind4(), presetAnimations() as any, presetShadcn()],
	preflights: [
		{
			getCSS: () => `
       *, ::before, ::after {
          box-sizing: border-box;
        }`,
		},
	],
});
