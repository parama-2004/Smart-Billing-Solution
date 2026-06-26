import { useState } from "react";
import { toast } from "react-toastify";
import { usePageTitle } from "../../hooks/usePageTitle";
import { api } from "../../api/axios";
import { useBrands, useCategories, useInvalidateQuery, BRANDS_KEY, CATEGORIES_KEY } from "../../hooks/useMasterQueries";
import "../../Styles/GlobalLayout.css";
import "../../Styles/BrandCategoryStyles.css";

/* ---------------- Types ---------------- */

interface BrandDto {
    id: number;
    brandCode: string;
    brandName: string;
    isActive: boolean;
}

interface CreateBrandRequest {
    brandCode: string;
    brandName: string;
    isActive: boolean;
}

interface CategoryDto {
    id: number;
    categoryCode: string;
    categoryName: string;
    isActive: boolean;
}

interface CreateCategoryRequest {
    categoryCode: string;
    categoryName: string;
    isActive: boolean;
}

/* ---------------- Component ---------------- */

const BrandCategoryMaster = () => {
    usePageTitle("Brand & Category Master");
    const { data: brands = [], isLoading: brandLoading } = useBrands();
    const { data: categories = [], isLoading: categoryLoading } = useCategories();
    const invalidate = useInvalidateQuery();
    const [brandForm, setBrandForm] = useState<CreateBrandRequest>({
        brandCode: "",
        brandName: "",
        isActive: true
    });
    const [editingBrandId, setEditingBrandId] = useState<number | null>(null);
    const [brandSearch, setBrandSearch] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    /* ---------- Category States ---------- */
    const [categoryForm, setCategoryForm] = useState<CreateCategoryRequest>({
        categoryCode: "",
        categoryName: "",
        isActive: true
    });
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    /* ---------- Category States ---------- */

    /* ---------- Brand Handlers ---------- */
    const resetBrandForm = () => {
        setEditingBrandId(null);
        setBrandForm({
            brandCode: "",
            brandName: "",
            isActive: true
        });
    };

    const handleBrandSubmit = async () => {
        if (!brandForm.brandCode.trim()) {
            toast.warning("Brand Code is required");
            return;
        }
        if (!brandForm.brandName.trim()) {
            toast.warning("Brand Name is required");
            return;
        }

        try {
            if (editingBrandId) {
                await api.put(`/brands/${editingBrandId}`, {
                    brandName: brandForm.brandName,
                    isActive: brandForm.isActive
                });
                toast.success("Brand updated!");
            } else {
                await api.post("/brands", {
                    ...brandForm,
                    brandCode: brandForm.brandCode.toUpperCase().trim()
                });
                toast.success("Brand added!");
            }
            invalidate(BRANDS_KEY);
            resetBrandForm();
        } catch (error: any) {
            console.error("Failed to save brand:", error);
            toast.error(`Failed to save brand: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleBrandEdit = (brand: BrandDto) => {
        setEditingBrandId(brand.id);
        setBrandForm({
            brandCode: brand.brandCode,
            brandName: brand.brandName,
            isActive: brand.isActive
        });
    };

    const handleBrandDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this brand?")) return;

        try {
            await api.delete(`/brands/${id}`);
            invalidate(BRANDS_KEY);
            toast.success("Brand deleted");
        } catch (error: any) {
            toast.error(`Failed to delete brand: ${error.response?.data?.error || error.message}`);
        }
    };

    /* ---------- Category Handlers ---------- */
    const resetCategoryForm = () => {
        setEditingCategoryId(null);
        setCategoryForm({
            categoryCode: "",
            categoryName: "",
            isActive: true
        });
    };

    const handleCategorySubmit = async () => {
        if (!categoryForm.categoryCode.trim()) {
            toast.warning("Category Code is required");
            return;
        }
        if (!categoryForm.categoryName.trim()) {
            toast.warning("Category Name is required");
            return;
        }

        try {
            if (editingCategoryId) {
                await api.put(`/categories/${editingCategoryId}`, {
                    categoryName: categoryForm.categoryName,
                    isActive: categoryForm.isActive
                });
                toast.success("Category updated!");
            } else {
                await api.post("/categories", {
                    ...categoryForm,
                    categoryCode: categoryForm.categoryCode.toUpperCase().trim()
                });
                toast.success("Category added!");
            }
            invalidate(CATEGORIES_KEY);
            resetCategoryForm();
        } catch (error: any) {
            console.error("Failed to save category:", error);
            toast.error(`Failed to save category: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleCategoryEdit = (category: CategoryDto) => {
        setEditingCategoryId(category.id);
        setCategoryForm({
            categoryCode: category.categoryCode,
            categoryName: category.categoryName,
            isActive: category.isActive
        });
    };

    const handleCategoryDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;

        try {
            await api.delete(`/categories/${id}`);
            invalidate(CATEGORIES_KEY);
            toast.success("Category deleted");
        } catch (error: any) {
            toast.error(`Failed to delete category: ${error.response?.data?.error || error.message}`);
        }
    };

    /* ---------- Filter Data ---------- */
    const filteredBrands = brands.filter(brand =>
        brand.brandCode.toLowerCase().includes(brandSearch.toLowerCase()) ||
        brand.brandName.toLowerCase().includes(brandSearch.toLowerCase())
    );

    const filteredCategories = categories.filter(category =>
        category.categoryCode.toLowerCase().includes(categorySearch.toLowerCase()) ||
        category.categoryName.toLowerCase().includes(categorySearch.toLowerCase())
    );

    /* ---------- Statistics ---------- */
    const activeBrands = brands.filter(b => b.isActive).length;
    const activeCategories = categories.filter(c => c.isActive).length;

    return (
        <div className="retro-master-container">

            {/* Header */}
            <div className="brand-category-header-bar">
                <span>BRAND & CATEGORY MASTER</span>
                <span>v1.0</span>
            </div>

            <div className="brand-category-content">
                {/* Left Side - Brand Master */}
                <div className="brand-section">
                    <div className="section-header">
                        <span className="section-title">BRAND MASTER</span>
                        <div className="section-stats">
                            <span className="stat-item">Total: {brands.length}</span>
                            <span className="stat-item">Active: {activeBrands}</span>
                        </div>
                    </div>

                    {/* Brand Form */}
                    <div className="master-form-section">
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="required">Brand Code</label>
                                <input
                                    className="master-retro-input"
                                    placeholder="e.g., 01, BR, COC"
                                    value={brandForm.brandCode}
                                    onChange={e => setBrandForm({ ...brandForm, brandCode: e.target.value.toUpperCase() })}
                                    maxLength={10}
                                    disabled={brandLoading || editingBrandId !== null}
                                />
                            </div>

                            <div className="form-group">
                                <label className="required">Brand Name</label>
                                <input
                                    className="master-retro-input"
                                    placeholder="e.g., Britannia, Coca-Cola"
                                    value={brandForm.brandName}
                                    onChange={e => setBrandForm({ ...brandForm, brandName: e.target.value })}
                                    maxLength={100}
                                    disabled={brandLoading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    className="master-retro-select"
                                    value={brandForm.isActive ? "1" : "0"}
                                    onChange={e => setBrandForm({
                                        ...brandForm,
                                        isActive: e.target.value === "1"
                                    })}
                                    disabled={brandLoading}
                                >
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-action-buttons">
                            <button
                                className="master-retro-btn primary"
                                onClick={handleBrandSubmit}
                                disabled={brandLoading}
                            >
                                {brandLoading ? (
                                    <span className="master-loading"></span>
                                ) : editingBrandId ? "UPDATE BRAND" : "ADD BRAND"}
                            </button>
                            {editingBrandId && (
                                <button
                                    className="master-retro-btn"
                                    onClick={resetBrandForm}
                                    disabled={brandLoading}
                                >
                                    CANCEL
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Brand Search */}
                    <div className="search-section">
                        <div className="search-box">
                            <label>Search Brands:</label>
                            <input
                                type="text"
                                className="master-retro-input"
                                placeholder="Search by code or name..."
                                value={brandSearch}
                                onChange={e => setBrandSearch(e.target.value)}
                            />
                            <div className="search-count">
                                {filteredBrands.length} of {brands.length}
                            </div>
                        </div>
                    </div>

                    {/* Brands Table */}
                    <div className="master-grid-container">
                        <table className="master-grid">
                            <thead>
                                <tr>
                                    <th className="code-cell">CODE</th>
                                    <th className="name-cell">BRAND NAME</th>
                                    <th className="status-cell">STATUS</th>
                                    <th className="actions-cell">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBrands.map(brand => (
                                    <tr key={brand.id}>
                                        <td className="code-cell">
                                            <strong>{brand.brandCode}</strong>
                                        </td>
                                        <td className="name-cell">
                                            {brand.brandName}
                                        </td>
                                        <td className="status-cell">
                                            {brand.isActive ? (
                                                <span className="status-active">ACTIVE</span>
                                            ) : (
                                                <span className="status-inactive">INACTIVE</span>
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            <div className="action-buttons">
                                                <button
                                                    className="grid-edit-btn"
                                                    onClick={() => handleBrandEdit(brand)}
                                                    disabled={brandLoading}
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    className="grid-delete-btn"
                                                    onClick={() => handleBrandDelete(brand.id)}
                                                    disabled={brandLoading}
                                                >
                                                    DELETE
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredBrands.length === 0 && !brandLoading && (
                                    <tr>
                                        <td colSpan={4} className="no-data">
                                            No brands found. Add your first brand above.
                                        </td>
                                    </tr>
                                )}
                                {brandLoading && (
                                    <tr>
                                        <td colSpan={4} className="no-data">
                                            <span className="master-loading"></span>
                                            Loading brands...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side - Category Master */}
                <div className="category-section">
                    <div className="section-header">
                        <span className="section-title">CATEGORY MASTER</span>
                        <div className="section-stats">
                            <span className="stat-item">Total: {categories.length}</span>
                            <span className="stat-item">Active: {activeCategories}</span>
                        </div>
                    </div>

                    {/* Category Form */}
                    <div className="master-form-section">
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="required">Category Code</label>
                                <input
                                    className="master-retro-input"
                                    placeholder="e.g., FD, BEV, SNK"
                                    value={categoryForm.categoryCode}
                                    onChange={e => setCategoryForm({ ...categoryForm, categoryCode: e.target.value.toUpperCase() })}
                                    maxLength={10}
                                    disabled={categoryLoading || editingCategoryId !== null}
                                />
                            </div>

                            <div className="form-group">
                                <label className="required">Category Name</label>
                                <input
                                    className="master-retro-input"
                                    placeholder="e.g., Food, Beverages, Snacks"
                                    value={categoryForm.categoryName}
                                    onChange={e => setCategoryForm({ ...categoryForm, categoryName: e.target.value })}
                                    maxLength={100}
                                    disabled={categoryLoading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    className="master-retro-select"
                                    value={categoryForm.isActive ? "1" : "0"}
                                    onChange={e => setCategoryForm({
                                        ...categoryForm,
                                        isActive: e.target.value === "1"
                                    })}
                                    disabled={categoryLoading}
                                >
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-action-buttons">
                            <button
                                className="master-retro-btn primary"
                                onClick={handleCategorySubmit}
                                disabled={categoryLoading}
                            >
                                {categoryLoading ? (
                                    <span className="master-loading"></span>
                                ) : editingCategoryId ? "UPDATE CATEGORY" : "ADD CATEGORY"}
                            </button>
                            {editingCategoryId && (
                                <button
                                    className="master-retro-btn"
                                    onClick={resetCategoryForm}
                                    disabled={categoryLoading}
                                >
                                    CANCEL
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Search */}
                    <div className="search-section">
                        <div className="search-box">
                            <label>Search Categories:</label>
                            <input
                                type="text"
                                className="master-retro-input"
                                placeholder="Search by code or name..."
                                value={categorySearch}
                                onChange={e => setCategorySearch(e.target.value)}
                            />
                            <div className="search-count">
                                {filteredCategories.length} of {categories.length}
                            </div>
                        </div>
                    </div>

                    {/* Categories Table */}
                    <div className="master-grid-container">
                        <table className="master-grid">
                            <thead>
                                <tr>
                                    <th className="code-cell">CODE</th>
                                    <th className="name-cell">CATEGORY NAME</th>
                                    <th className="status-cell">STATUS</th>
                                    <th className="actions-cell">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.map(category => (
                                    <tr key={category.id}>
                                        <td className="code-cell">
                                            <strong>{category.categoryCode}</strong>
                                        </td>
                                        <td className="name-cell">
                                            {category.categoryName}
                                        </td>
                                        <td className="status-cell">
                                            {category.isActive ? (
                                                <span className="status-active">ACTIVE</span>
                                            ) : (
                                                <span className="status-inactive">INACTIVE</span>
                                            )}
                                        </td>
                                        <td className="actions-cell">
                                            <div className="action-buttons">
                                                <button
                                                    className="grid-edit-btn"
                                                    onClick={() => handleCategoryEdit(category)}
                                                    disabled={categoryLoading}
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    className="grid-delete-btn"
                                                    onClick={() => handleCategoryDelete(category.id)}
                                                    disabled={categoryLoading}
                                                >
                                                    DELETE
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCategories.length === 0 && !categoryLoading && (
                                    <tr>
                                        <td colSpan={4} className="no-data">
                                            No categories found. Add your first category above.
                                        </td>
                                    </tr>
                                )}
                                {categoryLoading && (
                                    <tr>
                                        <td colSpan={4} className="no-data">
                                            <span className="master-loading"></span>
                                            Loading categories...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="brand-category-status-bar">
                <div className="status-item">
                    <span>Brands:</span>
                    <span>{brands.length} records</span>
                </div>
                <div className="status-item">
                    <span>Categories:</span>
                    <span>{categories.length} records</span>
                </div>
                <div className="status-item">
                    <span>Last Updated:</span>
                    <span>{new Date().toLocaleString()}</span>
                </div>
                <div className="status-item">
                    <span>System:</span>
                    <span>READY</span>
                </div>
            </div>

        </div>
    );
};

export default BrandCategoryMaster;