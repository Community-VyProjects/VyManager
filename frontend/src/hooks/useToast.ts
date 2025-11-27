import { create } from 'zustand';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const useToast = () => {
  const { addToast } = useToastStore();

  const toast = {
    success: (title: string, description?: string) => {
      addToast({ title, description, variant: 'success' });
    },
    error: (title: string, description?: string) => {
      addToast({ title, description, variant: 'destructive' });
    },
    info: (title: string, description?: string) => {
      addToast({ title, description, variant: 'default' });
    },
  };

  return { toast };
};
