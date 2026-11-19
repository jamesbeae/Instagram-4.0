import Card from "../UI/Card";
import OptionGroup from "../UI/OptionGroup";
import { useTheme } from "./ThemeProvider";

const themes = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
] as const;

export default function AppearanceSettings() {
    const { theme, setTheme } = useTheme();

    return (
        <Card as="section" aria-labelledby="appearance-heading" className="grid max-w-md gap-3 p-4">
            <h2 id="appearance-heading" className="text-lg font-semibold">Appearance</h2>
            <OptionGroup label="Color theme" options={themes} value={theme} onChange={setTheme} />
        </Card>
    );
}
