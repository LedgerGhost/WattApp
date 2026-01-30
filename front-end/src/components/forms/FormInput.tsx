interface FormInputProps {
  id: string
  label: string
  type?: string
  name: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  error?: string
}

export default function FormInput({
  id,
  label,
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  required = false,
  error,
}: FormInputProps) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}
