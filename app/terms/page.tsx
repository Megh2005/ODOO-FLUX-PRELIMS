"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Plus, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function TermsPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [savingTerm, setSavingTerm] = useState(false);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/terms");
      const data = await res.json();
      if (data.success) {
        setTerms(data.terms || []);
      }
    } catch (e) {
      toast.error("Failed to load terms templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      setSavingTerm(true);
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, isDefault }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Terms template saved!");
        setModalOpen(false);
        setTitle("");
        setContent("");
        setIsDefault(false);
        fetchTerms();
      } else {
        toast.error(result.error || "Failed to save template");
      }
    } catch (e) {
      toast.error("Error creating template");
    } finally {
      setSavingTerm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4 md:px-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Reusable Terms & Conditions Templates</h1>
            <p className="text-xs text-slate-500">Create pre-saved legal conditions to attach to invoices</p>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Template</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400">Loading templates...</div>
          ) : terms.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400">
              No custom terms templates created yet. Click "+ Add Template".
            </div>
          ) : (
            terms.map((t) => (
              <div key={t._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">{t.title}</h3>
                  {t.isDefault && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {t.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        <Dialog open={modalOpen} onOpenChange={(open) => setModalOpen(open)}>
          <DialogContent className="max-w-md bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">New Terms & Conditions Template</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTerm} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Template Title *</Label>
                <Input
                  required
                  placeholder="e.g. Standard Construction Supply Terms"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 h-9 text-xs border-slate-200"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Terms & Conditions Content *</Label>
                <Textarea
                  required
                  placeholder="1. All payments strictly within 15 days..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 text-xs border-slate-200 h-28"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="defaultCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <Label htmlFor="defaultCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Set as default template for new invoices
                </Label>
              </div>

              <DialogFooter className="mt-4 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={savingTerm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold" disabled={savingTerm}>
                  {savingTerm ? "Saving..." : "Save Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}
