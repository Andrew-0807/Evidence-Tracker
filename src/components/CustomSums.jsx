import React, { useState, useEffect, useMemo } from "react";
import { useStorage } from "./useStorage";
import { useLanguage } from "../localization/LanguageContext";
import { useTheme } from "./ThemeProvider";

// Assumption: availableTags list remains static during session
const CustomSums = ({ monthlyData = {}, availableTags = [] }) => {
  const [sums, setSums] = useState([]);
  const [form, setForm] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [ctrlPressed, setCtrlPressed] = useState(false);
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

  // Detect Control key for showing card actions
  useEffect(() => {
    const down = (e) => e.key === "Control" && setCtrlPressed(true);
    const up = (e) => e.key === "Control" && setCtrlPressed(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className={`text-2xl font-bold ${
            isDarkMode ? "text-slate-100" : "text-slate-800"
          }`}
        >
          {translate("Custom Sums")}
        </h2>
        <button
          onClick={handleAdd}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm shadow hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
        >
          {translate("Add")}
        </button>
      </div>
      {sums.length === 0 ? (
        <p className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
          {translate("No custom sums yet")}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sums
            .sort((a, b) => a.position - b.position)
            .map((sum, idx) => (
              <li
                key={sum.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className={`relative p-4 pr-16 rounded-xl border shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:scale-105 ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 hover:shadow-lg"
                    : "bg-white border-slate-200 hover:shadow-lg"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
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
                  <div
                    className={`text-right font-semibold ${
                      isDarkMode ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    {(computedValues[sum.id] || 0).toFixed(2)}
                  </div>
                </div>
                <div
                  className={`absolute top-2 right-2 flex space-x-1 transition-opacity duration-200 ${
                    ctrlPressed ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <button
                    onClick={() => handleEdit(sum)}
                    className={`p-1 rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? "text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {/* edit icon */}
                  </button>
                  <button
                    onClick={() => handleDuplicate(sum)}
                    className={`p-1 rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? "text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {/* duplicate icon */}
                  </button>
                  <button
                    onClick={() => handleDelete(sum.id)}
                    className={`p-1 rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? "text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {/* delete icon */}
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}

      {form && (
        <dialog
          open
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            className={`max-w-md w-full rounded p-6 animate-fade-in ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            {/* form fields */}
          </div>
        </dialog>
      )}
    </div>
  );
};

export default CustomSums;
