import { Toaster, toast } from 'sonner';

export function ToastProvider({ children }) {
  return (
    <>
      <Toaster
        position="top-center"
        expand
        richColors
        theme="dark"
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-3xl shadow-lg border border-slate-700/50 backdrop-blur-sm',
            description: 'text-sm text-slate-300',
            closeButton: 'bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-2xl',
          },
        }}
      />
      {children}
    </>
  );
}

export { toast };
