import "./App.css";
import UnsavedChangesProvider from "./components/UnsavedChanges";
import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import SignUp from "./pages/Signup";
import Login from "./pages/Login";
import RootLayout from "./components/RootLayout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Message from "./pages/Message";
import PasswordRecovery from "./pages/PasswordRecovery";
import Discover from "./pages/Discover";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";
import PostPage from "./pages/PostPage";
import ChatBox from "./pages/Message/Chatbox";
import { useSocket } from "./hooks/useSocket";
import { useAppSelector } from "./hooks/useStore";
import AuthInitializer from "./components/AuthInitializer";
import RequireAuth from "./components/RequireAuth";
const routes: RouteObject[] = [
    { path: "/forgot-password", element: <PasswordRecovery key="forgot" /> },
    { path: "/reset-password", element: <PasswordRecovery key="reset" /> },
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
                    { path: "post/:postId", element: <PostPage /> },
                    { path: "explore", element: <Discover /> },
                    { path: "reels", element: <Discover /> },
                    { path: "settings", element: <Settings /> },
                    ...["groups", "creator", "admin"].map(path => ({ path, element: <Workspace key={path} /> })),
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
];
const router = createBrowserRouter([{ element: <UnsavedChangesProvider />, children: routes }]);
function App() {
    const userId = useAppSelector((state) => state.authSlice.userInfo?._id);
    useSocket(userId);
    return (<AuthInitializer>
            <RouterProvider router={router}/>
        </AuthInitializer>);
}
export default App;
