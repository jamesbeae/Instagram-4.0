import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import ThemeProvider from "./components/Theme/ThemeProvider";
import "./index.css";
import { Provider } from "react-redux";
import store from "./lib/redux/index.ts";
import { PersistGate } from "redux-persist/integration/react";
import { persistor } from "./lib/redux";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
            <ThemeProvider><App /></ThemeProvider>
        </PersistGate>
    </Provider>
);
