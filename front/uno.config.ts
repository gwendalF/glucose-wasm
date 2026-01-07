import { defineConfig, presetMini } from "unocss";

export default defineConfig({
	presets: [presetMini()],
	preflights: [
		{
			getCSS: () => `
       *, ::before, ::after {
          box-sizing: border-box;
        }`,
		},
	],
});
