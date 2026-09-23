import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import SignUp from "./pages/Signup";
import Login from "./pages/Login";
import RootLayout from "./components/RootLayout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Message from "./pages/Message";
import ChatBox from "./pages/Message/Chatbox";
import { useSocket } from "./hooks/useSocket";
import { useAppSelector } from "./hooks/useStore";
import AuthInitializer from "./components/AuthInitializer";
import RequireAuth from "./components/RequireAuth";
const router = createBrowserRouter([
    {
        path: "/sign-up",
        element: <SignUp />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        element: <RequireAuth />,
        children: [
            {
                path: "/",
                element: <RootLayout />,
                children: [
                    {
                        index: true,
                        element: <Home />,
                    },
                    {
                        path: "profile/:_id",
                        element: <Profile />,
                    },
                    {
                        path: "message",
                        element: <Message />,
                        children: [
                            {
                                path: ":user_id",
                                element: <ChatBox />,
                            },
                        ],
                    },
                ],
            },
        ],
    },
]);

function App() {
    const userId = useAppSelector((state) => state.authSlice.userInfo?._id);
    useSocket(userId);
    return (
        <AuthInitializer>
            <RouterProvider router={router} />
        </AuthInitializer>
    );
}

export default App;
