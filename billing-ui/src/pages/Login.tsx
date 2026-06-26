import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { loginApi, checkDbStatus } from "../api/authApi";
import { useEffect } from "react";

function getLoginErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data as { error?: string; message?: string } | undefined;
        const serverMessage = data?.error || data?.message;

        if (serverMessage) {
            return `Login failed: ${serverMessage}`;
        }

        if (status === 401) {
            return "Login failed: incorrect username or password.";
        }

        if (!error.response) {
            return "Login failed: cannot connect to server. Check API/database service.";
        }

        return `Login failed: server returned status ${status}.`;
    }

    if (error instanceof Error && error.message) {
        return `Login failed: ${error.message}`;
    }

    return "Login failed. Please try again.";
}

export default function Login() {
    usePageTitle("Login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const usernameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "disconnected" | "error">("checking");
    const [dbMessage, setDbMessage] = useState("");

    useEffect(() => {
        checkDbStatus().then(res => {
            setDbStatus(res.status as any);
            setDbMessage(res.message || "");
        }).catch(() => {
            setDbStatus("error");
            setDbMessage("Network error");
        });
    }, []);


    const auth = useAuth();
    const nav = useNavigate();

    const submit = async () => {
        if (!username || !password) {
            toast.warning("Enter username and password");
            return;
        }

        try {
            setLoading(true);

            const res = await loginApi({ username, password });
            console.log(res);
            auth.login(
                {
                    id: res.id,
                    username: res.username,
                    role: res.role
                },
                res.token
            );
            if (window.electron?.loginSuccess) {
                window.electron.loginSuccess();
            }
            toast.success("Login successful!");
            nav("/home");
        } catch (err: unknown) {
            toast.error(getLoginErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={wrapper}>
            <div style={box}>
                <h2 style={titleStyle}>Smart Billing</h2>
                <p style={subtitleStyle}>Sign in to your account</p>

                <div style={inputContainer}>
                    <input
                        ref={usernameRef}
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                passwordRef.current?.focus();
                            }
                        }}
                        style={input}
                    />
                </div>

                <div style={inputContainer}>
                    <input
                        ref={passwordRef}
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void submit();
                            }
                        }}
                        style={input}
                    />
                </div>

                <button style={btn} onClick={submit} disabled={loading || dbStatus !== "connected"}>
                    {loading ? "LOGGING IN..." : "LOGIN"}
                </button>

                <div style={statusContainer}>
                    <div>
                        {dbStatus === "checking" && <span style={{ color: "#a0aec0", display: "inline-flex", alignItems: "center", gap: "6px" }}>⏳ Checking Database...</span>}
                        {dbStatus === "connected" && <span style={{ color: "#48bb78", display: "inline-flex", alignItems: "center", gap: "6px" }}>● Database Connected</span>}
                        {dbStatus === "disconnected" && <span style={{ color: "#f56565", display: "inline-flex", alignItems: "center", gap: "6px" }}>● Database Disconnected</span>}
                        {dbStatus === "error" && <span style={{ color: "#f56565", display: "inline-flex", alignItems: "center", gap: "6px" }}>⚠️ DB Error: {dbMessage}</span>}
                    </div>
                    {dbStatus !== "connected" && dbStatus !== "checking" && (
                        <button 
                            onClick={() => {
                                setDbStatus("checking");
                                checkDbStatus().then(res => {
                                    setDbStatus(res.status as any);
                                    setDbMessage(res.message || "");
                                }).catch(() => {
                                    setDbStatus("error");
                                    setDbMessage("Network error");
                                });
                            }}
                            style={retryBtn}
                        >
                            🔄 Retry Connection
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const wrapper = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at center, #1a1b26 0%, #0f1015 100%)",
    padding: "20px",
    boxSizing: "border-box" as const
};

const box = {
    background: "rgba(22, 23, 30, 0.8)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "40px 30px",
    width: "100%",
    maxWidth: "380px",
    textAlign: "center" as const,
    borderRadius: "16px",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)"
};

const titleStyle = {
    color: "#fff",
    fontSize: "24px",
    fontWeight: 600,
    margin: "0 0 6px 0",
    letterSpacing: "-0.5px",
    fontFamily: "system-ui, sans-serif"
};

const subtitleStyle = {
    color: "#718096",
    fontSize: "14px",
    margin: "0 0 28px 0",
    fontFamily: "system-ui, sans-serif"
};

const inputContainer = {
    marginBottom: "16px",
    width: "100%"
};

const input = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "all 0.2s ease"
};

const btn = {
    width: "100%",
    padding: "12px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)"
};

const statusContainer = {
    marginTop: "24px",
    fontSize: "12px",
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    alignItems: "center",
    fontFamily: "system-ui, sans-serif"
};

const retryBtn = {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "11px",
    borderRadius: "6px",
    color: "#a0aec0",
    transition: "all 0.2s ease",
    outline: "none"
};