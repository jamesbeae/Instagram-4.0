/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class", '[data-theme="dark"]'],
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            borderWidth: {
                0.5: "0.5px",
            },
            width: {
                "72px": "72px",
                "44px": "44px",
                "828px": "828px",
            },
            height: {
                "44px": "44px",
            },
            spacing: {
                "3/4": "75%",
                "90%": "90%",
                "10%": "10%",
                inherit: "inherit",
            },
            minWidth: {
                "50%": "50%",
                "60%": "60%",
                "828px": "828px",
            },
            maxWidth: {
                "630px": "630px",
            },
        },
        fontFamily: {
            sourceSans: ['"Source Sans 3"', "sans-serif"],
        },
        colors: {
            textGray: "rgb(var(--theme-muted) / <alpha-value>)",
            textSecondGray: "rgb(var(--theme-secondary) / <alpha-value>)",
            blue: "rgb(var(--theme-accent) / <alpha-value>)",
            white: "#fff",
            foreground: "rgb(var(--theme-text) / <alpha-value>)",
            errorText: "rgb(var(--theme-error) / <alpha-value>)",
            dark: "rgb(var(--theme-canvas) / <alpha-value>)",
            "#262626": "#262626",
            "#efeae0": "#efeae0",
            lightDark: "rgb(var(--theme-surface) / <alpha-value>)",
            lightSecondDark: "rgb(var(--theme-raised) / <alpha-value>)",
            transparent: "transparent",
        },
        screens: {
            mobile: "450px",
            tablet: "640px",
            laptop: "1024px",
            desktop: "1280px",
        },
    },
    plugins: [require("tailwind-scrollbar-hide")],
};
