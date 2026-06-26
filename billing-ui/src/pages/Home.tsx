import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";
import TopMenuBar from "../components/TopMenuBar";
import "../Styles/HomeStyle.css";
import bg from "../assets/smart-logo.png";

export default function Home() {
    usePageTitle("Dashboard");
    const auth = useAuth();
    const now = new Date();

    return (
        <div className="home-shell">
            <TopMenuBar />
            <div className="home-container">
                <div className="home-hero">
                    <div className="welcome-section">
                        <div className="welcome-card">
                            <p className="welcome-caption">Dashboard</p>
                            <h1 className="welcome-title">Welcome, {auth.user?.username}</h1>
                            <p className="welcome-subtitle">Smart Billing Suite</p>
                            <div className="home-meta-grid">
                                <div className="home-meta-card">
                                    <span className="meta-label">Role</span>
                                    <span className="meta-value">{auth.user?.role ?? "User"}</span>
                                </div>
                                <div className="home-meta-card">
                                    <span className="meta-label">Date</span>
                                    <span className="meta-value">{now.toLocaleDateString("en-IN")}</span>
                                </div>
                                <div className="home-meta-card">
                                    <span className="meta-label">Time</span>
                                    <span className="meta-value">{now.toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                   

                    <div className="home-brand-panel">
                        <div className="brand-glow" />
                        <img src={bg} alt="Smart Billing Suite Logo" className="brand-logo" />
                        <p className="brand-text">Reliable. Fast. Professional Billing.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}