import { ChangeEvent, useState } from "react";
import { User } from "../../../models/User";
import usePrivateHttp from "../../../hooks/usePrivateHttp";
import {
    updateProfile,
    UpdateProfileData,
} from "../../../services/userService";
import { useAppDispatch } from "../../../hooks/useStore";
import { authActions } from "../../../lib/redux/authSlice";
import Avatar from "../../../components/UI/Avatar/Avatar";
import { useUnsavedChanges } from "../../../components/UnsavedChanges";

type EditProfileModalProps = {
    user: User;
    onClose: () => void;
    onUpdated: (user: User) => void;
};

const EditProfileModal = ({
    user,
    onClose,
    onUpdated,
}: EditProfileModalProps) => {
    const privateHttp = usePrivateHttp();
    const dispatch = useAppDispatch();

    const [username, setUsername] = useState(user.username || "");
    const [email, setEmail] = useState(user.email || "");

    const [fullName, setFullName] = useState(
        user.fullName || ""
    );
    const [bio, setBio] = useState(user.bio || "");
    const [avatarData, setAvatarData] = useState<
        string | undefined
    >();
    const [avatarPreview, setAvatarPreview] = useState<
        string | null
    >(user.avatar || null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [avatarReading, setAvatarReading] = useState(false);
    const { markSaved, requestExit } = useUnsavedChanges(
        username !== (user.username || "") || email !== (user.email || "") || fullName !== (user.fullName || "") || bio !== (user.bio || "") || avatarData !== undefined || avatarReading,
        onClose,
    );

    function dismiss() {
        if (!isSubmitting) requestExit(onClose);
    }

    const handleAvatarChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/png",
            "image/jpeg",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setErrorMessage(
                "Chỉ chấp nhận ảnh PNG, JPEG hoặc WEBP"
            );
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage("Ảnh không được lớn hơn 5MB");
            return;
        }

        const reader = new FileReader();
        setAvatarReading(true);
        reader.onloadend = () => setAvatarReading(false);

        reader.onload = () => {
            const result = reader.result;

            if (typeof result === "string") {
                setAvatarData(result);
                setAvatarPreview(result);
                setErrorMessage("");
            }
        };

        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedFullName = fullName.trim();
        const normalizedBio = bio.trim();

        if (!/^[a-zA-Z0-9._]{3,30}$/.test(normalizedUsername)) {
            setErrorMessage("Username phải từ 3 đến 30 ký tự, chỉ gồm chữ, số, dấu chấm hoặc gạch dưới");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setErrorMessage("Email không hợp lệ");
            return;
        }

        if (normalizedFullName.length < 3) {
            setErrorMessage(
                "Họ tên phải có ít nhất 3 ký tự"
            );
            return;
        }

        if (normalizedBio.length > 500) {
            setErrorMessage(
                "Tiểu sử không được dài quá 500 ký tự"
            );
            return;
        }

        const data: UpdateProfileData = {
            username: normalizedUsername,
            email: normalizedEmail,
            fullName: normalizedFullName,
            bio: normalizedBio,
        };

        if (avatarData !== undefined) {
            data.avatarData = avatarData;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const response = await updateProfile(
                privateHttp,
                data
            );

            const updatedUser = response.data.userInfo;

            dispatch(
                authActions.profileUpdated(updatedUser)
            );

            markSaved();
            onUpdated(updatedUser);
            onClose();
        } catch (error) {
            console.error(error);
            const status = (error as any)?.response?.status;
            const field = (error as any)?.response?.data?.message;
            setErrorMessage(status === 409 && field === 'email' ? "Email này đã được sử dụng" : status === 409 ? "Username này đã được sử dụng" : "Không thể cập nhật hồ sơ");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
            onClick={event => { if (event.target === event.currentTarget) dismiss(); }}
            onKeyDown={event => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                dismiss();
            }}>
            <div role="dialog" aria-modal="true" aria-label="Edit profile" className="w-full max-w-md rounded-lg bg-lightDark p-6 text-foreground">
                <h2 className="mb-6 text-xl font-semibold">
                    Edit profile
                </h2>

                <div className="mb-5 flex items-center gap-4">
                    <Avatar
                        avatarUrl={avatarPreview}
                        username={user.username}
                        className="h-20 w-20"
                    />

                    <label className="cursor-pointer rounded bg-blue text-white px-4 py-2 text-sm font-semibold">
                        Change photo

                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={isSubmitting || avatarReading}
                            onChange={handleAvatarChange}
                        />
                    </label>
                </div>

                <label className="mb-2 block text-sm">Username</label>
                <input type="text" aria-label="Username" autoComplete="username" value={username} maxLength={30}
                    onChange={event => setUsername(event.target.value)} className="mb-4 w-full rounded border border-textGray bg-dark p-2 outline-none" />

                <label className="mb-2 block text-sm">Email</label>
                <input type="email" aria-label="Email" autoComplete="email" value={email} maxLength={254}
                    onChange={event => setEmail(event.target.value)} className="mb-4 w-full rounded border border-textGray bg-dark p-2 outline-none" />

                <label className="mb-2 block text-sm">
                    Full name
                </label>

                <input
                    type="text"
                    autoFocus
                    aria-label="Full name"
                    value={fullName}
                    maxLength={120}
                    onChange={(event) =>
                        setFullName(event.target.value)
                    }
                    className="mb-4 w-full rounded border border-textGray bg-dark p-2 outline-none"
                />

                <label className="mb-2 block text-sm">
                    Bio
                </label>

                <textarea
                    aria-label="Bio"
                    value={bio}
                    maxLength={500}
                    rows={5}
                    onChange={(event) =>
                        setBio(event.target.value)
                    }
                    className="w-full resize-none rounded border border-textGray bg-dark p-2 outline-none"
                />

                <div className="mt-1 text-right text-xs text-textSecondGray">
                    {bio.length}/500
                </div>

                {errorMessage && (
                    <div className="mt-3 text-sm text-errorText">
                        {errorMessage}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={dismiss}
                        disabled={isSubmitting}
                        className="rounded bg-textGray px-4 py-2"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || avatarReading}
                        className="rounded bg-blue text-white px-4 py-2 font-semibold disabled:opacity-70"
                    >
                        {isSubmitting
                            ? "Saving..."
                            : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
