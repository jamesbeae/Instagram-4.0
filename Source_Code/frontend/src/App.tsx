import "./App.css";
import { lazy, Suspense } from "react";
import UnsavedChangesProvider from "./components/UnsavedChanges";
import { createBrowserRouter, RouterProvider, type RouteObject } from "react-router-dom";
import RootLayout from "./components/RootLayout";
import { useSocket } from "./hooks/useSocket";
import { useAppSelector } from "./hooks/useStore";
import AuthInitializer from "./components/AuthInitializer";
import RequireAuth from "./components/RequireAuth";
const SignUp = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/Login/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const Message = lazy(() => import("./pages/Message"));
const PasswordRecovery = lazy(() => import("./pages/PasswordRecovery"));
const Discover = lazy(() => import("./pages/Discover"));
const Workspace = lazy(() => import("./pages/Workspace"));
const CreatorAnalytics = lazy(() => import("./pages/CreatorAnalytics"));
const Settings = lazy(() => import("./pages/Settings"));
const PostPage = lazy(() => import("./pages/PostPage"));
const ChatBox = lazy(() => import("./pages/Message/Chatbox"));
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
    { path: "/admin/login", element: <AdminLogin /> },
    { element: <RequireAuth adminOnly />, children: [{ path: "/admin", element: <AdminDashboard /> }] },
    {
        path: "/",
        element: <RootLayout />,
        children: [
            { index: true, element: <Home /> },
            { path: "post/:postId", element: <PostPage /> },
            { path: "explore", element: <Discover /> },
            { path: "profile/:_id", element: <Profile /> },
            { path: "reels", element: <Discover /> },
            {
                element: <RequireAuth />,
                children: [
                    { path: "settings", element: <Settings /> },
                    { path: "groups", element: <Workspace /> },
                    { path: "creator", element: <CreatorAnalytics /> },
                    { path: "message", element: <Message />, children: [{ path: ":user_id", element: <ChatBox /> }] },
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
            <Suspense fallback={<div role="status" className="p-6 text-foreground">Loading page…</div>}>
            <RouterProvider router={router}/>
            </Suspense>
        </AuthInitializer>);
}
export default App;
