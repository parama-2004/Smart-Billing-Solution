import { useEffect, useState, useMemo } from "react";
import type { CustomerDto } from "../../models/Customer";
import { getCustomers } from "../../api/customerApi";

const CustomersList = () => {
    const [customers, setCustomers] = useState<CustomerDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        getCustomers()
            .then(data => setCustomers(data))
            .catch(() => setError("Failed to load customers"))
            .finally(() => setLoading(false));
    }, []);

    // Highly optimized client-side search with maximum limit of 25 results
    const filteredCustomers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return customers.slice(0, 25);
        }

        const matched: CustomerDto[] = [];
        for (let i = 0; i < customers.length; i++) {
            const c = customers[i];
            if (
                c.name.toLowerCase().includes(query) ||
                (c.mobile && c.mobile.includes(query)) ||
                (c.customerCode && c.customerCode.toLowerCase().includes(query)) ||
                (c.email && c.email.toLowerCase().includes(query)) ||
                (c.address && c.address.toLowerCase().includes(query))
            ) {
                matched.push(c);
                if (matched.length >= 25) {
                    break;
                }
            }
        }
        return matched;
    }, [customers, searchTerm]);

    if (loading) return <p>Loading customers...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div style={{ padding: "20px" }}>
            <h2>Customers</h2>

            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "15px" }}>
                <input
                    type="text"
                    placeholder="Search by name, mobile, code, email, address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: "8px 12px",
                        width: "350px",
                        fontSize: "14px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
                    }}
                />
                <span style={{ fontSize: "14px", color: "#666" }}>
                    Showing {filteredCustomers.length} of {customers.length} customers (Max 25 shown)
                </span>
            </div>

            <table border={1} cellPadding={6} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ backgroundColor: "#f2f2f2" }}>
                        <th>S.No</th>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Mobile</th>
                        {/*<th>Telephone</th>*/}
                        <th>Email</th>
                        <th>Address</th>
                        <th>Opening</th>
                        <th>Closing</th>
                        <th>Purchase</th>
                        <th>Returned</th>
                        <th>Loyalty Points</th>
                    </tr>
                </thead>

                <tbody>
                    {filteredCustomers.length === 0 ? (
                        <tr>
                            <td colSpan={11} style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                                No customers found.
                            </td>
                        </tr>
                    ) : (
                        filteredCustomers.map((c, index) => (
                            <tr key={c.id}>
                                <td>{index + 1}</td>
                                <td>{c.customerCode}</td>
                                <td>{c.name}</td>
                                <td>{c.mobile}</td>
                                {/*<td>{c.telephone ?? "-"}</td>*/}
                                <td>{c.email ?? "-"}</td>
                                <td>{c.address}</td>
                                <td>{c.openingBalance}</td>
                                <td>{c.closingBalance}</td>
                                <td>{c.purchaseAmount}</td>
                                <td>{c.returnedAmount}</td>
                                <td>{c.loyaltyPoints}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default CustomersList;
