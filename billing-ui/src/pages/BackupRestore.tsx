import { useState } from "react";
import { toast } from "react-toastify";
import TopMenuBar from "../components/TopMenuBar";
import { usePageTitle } from "../hooks/usePageTitle";
import { downloadDatabaseBackup, runAnnualReset } from "../api/maintenanceApi";
import "../Styles/BackupReset.css";

export default function BackupRestore() {
    usePageTitle("Backup / Restore");

    const [busy, setBusy] = useState<"backup" | "reset" | null>(null);
    const [pendingAction, setPendingAction] = useState<"backup" | "reset" | null>(null);
    const [superAdminPassword, setSuperAdminPassword] = useState("");

    const closeDialog = () => {
        if (busy) return;
        setPendingAction(null);
        setSuperAdminPassword("");
    };

    const executeAction = async () => {
        if (!pendingAction) return;

        const password = superAdminPassword.trim();
        if (!password) {
            toast.warning("Enter superadmin password.");
            return;
        }

        try {
            setBusy(pendingAction);

            if (pendingAction === "backup") {
                await downloadDatabaseBackup(password);
                toast.success("Backup downloaded successfully.");
            } else {
                await runAnnualReset(password);
                toast.success("Annual reset completed.");
            }

            setPendingAction(null);
            setSuperAdminPassword("");
        } catch (error: any) {
            toast.error(error?.response?.status === 401
                ? "Invalid superadmin password."
                : pendingAction === "backup"
                    ? "Backup failed."
                    : "Annual reset failed.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="backup-page-shell">
            <TopMenuBar />
            <div className="backup-page-container">
                <h2>Backup / Annual Reset</h2>
                <p className="backup-disclaimer">
                    Use backup first and store file safely before running annual reset.
                </p>

                <div className="backup-actions">
                    <button
                        className="backup-btn primary"
                        onClick={() => setPendingAction("backup")}
                        disabled={busy !== null}
                    >
                        {busy === "backup" ? "Creating Backup..." : "Backup Database"}
                    </button>

                    <button
                        className="backup-btn danger"
                        onClick={() => setPendingAction("reset")}
                        disabled={busy !== null}
                    >
                        {busy === "reset" ? "Resetting..." : "Annual Reset"}
                    </button>
                </div>
            </div>

            {pendingAction && (
                <div className="backup-modal-overlay">
                    <div className="backup-modal">
                        <h3>{pendingAction === "backup" ? "Confirm Backup" : "Confirm Annual Reset"}</h3>
                        <p>
                            {pendingAction === "backup"
                                ? "Please save this backup file to a safe folder or external drive."
                                : "WARNING: This will permanently clear yearly transaction tables and reset IDs to start from 1. Take backup before proceeding."}
                        </p>

                        <label htmlFor="superadmin-password">Superadmin Password</label>
                        <input
                            id="superadmin-password"
                            type="password"
                            value={superAdminPassword}
                            onChange={e => setSuperAdminPassword(e.target.value)}
                            disabled={busy !== null}
                            autoFocus
                        />

                        <div className="backup-modal-actions">
                            <button className="backup-btn modal-cancel" onClick={closeDialog} disabled={busy !== null}>
                                Cancel
                            </button>
                            <button className="backup-btn primary" onClick={executeAction} disabled={busy !== null}>
                                {busy === "backup"
                                    ? "Creating Backup..."
                                    : busy === "reset"
                                        ? "Resetting..."
                                        : pendingAction === "backup"
                                            ? "Confirm Backup"
                                            : "Confirm Reset"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
