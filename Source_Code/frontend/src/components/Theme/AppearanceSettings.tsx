import { faCircleHalfStroke } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
        <Card as="section" aria-labelledby="appearance-heading" className="settings-card settings-appearance">
            <header className="settings-section-header">
                <span className="settings-icon" aria-hidden="true"><FontAwesomeIcon icon={faCircleHalfStroke} /></span>
                <h2 id="appearance-heading">Appearance</h2>
            </header>
            <div className="settings-theme-options">
                <OptionGroup label="Color theme" options={themes} value={theme} onChange={setTheme} />
                <p className="settings-muted">Your theme is saved on this browser.</p>
            </div>
        </Card>
    );
}
