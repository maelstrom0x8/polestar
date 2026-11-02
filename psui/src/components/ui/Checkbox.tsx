interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  id?: string;
}

export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  return (
    <label className="checkbox" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      {label && <span>{label}</span>}
    </label>
  );
}
