import { useState, useCallback } from "react";

/**
 * Centralizes the "open a confirm dialog, run the action only if
 * confirmed" pattern so every Super Admin page wires destructive actions
 * the same way instead of each inventing its own modal state.
 *
 * Usage:
 *   const { confirm, dialogProps } = useConfirmDialog();
 *   confirm({ title, message, onConfirm: async () => { ...actually do it... } });
 *   <ConfirmDialog {...dialogProps} />
 */
export function useConfirmDialog() {
  const [state, setState] = useState({ open: false, loading: false });

  const confirm = useCallback((opts) => {
    setState({ open: true, loading: false, ...opts });
  }, []);

  const handleConfirm = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      await state.onConfirm?.();
      setState({ open: false, loading: false });
    } catch (err) {
      setState((s) => ({ ...s, loading: false }));
      throw err;
    }
  }, [state]);

  const handleCancel = useCallback(() => {
    setState({ open: false, loading: false });
  }, []);

  return {
    confirm,
    dialogProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      confirmLabel: state.confirmLabel,
      danger: state.danger,
      loading: state.loading,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}