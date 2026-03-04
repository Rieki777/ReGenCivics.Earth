import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            rounded-xl p-4 shadow-lg border backdrop-blur-sm
            animate-in slide-in-from-bottom-5 fade-in duration-300
            ${
              toast.variant === "destructive"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-white border-[#7dd87d]/30 text-[#1a472a]"
            }
          `}
        >
          {toast.title && (
            <p className="font-bold text-sm mb-1">{toast.title}</p>
          )}
          {toast.description && (
            <p className="text-sm opacity-80">{toast.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}
