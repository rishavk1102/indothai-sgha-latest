import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

export default function AppMessageDialog({
  visible,
  header = "Message",
  message,
  onHide,
}) {
  return (
    <Dialog
      visible={visible}
      header={header}
      onHide={onHide}
      modal
      dismissableMask
      style={{ width: "min(440px, 92vw)" }}
      footer={
        <Button label="OK" onClick={onHide} autoFocus className="py-2 px-3" />
      }
    >
      <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
        {message}
      </p>
    </Dialog>
  );
}
