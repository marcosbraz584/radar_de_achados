"use client";

export default function ExcluirProdutoButton({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <button formAction={action} formNoValidate className="secondary-button" style={{ marginRight: "auto", color: "#b42318", borderColor: "#f0b4ae" }} type="submit" onClick={(event) => {
      const confirmed = window.confirm("Tem certeza que deseja excluir este produto? Esta ação não poderá ser desfeita.");
      if (!confirmed) event.preventDefault();
    }}>
      Excluir produto
    </button>
  );
}
