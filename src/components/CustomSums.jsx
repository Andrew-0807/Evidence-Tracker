import React, { useState, useEffect, useMemo } from "react";
import { useStorage } from "./useStorage";
import { useLanguage } from "../localization/LanguageContext";
import { useTheme } from "./ThemeProvider";

// Assumption: availableTags list remains static during session
const CustomSums = ({ monthlyData = {}, availableTags = [] }) => {
  const [sums, setSums] = useState([]);
  const [form, setForm] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const { translate } = useLanguage();
  const { isDarkMode } = useTheme();

  // Load persisted sums on mount
  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await useStorage.getCustomSums();
        loaded.sort((a, b) => a.position - b.position);
        setSums(loaded);
      } catch (_) {
        setSums([]);
      }
    };
    load();
  }, []);

  // Persist helper
  const persist = async (list) => {
    const ordered = list.map((s, idx) => ({ ...s, position: idx }));
    setSums(ordered);
    try {
      await useStorage.saveCustomSums(ordered);
    } catch (_) {
      /* ignore */
    }
  };

  // Compute values for current month
  const computedValues = useMemo(() => {
    const map = {};
    for (const sum of sums) {
      let total = 0;
      for (const item of sum.items || []) {
        const val = monthlyData[item.tag] || 0;
        total += (item.op === -1 ? -1 : 1) * val;
      }
      map[sum.id] = total;
    }
    return map;
  }, [sums, monthlyData]);

  // List helpers
  const handleAdd = () => setForm({ id: null, name: "", note: "", items: [] });
  const handleEdit = (s) => setForm({ ...s });
  const handleDuplicate = (s) =>
    persist([
      ...sums,
      {
        ...s,
        id: Date.now(),
        name: `${s.name} (copy)`,
        position: sums.length,
      },
    ]);
  const handleDelete = (id) => persist(sums.filter((s) => s.id !== id));

  // Drag reorder
  const handleDragStart = (i) => setDragIndex(i);
  const handleDrop = (i) => {
    if (dragIndex === null) return;
    const arr = [...sums];
    const [moved] = arr.splice(dragIndex, 1);
    arr.splice(i, 0, moved);
    persist(arr);
    setDragIndex(null);
  };

  // Editor logic
  const closeEditor = () => setForm(null);
  const addSlot = () =>
    setForm((f) =>
      f.items.length >= 5
        ? f
        : {
            ...f,
            items: [
              ...f.items,
              { slot_index: f.items.length, tag: availableTags[0] || "", op: 1 },
            ],
          }
    );
  const updateItem = (idx, field, val) =>
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      return { ...f, items };
    });
  const removeSlot = (idx) =>
    setForm((f) => ({
      ...f,
      items: f.items
        .filter((_, i) => i !== idx)
        .map((it, i) => ({ ...it, slot_index: i })),
    }));

  const formulaString = (items = []) =>
    items
      .sort((a, b) => a.slot_index - b.slot_index)
      .map((it, idx) => {
        const tagName = availableTags.includes(it.tag) ? it.tag : "(missing)";
        const part = `${tagName}(${it.op === 1 ? "+" : "-"})`;
        if (idx === 0) return part;
        return `${it.op === 1 ? "+" : "−"} ${part}`;
      })
      .join(" ");

  const previewValue = useMemo(() => {
    if (!form) return 0;
    return form.items.reduce((sum, it) => {
      const val = monthlyData[it.tag] || 0;
      return sum + (it.op === -1 ? -1 : 1) * val;
    }, 0);
  }, [form, monthlyData]);

  const saveForm = () => {
    if (!form.name.trim()) return;
    if ((form.note || "").length > 60) return;
    const items = form.items
      .slice(0, 5)
      .map((it, idx) => ({
        slot_index: idx,
        tag: it.tag,
        op: it.op === -1 ? -1 : 1,
      }));
    const newSum = {
      id: form.id ?? Date.now(),
      name: form.name.trim(),
      note: form.note?.trim() || undefined,
      position: form.position ?? sums.length,
      items,
    };
    const list = form.id
      ? sums.map((s) => (s.id === form.id ? { ...newSum, position: s.position } : s))
      : [...sums, newSum];
    persist(list);
    closeEditor();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className={`text-xl font-semibold ${
            isDarkMode ? "text-slate-100" : "text-slate-800"
          }`}
        >
          {translate("Custom Sums")}
        </h2>
        <button
          onClick={handleAdd}
          className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
        >
          {translate("Add")}
        </button>
      </div>
      {sums.length === 0 ? (
        <p className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
          {translate("No custom sums yet")}
        </p>
      ) : (
        <ul className="space-y-2">
          {sums
            .sort((a, b) => a.position - b.position)
            .map((sum, idx) => (
              <li
                key={sum.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className={`p-4 rounded border flex items-center justify-between ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-700"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      isDarkMode ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    {sum.name}
                  </div>
                  {sum.note && (
                    <div
                      className={`text-sm ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {sum.note}
                    </div>
                  )}
                  <div
                    className={`text-sm ${
                      isDarkMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {formulaString(sum.items)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`text-right font-semibold ${
                      isDarkMode ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    {(computedValues[sum.id] || 0).toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleEdit(sum)}
                    className="text-sm text-blue-500"
                  >
                    {translate("Edit")}
                  </button>
                  <button
                    onClick={() => handleDuplicate(sum)}
                    className="text-sm text-purple-500"
                  >
                    {translate("Duplicate")}
                  </button>
                  <button
                    onClick={() => handleDelete(sum.id)}
                    className="text-sm text-red-500"
                  >
                    {translate("Delete")}
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}

      {form && (
        <dialog
          open
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4"
        >
          <div
            className={`max-w-md w-full rounded p-6 ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <h3
              className={`text-lg font-medium mb-4 ${
                isDarkMode ? "text-slate-100" : "text-slate-800"
              }`}
            >
              {form.id ? translate("Edit Sum") : translate("Add Sum")}
            </h3>
            <div className="space-y-3">
              <input
                className={`w-full p-2 rounded border ${
                  isDarkMode
                    ? "bg-slate-700 border-slate-600 text-slate-100"
                    : "bg-white border-slate-300"
                }`}
                placeholder={translate("Name")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className={`w-full p-2 rounded border ${
                  isDarkMode
                    ? "bg-slate-700 border-slate-600 text-slate-100"
                    : "bg-white border-slate-300"
                }`}
                placeholder={translate("Note (optional)")}
                value={form.note || ""}
                onChange={(e) =>
                  setForm({ ...form, note: e.target.value.slice(0, 60) })
                }
              />
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <select
                    value={item.op}
                    onChange={(e) =>
                      updateItem(idx, "op", Number(e.target.value))
                    }
                    className={`p-2 rounded border ${
                      isDarkMode
                        ? "bg-slate-700 border-slate-600 text-slate-100"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <option value={1}>+</option>
                    <option value={-1}>-</option>
                  </select>
                  <select
                    value={item.tag}
                    onChange={(e) => updateItem(idx, "tag", e.target.value)}
                    className={`flex-1 p-2 rounded border ${
                      isDarkMode
                        ? "bg-slate-700 border-slate-600 text-slate-100"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <option value=""></option>
                    {availableTags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeSlot(idx)}
                    className="text-red-500 text-sm"
                  >
                    {translate("Remove")}
                  </button>
                </div>
              ))}
              {form.items.length < 5 && (
                <button
                  onClick={addSlot}
                  className="text-sm text-indigo-600"
                >
                  {translate("Add Slot")}
                </button>
              )}
              <div
                className={`text-sm ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {translate("Formula")}: {formulaString(form.items)}
              </div>
              <div
                className={`text-sm ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {translate("Value")}: {previewValue.toFixed(2)}
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={closeEditor}
                className={`px-3 py-1 rounded border ${
                  isDarkMode
                    ? "border-slate-600 text-slate-100"
                    : "border-slate-300"
                }`}
              >
                {translate("Cancel")}
              </button>
              <button
                onClick={saveForm}
                className="px-3 py-1 rounded bg-indigo-600 text-white"
              >
                {translate("Save")}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default CustomSums;
