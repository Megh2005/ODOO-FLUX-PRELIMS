"use client";

import { useEffect, useState } from "react";
import {
  TbBox,
  TbPlus,
  TbSearch,
  TbDownload,
  TbEdit,
  TbTrash,
  TbAdjustmentsHorizontal,
  TbHistory,
  TbX,
} from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { CONSTRUCTION_CATEGORIES, CONSTRUCTION_UNITS, GST_PERCENTAGE_OPTIONS, LINE_ITEM_GST_OPTIONS } from "@/lib/constants";
import { exportInventoryToExcel } from "@/lib/excelExporter";
import { toast } from "sonner";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [stockStatus, setStockStatus] = useState("ALL");

  // Modals & Drawers States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<any>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<any>(null);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Product Form State (Zoho Billing Aligned)
  const [formData, setFormData] = useState({
    productName: "",
    productDescription: "",
    category: CONSTRUCTION_CATEGORIES[0],
    unit: CONSTRUCTION_UNITS[0],
    itemType: "GOODS",
    hsnCode: "",
    purchasePrice: "",
    sellingPrice: "",
    gstRate: "18",
    minimumStockQuantity: "10",
    currentStock: "0",
  });

  // Adjustment Form State
  const [adjustData, setAdjustData] = useState({
    movementType: "ADDITION",
    quantity: "1",
    notes: "",
  });

  useEffect(() => {
    fetchProducts();
  }, [search, category, stockStatus]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category !== "ALL") params.append("category", category);
      if (stockStatus !== "ALL") params.append("stockStatus", stockStatus);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      productName: "",
      productDescription: "",
      category: CONSTRUCTION_CATEGORIES[0],
      unit: CONSTRUCTION_UNITS[0],
      itemType: "GOODS",
      hsnCode: "",
      purchasePrice: "",
      sellingPrice: "",
      gstRate: "18",
      minimumStockQuantity: "10",
      currentStock: "0",
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setFormData({
      productName: prod.productName,
      productDescription: prod.productDescription || "",
      category: prod.category,
      unit: prod.unit,
      itemType: prod.itemType || "GOODS",
      hsnCode: prod.hsnCode || "",
      purchasePrice: String(prod.purchasePrice !== undefined && prod.purchasePrice !== null ? prod.purchasePrice : ""),
      sellingPrice: String(prod.sellingPrice),
      gstRate: String(prod.gstRate !== undefined ? prod.gstRate : 18),
      minimumStockQuantity: String(prod.minimumStockQuantity),
      currentStock: String(prod.currentStock),
    });
    setProductModalOpen(true);
  };

  const generateAIDescription = async () => {
    if (!formData.productName.trim()) {
      toast.error("Please enter a product name first to generate a description.");
      return;
    }

    try {
      setGeneratingAI(true);
      const res = await fetch("/api/products/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: formData.productName,
          category: formData.category,
          itemType: formData.itemType,
        }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        setFormData((prev) => ({ ...prev, productDescription: data.description }));
        toast.success("AI Description generated!");
      } else {
        toast.error(data.error || "Failed to generate AI description");
      }
    } catch (err) {
      toast.error("Error connecting to AI description service");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.sellingPrice) {
      toast.error("Please fill all required product fields");
      return;
    }

    try {
      setSavingProduct(true);
      const url = editingProduct ? `/api/products/${editingProduct._id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
          sellingPrice: Number(formData.sellingPrice),
          gstRate: formData.gstRate && formData.gstRate !== "NONE" ? Number(formData.gstRate) : undefined,
          minimumStockQuantity: Number(formData.minimumStockQuantity),
          currentStock: Number(formData.currentStock),
        }),
      });
      const result = await res.json();

      if (result.success) {
        if (editingProduct) {
          toast.success("Product updated successfully!");
          setProductModalOpen(false);
        } else {
          toast.success("Product created successfully! Form reset for next product.");
          setFormData({
            productName: "",
            productDescription: "",
            category: CONSTRUCTION_CATEGORIES[0],
            unit: CONSTRUCTION_UNITS[0],
            itemType: "GOODS",
            hsnCode: "",
            purchasePrice: "",
            sellingPrice: "",
            gstRate: "18",
            minimumStockQuantity: "10",
            currentStock: "0",
          });
          setEditingProduct(null);
        }
        fetchProducts();
      } else {
        toast.error(result.error || "Failed to save product");
      }
    } catch (err) {
      toast.error("Error saving product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (prod: any) => {
    if (!confirm(`Are you sure you want to permanently delete "${prod.productName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/products/${prod._id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message || "Product deleted permanently");
        fetchProducts();
      } else {
        toast.error(result.error || "Error deleting product");
      }
    } catch (e) {
      toast.error("Error deleting product");
    }
  };

  const handleOpenAdjust = (prod: any) => {
    setSelectedProductForAdjust(prod);
    setAdjustData({
      movementType: "ADDITION",
      quantity: "1",
      notes: "",
    });
    setAdjustDrawerOpen(true);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdjust) return;

    try {
      setSavingAdjust(true);
      const current = selectedProductForAdjust.currentStock;
      const qty = Number(adjustData.quantity);
      if (!qty || qty <= 0) {
        toast.error("Please enter a valid quantity greater than 0");
        return;
      }

      let newStock = current;
      if (adjustData.movementType === "ADDITION") newStock += qty;
      else if (adjustData.movementType === "DEDUCTION") newStock -= qty;

      if (newStock < 0) {
        toast.error("Stock cannot drop below 0");
        return;
      }

      const res = await fetch(`/api/products/${selectedProductForAdjust._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStock: newStock,
          stockAdjustmentNote: `${adjustData.movementType}: ${adjustData.notes}`,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Stock level updated successfully!");
        setAdjustDrawerOpen(false);
        fetchProducts();
      } else {
        toast.error(result.error || "Failed to adjust stock");
      }
    } catch (err) {
      toast.error("Error adjusting stock");
    } finally {
      setSavingAdjust(false);
    }
  };

  const handleOpenHistory = async (prod: any) => {
    setHistoryProduct(prod);
    try {
      const res = await fetch(`/api/products/${prod._id}`);
      const result = await res.json();
      if (result.success) {
        setStockHistory(result.stockHistory || []);
        setHistoryDrawerOpen(true);
      }
    } catch (e) {
      toast.error("Failed to load movement history");
    }
  };

  const handleExportExcel = () => {
    if (products.length === 0) {
      toast.error("No products available to export");
      return;
    }
    exportInventoryToExcel(products);
    toast.success("Inventory stock exported to Excel!");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 md:px-6">
        {/* Header Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Warehouse Stock & Inventory Directory</h1>
            <p className="text-xs text-slate-500">
              Manage stock levels, units, HSN codes, GST rates, and stock movement lifecycle.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="gap-2 text-xs font-semibold border-slate-300 text-slate-700"
            >
              <TbDownload className="w-4 h-4" />
              <span>Export Excel</span>
            </Button>
            <Button
              onClick={handleOpenAddProduct}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
            >
              <TbPlus className="w-4 h-4" />
              <span>Add New Product</span>
            </Button>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <TbSearch className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search product name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full md:w-48 h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {CONSTRUCTION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="w-full md:w-40 h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-700"
          >
            <option value="ALL">All Stock Status</option>
            <option value="IN">In Stock</option>
            <option value="LOW">Low Stock Alert</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Product / Material</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right">Current Stock</th>
                  <th className="py-3 px-3 text-right">Purchase Price</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">GST %</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading construction inventory products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No products found matching filters. Click "+ Add New Product" to create one.
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => {
                    const isLowStock = prod.currentStock <= prod.minimumStockQuantity;
                    const isOutOfStock = prod.currentStock <= 0;
                    return (
                      <tr key={prod._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-slate-900">{prod.productName}</p>
                            {prod.productDescription && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                                {prod.productDescription}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{prod.category}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600">{prod.unit}</td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-black ${
                              isOutOfStock
                                ? "text-rose-600"
                                : isLowStock
                                ? "text-amber-600"
                                : "text-slate-900"
                            }`}
                          >
                            {prod.currentStock}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Min: {prod.minimumStockQuantity}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-600">
                          ₹ {Number(prod.purchasePrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          ₹ {Number(prod.sellingPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {prod.gstRate !== undefined ? prod.gstRate : 18}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              title="Adjust Stock"
                              onClick={() => handleOpenAdjust(prod)}
                              className="h-8 px-2 text-xs border-slate-300 text-slate-700 gap-1"
                            >
                              <TbAdjustmentsHorizontal className="w-4 h-4" />
                              <span>Adjust</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Movement History"
                              onClick={() => handleOpenHistory(prod)}
                              className="h-8 px-2 text-xs border-slate-300 text-slate-600"
                            >
                              <TbHistory className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Edit Product"
                              onClick={() => handleOpenEditProduct(prod)}
                              className="h-8 px-2 text-xs border-slate-300 text-slate-600"
                            >
                              <TbEdit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete Product Permanently"
                              onClick={() => handleDeleteProduct(prod)}
                              className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <TbTrash className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Product Modal */}
        <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
          <DialogContent className="bg-white border border-slate-200">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TbBox className="w-5 h-5 text-amber-600" />
                <span>{editingProduct ? "Edit Product / Material Item" : "New Zoho-Aligned Product Creation"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Specify material identification, default GST rate, prices, and stock alert limits.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-1 text-xs">
              {/* Material Identification */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700">Product / Material Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Ultratech PPC Cement Bag 50kg"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-medium"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Category *</Label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {CONSTRUCTION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Construction Unit *</Label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium max-h-60"
                    >
                      {CONSTRUCTION_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Item Type Row */}
                <div className="pt-1 border-t border-slate-200/60">
                  <Label className="text-[11px] font-bold text-slate-700">Item Type</Label>
                  <select
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                    className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="GOODS">Goods / Material</option>
                    <option value="SERVICE">Labor / Service</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-slate-700">Description / Technical Specifications</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter grade, manufacturer details, or site notes..."
                      value={formData.productDescription}
                      onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                      className="h-9 text-xs border-slate-200 bg-white flex-1"
                    />
                    <Button
                      type="button"
                      onClick={generateAIDescription}
                      disabled={generatingAI || !formData.productName}
                      className="h-9 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md shrink-0 transition-colors"
                    >
                      {generatingAI ? "Generating..." : "Generate"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock Limits */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Purchase Price (₹) (Optional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="340.00"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Selling Price (₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      placeholder="380.00"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-bold text-amber-800"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Current Stock *</Label>
                    <Input
                      type="number"
                      required
                      placeholder="100"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Default GST Rate (Optional)</Label>
                    <select
                      value={formData.gstRate}
                      onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                      className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                    >
                      <option value="NONE">Unspecified / None</option>
                      {LINE_ITEM_GST_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">Min Alert Limit *</Label>
                    <Input
                      type="number"
                      required
                      placeholder="10"
                      value={formData.minimumStockQuantity}
                      onChange={(e) => setFormData({ ...formData, minimumStockQuantity: e.target.value })}
                      className="mt-1 h-9 text-xs border-slate-200 bg-white font-semibold"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setProductModalOpen(false)} className="h-9 px-4 text-xs font-semibold" disabled={savingProduct}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 px-5 shadow-xs" disabled={savingProduct}>
                  {savingProduct ? "Saving..." : editingProduct ? "Save Changes" : "Create Material Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Stock Adjustment Drawer */}
        <Drawer open={adjustDrawerOpen} onOpenChange={(open) => setAdjustDrawerOpen(open)}>
          <DrawerContent className="bg-white p-6 max-w-lg mx-auto border-t border-slate-200">
            <DrawerHeader className="p-0 mb-4">
              <DrawerTitle className="text-base font-bold text-slate-900">
                Adjust Stock: {selectedProductForAdjust?.productName}
              </DrawerTitle>
            </DrawerHeader>

            <form onSubmit={handleSaveAdjust} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between">
                <div>
                  <span className="text-slate-500 block">Current Available:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {selectedProductForAdjust?.currentStock} {selectedProductForAdjust?.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Min Threshold:</span>
                  <span className="font-bold text-slate-700 text-sm">
                    {selectedProductForAdjust?.minimumStockQuantity} {selectedProductForAdjust?.unit}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Movement Action</Label>
                <select
                  value={adjustData.movementType}
                  onChange={(e) => setAdjustData({ ...adjustData, movementType: e.target.value })}
                  className="mt-1 w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ADDITION">+ Stock Addition / Restock</option>
                  <option value="DEDUCTION">- Stock Deduction / Damage / Loss</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Quantity to Adjust</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                  className="mt-1 h-9 text-xs border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Notes / Reason</Label>
                <Input
                  placeholder="e.g. Received new shipment from supplier"
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  className="mt-1 h-9 text-xs border-slate-200"
                />
              </div>

              <DrawerFooter className="p-0 pt-2 flex flex-row justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdjustDrawerOpen(false)} className="h-9 px-4 text-xs font-semibold" disabled={savingAdjust}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 px-5 shadow-xs" disabled={savingAdjust}>
                  {savingAdjust ? "Adjusting..." : "Save Stock Adjustment"}
                </Button>
              </DrawerFooter>
            </form>
          </DrawerContent>
        </Drawer>

        {/* Stock Movement History Drawer */}
        <Drawer open={historyDrawerOpen} onOpenChange={(open) => setHistoryDrawerOpen(open)}>
          <DrawerContent className="bg-white p-6 max-w-2xl mx-auto border-t border-slate-200 max-h-[85vh] overflow-y-auto">
            <DrawerHeader className="p-0 mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <DrawerTitle className="text-base font-bold text-slate-900">
                  Stock Audit Trail: {historyProduct?.productName}
                </DrawerTitle>
                <p className="text-xs text-slate-500">Historical stock movements & invoice deductions</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setHistoryDrawerOpen(false)} className="h-8 w-8 p-0">
                <TbX className="w-4 h-4" />
              </Button>
            </DrawerHeader>

            <div className="space-y-3 text-xs">
              {stockHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No stock movement entries recorded yet.</div>
              ) : (
                stockHistory.map((item) => (
                  <div
                    key={item._id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.movementType === "ADDITION"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.movementType === "DEDUCTION"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.movementType}
                        </span>
                        <span>{item.quantity} {historyProduct?.unit}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">{item.notes || "No notes provided"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(item.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 text-[11px]">Stock Transition</p>
                      <p className="font-black text-slate-800 text-sm">
                        {item.previousStock} → {item.newStock}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
  );
}
