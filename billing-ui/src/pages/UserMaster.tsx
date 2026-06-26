import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../hooks/usePageTitle";
import {
    getAllUsers,
    registerUser,
    changePassword,
    toggleUser
} from "../api/userApi";
import { useAuth } from "../context/AuthContext";
import "../Styles/UserStyle.css";
import { getCurrentDateTime } from "../utils/dateUtils";


export default function UserMaster() {
    usePageTitle("User Master");
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"Admin" | "User" | "Operator">("User");
    const [oldPass, setOldPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [newUserId, setNewUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            setLoading(true);
            const allUsers = await getAllUsers();
            setUsers(allUsers || []);
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoading(false);
        }
    };

    const addUser = async () => {
        if (!username.trim() || !password.trim()) {
            toast.warning("Username and password are required!");
            return;
        }

        try {
            setLoading(true);
            const newUser = await registerUser({ username, password, role });
            setNewUserId(newUser.id);
            setUsername("");
            setPassword("");
            setRole("User");
            await load();

            setTimeout(() => setNewUserId(null), 2000);
        } catch (error: any) {
            toast.error(error?.message || "Error adding user");
        } finally {
            setLoading(false);
        }
    };

    const updatePassword = async () => {
        if (!oldPass.trim() || !newPass.trim()) {
            toast.warning("Both old and new passwords are required!");
            return;
        }

        try {
            setLoading(true);
            await changePassword({ oldPassword: oldPass, newPassword: newPass });
            setOldPass("");
            setNewPass("");
            toast.success("Password changed successfully!");
        } catch (error: any) {
            toast.error(error?.message || "Error changing password");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleUser = async (userId: number) => {
        if (window.confirm("Are you sure you want to toggle this user's status?")) {
            try {
                setLoading(true);
                await toggleUser(userId);
                await load();
            } catch (error: any) {
                toast.error(error?.message || "Error toggling user status");
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="user-master-container">
            {/* Header */}
            <div className="user-header-bar">
                <span> USER MASTER - SMART SUPER MARKET</span>
                <span className="user-date-display">{getCurrentDateTime()}</span>
            </div>

            {/* ADD USER (ADMIN ONLY) */}
            {user?.role === "Admin" && (
                <section className="user-form-section">
                    <h3 className="user-section-title"> ADD NEW USER</h3>
                    <div className="user-form-grid">
                        <div className="user-form-group">
                            <label>USERNAME</label>
                            <input
                                className="retro-user-input"
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="user-form-group">
                            <label>PASSWORD</label>
                            <input
                                className="retro-user-input"
                                placeholder="Enter password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="user-form-group">
                            <label>ROLE</label>
                            <select
                                className="retro-user-select"
                                value={role}
                                onChange={e => setRole(e.target.value as any)}
                                disabled={loading}
                            >
                                <option value="User">USER</option>
                                <option value="Operator">OPERATOR</option>
                                <option value="Admin">ADMIN</option>
                            </select>
                        </div>
                        <div className="user-form-group">
                            <label>&nbsp;</label>
                            <button
                                className="retro-user-btn primary"
                                onClick={addUser}
                                disabled={!username.trim() || !password.trim() || loading}
                            >
                                {loading ? "ADDING..." : "ADD USER"}
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* PASSWORD CHANGE */}
            <section className="user-form-section">
                <h3 className="user-section-title"> CHANGE PASSWORD</h3>
                <div className="user-form-grid">
                    <div className="user-form-group">
                        <label>CURRENT PASSWORD</label>
                        <input
                            className="retro-user-input"
                            placeholder="Enter current password"
                            type="password"
                            value={oldPass}
                            onChange={e => setOldPass(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="user-form-group">
                        <label>NEW PASSWORD</label>
                        <input
                            className="retro-user-input"
                            placeholder="Enter new password"
                            type="password"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="user-form-group">
                        <label>&nbsp;</label>
                        <button
                            className="retro-user-btn primary"
                            onClick={updatePassword}
                            disabled={!oldPass.trim() || !newPass.trim() || loading}
                        >
                            {loading ? "CHANGING..." : "CHANGE PASSWORD"}
                        </button>
                    </div>
                </div>
            </section>

            {/* USER LIST */}
            <section className="user-list-section">
                <h3 className="user-section-title"> USER LIST</h3>
                <div className="user-table-container">
                    {loading && !users.length ? (
                        <div className="user-loading-message">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="user-no-data">No users found</div>
                    ) : (
                        <table className="retro-user-table">
                            <thead>
                                <tr>
                                    <th className="user-id-cell">ID</th>
                                    <th>USERNAME</th>
                                    <th className="user-role-cell">ROLE</th>
                                    <th className="user-status-cell">STATUS</th>
                                    {user?.role === "Admin" && <th className="user-action-cell">ACTION</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr
                                        key={u.id}
                                        className={newUserId === u.id ? "user-highlight-new" : ""}
                                    >
                                        <td className="user-id-cell">#{u.id.toString().padStart(3, '0')}</td>
                                        <td>
                                            <strong>{u.username}</strong>
                                            {u.id === user?.id && (
                                                <div className="user-current-indicator">(You)</div>
                                            )}
                                        </td>
                                        <td className="user-role-cell">
                                            <span className={`user-role-badge role-${u.role?.toLowerCase()}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="user-status-cell">
                                            <span className={`user-status-badge status-${u.isActive ? 'active' : 'inactive'}`}>
                                                {u.isActive ? "ACTIVE" : "DISABLED"}
                                            </span>
                                        </td>
                                        {user?.role === "Admin" && u.id !== user?.id && (
                                            <td className="user-action-cell">
                                                <button
                                                    className={`user-action-btn ${u.isActive ? 'danger' : 'success'}`}
                                                    onClick={() => handleToggleUser(u.id)}
                                                    disabled={loading}
                                                >
                                                    {u.isActive ? "DISABLE" : "ENABLE"}
                                                </button>
                                            </td>
                                        )}
                                        {user?.role === "Admin" && u.id === user?.id && (
                                            <td className="user-action-cell">
                                                <span className="user-current-session">(Current)</span>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Status Bar */}
            <div className="user-status-bar">
                <span>
                    <strong>STATUS:</strong> {user?.role === "Admin" ? "ADMIN MODE" : user?.role === "Operator" ? "OPERATOR MODE" : "USER MODE"}
                </span>
                <span>
                    <strong>ACTIVE USERS:</strong> {users.filter(u => u.isActive).length} / {users.length}
                </span>
                <span>
                    <strong>LAST UPDATED:</strong> {new Date().toLocaleTimeString()}
                </span>
            </div>
        </div>
    );
}