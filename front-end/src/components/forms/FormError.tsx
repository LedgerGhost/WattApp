interface FormErrorProps {
  message: string
}

export default function FormError({ message }: FormErrorProps) {
  return (
    <div
      style={{
        color: '#d32f2f',
        fontSize: '14px',
        marginBottom: '16px',
        padding: '8px',
        backgroundColor: '#ffebee',
        borderRadius: '4px',
      }}
    >
      {message}
    </div>
  )
}
