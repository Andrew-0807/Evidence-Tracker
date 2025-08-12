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
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sums
            .sort((a, b) => a.position - b.position)
            .map((sum, idx) => (
              <li
                key={sum.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                className={`relative p-4 pr-16 rounded-xl border shadow-md cursor-grab active:cursor-grabbing transition-shadow transition-transform duration-200 ease-out hover:-translate-y-1 animate-fade-in ${
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDuplicate(sum)}
                    className={`p-1 rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? "text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(sum.id)}
                    className={`p-1 rounded-md transition-colors duration-200 ${
                      isDarkMode
                        ? "text-slate-300 hover:bg-slate-700"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
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
                    className="text-red-500 text-sm transition-colors duration-200 hover:text-red-700"
                  >
                    {translate("Remove")}
                  </button>
                </div>
              ))}
              {form.items.length < 5 && (
                <button
                  onClick={addSlot}
                  className="text-sm text-indigo-600 transition-colors duration-200 hover:text-indigo-800"
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
                className={`px-3 py-1 rounded border transition-colors duration-200 ${
                  isDarkMode
                    ? "border-slate-600 text-slate-100 hover:bg-slate-700"
                    : "border-slate-300 hover:bg-slate-100"
                }`}
              >
                {translate("Cancel")}
              </button>
              <button
                onClick={saveForm}
                className="px-3 py-1 rounded bg-indigo-600 text-white transition-colors duration-200 hover:bg-indigo-700"
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
