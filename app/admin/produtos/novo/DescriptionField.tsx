"use client";

import { useEffect, useState } from "react";

export default function DescriptionField() {
  const [description, setDescription] = useState("");

  useEffect(() => {
    function handleImportedDescription(event: Event) {
      const customEvent = event as CustomEvent<string>;
      setDescription(customEvent.detail || "");
    }

    window.addEventListener("mercadolivre:description", handleImportedDescription);
    return () => window.removeEventListener("mercadolivre:description", handleImportedDescription);
  }, []);

  return (
    <label className="field field-full">
      <span>Descrição</span>
      <textarea
        name="description"
        rows={5}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
    </label>
  );
}
