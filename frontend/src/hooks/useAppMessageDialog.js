import { useCallback, useState } from "react";
import AppMessageDialog from "../components/AppMessageDialog";

export function useAppMessageDialog() {
  const [state, setState] = useState(null);

  const hide = useCallback(() => setState(null), []);

  const showDialog = useCallback((message, header = "Message") => {
    if (message == null || message === "") return;
    setState({ message: String(message), header: header || "Message" });
  }, []);

  const showError = useCallback(
    (message, header = "Error") => showDialog(message, header),
    [showDialog],
  );

  const showWarn = useCallback(
    (message, header = "Warning") => showDialog(message, header),
    [showDialog],
  );

  const messageDialog = (
    <AppMessageDialog
      visible={!!state}
      header={state?.header}
      message={state?.message}
      onHide={hide}
    />
  );

  return { showDialog, showError, showWarn, hide, messageDialog };
}
