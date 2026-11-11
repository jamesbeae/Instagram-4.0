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
        const normalizedFullName = fullName.trim();
        const normalizedBio = bio.trim();

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

            onUpdated(updatedUser);
            onClose();
        } catch (error) {
            console.error(error);
            setErrorMessage(
                "Không thể cập nhật hồ sơ"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
            <div className="w-full max-w-md rounded-lg bg-lightDark p-6 text-white">
                <h2 className="mb-6 text-xl font-semibold">
                    Edit profile
                </h2>

                <div className="mb-5 flex items-center gap-4">
                    <Avatar
                        avatarUrl={avatarPreview}
                        username={user.username}
                        className="h-20 w-20"
                    />

                    <label className="cursor-pointer rounded bg-blue px-4 py-2 text-sm font-semibold">
                        Change photo

                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </label>
                </div>

                <label className="mb-2 block text-sm">
                    Full name
                </label>

                <input
                    type="text"
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
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded bg-textGray px-4 py-2"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="rounded bg-blue px-4 py-2 font-semibold disabled:opacity-70"
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