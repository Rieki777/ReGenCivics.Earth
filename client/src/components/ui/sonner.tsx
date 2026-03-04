import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'white',
          color: '#1a472a',
          border: '1px solid rgba(125, 216, 125, 0.3)',
          borderRadius: '12px',
        },
        classNames: {
          success: 'border-[#7dd87d]/50 bg-[#f0f7f0]',
          error: 'border-red-200 bg-red-50 text-red-800',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
