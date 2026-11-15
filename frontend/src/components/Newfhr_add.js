import React from "react";
import { useNavigate } from "react-router-dom";
import CreateNonScheduleFhr from "./form_FHR/CreateNonScheduleFhr";

/**
 * Add FHR entry point (dialog or embedded).
 * Uses the same Non-Schedule create form so staff are not shown a dead stub.
 */
const Newfhr_add = ({ onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="p-2">
      <CreateNonScheduleFhr
        compact
        onCancel={onClose}
        onCreated={({ fhr_id }) => {
          if (typeof onClose === "function") onClose();
          if (fhr_id) {
            navigate(`/dashboard/edit_fhr/${fhr_id}`);
            return;
          }
          navigate("/dashboard/FHR_draft");
        }}
      />
    </div>
  );
};

export default Newfhr_add;
